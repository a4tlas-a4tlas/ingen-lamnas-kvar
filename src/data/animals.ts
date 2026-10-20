// The animals are species, not characters. Every run, each of us is someone new
// of their kind: a name drawn from the species' names, traits rolled, and the
// cards their species knows.
import type { CastId, Size, Species, TraitId } from '../engine/types';
export type { CastId };

export interface SpeciesDef {
  species: Species;
  /** Swedish species word used in card footers and the memorial. */
  kindName: string;
  predator: boolean;
  size: Size;
  flier?: boolean;
  /** Toads swim: the current doesn't take them. */
  swimmer?: boolean;
  /** Hares and fawns: led two steps at once, and quick to bolt. */
  fast?: boolean;
  /** Swedish grammar for the lines that speak of one of this kind: "en hare", "den", "haren". */
  en: 'en' | 'ett';
  den: 'den' | 'det';
  definite: string;
  hunger?: number;
  belief: number;
  swarm?: number;
  /** Names one of this kind may have; a swarm's name is a family's. */
  names: string[];
}

export const SPECIES: Record<Species, SpeciesDef> = {
  badger: { species: 'badger', kindName: 'grävling', en: 'en', den: 'den', definite: 'grävlingen', predator: false, size: 'large', belief: 8, names: ['Ljung', 'Mossa', 'Tuva', 'Gråbo', 'Stubbe', 'Ekro'] },
  toad: { species: 'toad', kindName: 'padda', en: 'en', den: 'den', definite: 'paddan', predator: false, size: 'small', swimmer: true, belief: 7, names: ['Kvarn', 'Dy', 'Vass', 'Gyttja', 'Knott', 'Lera'] },
  fox: { species: 'fox', kindName: 'räv', en: 'en', den: 'den', definite: 'räven', predator: true, size: 'medium', belief: 5, names: ['Sotfot', 'Glöd', 'Rönn', 'Rost', 'Snabbe', 'Brand'] },
  owl: { species: 'owl', kindName: 'uggla', en: 'en', den: 'den', definite: 'ugglan', predator: true, size: 'medium', flier: true, belief: 4, names: ['Skymning', 'Gryning', 'Måne', 'Tyst', 'Vinge', 'Natt'] },
  adder: { species: 'adder', kindName: 'huggorm', en: 'en', den: 'den', definite: 'huggormen', predator: true, size: 'small', hunger: 2, belief: 4, names: ['Sicksack', 'Slinga', 'Fjäll', 'Ringel', 'Ormbunke', 'Sten'] },
  mice: { species: 'mice', kindName: 'musfamilj', en: 'en', den: 'den', definite: 'musfamiljen', predator: false, size: 'small', belief: 6, swarm: 6, names: ['Fröna', 'Smulorna', 'Kornen', 'Vipporna', 'Tussarna', 'Axen'] },
  hare: { species: 'hare', kindName: 'hare', en: 'en', den: 'den', definite: 'haren', predator: false, size: 'small', fast: true, belief: 4, names: ['Tistel', 'Klöver', 'Ärta', 'Vind', 'Hassel', 'Språng'] },
  hedgehog: { species: 'hedgehog', kindName: 'igelkott', en: 'en', den: 'den', definite: 'igelkotten', predator: false, size: 'small', belief: 6, names: ['Borre', 'Nypon', 'Sticka', 'Tagg', 'Hassla', 'Ljungbo'] },
  squirrel: { species: 'squirrel', kindName: 'ekorre', en: 'en', den: 'den', definite: 'ekorren', predator: false, size: 'small', belief: 5, names: ['Kotte', 'Rödpäls', 'Kvist', 'Nötta', 'Gran', 'Tofs'] },
  mole: { species: 'mole', kindName: 'mullvad', en: 'en', den: 'den', definite: 'mullvaden', predator: false, size: 'small', belief: 6, names: ['Mull', 'Sammet', 'Rot', 'Torva', 'Mörker', 'Grus'] },
  beaver: { species: 'beaver', kindName: 'bäver', en: 'en', den: 'den', definite: 'bävern', predator: false, size: 'large', swimmer: true, belief: 7, names: ['Bark', 'Spån', 'Al', 'Flotte', 'Ek', 'Vide'] },
  fawn: { species: 'fawn', kindName: 'rådjurskid', en: 'ett', den: 'det', definite: 'rådjurskidet', predator: false, size: 'medium', fast: true, belief: 4, names: ['Fläcka', 'Dagg', 'Vitsvans', 'Löv', 'Mjuka', 'Ljus'] },
};

