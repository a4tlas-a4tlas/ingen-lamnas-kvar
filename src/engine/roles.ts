// The parts we play among us, now that no one is a fixed character: the one of a
// kind, the eldest, the one who remembers the way, the one who can fly, the
// hungriest predator. Story, promises and voices speak to roles, not to names.
import { SPECIES } from '../data/animals';
import { canFly, huntsAt, isPresent } from './rules';
import type { Animal, GameState, Species } from './types';

/** The first of a kind who is still with us. */
export const kin = (s: GameState, species: Species): Animal | undefined => s.animals.find((a) => a.species === species && isPresent(a));
export const kinId = (species: Species) => (s: GameState) => kin(s, species)?.id;

/** The one who remembers the way – whether still with us or not: the map is their memory. */
export const guide = (s: GameState): Animal | undefined => s.animals.find((a) => a.guide);
export const guideHere = (s: GameState): Animal | undefined => { const g = guide(s); return g && isPresent(g) ? g : undefined; };
export const guideName = (s: GameState) => guide(s)?.name ?? 'Vägvisaren';
/** What kind the guide is, for those who speak of it: "er padda". */
export const guideKind = (s: GameState) => { const g = guide(s); return g ? SPECIES[g.species].kindName : 'vägvisare'; };

/** The eldest, if still with us. */
export const elder = (s: GameState): Animal | undefined => s.animals.find((a) => a.elder && isPresent(a));
export const elderId = (s: GameState) => elder(s)?.id;

/** One of us who can fly right now. */
export const flier = (s: GameState): Animal | undefined => s.animals.find((a) => isPresent(a) && canFly(a));
export const flierId = (s: GameState) => flier(s)?.id;

/** The predator closest to forgetting the oath, if any is close. */
export function hungry(s: GameState): Animal | undefined {
  return s.animals
    .filter((a) => a.predator && isPresent(a) && a.belief <= huntsAt(s, a) + 2)
    .sort((a, b) => a.belief - huntsAt(s, a) - (b.belief - huntsAt(s, b)))[0];
}
export const hungryId = (s: GameState) => hungry(s)?.id;

/** Someone's name, or a fallback when they are gone or never were. */
export const nameOf = (s: GameState, id?: string, fallback = 'någon') => s.animals.find((a) => a.id === id)?.name ?? fallback;
