// Fältet under himlen: the open fields, and something always circling over them.
// By day the buzzard's shadow shows where it will strike; at night the eagle owl
// is only heard – and it hunts in the air, too.
import type { Animal, GameState, ZoneId } from '../types';
import type { EncounterDef } from './types';

export const RAPTOR: EncounterDef = {
  id: 'raptor',
  title: { day: 'Fältet under himlen', night: 'Fältet om natten' },
  crossed: 'nådde häcken',
  timeUp: {
    day: 'Kvällen kommer, och med den något annat på jakt. Vi kan inte stanna på fältet längre.',
    night: 'Gryningen kommer, och vråken vaknar. Vi kan inte stanna på fältet längre.',
  },
  leftBehind: { day: 'som blev kvar på fältet', night: 'som blev kvar på fältet i mörkret' },
  lastHour: {
    day: 'Solen står lågt över fälten. Det här är sista timmen.',
    night: 'Himlen ljusnar över fälten. Det här är nattens sista timme.',
  },
  maxTurn: 8,
  zones: [
    { id: 'akerrenen', label: 'Åkerrenen', name: 'åkerrenen', rect: [0, 76, 100, 24], start: true, cover: true },
    { id: 'fara1', label: 'Första fåran', name: 'första fåran', rect: [0, 46, 33, 30], coverFor: ['small'] },
    { id: 'fara2', label: 'Andra fåran', name: 'andra fåran', rect: [33, 46, 34, 30], coverFor: ['small'] },
    { id: 'fara3', label: 'Tredje fåran', name: 'tredje fåran', rect: [67, 46, 33, 30], coverFor: ['small'] },
    { id: 'faltet', label: 'Öppna fältet', name: 'öppna fältet', rect: [0, 24, 60, 22], exposed: true },
    { id: 'stenroset', label: 'Stenröset', name: 'stenröset', rect: [60, 24, 40, 22], coverFor: ['small', 'medium'] },
    { id: 'hacken', label: 'Häcken', name: 'häcken', rect: [0, 10, 100, 14], goal: true },
  ],
  // Up through a furrow, then over the open field or across the stones.
  edges: [
    ['akerrenen', 'fara2'],
    ['akerrenen', 'fara1'],
    ['akerrenen', 'fara3'],
    ['fara1', 'faltet'],
    ['fara2', 'faltet'],
    ['fara2', 'stenroset'],
    ['fara3', 'stenroset'],
    ['faltet', 'hacken'],
    ['stenroset', 'hacken'],
  ],
};

const zone = (id: ZoneId) => RAPTOR.zones.find((z) => z.id === id)!;
const SIZE_RANK: Record<Animal['size'], number> = { small: 0, medium: 1, large: 2 };

/** Hidden from the bird: in full cover, or in cover that fits our size – and not up in the air. */
export function sheltered(a: Animal): boolean {
  if (a.flying) return false;
  const z = zone(a.zone);
  return !!z.cover || !!z.coverFor?.includes(a.size);
}

/** Whom the bird can take where it strikes: the smallest of us without cover. The large it cannot lift. */
export function prey(s: GameState, z: ZoneId): Animal | undefined {
  return s.animals
    .filter((a) => a.status === 'active' && a.zone === z && a.size !== 'large' && !sheltered(a))
    .sort((a, b) => SIZE_RANK[a.size] - SIZE_RANK[b.size])[0];
}

/** Where the shadow may glide next: where it is, or one zone on. Never over the hedge or the field edge. */
export function shadowOptions(here: ZoneId | null): ZoneId[] {
  const huntable = RAPTOR.zones.filter((z) => !z.goal && !z.start).map((z) => z.id);
  if (!here) return huntable;
  const near = RAPTOR.edges.flatMap(([a, b]) => (a === here ? [b] : b === here ? [a] : []));
  return [here, ...near].filter((z) => huntable.includes(z));
}

/** How many of us stand exposed in a zone: what draws the bird. */
export function exposedIn(s: GameState, z: ZoneId): number {
  return s.animals.filter((a) => a.status === 'active' && a.zone === z && a.size !== 'large' && !sheltered(a)).length;
}
