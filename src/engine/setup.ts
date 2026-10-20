import { CAST_IDS, RANDOM_CAST, SPECIES, castDef, nameFor, startBond, type CastId, type Member } from '../data/animals';
import { LOADOUT, SKILLS } from '../data/skills';
import { BAD_TRAITS, GOOD_TRAITS } from '../data/traits';
import { pick, randInt, shuffle, type RngHolder } from './rng';
import { DALEN, type RegionDef } from '../data/regions/dalen';
import { generateRegion } from './regions';
import { ROAD } from './encounters/road';
import { bondKey } from './rules';
import { VERSES } from '../data/verses';
import type { Animal, Card, GameState, Journey, Species, Verse, VerseId, ZoneId } from './types';

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
  // One good and one bad, unless the place in the group already says.
  const fixed = member.traits ?? [];
  // Only a predator can be hungry for the others, and only a believer can start to doubt –
  // one who already stands below the line would begin the run hunting or bolting.
  const bad = BAD_TRAITS.filter((t) => (t !== 'hungrig' || def.predator) && (t !== 'tvivlande' || def.belief >= 5));
  const traits = fixed.length ? [...fixed] : [shuffle(h, [...GOOD_TRAITS])[0], shuffle(h, bad)[0]];
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
    belief: def.belief - (traits.includes('tvivlande') ? 1 : 0),
    injuries: [],
    grief: [],
    count: def.swarm,
    zone,
    status: 'active',
    intent: { kind: 'follow' },
    slowTime: 0,
    braced: false,
    flying: false,
    skills: [],
    loadout: [],
    xp: 0,
  };
  // Three of the kind's four first skills, carried from the start.
  animal.skills = shuffle(h, [...SKILLS[member.species].basic]).slice(0, LOADOUT);
  animal.loadout = [...animal.skills];
  const cards: Card[] = animal.loadout.map((kind) => ({ uid: nextUid(), kind, owner: id }));
  return { animal, cards };
}

/** An id for one more of a kind: the species itself, or numbered if we already have one. */
export function idFor(species: string, taken: string[]): string {
  if (!taken.includes(species)) return species;
  let n = 2;
  while (taken.includes(`${species}-${n}`)) n++;
  return `${species}-${n}`;
}

/** The kinds of the random group, drawn from its own stream of the seed so the other groups stay the same. */
export function rollCast(seed: number): Member[] {
  const h: RngHolder = { rng: (seed ^ 0x2c1b3a7) | 0 };
  const all = Object.keys(SPECIES) as Species[];
  const prey = all.filter((sp) => !SPECIES[sp].predator);
  const size = RANDOM_CAST.min + randInt(h, RANDOM_CAST.max - RANDOM_CAST.min + 1);
  const kinds: Species[] = shuffle(h, [...prey]).slice(0, RANDOM_CAST.minPrey);
  while (kinds.length < size) {
    const sp = pick(h, all);
    const ofKind = kinds.filter((k) => k === sp).length;
    const predators = kinds.filter((k) => SPECIES[k].predator).length;
    if (ofKind >= RANDOM_CAST.maxOfKind || (SPECIES[sp].predator && predators >= RANDOM_CAST.maxPredators)) continue;
    kinds.push(sp);
  }
  // The eldest is the one who believes most; the guide one of the prey who isn't the eldest.
  const elder = kinds.reduce((best, k, i) => (SPECIES[k].belief > SPECIES[kinds[best]].belief ? i : best), 0);
  const guides = kinds.map((_, i) => i).filter((i) => i !== elder && !SPECIES[kinds[i]].predator);
  const guide = pick(h, guides);
  const members = kinds.map((species, i): Member => ({ species, ...(i === elder ? { elder: true } : {}), ...(i === guide ? { guide: true } : {}) }));
  // Eldest first, guide second, the rest as drawn – the order we are shown in.
  return [members[elder], members[guide], ...members.filter((_, i) => i !== elder && i !== guide)];
}

/** Which kinds a group holds. */
export const castMembers = (seed: number, id: CastId): Member[] => (id === 'slumpad' ? rollCast(seed) : castDef(id).members);

export interface CastGroup {
  cast: CastId;
  animals: Animal[];
  draw: Card[];
  bonds: Record<string, number>;
  nextUid: number;
  /** The run's generator after the group was rolled. */
  rng: number;
}

/** Everyone in a group, as they would be this run: names, traits and skills rolled from the seed. */
export function buildCast(seed: number, cast: CastId): CastGroup {
  const h: RngHolder = { rng: seed };
  let uid = 1;
  const animals: Animal[] = [];
  const draw: Card[] = [];

  for (const m of castMembers(seed, cast)) {
    const id = idFor(m.species, animals.map((a) => a.id));
    const name = nameFor(m.species, seed, animals.map((a) => a.name), m.elder);
    const made = makeAnimal(m, id, name, h, () => uid++, ROAD.zones.find((z) => z.start)!.id);
    animals.push(made.animal);
    draw.push(...made.cards);
  }

  // Kinds that know each other start with the old bonds; two of a kind already belong together.
  const bonds: Record<string, number> = {};
  for (const [i, a] of animals.entries()) {
    for (const b of animals.slice(i + 1)) {
      const v = startBond(a.species, b.species);
      if (v) bonds[bondKey(a.id, b.id)] = v;
    }
  }
  return { cast, animals, draw, bonds, nextUid: uid, rng: h.rng };
}

/** The groups we may choose between before the oath. */
export const castOffers = (seed: number): CastGroup[] => CAST_IDS.map((id) => buildCast(seed, id));

export function createGame(seed: number): GameState {
  const { cast, animals, draw, bonds, nextUid, rng } = buildCast(seed, 'dalensSista');

  return {
    version: 20,
    cast,
    journey: firstRegion(seed),
    variant: 'normal',
    time: 'night',
    clock: 'night',
    unmourned: [],
    encounterId: 'road',
    seed,
    rng,
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
    nextUid,
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
    warded: [],
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
