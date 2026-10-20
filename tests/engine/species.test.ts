import { describe, expect, it } from 'vitest';
import { RANDOM_CAST, SPECIES } from '../../src/data/animals';
import { CARDS } from '../../src/data/cards';
import { SKILLS } from '../../src/data/skills';
import { RESCUE_TRUST, bond, canPlay, cardZones, handSize, isFast, leadZones } from '../../src/engine/rules';
import { createGame, makeAnimal, rollCast } from '../../src/engine/setup';
import { RESCUED_BELIEF, step } from '../../src/engine/step';
import type { CardKind, GameState, Species, ZoneId } from '../../src/engine/types';
import { calmGame, car, get, run, setTraffic } from './helpers';

const NEW: Species[] = ['hedgehog', 'squirrel', 'mole', 'beaver', 'fawn'];

/** One more of a kind on the road, untroubled, carrying what we give it. */
function withKind(s: GameState, species: Species, zone: ZoneId = 'dike'): string {
  const made = makeAnimal({ species }, species, SPECIES[species].names[0], s, () => s.nextUid++, zone);
  made.animal.traits = [];
  made.animal.belief = 8;
  s.animals.push(made.animal);
  return species;
}

function give(s: GameState, owner: string, kind: CardKind): number {
  const uid = s.nextUid++;
  s.hand.push({ uid, kind, owner });
  return uid;
}

const play = (s: GameState, uid: number, more: { target?: string; zone?: ZoneId } = {}) => run(s, { type: 'play', uid, ...more });
const road = () => {
  const s = calmGame(['ingenLamnas']);
  s.kraft = 99;
  return s;
};

