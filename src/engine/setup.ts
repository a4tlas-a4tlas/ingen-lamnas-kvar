import { CAST, START_BONDS } from '../data/animals';
import { TRAITS, TRAIT_IDS } from '../data/traits';
import { shuffle, type RngHolder } from './rng';
import { START_PLACE } from '../data/journey';
import { ROAD } from './encounters/road';
import { bondKey } from './rules';
import { VERSES } from '../data/verses';
import type { Animal, Card, GameState, Verse, VerseId } from './types';

/** We swear a single verse in the glen; later verses come from the journey. */
export const OATH_VERSES = 1;

export function oathVerse(id: VerseId): Verse {
  return { id, kind: 'oath', base: id, text: VERSES[id].text, flippedText: VERSES[id].flippedText, flipped: false };
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
      size: def.size,
      flier: def.flier ?? false,
      hunger: def.hunger ?? 0,
      traits,
      belief: def.belief,
      injuries: [],
      grief: [],
      count: def.swarm,
      zone: ROAD.zones.find((z) => z.start)!.id,
      status: 'active',
      intent: { kind: 'follow' },
      slowTime: 0,
      braced: false,
      flying: false,
    });
    draw.push({ uid: uid++, kind: def.speciesCard, owner: def.id });
    for (const t of traits) draw.push({ uid: uid++, kind: TRAITS[t].card, owner: def.id });
  }

  const bonds: Record<string, number> = {};
  for (const [a, b, v] of START_BONDS) bonds[bondKey(a, b)] = v;

  return {
    version: 6,
    journey: { at: START_PLACE, visited: [START_PLACE] },
    time: 'night',
    clock: 'night',
    unmourned: [],
    encounterId: 'road',
    seed,
    rng: h.rng,
    phase: 'oath',
    turn: 0,
    maxTurn: ROAD.maxTurn,
    kraft: 0,
    hope: 6,
    animals,
    bonds,
    verses: [],
    draw,
    hand: [],
    discard: [],
    nextUid: uid,
    // Planned when each encounter starts.
    trafficPlan: [],
    moonPlan: [],
    revealed: [],
    dogs: [],
    dogsAwake: false,
    scent: {},
    alarm: 0,
    farmerOut: false,
    farmerSweep: null,
    currentPlan: [],
    slipPlan: [],
    damCreak: 0,
    closed: [],
    heron: null,
    peekNext: false,
    darkRevealed: false,
    hitQueue: [],
    log: [],
  };
}
