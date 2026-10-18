import { CAST, START_BONDS, type AnimalDef } from '../data/animals';
import { TRAITS, TRAIT_IDS } from '../data/traits';
import { random, shuffle, type RngHolder } from './rng';
import { PLACES, START_PLACE } from '../data/journey';
import { ROAD } from './encounters/road';
import { bondKey } from './rules';
import { VERSES } from '../data/verses';
import type { Animal, Card, GameState, Journey, Variant, Verse, VerseId, ZoneId } from './types';

/** We swear a single verse in the glen; later verses come from the journey. */
export const OATH_VERSES = 1;

export function oathVerse(id: VerseId): Verse {
  return { id, kind: 'oath', base: id, text: VERSES[id].text, flippedText: VERSES[id].flippedText, flipped: false };
}

/**
 * What each place really is, and what Kvarn remembers. Rolled from its own stream of
 * the seed, so the rest of the run plays out the same whatever the fog holds.
 */
export function rollMemory(seed: number): Pick<Journey, 'truth' | 'guess' | 'scouted'> {
  const h: RngHolder = { rng: (seed ^ 0x5bd1e995) | 0 };
  const truth: Record<string, Variant> = {};
  const guess: Record<string, Variant> = {};
  for (const p of PLACES.filter((x) => x.memory)) {
    truth[p.id] = random(h) < 0.4 ? 'hard' : 'normal';
    guess[p.id] = random(h) < 2 / 3 ? truth[p.id] : truth[p.id] === 'hard' ? 'normal' : 'hard';
  }
  return { truth, guess, scouted: [] };
}

/** An animal from its definition: species card plus two traits (fixed ones first, the rest rolled), and their cards. */
export function makeAnimal(def: AnimalDef, h: RngHolder, nextUid: () => number, zone: ZoneId): { animal: Animal; cards: Card[] } {
  const fixed = def.traits ?? [];
  const traits = [...fixed, ...shuffle(h, TRAIT_IDS.filter((t) => !fixed.includes(t)))].slice(0, 2);
  const animal: Animal = {
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
    zone,
    status: 'active',
    intent: { kind: 'follow' },
    slowTime: 0,
    braced: false,
    flying: false,
  };
  const cards: Card[] = [{ uid: nextUid(), kind: def.speciesCard, owner: def.id }];
  for (const t of traits) cards.push({ uid: nextUid(), kind: TRAITS[t].card, owner: def.id });
  return { animal, cards };
}

export function createGame(seed: number): GameState {
  const h: RngHolder = { rng: seed };
  let uid = 1;
  const animals: Animal[] = [];
  const draw: Card[] = [];

  for (const def of CAST) {
    const made = makeAnimal(def, h, () => uid++, ROAD.zones.find((z) => z.start)!.id);
    animals.push(made.animal);
    draw.push(...made.cards);
  }

  const bonds: Record<string, number> = {};
  for (const [a, b, v] of START_BONDS) bonds[bondKey(a, b)] = v;

  return {
    version: 9,
    journey: { at: START_PLACE, visited: [START_PLACE], ...rollMemory(seed) },
    variant: 'normal',
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
    rescue: null,
    met: [],
    meeting: null,
    fireDebt: { embers: 0, apart: [], dark: [] },
    peekNext: false,
    darkRevealed: false,
    hitQueue: [],
    log: [],
  };
}
