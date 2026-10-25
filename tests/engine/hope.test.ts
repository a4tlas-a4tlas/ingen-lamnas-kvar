import { describe, expect, it } from 'vitest';
import { defaultPlan } from '../../src/engine/campfire';
import { mood, moodAt } from '../../src/engine/rules';
import { step } from '../../src/engine/step';
import type { GameState } from '../../src/engine/types';
import { ownWillBelow } from '../../src/engine/will';
import { CROW_AWAY, calmGame, get, run } from './helpers';

/** Across the road, at the fire, everyone at belief 6, and hope as we say. */
function atFire(hope: number): GameState {
  let s = calmGame(['ingenLamnas']);
  for (const a of s.animals) a.zone = 'lane2';
  s.kraft = 99;
  for (const a of s.animals) s = run(s, { type: 'lead', target: a.id, zone: 'farDike' });
  s = run(s, { type: 'travel', to: 'granbacken' }, ...CROW_AWAY);
  for (const a of s.animals) a.belief = 6;
  s.hope = hope;
  return s;
}
const rest = (s: GameState) => run(s, { type: 'restAtFire', ...defaultPlan(s) });
const lines = (s: GameState) => s.log.map((e) => ('text' in e ? String(e.text) : ''));

describe('the mood', () => {
  it('is despair at 0–2, worry at 3–6, trust at 7–10', () => {
    expect([0, 2, 3, 6, 7, 10].map(moodAt)).toEqual(['fortvivlan', 'fortvivlan', 'oro', 'oro', 'tillit', 'tillit']);
  });

  it('moves the line of the own will: 4 in trust, 5 in worry, 6 in despair – on top of the traits', () => {
    const s = calmGame(['ingenLamnas']);
    const fox = get(s, 'fox');
    const at = (hope: number) => { s.hope = hope; return ownWillBelow(s, fox); };
    expect([at(8), at(5), at(1)]).toEqual([4, 5, 6]);
    fox.traits = ['modig'];
    expect(at(8)).toBe(3);
  });

  it('gives a Kraft in trust and takes one in despair, each hour', () => {
    for (const [hope, kraft] of [[8, 4], [5, 3], [1, 2]]) {
      const s = calmGame(['ingenLamnas']);
      s.hope = hope;
      expect(run(s, { type: 'endTurn' }).kraft).toBe(kraft);
    }
  });

  it('says so when it changes, and only then', () => {
    const s = calmGame(['ingenLamnas']);
    s.hope = 3;
    s.animals[0].status = 'dead';
    // A death costs hope: worry turns to despair.
    const r = step(s, { type: 'endTurn' });
    if (mood(r.state) === 'fortvivlan') expect(lines(r.state)).toContain('Förtvivlan tar oss.');
    const t = calmGame(['ingenLamnas']);
    t.hope = 5;
    expect(lines(run(t, { type: 'endTurn' })).some((l) => /Förtvivlan tar oss|Något har lättat/.test(l))).toBe(false);
  });
});

describe('at the fire', () => {
  it('belief far from hope drifts one step toward it; near it, nothing moves', () => {
    const s = atFire(5);
    get(s, 'badger').belief = 9;
    get(s, 'owl').belief = 2;
    get(s, 'toad').belief = 7;
    // By the embers each gains 1 as always; the mood's pull comes on top.
    const r = run(s, { type: 'restAtFire', watch: 'mice', pairs: [['badger', 'toad'], ['owl', 'fox']], mourning: {} });
    expect(get(r, 'badger').belief).toBe(9 - 1 + 1);
    expect(get(r, 'owl').belief).toBe(2 + 1 + 1);
    expect(get(r, 'toad').belief).toBe(7 + 1);
  });

  it('in trust, a fading bad trait lets go after one night by the embers', () => {
    const s = atFire(8);
    const plan = defaultPlan(s);
    const id = plan.pairs[0][0];
    get(s, id).traits = ['hetsig'];
    const r = run(s, { type: 'restAtFire', ...plan });
    expect(get(r, id).traits).toEqual([]);
    expect(lines(r).some((l) => /En natt vid glöden räckte/.test(l))).toBe(true);
  });

  it('in despair, nothing lets go – and the weakest begins to doubt', () => {
    const s = atFire(1);
    const plan = defaultPlan(s);
    const id = plan.pairs[0][0];
    get(s, id).traits = ['hetsig'];
    get(s, id).emberNights = 5;
    get(s, 'owl').belief = 3;
    const r = rest(s);
    expect(get(r, id).traits).toContain('hetsig');
    expect(get(r, 'owl').traits).toContain('tvivlande');
    expect(r.animals.filter((a) => a.traits.includes('tvivlande'))).toHaveLength(1);
    expect(lines(r)).toContain('Förtvivlan sitter med vid elden.');
  });

  it('in worry, the embers work as before: two nights', () => {
    const s = atFire(5);
    const plan = defaultPlan(s);
    const id = plan.pairs[0][0];
    get(s, id).traits = ['hetsig'];
    expect(get(run(s, { type: 'restAtFire', ...plan }), id).traits).toEqual(['hetsig']);
  });
});