/** A place in a group: what kind it is, and the part it plays among us. */
export interface Member {
  species: Species;
  /** The eldest: the one we listen to. Called "Gamla …". */
  elder?: boolean;
  /** The one who remembers the way: Kvarn's map is the guide's. */
  guide?: boolean;
  /** Traits it always has; the rest are rolled. */
  traits?: TraitId[];
}

/** A group that could leave the glen: which kinds, and who is eldest and guide. Who they are is new every run. */
export interface CastDef {
  id: CastId;
  name: string;
  line: string;
  /** Empty for the random one: its kinds are drawn from the run's seed. */
  members: Member[];
}

/** The groups we choose between before the oath, like the casts of a story told many ways. */
export const CASTS: CastDef[] = [
  {
    id: 'dalensSista',
    name: 'Dalens sista',
    line: 'De som alltid funnits i dalen.',
    members: [
      { species: 'badger', elder: true },
      { species: 'toad', guide: true },
      { species: 'fox' },
      { species: 'owl' },
      { species: 'adder' },
      { species: 'mice' },
    ],
  },
  {
    id: 'rovdjurensPakt',
    name: 'Rovdjurens pakt',
    line: 'Fyra som kunde äta de andra – om de glömde eden.',
    members: [
      { species: 'fox', elder: true },
      { species: 'toad', guide: true },
      { species: 'fox' },
      { species: 'owl' },
      { species: 'adder' },
      { species: 'mice' },
    ],
  },
  {
    id: 'deSma',
    name: 'De små',
    line: 'Många att bära, och bara en som bär.',
    members: [
      { species: 'badger', elder: true },
      { species: 'toad', guide: true },
      { species: 'mice' },
      { species: 'mice' },
      { species: 'hare' },
    ],
  },
  { id: 'slumpad', name: 'Slumpad', line: 'Vilka som helst – den här gången just dessa.', members: [] },
];

export const CAST_IDS = CASTS.map((c) => c.id);
export const castDef = (id: CastId) => CASTS.find((c) => c.id === id)!;

/** The group that leaves the glen unless we choose another. */
export const START_GROUP: Member[] = CASTS[0].members;

/** The random group: never more than three predators, at least two prey, at most two of a kind. */
export const RANDOM_CAST = { min: 5, max: 6, maxPredators: 3, minPrey: 2, maxOfKind: 2 };

/** Starting bonds between kinds, -3..3. Pairs not listed start at 0; two of the same kind start at 1. */
export const START_BONDS: [Species, Species, number][] = [
  ['badger', 'mice', 2],
  ['badger', 'toad', 2],
  ['badger', 'fox', 1],
  ['badger', 'owl', 1],
  ['toad', 'mice', 1],
  ['toad', 'owl', 1],
  ['fox', 'owl', 1],
  ['fox', 'mice', -1],
  ['owl', 'mice', -2],
  ['adder', 'mice', -2],
  ['adder', 'toad', -1],
  ['adder', 'badger', 1],
  ['hedgehog', 'adder', -2],
  ['hedgehog', 'badger', 1],
  ['squirrel', 'owl', -1],
  ['squirrel', 'mice', 1],
  ['mole', 'badger', 1],
  ['mole', 'toad', 1],
  ['beaver', 'toad', 2],
  ['beaver', 'badger', 1],
  ['fawn', 'fox', -1],
  ['fawn', 'hare', 1],
  ['fawn', 'badger', 1],
];

export const SAME_KIND_BOND = 1;

/** The bond two kinds start with. */
export function startBond(a: Species, b: Species): number {
  if (a === b) return SAME_KIND_BOND;
  return START_BONDS.find(([x, y]) => (x === a && y === b) || (x === b && y === a))?.[2] ?? 0;
}

/** What one of a kind is called, given the names already among us. Drawn from its own stream of the seed. */
export function nameFor(species: Species, seed: number, taken: string[], elder = false): string {
  const names = SPECIES[species].names.filter((n) => !taken.some((t) => t.endsWith(n)));
  const pool = names.length ? names : SPECIES[species].names;
  let h = (seed ^ 0x51ed27) | 0;
  for (const ch of species) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193);
  const name = pool[(h >>> 0) % pool.length];
  return elder ? `Gamla ${name}` : name;
}