describe('the new kinds', () => {
  it('each knows six things, four from the start and two learned', () => {
    for (const sp of NEW) {
      expect(SKILLS[sp].basic).toHaveLength(4);
      expect(SKILLS[sp].advanced).toHaveLength(2);
      for (const k of [...SKILLS[sp].basic, ...SKILLS[sp].advanced]) expect(CARDS[k]).toBeDefined();
      expect(SPECIES[sp].names).toHaveLength(6);
    }
    expect(SPECIES.beaver).toMatchObject({ size: 'large', swimmer: true });
    expect(SPECIES.fawn).toMatchObject({ size: 'medium', fast: true });
    expect(NEW.every((sp) => !SPECIES[sp].predator)).toBe(true);
  });

  it('the random group can draw them, the fixed ones cannot', () => {
    const drawn = new Set(Array.from({ length: 300 }, (_, i) => rollCast(i + 1)).flat().map((m) => m.species));
    for (const sp of NEW) expect(drawn.has(sp)).toBe(true);
    expect(rollCast(5).length).toBeLessThanOrEqual(RANDOM_CAST.max);
  });

  it('a hedgehog curled up: a bite or a claw lets go – a car does not', () => {
    let s = road();
    const h = withKind(s, 'hedgehog', 'lane1');
    s = play(s, give(s, h, 'rullaIhop'));
    expect(get(s, h)).toMatchObject({ curled: true, rooted: true });
    // A fox that forgets the oath pricks itself.
    const fox = get(s, 'fox'); // in the ditch beside the lane: close enough to strike, out of the car's way
    fox.intent = { kind: 'hunt', target: h };
    const before = fox.belief;
    setTraffic(s, [car('lane1')]);
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'fox').belief).toBe(before - 1);
    expect(s.log.some((e) => 'text' in e && /stack sig på/.test(e.text))).toBe(true);
    // But the car still hits.
    expect(get(s, h).injuries.length + (get(s, h).status === 'dead' ? 1 : 0)).toBeGreaterThan(0);
  });

  it('Taggar and Trygg rygg curl the small ones beside the hedgehog', () => {
    let s = road();
    const h = withKind(s, 'hedgehog');
    s = play(s, give(s, h, 'taggar'));
    expect(get(s, 'mice').curled).toBe(true);
    expect(get(s, 'toad').curled).toBe(true);
    expect(get(s, 'badger').curled).toBeFalsy();
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'mice').curled).toBe(false);
    s.kraft = 99;
    s = play(s, give(s, h, 'tryggRygg'), { target: 'toad' });
    expect(get(s, 'toad').curled).toBe(true);
  });

  it('a squirrel up a tree: the cars pass beneath it, but it cannot climb out of the water', () => {
    let s = road();
    const q = withKind(s, 'squirrel', 'lane1');
    s = play(s, give(s, q, 'klattra'));
    expect(get(s, q)).toMatchObject({ climbing: true, flying: true });
    setTraffic(s, [car('lane1')]);
    s = run(s, { type: 'endTurn' });
    expect(get(s, q).injuries).toEqual([]);
    expect(s.log.some((e) => 'text' in e && /uppe i trädet/.test(e.text))).toBe(true);
  });

  it('Gömma förråd keeps a card for the next hour; Pigg gives Kraft', () => {
    let s = road();
    const q = withKind(s, 'squirrel');
    const hand = s.hand.length;
    s = play(s, give(s, q, 'gommaForrad'));
    expect(s.hand.length).toBe(hand + 1); // the card went, one came, and one waits
    expect(s.stash).toBe(1);
    s = run(s, { type: 'endTurn' });
    expect(s.stash).toBe(0);
    expect(s.hand.length).toBe(handSize(s) + 1);
    s.kraft = 1;
    s = play(s, give(s, q, 'pigg'));
    expect(s.kraft).toBe(2);
  });

  it('a mole digs a way, and the small ones follow it under the ground', () => {
    let s = road();
    const m = withKind(s, 'mole');
    const uid = give(s, m, 'gravaGang');
    const to = cardZones(s, s.hand.find((c) => c.uid === uid)!)[0];
    s = play(s, uid, { zone: to });
    for (const id of [m, 'mice', 'toad']) expect(get(s, id)).toMatchObject({ zone: to, hidden: true });
    expect(get(s, 'badger').zone).toBe('dike');
  });

  it('the mole feels what comes in the dark, but never sees the next hour', () => {
    let s = road();
    const m = withKind(s, 'mole');
    s = play(s, give(s, m, 'kannaSkakningar'));
    expect(s.darkRevealed).toBe(true);
    expect(s.peekNext).toBe(false);
    expect(s.revealed).toContain('culvert');
  });

  it('a beaver fells a tree, and everyone beside it crosses on it together', () => {
    let s = road();
    const b = withKind(s, 'beaver');
    const uid = give(s, b, 'fallaTrad');
    const to = cardZones(s, s.hand.find((c) => c.uid === uid)!)[0];
    s = play(s, uid, { zone: to });
    for (const id of ['badger', 'fox', 'mice']) expect(get(s, id)).toMatchObject({ zone: to, protectedBy: b });
    expect(get(s, b).zone).toBe(to);
  });

  it('at the river the beaver mends the dam; elsewhere it holds us', () => {
    let s = road();
    const b = withKind(s, 'beaver');
    s = play(s, give(s, b, 'lagaDammen'));
    expect(get(s, 'badger').braced).toBe(true);
    const r = road();
    withKind(r, 'beaver');
    r.encounterId = 'river';
    r.damCreak = 3;
    const after = play(r, give(r, 'beaver', 'lagaDammen'));
    expect(after.damCreak).toBe(1);
  });

  it('a fawn is led two steps like the hare, and its fear spreads to those beside it', () => {
    const s = road();
    const f = withKind(s, 'fawn');
    expect(isFast(get(s, f))).toBe(true);
    expect(leadZones(s, get(s, f))).toContain('median');
    let spread = 0;
    for (let seed = 1; seed <= 40; seed++) {
      let t = calmGame(['ingenLamnas'], seed);
      withKind(t, 'fawn');
      get(t, 'fawn').belief = 1;
      t = run(t, { type: 'endTurn' });
      if (t.phase !== 'play') continue;
      const scared = ['freeze', 'bolt'].includes(get(t, 'fawn').intent.kind);
      const said = t.log.some((e) => 'text' in e && /rädsla smittar/.test(e.text));
      expect(said).toBe(scared);
      if (scared) spread++;
    }
    expect(spread).toBeGreaterThan(0);
  });

  it('Klättra cannot be played in the water, nor twice', () => {
    const s = road();
    const q = withKind(s, 'squirrel');
    const uid = give(s, q, 'klattra');
    const card = s.hand.find((c) => c.uid === uid)!;
    expect(canPlay(s, card)).toBe(true);
    get(s, q).climbing = true;
    get(s, q).flying = true;
    expect(canPlay(s, card)).toBe(false);
  });
});

