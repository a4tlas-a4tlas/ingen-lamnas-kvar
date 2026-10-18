import { createGame, oathVerse } from '../../src/engine/setup';
import { DALEN, type Template } from '../../src/data/regions/dalen';
import { step } from '../../src/engine/step';
import type { Action, GameState, MapNode, Strike, VerseId } from '../../src/engine/types';

export function run(s: GameState, ...actions: Action[]): GameState {
  for (const a of actions) {
    const r = step(s, a);
    const err = r.events.find((e) => e.kind === 'error');
    if (err && err.kind === 'error') throw new Error(err.text);
    s = r.state;
  }
  return s;
}

/** A place from a region template, put on a fixed map. */
const node = (t: Template, id: string, row: number, next: string[]): MapNode => {
  const { key: _key, ...rest } = t;
  return { ...rest, id, row, x: 50, y: 90 - row * 20, next };
};

/**
 * A fixed little map for the engine tests, the way the journey used to be:
 * Dalen → Vägen → Granbacken → Gården or Ån → Åkrarna. The real one is drawn anew every run.
 */
export const CLASSIC: MapNode[] = [
  node(DALEN.start, 'dalen', 0, ['vagen']),
  node(DALEN.first, 'vagen', 1, ['granbacken']),
  node(DALEN.lastFire, 'granbacken', 2, ['garden', 'an']),
  node(DALEN.dangers[0], 'garden', 3, ['akrarna']),
  node(DALEN.dangers[1], 'an', 3, ['akrarna']),
  { ...node(DALEN.end, 'akrarna', 4, []), name: 'Åkrarna' },
];

/** A new game on the fixed little map, with Kvarn remembering every place right. */
export function classicGame(seed: number): GameState {
  const s = createGame(seed);
  s.journey = { ...s.journey, nodes: structuredClone(CLASSIC), truth: { garden: 'normal', an: 'normal' }, guess: { garden: 'normal', an: 'normal' } };
  return s;
}

/**
 * A sworn game where nobody doubts, the road is quiet and the moon hides.
 * The oath takes one verse; tests may hold more to exercise verses gained later.
 */
export function calmGame(verses: VerseId[], seed = 7): GameState {
  const s = run(classicGame(seed), { type: 'swear', verses: [verses[0]] }, { type: 'travel', to: 'vagen' });
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

/** Arriving at the fire, the crow waits for an answer: these turn it away. */
export const CROW_AWAY: Action[] = [
  { type: 'respond', option: 'no' },
  { type: 'respond', option: 'close' },
];
