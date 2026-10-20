import { describe, expect, it } from 'vitest';
import { CASTS, CAST_IDS, RANDOM_CAST, SPECIES, startBond, type CastId } from '../../src/data/animals';
import { meetingOptions } from '../../src/data/meetings';
import { defaultPlan } from '../../src/engine/campfire';
import { encounterOf } from '../../src/engine/encounters';
import { bond, isActive, leadZones, zoneDistance } from '../../src/engine/rules';
import { castOffers, createGame, rollCast } from '../../src/engine/setup';
import { step } from '../../src/engine/step';
import type { Action, GameState } from '../../src/engine/types';
import { run } from './helpers';

const kinds = (s: GameState) => s.animals.map((a) => a.species);

describe('who goes: the groups before the oath', () => {
  it('four groups are offered, the same each time for a seed', () => {
    const offers = castOffers(9);
    expect(offers.map((g) => g.cast)).toEqual(CAST_IDS);
    expect(castOffers(9)).toEqual(offers);
    expect(castOffers(10)).not.toEqual(offers);
  });

  it('the fixed groups hold their kinds, each with one eldest and one guide', () => {
    for (const def of CASTS.filter((c) => c.id !== 'slumpad')) {
      const g = castOffers(4).find((x) => x.cast === def.id)!;
      expect(g.animals.map((a) => a.species)).toEqual(def.members.map((m) => m.species));
      expect(g.animals.filter((a) => a.elder)).toHaveLength(1);
      expect(g.animals.filter((a) => a.guide)).toHaveLength(1);
      expect(g.draw).toHaveLength(g.animals.length * 3);
    }
    const pact = castOffers(4).find((g) => g.cast === 'rovdjurensPakt')!;
    expect(pact.animals.filter((a) => a.predator)).toHaveLength(4);
    const small = castOffers(4).find((g) => g.cast === 'deSma')!;
    expect(small.animals.filter((a) => a.size === 'large')).toHaveLength(1);
    expect(small.animals.some((a) => a.species === 'hare')).toBe(true);
  });

  it('the random group keeps to its rules', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const m = rollCast(seed);
      const predators = m.filter((x) => SPECIES[x.species].predator).length;
      expect(m.length).toBeGreaterThanOrEqual(RANDOM_CAST.min);
      expect(m.length).toBeLessThanOrEqual(RANDOM_CAST.max);
      expect(predators).toBeLessThanOrEqual(RANDOM_CAST.maxPredators);
      expect(m.length - predators).toBeGreaterThanOrEqual(RANDOM_CAST.minPrey);
      for (const sp of new Set(m.map((x) => x.species))) expect(m.filter((x) => x.species === sp).length).toBeLessThanOrEqual(RANDOM_CAST.maxOfKind);
      expect(m.filter((x) => x.elder)).toHaveLength(1);
      const guide = m.filter((x) => x.guide);
      expect(guide).toHaveLength(1);
      expect(guide[0].elder).toBeFalsy();
      expect(SPECIES[guide[0].species].predator).toBe(false);
      // The eldest is the one who believes most.
      const top = Math.max(...m.map((x) => SPECIES[x.species].belief));
      expect(SPECIES[m.find((x) => x.elder)!.species].belief).toBe(top);
    }
    expect(new Set(Array.from({ length: 40 }, (_, i) => rollCast(i + 1).map((x) => x.species).join())).size).toBeGreaterThan(20);
  });

  it('without a choice the glen\'s own six go, as before', () => {
    const s = createGame(3);
    expect(s.cast).toBe('dalensSista');
    expect(kinds(s)).toEqual(['badger', 'toad', 'fox', 'owl', 'adder', 'mice']);
  });

  it('choosing a group gives us exactly those who were offered', () => {
    const offer = castOffers(12).find((g) => g.cast === 'deSma')!;
    const s = run(createGame(12), { type: 'chooseCast', cast: 'deSma' });
    expect(s.cast).toBe('deSma');
    expect(s.animals).toEqual(offer.animals);
    expect(s.draw).toEqual(offer.draw);
    expect(s.animals.map((a) => a.id)).toEqual(['badger', 'toad', 'mice', 'mice-2', 'hare']);
    // Two of a kind: different names, and they already belong together.
    expect(s.animals[2].name).not.toBe(s.animals[3].name);
    expect(bond(s, 'mice', 'mice-2')).toBe(startBond('mice', 'mice'));
    expect(bond(s, 'badger', 'mice-2')).toBe(startBond('badger', 'mice'));
    // And we can change our minds until the oath is sworn.
    const back = run(s, { type: 'chooseCast', cast: 'dalensSista' });
    expect(back.animals).toEqual(createGame(12).animals);
  });

  it('once the oath is sworn, the group is who it is', () => {
    const s = run(createGame(5), { type: 'chooseCast', cast: 'rovdjurensPakt' }, { type: 'swear', verses: ['viJagarInte'] });
    const r = step(s, { type: 'chooseCast', cast: 'deSma' });
    expect(r.events.some((e) => e.kind === 'error')).toBe(true);
    expect(r.state.cast).toBe('rovdjurensPakt');
    expect(r.state.log.some((e) => 'text' in e && /Vi var sex/.test(e.text))).toBe(true);
  });

  it('a group that already has a hare meets a second one in the snare', () => {
    let s = run(createGame(8), { type: 'chooseCast', cast: 'deSma' }, { type: 'swear', verses: ['ingenLamnas'] });
    // Straight to the first farm or river, where someone waits to be freed.
    const n = s.journey.nodes.find((x) => x.encounter === 'farm' || x.encounter === 'river')!;
    s.journey.nodes[0].next = [n.id];
    s = run(s, { type: 'travel', to: n.id });
    expect(s.rescue).toMatchObject({ species: 'hare', who: 'hare-2' });
  });
});

