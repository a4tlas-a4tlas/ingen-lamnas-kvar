// Gårdshundarna: a farm at dawn. Two dogs follow our scent; their barking
// wakes the farm, and then the farmer comes out with a flashlight.
import type { Dog, GameState, ZoneId } from '../types';
import type { EncounterDef } from './types';

export const FARM: EncounterDef = {
  id: 'farm',
  title: 'Gårdshundarna',
  crossed: 'tog sig över stenmuren',
  timeUp: 'Solen stod högt över gården. Vi kunde inte vänta längre.',
  leftBehind: 'som blev kvar på gården',
  night: false,
  maxTurn: 8,
  zones: [
    { id: 'snaret', label: 'Snåret', name: 'snåret', rect: [0, 77, 100, 23], start: true, cover: true },
    { id: 'hogtGras', label: 'Högt gräs', name: 'det höga gräset', rect: [0, 52, 34, 25], cover: true, breaksScent: true },
    { id: 'gardsplanen', label: 'Gårdsplanen', name: 'gårdsplanen', rect: [34, 40, 40, 37], exposed: true },
    { id: 'honshuset', label: 'Hönshuset', name: 'hönshuset', rect: [74, 55, 26, 22] },
    { id: 'backen', label: 'Bäcken', name: 'bäcken', rect: [0, 25, 34, 27], breaksScent: true },
    { id: 'godsel', label: 'Gödselstacken', name: 'gödselstacken', rect: [74, 25, 26, 30], breaksScent: true },
    { id: 'stenmuren', label: 'Stenmuren', name: 'stenmuren', rect: [0, 12, 100, 13], goal: true },
  ],
  edges: [
    ['snaret', 'gardsplanen'],
    ['snaret', 'hogtGras'],
    ['hogtGras', 'backen'],
    ['backen', 'stenmuren'],
    ['gardsplanen', 'godsel'],
    ['gardsplanen', 'honshuset'],
    ['godsel', 'stenmuren'],
  ],
};

export const KENNEL: ZoneId = 'gardsplanen';
export const HEN_HOUSE: ZoneId = 'honshuset';
export const ALARM_MAX = 5;
export const SCENT_MAX = 3;

export function newDogs(): Dog[] {
  return [
    { id: 'rapp', name: 'Rapp', zone: KENNEL, target: null },
    { id: 'tass', name: 'Tass', zone: KENNEL, target: null },
  ];
}

/** Zone-graph neighbours, any direction, ignoring size and fog: the dogs go anywhere on the farm. */
function adjacent(z: ZoneId): ZoneId[] {
  return FARM.edges.flatMap(([a, b]) => (a === z ? [b] : b === z ? [a] : []));
}

/** The shortest walk from one zone to another, as a list of zones after `from`. */
export function farmPath(from: ZoneId, to: ZoneId): ZoneId[] {
  const prev = new Map<ZoneId, ZoneId>();
  const seen = new Set([from]);
  let frontier = [from];
  while (frontier.length && !seen.has(to)) {
    const next: ZoneId[] = [];
    for (const z of frontier) for (const n of adjacent(z)) if (!seen.has(n)) { seen.add(n); prev.set(n, z); next.push(n); }
    frontier = next;
  }
  if (!seen.has(to)) return [];
  const path: ZoneId[] = [];
  for (let z = to; z !== from; z = prev.get(z)!) path.unshift(z);
  return path;
}

/** Where a dog ends the hour: two steps along the way to its target at most. */
export function dogDestination(dog: Dog): ZoneId {
  if (!dog.target) return dog.zone;
  const path = farmPath(dog.zone, dog.target);
  return path[Math.min(path.length, 2) - 1] ?? dog.zone;
}

/**
 * The dogs follow the strongest scent: the first dog the strongest, the second
 * the next strongest (or the same, if there is only one trail). No scent: they stay.
 */
export function dogTargets(s: GameState): (ZoneId | null)[] {
  const trails = Object.entries(s.scent)
    .filter(([z, v]) => v > 0 && z !== 'stenmuren')
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([z]) => z);
  return s.dogs.map((_, i) => trails[i] ?? trails[0] ?? null);
}
