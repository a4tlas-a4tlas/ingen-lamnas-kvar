import type { CardKind, Size, Species } from '../engine/types';

export interface AnimalDef {
  id: string;
  name: string;
  species: Species;
  /** Swedish species word used in card footers and the memorial. */
  kindName: string;
  predator: boolean;
  size: Size;
  flier?: boolean;
  hunger?: number;
  elder?: boolean;
  belief: number;
  swarm?: number;
  speciesCard: CardKind;
}

// Placeholder cast for the first slice. Roles are not fixed: each animal
// gets two random personality traits on top of its species card.
export const CAST: AnimalDef[] = [
  { id: 'ljung', name: 'Gamla Ljung', species: 'badger', kindName: 'grävling', predator: false, size: 'large', elder: true, belief: 8, speciesCard: 'bara' },
  { id: 'kvarn', name: 'Kvarn', species: 'toad', kindName: 'padda', predator: false, size: 'small', belief: 7, speciesCard: 'gamlaVagar' },
  { id: 'sotfot', name: 'Sotfot', species: 'fox', kindName: 'räv', predator: true, size: 'medium', belief: 5, speciesCard: 'snabbaTassar' },
  { id: 'skymning', name: 'Skymning', species: 'owl', kindName: 'uggla', predator: true, size: 'medium', flier: true, belief: 4, speciesCard: 'vingar' },
  { id: 'sicksack', name: 'Sicksack', species: 'adder', kindName: 'huggorm', predator: true, size: 'small', hunger: 2, belief: 4, speciesCard: 'giftIReserv' },
  { id: 'frona', name: 'Fröna', species: 'mice', kindName: 'musfamilj', predator: false, size: 'small', belief: 6, swarm: 6, speciesCard: 'smaSteg' },
];

/** Starting bonds, -3..3. Pairs not listed start at 0. */
export const START_BONDS: [string, string, number][] = [
  ['ljung', 'frona', 2],
  ['ljung', 'kvarn', 2],
  ['ljung', 'sotfot', 1],
  ['ljung', 'skymning', 1],
  ['kvarn', 'frona', 1],
  ['kvarn', 'skymning', 1],
  ['sotfot', 'skymning', 1],
  ['sotfot', 'frona', -1],
  ['skymning', 'frona', -2],
  ['sicksack', 'frona', -2],
  ['sicksack', 'kvarn', -1],
  ['sicksack', 'ljung', 1],
];