describe('who waits to be rescued', () => {
  /** On the road, then straight on to a farm or the river in this region. */
  function toTheTrap(seed: number, encounter: 'farm' | 'river'): GameState {
    let s = run(createGame(seed), { type: 'swear', verses: ['ingenLamnas'] });
    const n = s.journey.nodes.find((x) => x.encounter === encounter);
    if (!n) return s;
    s.journey.nodes[0].next = [n.id];
    s = run(s, { type: 'travel', to: n.id });
    return s;
  }

  it('is of a kind not with us, never a swimmer or flier on the stone, and the same for a seed', () => {
    const seen = new Set<Species>();
    for (let seed = 1; seed <= 60; seed++) {
      for (const where of ['farm', 'river'] as const) {
        const s = toTheTrap(seed, where);
        if (!s.rescue) continue;
        seen.add(s.rescue.species);
        expect(s.animals.map((a) => a.species)).not.toContain(s.rescue.species);
        if (where === 'river') expect(SPECIES[s.rescue.species].swimmer || SPECIES[s.rescue.species].flier).toBeFalsy();
        expect(toTheTrap(seed, where).rescue).toEqual(s.rescue);
        expect(s.log.some((e) => 'text' in e && e.text.includes(`${SPECIES[s.rescue!.species].en} ${SPECIES[s.rescue!.species].kindName}`))).toBe(true);
      }
    }
    // With the glen's six, the hare and all five new kinds can be trapped.
    for (const sp of ['hare', ...NEW] as Species[]) expect(seen.has(sp)).toBe(true);
  });

  it('a trapped predator needs more trust, and the rescued begin with little belief', () => {
    let s = run(createGame(3), { type: 'chooseCast', cast: 'deSma' }, { type: 'swear', verses: ['ingenLamnas'] });
    const n = s.journey.nodes.find((x) => x.encounter === 'farm')!;
    s.journey.nodes[0].next = [n.id];
    s = run(s, { type: 'travel', to: n.id });
    s.rescue = { ...s.rescue!, who: 'fox', species: 'fox', need: RESCUE_TRUST + 1 };
    expect(s.rescue.need).toBe(3);
    for (const a of s.animals) if (a.status === 'active') { a.belief = 8; a.intent = { kind: 'follow' }; }
    s.kraft = 99;
    get(s, 'toad').zone = 'gardsplanen';
    s = run(s, { type: 'rescue', by: 'toad' }, { type: 'rescue', by: 'toad' });
    expect(s.rescue?.trust).toBe(2);
    get(s, 'toad').zone = 'honshuset';
    expect(step(s, { type: 'rescue', by: 'toad' }).state.rescue?.trust).toBe(3);
    s = run(s, { type: 'rescue', by: 'toad' }, { type: 'rescue', by: 'toad' });
    expect(get(s, 'fox').belief).toBeLessThanOrEqual(RESCUED_BELIEF);
    expect(bond(s, 'fox', 'toad')).toBeGreaterThanOrEqual(0);
  });

  it('happens once in each region, not once in the whole run', () => {
    expect(toTheTrap(4, 'farm').rescues).toEqual(['dalen']);
    // Someone already waited in this region: no one this time.
    let s = run(createGame(4), { type: 'swear', verses: ['ingenLamnas'] });
    s.rescues = ['dalen'];
    const n = s.journey.nodes.find((x) => x.encounter === 'farm')!;
    s.journey.nodes[0].next = [n.id];
    expect(run(s, { type: 'travel', to: n.id }).rescue).toBeNull();
    // Only another region's rescue: someone waits here.
    s.rescues = ['akrarna'];
    expect(run(s, { type: 'travel', to: n.id }).rescue).not.toBeNull();
  });
});
