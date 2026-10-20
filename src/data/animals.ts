// The animals are species, not characters. Every run, each of us is someone new
// of their kind: a name drawn from the species' names, traits rolled, and the
// cards their species knows.
import type { Size, Species, TraitId } from '../engine/types';

export interface SpeciesDef {
  species: Species;
  /** Swedish species word used in card footers and the memorial. */
  kindName: string;
  predator: boolean;
  size: Size;
  flier?: boolean;
  /** Toads swim: the current doesn't take them. */
  swimmer?: boolean;
  hunger?: number;
  belief: number;
  swarm?: number;
  /** Names one of this kind may have; a swarm's name is a family's. */
  names: string[];
}

export const SPECIES: Record<Species, SpeciesDef> = {
  badger: { species: 'badger', kindName: 'grävling', predator: false, size: 'large', belief: 8, names: ['Ljung', 'Mossa', 'Tuva', 'Gråbo', 'Stubbe', 'Ekro'] },
  toad: { species: 'toad', kindName: 'padda', predator: false, size: 'small', swimmer: true, belief: 7, names: ['Kvarn', 'Dy', 'Vass', 'Gyttja', 'Knott', 'Lera'] },
  fox: { species: 'fox', kindName: 'räv', predator: true, size: 'medium', belief: 5, names: ['Sotfot', 'Glöd', 'Rönn', 'Rost', 'Snabbe', 'Brand'] },
  owl: { species: 'owl', kindName: 'uggla', predator: true, size: 'medium', flier: true, belief: 4, names: ['Skymning', 'Gryning', 'Måne', 'Tyst', 'Vinge', 'Natt'] },
  adder: { species: 'adder', kindName: 'huggorm', predator: true, size: 'small', hunger: 2, belief: 4, names: ['Sicksack', 'Slinga', 'Fjäll', 'Ringel', 'Ormbunke', 'Sten'] },
  mice: { species: 'mice', kindName: 'musfamilj', predator: false, size: 'small', belief: 6, swarm: 6, names: ['Fröna', 'Smulorna', 'Kornen', 'Vipporna', 'Tussarna', 'Axen'] },
  hare: { species: 'hare', kindName: 'hare', predator: false, size: 'small', belief: 4, names: ['Tistel', 'Klöver', 'Ärta', 'Vind', 'Hassel', 'Språng'] },
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

/** The group that leaves the glen. Who they are is new every run. */
export const START_GROUP: Member[] = [
  { species: 'badger', elder: true },
  { species: 'toad', guide: true },
  { species: 'fox' },
  { species: 'owl' },
  { species: 'adder' },
  { species: 'mice' },
];

/** Starting bonds between kinds, -3..3. Pairs not listed start at 0. */
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
];

/** What one of a kind is called, given the names already among us. Drawn from its own stream of the seed. */
export function nameFor(species: Species, seed: number, taken: string[], elder = false): string {
  const names = SPECIES[species].names.filter((n) => !taken.some((t) => t.endsWith(n)));
  const pool = names.length ? names : SPECIES[species].names;
  let h = (seed ^ 0x51ed27) | 0;
  for (const ch of species) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193);
  const name = pool[(h >>> 0) % pool.length];
  return elder ? `Gamla ${name}` : name;
}
