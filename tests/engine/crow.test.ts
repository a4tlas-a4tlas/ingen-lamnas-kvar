import { describe, expect, it } from 'vitest';
import { defaultPlan, emberPairs, planProblem } from '../../src/engine/campfire';
import { meetingOptions } from '../../src/data/meetings/crow.sv';
import { step } from '../../src/engine/step';
import type { GameState } from '../../src/engine/types';
import { calmGame, get, run } from './helpers';

function atTheFire(): GameState {
  let s = calmGame(['ingenLamnas']);
  for (const a of s.animals) a.zone = 'lane2';
  s.kraft = 99;
  for (const a of s.animals) s = run(s, { type: 'lead', target: a.id, zone: 'farDike' });
  return run(s, { type: 'travel', to: 'granbacken' });
}

const deck = (s: GameState) => [...s.draw, ...s.hand, ...s.discard];
const say = (s: GameState, ...options: string[]) => run(s, ...options.map((option) => ({ type: 'respond' as const, option })));
const offered = (s: GameState) => meetingOptions(s).map((o) => o.id);

describe('the crow at the fire', () => {
  it('lands when we come to the fire, and we cannot rest until it is answered', () => {
    const s = atTheFire();
    expect(s.meeting).toMatchObject({ id: 'crow', frame: 'start' });
    expect(step(s, { type: 'restAtFire', ...defaultPlan(s) }).events[0].kind).toBe('error');
  });

  it('each animal answers in its own way – and only those with us', () => {
    const s = atTheFire();
    expect(offered(s)).toEqual(expect.arrayContaining(['ask', 'kvarn', 'fox', 'owl', 'lonely', 'no']));
    get(s, 'sotfot').status = 'dead';
    expect(offered(s)).not.toContain('fox');
  });

  it('for a card it tells us the truth, and the card is gone for good', () => {
    let s = say(atTheFire(), 'ask');
    const card = deck(s).find((c) => c.kind !== 'minne')!;
    s = run(s, { type: 'respond', option: 'card', uid: card.uid });
    expect(s.meeting?.frame).toBe('told');
    expect(s.journey.scouted.sort()).toEqual(['an', 'garden']);
    expect(deck(s).some((c) => c.uid === card.uid)).toBe(false);
    s = say(s, 'thanks');
    expect(s.meeting).toBeNull();
  });

  it('for a place by the embers, only one pair gets the fire tonight', () => {
    const s = say(atTheFire(), 'ask', 'ember', 'thanks');
    expect(emberPairs(s)).toBe(1);
    const plan = defaultPlan(s);
    expect(plan.pairs).toHaveLength(1);
    expect(planProblem(s, { ...plan, pairs: [...plan.pairs, ['frona', 'sicksack']] })).toMatch(/bara ett par/);
  });

  it('Kvarn’s pride: the crow tells how many places Kvarn remembers wrong, and Kvarn takes it to heart', () => {
    const s = atTheFire();
    s.journey.guess = { ...s.journey.truth, an: s.journey.truth.an === 'hard' ? 'normal' : 'hard' };
    const before = get(s, 'kvarn').belief;
    const r = say(s, 'kvarn');
    expect(r.meeting?.frame).toBe('kvarn');
    expect(get(r, 'kvarn').belief).toBe(before - 1);
    expect(offered(say(r, 'back'))).not.toContain('kvarn');
  });

  it('the fox’s trick: it works as often as Sotfot believes – or the crow takes one of Sotfot’s cards', () => {
    const s = say(atTheFire(), 'fox');
    get(s, 'sotfot').belief = 10; // 90 %
    let won = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const t = structuredClone(s);
      t.rng = seed;
      const r = say(t, 'trick');
      if (r.meeting?.frame === 'told') won++;
      else {
        expect(r.meeting?.frame).toBe('snatched');
        expect(deck(r).filter((c) => c.owner === 'sotfot')).toHaveLength(deck(s).filter((c) => c.owner === 'sotfot').length - 1);
      }
    }
    expect(won).toBeGreaterThan(28);
  });

  it('Sotfot gives up a place and sits in the dark; Gamla Ljung tells the crow of the glen and sits apart', () => {
    const dark = say(atTheFire(), 'fox', 'dark', 'thanks');
    expect(dark.fireDebt).toMatchObject({ embers: 1, dark: ['sotfot'] });
    expect(planProblem(dark, { ...defaultPlan(dark), watch: 'sotfot' })).toMatch(/redan sin plats/);
    const story = say(atTheFire(), 'lonely', 'story', 'thanks');
    expect(story.fireDebt.apart).toEqual(['ljung']);
    expect(story.journey.scouted.length).toBeGreaterThan(0);
    get(story, 'ljung').injuries = ['bleeding'];
    const r = run(story, { type: 'restAtFire', ...defaultPlan(story) });
    expect(get(r, 'ljung').injuries).toContain('bleeding'); // no rest while telling
    expect(r.fireDebt).toEqual({ embers: 0, apart: [], dark: [] });
  });

  it('the owl frightens the crow away – or offers to fly there itself', () => {
    const scared = say(atTheFire(), 'owl', 'scare');
    expect(scared.meeting?.frame).toBe('fled');
    expect(scared.journey.scouted).toEqual([]);
    expect(say(atTheFire(), 'owl', 'self').meeting?.frame).toBe('offended');
  });

  it('turned away, it tells us nothing', () => {
    const s = say(atTheFire(), 'no', 'close');
    expect(s.meeting).toBeNull();
    expect(s.journey.scouted).toEqual([]);
  });
});
