// Stormen: the open heath above the tree line, in a hard wind. Each hour the gusts cross
// a row of the heath – we see where, and where next. Whoever stands in the open there
// when the hour goes is chilled through: their belief sinks, and the small are shaken.
// One boulder, hollow or cairn in each row gives shelter. Nothing here kills – but the
// cold gets into the will. When the wind comes in squalls, two rows are swept at once,
// and the next gust comes without warning.
import { random, type RngHolder } from '../rng';
import type { Animal, GameState, ZoneId } from '../types';
import type { EncounterDef } from './types';

export const STORM: EncounterDef = {
  id: 'storm',
  title: { day: 'Stormen över heden', night: 'Stormen i natten' },
  crossed: 'kom i lä bakom krönet',
  timeUp: {
    day: 'Vinden vänder och blir hårdare. Ingen av oss står emot den längre. Vi kan inte vänta.',
    night: 'Kylan biter hårdare mot morgonen. Ingen av oss står emot den längre. Vi kan inte vänta.',
  },
  leftBehind: { day: 'som blev kvar på heden', night: 'som blev kvar på heden i natten' },
  lastHour: {
    day: 'Vinden ökar. Det här är sista timmen.',
    night: 'Det är som kallast nu, före gryningen. Det här är sista timmen.',
  },
  maxTurn: 8,
  zones: [
    { id: 'tradgransen', label: 'Trädgränsen', name: 'trädgränsen', rect: [0, 80, 100, 20], start: true },
    { id: 'ljungV', label: 'Ljungen, väst', name: 'ljungen i väster', rect: [0, 58, 34, 22], exposed: true },
    { id: 'stenblocket', label: 'Stenblocket', name: 'stenblocket', rect: [34, 58, 32, 22], cover: true },
    { id: 'ljungO', label: 'Ljungen, öst', name: 'ljungen i öster', rect: [66, 58, 34, 22], exposed: true },
    { id: 'svackan', label: 'Svackan', name: 'svackan', rect: [0, 36, 34, 22], cover: true },
    { id: 'kalheden', label: 'Kalheden', name: 'kalheden', rect: [34, 36, 32, 22], exposed: true },
    { id: 'lavheden', label: 'Lavheden', name: 'lavheden', rect: [66, 36, 34, 22], exposed: true },
    { id: 'krontV', label: 'Krönet, väst', name: 'krönet i väster', rect: [0, 14, 34, 22], exposed: true },
    { id: 'krontM', label: 'Krönet', name: 'krönet', rect: [34, 14, 32, 22], exposed: true },
    { id: 'roset', label: 'Röset', name: 'röset', rect: [66, 14, 34, 22], cover: true },
    { id: 'lat', label: 'Lä bakom krönet', name: 'lä bakom krönet', rect: [0, 0, 100, 14], goal: true },
  ],
  // Up over the heath to the lee of the ridge – and along each row, from shelter to shelter.
  edges: [
    ['tradgransen', 'stenblocket'],
    ['tradgransen', 'ljungV'],
    ['tradgransen', 'ljungO'],
    ['ljungV', 'svackan'],
    ['stenblocket', 'kalheden'],
    ['ljungO', 'lavheden'],
    ['ljungV', 'stenblocket'],
    ['stenblocket', 'ljungO'],
    ['svackan', 'krontV'],
    ['kalheden', 'krontM'],
    ['lavheden', 'roset'],
    ['svackan', 'kalheden'],
    ['kalheden', 'lavheden'],
    ['krontV', 'krontM'],
    ['krontM', 'roset'],
    ['krontV', 'lat'],
    ['krontM', 'lat'],
    ['roset', 'lat'],
  ],
};

/** The heath's three rows, bottom to top: where the gusts sweep. */
export const STORM_ROWS: ZoneId[][] = [['ljungV', 'stenblocket', 'ljungO'], ['svackan', 'kalheden', 'lavheden'], ['krontV', 'krontM', 'roset']];

/** Which rows the gusts sweep, hour by hour: one, never the same twice running – two in squalls. */
export function planStorm(h: RngHolder, maxTurn: number, hard: boolean): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < maxTurn; i++) {
    const last = out[i - 1] ?? [];
    const pool = [0, 1, 2].filter((r) => hard || !last.includes(r));
    const first = pool[Math.floor(random(h) * pool.length)];
    if (!hard) {
      out.push([first]);
      continue;
    }
    const rest = [0, 1, 2].filter((r) => r !== first);
    out.push([first, rest[Math.floor(random(h) * rest.length)]].sort());
  }
  return out;
}

/** The zones the gusts sweep this hour (or another). */
export const gustZones = (s: GameState, turn = s.turn): ZoneId[] =>
  s.encounterId === 'storm' ? (s.storm.rows[turn - 1] ?? []).flatMap((r) => STORM_ROWS[r]) : [];

/** Do we see the next hour's gust? Not when the wind comes in squalls. */
export const nextGustKnown = (s: GameState) => s.variant !== 'hard';

/** Is this one out in the wind when the hour goes? In a gust row, not in shelter and not hidden. */
export function inTheWind(s: GameState, a: Animal, z: ZoneId = a.zone): boolean {
  if (a.status !== 'active' || a.hidden) return false;
  const def = STORM.zones.find((d) => d.id === z);
  return !!def && !def.cover && gustZones(s).includes(z);
}
