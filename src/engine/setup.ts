import { CAST, START_BONDS } from '../data/animals';
import { TRAITS, TRAIT_IDS } from '../data/traits';
import { random, randInt, pick, shuffle, type RngHolder } from './rng';
import { bondKey } from './rules';
import type { Animal, Card, GameState, LaneId, Strike } from './types';

export const MAX_TURN = 10;

function rollTraffic(h: RngHolder, turn: number, darkTurn: number): Strike[] {
  const lanes: LaneId[] = ['lane1', 'lane2'];
  const strikes: Strike[] = [];
  const car = (lane: LaneId): Strike =>
    random(h) < 0.18 + turn * 0.02
      ? { lane, wounds: 2, vehicle: 'lastbil', dark: false }
      : { lane, wounds: 1, vehicle: 'bil', dark: false };

  if (turn === 1) strikes.push(car(pick(h, lanes)));
  else {
    const r = random(h);
    if (r < 0.12) {
      // A quiet hour. Tempting.
    } else if (turn >= 2 && r < 0.55) strikes.push(car('lane1'), car('lane2'));
    else strikes.push(car(pick(h, lanes)));
  }
  if (turn === darkTurn) strikes.push({ lane: pick(h, lanes), wounds: 2, vehicle: 'mörk bil', dark: true });
  return strikes;
}

export function createGame(seed: number): GameState {
  const h: RngHolder = { rng: seed };
  let uid = 1;
  const animals: Animal[] = [];
  const draw: Card[] = [];

  for (const def of CAST) {
    const traits = shuffle(h, [...TRAIT_IDS]).slice(0, 2);
    animals.push({
      id: def.id,
      name: def.name,
      species: def.species,
      predator: def.predator,
      elder: def.elder ?? false,
      traits,
      belief: def.belief,
      wounds: 0,
      count: def.swarm,
      zone: 'dike',
      status: 'active',
      intent: { kind: 'follow' },
      culvertTime: 0,
      braced: false,
      flying: false,
    });
    draw.push({ uid: uid++, kind: def.speciesCard, owner: def.id });
    for (const t of traits) draw.push({ uid: uid++, kind: TRAITS[t].card, owner: def.id });
  }

  const bonds: Record<string, number> = {};
  for (const [a, b, v] of START_BONDS) bonds[bondKey(a, b)] = v;

  const darkTurn = 4 + randInt(h, 4);
  const trafficPlan: Strike[][] = [];
  const moonPlan: boolean[] = [];
  for (let t = 1; t <= MAX_TURN; t++) {
    trafficPlan.push(rollTraffic(h, t, darkTurn));
    moonPlan.push(random(h) < 0.4);
  }

  return {
    version: 1,
    seed,
    rng: h.rng,
    phase: 'oath',
    turn: 0,
    maxTurn: MAX_TURN,
    kraft: 0,
    hope: 6,
    animals,
    bonds,
    verses: [],
    draw,
    hand: [],
    discard: [],
    nextUid: uid,
    trafficPlan,
    moonPlan,
    culvertRevealed: false,
    peekNext: false,
    darkRevealed: false,
    hitQueue: [],
    log: [],
  };
}
