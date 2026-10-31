// Jägaren: the forest edge, and the last of the way. A hunter stands where the trees
// begin and watches part of the clearing each hour – we can read where. Whoever stands
// in the open where he looks is shot. Behind us comes his dog, nose to the ground,
// following our scent; where it finds us it barks, and next hour the hunter looks there –
// into cover too, for now he knows. Water breaks the scent, and a fox or an owl can draw
// the dog away. Beyond the hunter: the forest.
import { random, type RngHolder } from '../rng';
import type { Dog, GameState, ZoneId } from '../types';
import type { EncounterDef } from './types';

export const HUNT: EncounterDef = {
  id: 'hunt',
  title: { day: 'Jägaren', night: 'Jägaren' },
  fixedTime: 'day',
  crossed: 'nådde skogen',
  timeUp: {
    day: 'Fler jägare kommer genom hygget. Det är för sent att vänta på någon mer.',
    night: 'Fler jägare kommer genom hygget. Det är för sent att vänta på någon mer.',
  },
  leftBehind: { day: 'som blev kvar på hygget', night: 'som blev kvar på hygget' },
  lastHour: {
    day: 'Det här är sista timmen. Skogen är nära.',
    night: 'Det här är sista timmen. Skogen är nära.',
  },
  maxTurn: 6,
  zones: [
    { id: 'vagkanten', label: 'Vägkanten', name: 'vägkanten', rect: [0, 80, 100, 20], start: true },
    { id: 'ormbunkarna', label: 'Ormbunkarna', name: 'ormbunkarna', rect: [0, 58, 34, 22], cover: true },
    { id: 'kalytan', label: 'Kalhygget', name: 'kalhygget', rect: [34, 58, 32, 22], exposed: true },
    { id: 'stenroset', label: 'Stenröset', name: 'stenröset', rect: [66, 58, 34, 22], cover: true },
    { id: 'granplanteringen', label: 'Granplanteringen', name: 'granplanteringen', rect: [0, 36, 34, 22], cover: true },
    { id: 'stigen', label: 'Stigen', name: 'stigen', rect: [34, 36, 32, 22], exposed: true },
    { id: 'backen', label: 'Bäcken', name: 'bäcken', rect: [66, 36, 34, 22], water: true, breaksScent: true },
    { id: 'vindfallet', label: 'Vindfället', name: 'vindfället', rect: [0, 14, 34, 22] },
    { id: 'glantan', label: 'Gläntan', name: 'gläntan', rect: [34, 14, 32, 22], exposed: true },
    { id: 'mossbacken', label: 'Mossbacken', name: 'mossbacken', rect: [66, 14, 34, 22] },
    { id: 'skogen', label: 'Skogen', name: 'skogen', rect: [0, 0, 100, 14], goal: true },
  ],
  // Across the clearing to the forest – and along each row.
  edges: [
    ['vagkanten', 'kalytan'],
    ['vagkanten', 'ormbunkarna'],
    ['vagkanten', 'stenroset'],
    ['ormbunkarna', 'granplanteringen'],
    ['kalytan', 'stigen'],
    ['stenroset', 'backen'],
    ['ormbunkarna', 'kalytan'],
    ['kalytan', 'stenroset'],
    ['granplanteringen', 'vindfallet'],
    ['stigen', 'glantan'],
    ['backen', 'mossbacken'],
    ['granplanteringen', 'stigen'],
    ['stigen', 'backen'],
    ['vindfallet', 'glantan'],
    ['glantan', 'mossbacken'],
    ['vindfallet', 'skogen'],
    ['glantan', 'skogen'],
    ['mossbacken', 'skogen'],
  ],
};

/** The hunt's rows and columns: where the hunter's eyes can sweep in an hour. */
export const ROWS: ZoneId[][] = [['ormbunkarna', 'kalytan', 'stenroset'], ['granplanteringen', 'stigen', 'backen'], ['vindfallet', 'glantan', 'mossbacken']];
export const COLUMNS: ZoneId[][] = [0, 1, 2].map((i) => ROWS.map((r) => r[i]));
const LINES = [...ROWS, ...COLUMNS];

/** Where the hunter looks, hour by hour: a row and a column at once. Never the same line twice running. */
export function planHunt(h: RngHolder, maxTurn: number): ZoneId[][] {
  const out: ZoneId[][] = [];
  let last = -1;
  for (let i = 0; i < maxTurn; i++) {
    let k = Math.floor(random(h) * LINES.length);
    if (k === last) k = (k + 1) % LINES.length;
    last = k;
    const line = LINES[k];
    const other = k < 3 ? COLUMNS[Math.floor(random(h) * 3)] : ROWS[Math.floor(random(h) * 3)];
    out.push([...new Set([...line, ...other])]);
  }
  return out;
}

/** Where the hunter might look instead, hour by hour: another row and column – we see him turn, but not which way. */
export function planHuntFeint(h: RngHolder, plan: ZoneId[][]): ZoneId[][] {
  return plan.map((real) => {
    const key = [...real].sort().join();
    const crosses = ROWS.flatMap((r) => COLUMNS.map((c) => [...new Set([...r, ...c])])).filter((x) => [...x].sort().join() !== key);
    return crosses[Math.floor(random(h) * crosses.length)];
  });
}

/** The hunter's dogs: one, or two with a hunting party. They start at the road, behind us. */
export const huntDogs = (hard: boolean): Dog[] => [
  { id: 'fylax', name: 'Fylax', zone: 'vagkanten', target: null },
  ...(hard ? [{ id: 'tora', name: 'Tora', zone: 'vagkanten', target: null }] : []),
];

/** Where the hunter looks this hour (or another): his plan, and wherever a dog barked the hour before. */
export const watched = (s: GameState, turn = s.turn): ZoneId[] =>
  s.encounterId === 'hunt' ? [...new Set([...(s.hunt.plan[turn - 1] ?? []), ...(turn === s.turn ? s.hunt.barked : [])])] : [];

function adjacent(z: ZoneId): ZoneId[] {
  return HUNT.edges.flatMap(([a, b]) => (a === z ? [b] : b === z ? [a] : []));
}

/** Where a dog ends the hour: up to two steps along the shortest way to its target. */
export function huntDogDestination(dog: Dog): ZoneId {
  if (!dog.target || dog.target === dog.zone) return dog.zone;
  const prev = new Map<ZoneId, ZoneId>();
  const seen = new Set([dog.zone]);
  let frontier = [dog.zone];
  while (frontier.length && !seen.has(dog.target)) {
    const next: ZoneId[] = [];
    for (const z of frontier) for (const n of adjacent(z)) if (!seen.has(n) && n !== 'skogen') { seen.add(n); prev.set(n, z); next.push(n); }
    frontier = next;
  }
  if (!seen.has(dog.target)) return dog.zone;
  const path: ZoneId[] = [];
  for (let z = dog.target; z !== dog.zone; z = prev.get(z)!) path.unshift(z);
  return path[Math.min(path.length, 2) - 1] ?? dog.zone;
}

/** The dogs follow the strongest scent – the first dog the strongest, the second the next. */
export function huntDogTargets(s: GameState): (ZoneId | null)[] {
  const trails = Object.entries(s.scent)
    .filter(([z, v]) => v > 0 && z !== 'skogen')
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([z]) => z);
  return s.dogs.map((_, i) => trails[i] ?? trails[0] ?? null);
}
