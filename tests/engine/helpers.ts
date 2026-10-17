import { createGame, oathVerse } from '../../src/engine/setup';
import { step } from '../../src/engine/step';
import type { Action, GameState, Strike, VerseId } from '../../src/engine/types';

export function run(s: GameState, ...actions: Action[]): GameState {
  for (const a of actions) {
    const r = step(s, a);
    const err = r.events.find((e) => e.kind === 'error');
    if (err && err.kind === 'error') throw new Error(err.text);
    s = r.state;
  }
  return s;
}

/**
 * A sworn game where nobody doubts, the road is quiet and the moon hides.
 * The oath takes one verse; tests may hold more to exercise verses gained later.
 */
export function calmGame(verses: VerseId[], seed = 7): GameState {
  const s = run(createGame(seed), { type: 'swear', verses: [verses[0]] }, { type: 'travel', to: 'vagen' });
  s.verses = verses.map(oathVerse);
  for (const a of s.animals) {
    a.belief = 8;
    a.intent = { kind: 'follow' };
  }
  s.trafficPlan = s.trafficPlan.map(() => []);
  s.moonPlan = s.moonPlan.map(() => true);
  return s;
}

export function setTraffic(s: GameState, strikes: Strike[]) {
  s.trafficPlan[s.turn - 1] = strikes;
}

/** A car injures; a truck kills. */
export const car = (lane: 'lane1' | 'lane2'): Strike => ({ lane, severity: 'injure', vehicle: 'bil', dark: false });
export const truck = (lane: 'lane1' | 'lane2'): Strike => ({ lane, severity: 'kill', vehicle: 'lastbil', dark: false });

export const get = (s: GameState, id: string) => s.animals.find((a) => a.id === id)!;
