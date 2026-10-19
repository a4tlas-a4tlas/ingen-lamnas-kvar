import { SPECIES, START_BONDS, START_GROUP, nameFor, type Member } from '../data/animals';
import { TRAITS, TRAIT_IDS } from '../data/traits';
import { shuffle, type RngHolder } from './rng';
import { DALEN, type RegionDef } from '../data/regions/dalen';
import { generateRegion } from './regions';
import { ROAD } from './encounters/road';
import { bondKey } from './rules';
import { VERSES } from '../data/verses';
import type { Animal, Card, GameState, Journey, Verse, VerseId, ZoneId } from './types';

/** We swear a single verse in the glen; later verses come from the journey. */
export const OATH_VERSES = 1;

export function oathVerse(id: VerseId): Verse {
  return { id, kind: 'oath', base: id, text: VERSES[id].text, flippedText: VERSES[id].flippedText, flipped: false };
}

/**
 * A region's map, with what each place really is and what Kvarn remembers.
 * Drawn from its own stream of the seed, so the rest of the run plays out the same.
 */
export function regionJourney(def: RegionDef, seed: number): Journey {
  const map = generateRegion(def, seed);
  const start = def.start.key;
  return { region: def.id, nodes: map.nodes, at: start, visited: [start], truth: map.truth, guess: map.guess, scouted: [] };
}

export const firstRegion = (seed: number) => regionJourney(DALEN, seed);

/** Someone of a kind: species card plus two traits (fixed ones first, the rest rolled), and their cards. */
export function makeAnimal(member: Member, id: string, name: string, h: RngHolder, nextUid: () => number, zone: ZoneId): { animal: Animal; cards: Card[] } {
  const def = SPECIES[member.species];
  const fixed = member.traits ?? [];
  const traits = [...fixed, ...shuffle(h, TRAIT_IDS.filter((t) => !fixed.includes(t)))].slice(0, 2);
  const animal: Animal = {
    id,
    name,
    species: def.species,
    predator: def.predator,
    elder: member.elder ?? false,
    guide: member.guide ?? false,
    size: def.size,
    flier: def.flier ?? false,
    swimmer: def.swimmer ?? false,
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
  const cards: Card[] = [{ uid: nextUid(), kind: def.speciesCard, owner: id }];
  for (const t of traits) cards.push({ uid: nextUid(), kind: TRAITS[t].card, owner: id });
  return { animal, cards };
}

/** An id for one more of a kind: the species itself, or numbered if we already have one. */
export function idFor(species: string, taken: string[]): string {
  if (!taken.includes(species)) return species;
  let n = 2;
  while (taken.includes(`${species}-${n}`)) n++;
  return `${species}-${n}`;
}

export function createGame(seed: number): GameState {
  const h: RngHolder = { rng: seed };
  let uid = 1;
  const animals: Animal[] = [];
  const draw: Card[] = [];

  for (const m of START_GROUP) {
    const id = idFor(m.species, animals.map((a) => a.id));
    const name = nameFor(m.species, seed, animals.map((a) => a.name), m.elder);
    const made = makeAnimal(m, id, name, h, () => uid++, ROAD.zones.find((z) => z.start)!.id);
    animals.push(made.animal);
    draw.push(...made.cards);
  }

  // Kinds that know each other: the first of each kind carries the old bonds.
  const bonds: Record<string, number> = {};
  for (const [a, b, v] of START_BONDS) if (animals.some((x) => x.id === a) && animals.some((x) => x.id === b)) bonds[bondKey(a, b)] = v;

  return {
    version: 16,
    journey: firstRegion(seed),
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
    fellPlan: [],
    dozePlan: [],
    raptors: [],
    rescue: null,
    met: [],
    knowledge: [],
    run: { regions: ['dalen'], offered: [], between: false },
    meeting: null,
    proposal: null,
    fireDebt: { embers: 0, apart: [], dark: [] },
    peekNext: false,
    darkRevealed: false,
    hitQueue: [],
    log: [],
  };
}
