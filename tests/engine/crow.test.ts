import { describe, expect, it } from 'vitest';
import { crowCards, crowOffers, defaultPlan, planProblem } from '../../src/engine/campfire';
import type { GameState } from '../../src/engine/types';
import { calmGame, run } from './helpers';

function atTheFire(): GameState {
  let s = calmGame(['ingenLamnas']);
  for (const a of s.animals) a.zone = 'lane2';
  s.kraft = 99;
  for (const a of s.animals) s = run(s, { type: 'lead', target: a.id, zone: 'farDike' });
  return run(s, { type: 'travel', to: 'granbacken' });
}

const deck = (s: GameState) => [...s.draw, ...s.hand, ...s.discard];

describe('the crow', () => {
  it('comes to the fire while something ahead is still only Kvarn’s memory', () => {
    const s = atTheFire();
    expect(crowOffers(s)).toBe(true);
    s.journey.scouted = ['garden', 'an'];
    expect(crowOffers(s)).toBe(false);
  });

  it('for a card, it tells us the truth – and the card is gone for good', () => {
    const s = atTheFire();
    const card = crowCards(s)[0];
    const r = run(s, { type: 'restAtFire', ...defaultPlan(s), crow: { price: 'card', uid: card.uid } });
    expect(r.journey.scouted.sort()).toEqual(['an', 'garden']);
    expect(deck(r).some((c) => c.uid === card.uid)).toBe(false);
    expect(deck(r)).toHaveLength(deck(s).length - 1);
  });

  it('for a place by the embers, only one pair gets the fire tonight', () => {
    const s = atTheFire();
    const plan = defaultPlan(s);
    expect(planProblem(s, { ...plan, crow: { price: 'ember' } })).toMatch(/bara ett par/);
    const r = run(s, { type: 'restAtFire', ...plan, pairs: plan.pairs.slice(0, 1), crow: { price: 'ember' } });
    expect(r.journey.scouted.sort()).toEqual(['an', 'garden']);
  });

  it('a card must be chosen, it will not take a memory, and the owl and the crow are never both needed', () => {
    const s = atTheFire();
    const plan = defaultPlan(s);
    expect(planProblem(s, { ...plan, crow: { price: 'card', uid: -1 } })).toBe('Välj vilket kort kråkan får.');
    expect(crowCards(s).some((c) => c.kind === 'minne')).toBe(false);
    const pairs = plan.pairs.filter((p) => !p.includes('skymning'));
    const watch = plan.watch === 'skymning' ? 'ljung' : plan.watch;
    expect(planProblem(s, { ...plan, pairs, watch, scout: 'skymning', crow: { price: 'ember' } })).toMatch(/spanar redan/);
  });

  it('turned away, it tells us nothing', () => {
    const s = atTheFire();
    expect(run(s, { type: 'restAtFire', ...defaultPlan(s) }).journey.scouted).toEqual([]);
  });
});
