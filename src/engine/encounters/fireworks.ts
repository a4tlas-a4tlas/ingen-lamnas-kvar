// Fyrverkerinatten – Stadens sista natt: the boss of the city. New Year's Eve in the city
// park, and we must cross it to the railway embankment beyond. Nothing here hunts us. The
// danger is fear itself: every bang drives us away from where it burst, and people fill
// the paths. Those who hold each other stand; cover dulls the noise; comfort reaches all
// who stand together. At midnight the whole sky goes up at once.
import { random, type RngHolder } from '../rng';
import type { Animal, GameState, ZoneId } from '../types';
import type { EncounterDef } from './types';

export const FIREWORKS: EncounterDef = {
  id: 'fireworks',
  title: { day: 'Fyrverkerinatten', night: 'Fyrverkerinatten' },
  fixedTime: 'night',
  crossed: 'nådde banvallen',
  timeUp: {
    day: 'Midnatt. Hela himlen brinner, och ingen av oss kan tänka längre. Vi kan inte stanna i parken.',
    night: 'Midnatt. Hela himlen brinner, och ingen av oss kan tänka längre. Vi kan inte stanna i parken.',
  },
  leftBehind: { day: 'som blev kvar i parken när det small', night: 'som blev kvar i parken när det small' },
  lastHour: {
    day: 'Folk räknar ner. Det här är sista timmen – midnatt.',
    night: 'Folk räknar ner. Det här är sista timmen – midnatt.',
  },
  maxTurn: 5,
  zones: [
    { id: 'parkgrinden', label: 'Parkgrinden', name: 'parkgrinden', rect: [0, 80, 100, 20], start: true, cover: true },
    { id: 'buskarna', label: 'Buskarna', name: 'buskarna', rect: [0, 52, 34, 28], cover: true },
    { id: 'gangen', label: 'Gången', name: 'gången', rect: [34, 52, 32, 28], exposed: true },
    { id: 'dammen', label: 'Dammen', name: 'dammen', rect: [66, 52, 34, 28], water: true },
    { id: 'paviljongen', label: 'Musikpaviljongen', name: 'musikpaviljongen', rect: [0, 24, 34, 28], cover: true },
    { id: 'grasplanen', label: 'Gräsplanen', name: 'gräsplanen', rect: [34, 24, 32, 28], exposed: true },
    { id: 'lekplatsen', label: 'Lekplatsen', name: 'lekplatsen', rect: [66, 24, 34, 28] },
    { id: 'banvallen', label: 'Banvallen', name: 'banvallen', rect: [0, 6, 100, 18], goal: true },
  ],
  // Through the park to the embankment – and across it, away from the bangs.
  edges: [
    ['parkgrinden', 'gangen'],
    ['parkgrinden', 'buskarna'],
    ['parkgrinden', 'dammen'],
    ['buskarna', 'paviljongen'],
    ['gangen', 'grasplanen'],
    ['dammen', 'lekplatsen'],
    ['buskarna', 'gangen'],
    ['gangen', 'dammen'],
    ['paviljongen', 'grasplanen'],
    ['grasplanen', 'lekplatsen'],
    ['paviljongen', 'banvallen'],
    ['grasplanen', 'banvallen'],
    ['lekplatsen', 'banvallen'],
  ],
};

/** The park itself, where the rockets fall and the people walk: two rows of three. */
export const PARK: ZoneId[] = ['buskarna', 'gangen', 'dammen', 'paviljongen', 'grasplanen', 'lekplatsen'];

export interface Burst {
  zone: ZoneId;
  /** 1: only where it bursts. 2: there and the zones beside it. */
  strength: 1 | 2;
}

const pick = <T>(h: RngHolder, xs: T[]): T => xs[Math.floor(random(h) * xs.length)];

/** Steps between two zones of the park, along a row or across to the other; the gate and the embankment are one step from their row. */
export function parkDistance(a: ZoneId, b: ZoneId): number {
  const pos = (z: ZoneId): [number, number] => {
    const i = PARK.indexOf(z);
    if (i >= 0) return [Math.floor(i / 3) + 1, i % 3];
    return [z === 'banvallen' ? 3 : 0, 1];
  };
  const [ra, ca] = pos(a);
  const [rb, cb] = pos(b);
  if (ra === 0 || ra === 3 || rb === 0 || rb === 3) return Math.abs(ra - rb);
  return Math.abs(ra - rb) + Math.abs(ca - cb);
}

/** The night's bursts, hour by hour: one each hour, three heavy ones at midnight – and from the fourth hour one more when the whole city fires. */
export function planBursts(h: RngHolder, maxTurn: number, hard: boolean): Burst[][] {
  return Array.from({ length: maxTurn }, (_, i) => {
    const hour = i + 1;
    const midnight = hour === maxTurn;
    const n = (midnight ? 3 : 1) + (hard && hour >= 4 ? 1 : 0);
    const pool = [...PARK];
    return Array.from({ length: Math.min(n, pool.length) }, () => ({
      zone: pool.splice(Math.floor(random(h) * pool.length), 1)[0],
      strength: (midnight || (hour >= 2 && random(h) < 0.5) ? 2 : 1) as 1 | 2,
    }));
  });
}

/** Where the people walk each hour: one zone of the park, never the same twice running. */
export function planCrowd(h: RngHolder, maxTurn: number): ZoneId[] {
  const out: ZoneId[] = [];
  for (let i = 0; i < maxTurn; i++) out.push(pick(h, PARK.filter((z) => z !== out[i - 1])));
  return out;
}

/** This hour's bursts. */
export const burstsNow = (s: GameState): Burst[] => s.fireworks.plan[s.turn - 1] ?? [];
/** Where the people walk this hour – unless it is the hour the child's family stepped aside for us. */
export const crowdNow = (s: GameState): ZoneId | null => (s.fireworks.childHour === s.turn ? null : s.fireworks.crowdPlan[s.turn - 1] ?? null);

/** Does this burst reach a zone? Cover dulls it: there, only a burst right overhead. */
export function reaches(b: Burst, z: ZoneId): boolean {
  const cover = !!FIREWORKS.zones.find((d) => d.id === z)?.cover;
  const d = parkDistance(b.zone, z);
  return d === 0 || (!cover && b.strength === 2 && d === 1);
}

/** One of ours that this one holds on to: bond 2 or more, in the same place. Neither of them is driven off. */
export function holdsWith(s: GameState, a: Animal, zoneOf: (x: Animal) => ZoneId = (x) => x.zone): Animal | undefined {
  return s.animals.find((o) => o !== a && o.status === 'active' && zoneOf(o) === zoneOf(a) && (s.bonds[[a.id, o.id].sort().join('|')] ?? 0) >= 2);
}

/** Where a bang drives one of us: a neighbouring zone farther from the burst – never the embankment, never where the people are. */
export function pushOptions(s: GameState, b: Burst, from: ZoneId, neighbours: ZoneId[]): ZoneId[] {
  const here = parkDistance(b.zone, from);
  return neighbours.filter((z) => z !== 'banvallen' && z !== crowdNow(s) && (here === 0 || parkDistance(b.zone, z) > here));
}
