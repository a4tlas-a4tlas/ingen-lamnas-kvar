import { describe, expect, it } from 'vitest';
import { allSkills } from '../../src/data/skills';
import { defaultPlan, planProblem, teachable } from '../../src/engine/campfire';
import { bondKey } from '../../src/engine/rules';
import { step, XP_TO_LEARN } from '../../src/engine/step';
import type { GameState } from '../../src/engine/types';
import { CROW_AWAY, calmGame, get, run } from './helpers';

/** Everyone across the road: one danger lived through. */
function acrossTheRoad(): GameState {
  let s = calmGame(['ingenLamnas']);
  for (const a of s.animals) a.zone = 'lane2';
  s.kraft = 99;
  for (const a of s.animals) s = run(s, { type: 'lead', target: a.id, zone: 'farDike' });
  return s;
}

describe('learning from what we live through', () => {
  it('each danger crossed counts; at three, two skills of its kind it does not know are offered', () => {
    const s = acrossTheRoad();
    expect(get(s, 'fox').xp).toBe(1);
    const fox = get(s, 'fox');
    fox.xp = XP_TO_LEARN - 1;
    fox.offer = undefined;
    // One more danger: here, simply cross the road again.
    let t = calmGame(['ingenLamnas']);
    t.animals = structuredClone(s.animals);
    for (const a of t.animals) { a.status = 'active'; a.zone = 'lane2'; }
    t.kraft = 99;
    for (const a of t.animals) t = run(t, { type: 'lead', target: a.id, zone: 'farDike' });
    const after = get(t, 'fox');
    expect(after.xp).toBe(0);
    expect(after.offer).toHaveLength(2);
    for (const k of after.offer!) {
      expect(allSkills('fox')).toContain(k);
      expect(after.skills).not.toContain(k);
    }
  });

  it('one who already knows all six learns nothing more this way', () => {
    let s = calmGame(['ingenLamnas']);
    const fox = get(s, 'fox');
    fox.skills = allSkills('fox');
    fox.xp = XP_TO_LEARN - 1;
    for (const a of s.animals) a.zone = 'lane2';
    s.kraft = 99;
    for (const a of s.animals) s = run(s, { type: 'lead', target: a.id, zone: 'farDike' });
    expect(get(s, 'fox').offer).toBeUndefined();
  });

  it('the choice is made on the map or by the fire; only what is offered; carried at once if there is room', () => {
    let s = acrossTheRoad();
    const fox = get(s, 'fox');
    const unknown = allSkills('fox').filter((k) => !fox.skills.includes(k));
    fox.offer = unknown.slice(0, 2);
    expect(step(s, { type: 'learn', animal: 'fox', skill: unknown[2] }).events[0]).toMatchObject({ kind: 'error' });
    s = run(s, { type: 'equip', animal: 'fox', skills: fox.loadout.slice(0, 2) });
    s = run(s, { type: 'learn', animal: 'fox', skill: unknown[0] });
    expect(get(s, 'fox').skills).toContain(unknown[0]);
    expect(get(s, 'fox').loadout).toContain(unknown[0]);
    expect(get(s, 'fox').offer).toBeUndefined();
    const deck = [...s.draw, ...s.hand, ...s.discard].filter((c) => c.owner === 'fox');
    expect(deck.map((c) => c.kind)).toContain(unknown[0]);
  });
});

describe('teaching by the fire', () => {
  function atFire(): GameState {
    const s = run(acrossTheRoad(), { type: 'travel', to: 'granbacken' }, ...CROW_AWAY);
    s.bonds[bondKey('badger', 'toad')] = 2;
    get(s, 'badger').skills = ['bara', 'taEmot', 'trosta'];
    get(s, 'toad').skills = ['gamlaVagar', 'simma', 'lasaNatten'];
    return s;
  }

  it('across kinds only comfort and insight can be taught; within a kind, anything', () => {
    const s = atFire();
    expect(teachable(s, 'badger', 'toad')).toEqual(['trosta']);
    expect(teachable(s, 'toad', 'badger')).toEqual(['gamlaVagar', 'lasaNatten']); // the old ways are knowledge too
    s.bonds[bondKey('badger', 'toad')] = 1;
    expect(teachable(s, 'badger', 'toad')).toEqual([]);
  });

  it('the two must share the embers; neither rests, but the lesson stays', () => {
    let s = atFire();
    get(s, 'badger').injuries = ['bleeding'];
    const plan = { ...defaultPlan(s), teach: { teacher: 'badger', learner: 'toad', skill: 'trosta' as const } };
    plan.pairs = [['badger', 'toad'], ...plan.pairs.filter((p) => !p.includes('badger') && !p.includes('toad'))].slice(0, 2) as [string, string][];
    if (plan.watch === 'badger' || plan.watch === 'toad') plan.watch = 'mice';
    expect(planProblem(s, { ...plan, pairs: plan.pairs.slice(1) })).toBe('Bara ett par vid glöden kan lära varandra.');
    expect(planProblem(s, { ...plan, teach: { ...plan.teach, skill: 'bara' } })).toBe('Det går inte att lära ut i natt.');
    s = run(s, { type: 'restAtFire', ...plan });
    expect(get(s, 'toad').skills).toContain('trosta');
    expect(get(s, 'badger').injuries).toContain('bleeding');
  });
});
