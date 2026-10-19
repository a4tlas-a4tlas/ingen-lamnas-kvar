import { describe, expect, it } from 'vitest';
import { defaultPlan, planProblem } from '../../src/engine/campfire';
import { AWAKE_ALARM } from '../../src/engine/encounters/farm';
import { FLOOD_DAM_CREAK } from '../../src/engine/encounters/river';
import { createGame } from '../../src/engine/setup';
import { generateRegion } from '../../src/engine/regions';
import { DALEN } from '../../src/data/regions/dalen';
import { step } from '../../src/engine/step';
import type { GameState } from '../../src/engine/types';
import { CROW_AWAY, calmGame, get, run } from './helpers';

/** At the campfire on Granbacken, before the fork. */
function atTheFire(): GameState {
  let s = calmGame(['ingenLamnas']);
  for (const a of s.animals) a.zone = 'lane2';
  s.kraft = 99;
  for (const a of s.animals) s = run(s, { type: 'lead', target: a.id, zone: 'farDike' });
  return run(s, { type: 'travel', to: 'granbacken' }, ...CROW_AWAY);
}

const lastNarration = (s: GameState) => s.log.filter((e) => e.kind === 'narrate').map((e) => e.text);

describe("Kvarn's memory", () => {
  it('is rolled from the seed, for every place Kvarn may misremember', () => {
    expect(createGame(11).journey.truth).toEqual(createGame(11).journey.truth);
    const map = generateRegion(DALEN, 11);
    expect(Object.keys(map.truth).sort()).toEqual(map.nodes.filter((n) => n.memory).map((n) => n.id).sort());
  });

  it('is wrong about one place in three', () => {
    let wrong = 0;
    let all = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const m = generateRegion(DALEN, seed);
      for (const id of Object.keys(m.truth)) {
        all++;
        if (m.truth[id] !== m.guess[id]) wrong++;
      }
    }
    expect(wrong / all).toBeGreaterThan(0.28);
    expect(wrong / all).toBeLessThan(0.39);
  });

  it('an awake farm starts with the alarm already raised', () => {
    let s = run(atTheFire(), { type: 'restAtFire', ...defaultPlan(atTheFire()) });
    s.journey.truth.garden = 'hard';
    s = run(s, { type: 'travel', to: 'garden' });
    expect(s.variant).toBe('hard');
    expect(s.alarm).toBe(AWAKE_ALARM);
  });

  it('a flooding river: a strong current most hours, and a dam half gone', () => {
    let strong = 0;
    for (let seed = 1; seed <= 40; seed++) {
      let s = calmGame(['ingenLamnas'], seed);
      for (const a of s.animals) a.zone = 'lane2';
      s.kraft = 99;
      for (const a of s.animals) s = run(s, { type: 'lead', target: a.id, zone: 'farDike' });
      s = run(s, { type: 'travel', to: 'granbacken' }, ...CROW_AWAY);
      s = run(s, { type: 'restAtFire', ...defaultPlan(s) });
      s.journey.truth.an = 'hard';
      s = run(s, { type: 'travel', to: 'an' });
      expect(s.damCreak).toBe(FLOOD_DAM_CREAK);
      strong += s.currentPlan.slice(1).filter((x) => x === 'strid').length / (s.currentPlan.length - 1);
    }
    expect(strong / 40).toBeGreaterThan(0.65);
  });

  it('on arrival we learn whether Kvarn remembered right', () => {
    let s = run(atTheFire(), { type: 'restAtFire', ...defaultPlan(atTheFire()) });
    s.journey.truth.an = 'hard';
    s.journey.guess.an = 'normal';
    expect(lastNarration(run(s, { type: 'travel', to: 'an' }))).toContain('Kvarn mindes fel: ån svämmar över.');
    s.journey.guess.an = 'hard';
    expect(lastNarration(run(s, { type: 'travel', to: 'an' }))).toContain('Det var som Kvarn mindes: ån svämmar över.');
  });
});

describe('the owl scouts', () => {
  it('only one who can fly may scout, and not while keeping watch', () => {
    const s = atTheFire();
    const plan = defaultPlan(s);
    expect(planProblem(s, { ...plan, scout: 'toad' })).toBe('Bara den som kan flyga kan spana.');
    const apart = plan.pairs.filter((p) => !p.includes('owl'));
    expect(planProblem(s, { ...plan, pairs: apart, watch: 'owl', scout: 'owl' })).toMatch(/spanar/);
    get(s, 'owl').injuries = ['broken'];
    expect(planProblem(s, { ...plan, pairs: plan.pairs.filter((p) => !p.includes('owl')), scout: 'owl' })).toBe('Bara den som kan flyga kan spana.');
  });

  it('flies ahead and reveals what lies there, but gets no rest', () => {
    const s = atTheFire();
    const plan = defaultPlan(s);
    get(s, 'owl').injuries = ['bleeding'];
    const pairs = plan.pairs.filter((p) => !p.includes('owl'));
    const r = step(s, { type: 'restAtFire', ...plan, pairs, watch: plan.watch === 'owl' ? 'badger' : plan.watch, scout: 'owl' });
    expect(r.events.find((e) => e.kind === 'error')).toBeUndefined();
    expect(r.state.journey.scouted.sort()).toEqual(['an', 'garden']);
    expect(get(r.state, 'owl').injuries).toContain('bleeding');
    // Flying ahead is not sitting alone in the dark.
    expect(r.state.log.some((e) => e.text.includes('Skymning satt ensam'))).toBe(false);
  });
});