/** A crude walker: leads everyone toward the goal, answers the first reply, rests the default way, lets go. */
function walk(s: GameState): { s: GameState; stuck: string } {
  let stuck = '';
  for (let n = 0; n < 4000 && s.phase !== 'over'; n++) {
    const tryStep = (a: Action) => {
      const r = step(s, a);
      const err = r.events.find((e) => e.kind === 'error');
      if (err) {
        stuck = `${s.phase} at ${s.journey.at}: ${a.type} → ${'text' in err ? err.text : ''}`;
        return false;
      }
      s = r.state;
      return true;
    };
    if (s.meeting) {
      const opt = meetingOptions(s)[0];
      // A reply that asks for a card: try the cards we hold until one is taken.
      const uids = [undefined, ...[...s.draw, ...s.hand, ...s.discard].map((c) => c.uid)];
      if (!opt || !uids.some((uid) => tryStep({ type: 'respond', option: opt.id, uid }))) break;
      stuck = '';
      continue;
    }
    if (s.phase === 'map') {
      const here = s.journey.nodes.find((x) => x.id === s.journey.at)!;
      if (!tryStep({ type: 'travel', to: here.next[0] })) break;
    } else if (s.phase === 'campfire') {
      if (!tryStep({ type: 'restAtFire', ...defaultPlan(s) })) break;
    } else if (s.phase === 'lastMoment') {
      tryStep({ type: 'lastMoment', choice: 'letGo' });
      stuck = '';
    } else if (s.phase === 'play') {
      const goal = encounterOf(s).zones.find((z) => z.goal)!.id;
      for (const a of s.animals.filter(isActive)) {
        const zones = leadZones(s, a).sort((x, y) => zoneDistance(s, x, goal) - zoneDistance(s, y, goal));
        if (zones.length && zoneDistance(s, zones[0], goal) < zoneDistance(s, a.zone, goal)) tryStep({ type: 'lead', target: a.id, zone: zones[0] });
      }
      stuck = ''; // some can't be led – frozen, carried – and that's fine
      // Leading the last one across ends the danger by itself.
      if (s.phase === 'play' && !s.meeting && !tryStep({ type: 'endTurn' })) break;
    } else break;
  }
  return { s, stuck };
}

describe('every group can walk the whole glen', () => {
  for (const cast of CAST_IDS as CastId[]) {
    it(`${cast}: no story part, voice or danger stumbles on who is missing`, () => {
      for (let seed = 1; seed <= 12; seed++) {
        const { s, stuck } = walk(run(createGame(seed), { type: 'chooseCast', cast }, { type: 'swear', verses: ['viJagarInte'] }));
        expect(stuck).toBe('');
        expect(s.phase).toBe('over');
        const texts = s.log.map((e) => ('text' in e ? String(e.text) : ''));
        expect(texts.filter((t) => /undefined|NaN|\[object/.test(t))).toEqual([]);
      }
    });
  }
});
