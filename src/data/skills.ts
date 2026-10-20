// Each kind knows six things it can do: four that anyone of the kind may start with,
// and two that are learned on the way. Three are carried at a time: those are its cards.
import type { CardKind, Species } from '../engine/types';

export interface SkillSet {
  basic: CardKind[];
  advanced: CardKind[];
}

export const SKILLS: Record<Species, SkillSet> = {
  badger: { basic: ['bara', 'taEmot', 'trosta', 'gravaNer'], advanced: ['gamlesRost', 'staSomSten'] },
  toad: { basic: ['gamlaVagar', 'simma', 'lasaNatten', 'talamod'], advanced: ['lyssnaIMarken', 'giftIHuden'] },
  fox: { basic: ['snabbaTassar', 'smyga', 'gaForst', 'lockbete'], advanced: ['list', 'mattForStunden'] },
  owl: { basic: ['vingar', 'flyga', 'tystVinge', 'vaka'], advanced: ['ropINatten', 'baraLiten'] },
  adder: { basic: ['ringla', 'giftIReserv', 'gommaSig', 'hota'], advanced: ['varmaSig', 'omsaSkinn'] },
  mice: { basic: ['smaSteg', 'spridaSig', 'krypaIn', 'skratt'], advanced: ['baraIhop', 'mangaOgon'] },
  hare: { basic: ['sprang', 'hacka', 'frysaStilla', 'stampa'], advanced: ['lockaBort', 'vidoga'] },
};

/** How many skills an animal carries at once: its cards in the deck. */
export const LOADOUT = 3;

export const allSkills = (species: Species) => [...SKILLS[species].basic, ...SKILLS[species].advanced];
