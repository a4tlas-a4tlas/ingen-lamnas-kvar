// Det besprutade fältet: a tractor drives the crop rows one by one and leaves a sweet,
// poisoned mist behind it, which the wind carries over the field. By night the
// tractor sleeps, but the day's mist still lies low in the rows and moves unseen.
import { random, type RngHolder } from '../rng';
import type { GameState, Wind, ZoneId } from '../types';
import type { EncounterDef } from './types';

export const SPRAYER: EncounterDef = {
  id: 'sprayer',
  title: { day: 'Det besprutade fältet', night: 'Fältet efter sprutan' },
  crossed: 'nådde dungen',
  timeUp: {
    day: 'Traktorn vänder och kommer tillbaka med full tank. Vi kan inte stanna på fältet längre.',
    night: 'Gryningen kommer, och med den traktorn. Vi kan inte stanna på fältet längre.',
  },
  leftBehind: { day: 'som blev kvar i dimman', night: 'som blev kvar i dimman om natten' },
  lastHour: {
    day: 'Traktorn tankar vid kanten. Det här är sista timmen.',
    night: 'Himlen ljusnar över raderna. Det här är nattens sista timme.',
  },
  maxTurn: 8,
  zones: [
    { id: 'dikesrenen', label: 'Dikesrenen', name: 'dikesrenen', rect: [0, 82, 100, 18], start: true, cover: true },
    { id: 'backen1', label: 'Bäcken', name: 'bäcken', rect: [0, 40, 20, 42], water: true, slow: true, cover: true },
    { id: 'backen2', label: 'Bäcken, övre', name: 'bäckens övre lopp', rect: [0, 18, 20, 22], water: true, slow: true, cover: true },
    { id: 'rad1v', label: 'Första raden', name: 'första raden', rect: [20, 62, 40, 20], exposed: true },
    { id: 'rad1o', label: 'Första raden, öst', name: 'första radens östra ände', rect: [60, 62, 40, 20], exposed: true },
    { id: 'rad2v', label: 'Andra raden', name: 'andra raden', rect: [20, 40, 40, 22], exposed: true },
    { id: 'ograset', label: 'Ogräset', name: 'ogräset', rect: [60, 40, 40, 22], cover: true },
    { id: 'rad3v', label: 'Tredje raden', name: 'tredje raden', rect: [20, 18, 40, 22], exposed: true },
    { id: 'rad3o', label: 'Tredje raden, öst', name: 'tredje radens östra ände', rect: [60, 18, 40, 22], exposed: true },
    { id: 'dungen', label: 'Dungen', name: 'dungen', rect: [0, 4, 100, 14], goal: true },
  ],
  // Straight up through the rows, around through the weeds, or the long, wet way up the stream.
  edges: [
    ['dikesrenen', 'rad1v'],
    ['dikesrenen', 'rad1o'],
    ['dikesrenen', 'backen1'],
    ['rad1v', 'rad2v'],
    ['rad1o', 'ograset'],
    ['rad1v', 'backen1'],
    ['rad2v', 'rad3v'],
    ['rad2v', 'backen2'],
    ['ograset', 'rad3o'],
    ['backen1', 'backen2'],
    ['rad3v', 'dungen'],
    ['rad3o', 'dungen'],
    ['backen2', 'dungen'],
  ],
};

/** The crop rows the tractor drives, nearest first. The weeds stand in the second; it goes around them. */
export const ROWS: ZoneId[][] = [['rad1v', 'rad1o'], ['rad2v'], ['rad3v', 'rad3o']];
/** Where the mist can lie: only in the crop. Water and weeds take it, the ditch and the grove are out of reach. */
export const CROP: ZoneId[] = ROWS.flat();
export const WINDS: Wind[] = ['norr', 'söder', 'öster', 'väster'];
/** How many patches of the day's mist lie in the rows when night falls. */
export const NIGHT_MIST = 3;

/** Where a patch of mist drifts with the wind. Anything not in the crop is where it ends. */
const DRIFT: Record<ZoneId, Record<Wind, ZoneId | null>> = {
  rad1v: { norr: 'rad2v', söder: null, öster: 'rad1o', väster: null },
  rad1o: { norr: null, söder: null, öster: null, väster: 'rad1v' },
  rad2v: { norr: 'rad3v', söder: 'rad1v', öster: null, väster: null },
  rad3v: { norr: null, söder: 'rad2v', öster: 'rad3o', väster: null },
  rad3o: { norr: null, söder: null, öster: null, väster: 'rad3v' },
};

/** The mist after the wind has moved it: patches that leave the crop are gone. */
export function drift(mist: ZoneId[], wind: Wind): ZoneId[] {
  const out = mist.map((z) => DRIFT[z]?.[wind]).filter((z): z is ZoneId => !!z);
  return [...new Set(out)];
}

/** The zones of a row (1–3). */
export const rowZones = (row: number): ZoneId[] => ROWS[row - 1] ?? [];

/** Where the spray lands: the tractor's row – and on the hard field, the row after it too. */
export function sprayed(row: number, hard: boolean): ZoneId[] {
  const next = row < ROWS.length ? row + 1 : row - 1;
  return hard ? [...rowZones(row), ...rowZones(next)] : rowZones(row);
}

/** The tractor goes back and forth over the rows; the wind mostly keeps its course. */
export function planSprayer(h: RngHolder, maxTurn: number): { rowPlan: number[]; windPlan: Wind[] } {
  const sweep = [1, 2, 3, 3, 2, 1];
  const start = Math.floor(random(h) * sweep.length);
  const rowPlan = Array.from({ length: maxTurn }, (_, i) => sweep[(start + i) % sweep.length]);
  const windPlan: Wind[] = [];
  for (let t = 0; t < maxTurn; t++) {
    const keep = t > 0 && random(h) < 0.6;
    windPlan.push(keep ? windPlan[t - 1] : WINDS[Math.floor(random(h) * WINDS.length)]);
  }
  return { rowPlan, windPlan };
}

/** At night, the mist that lies in the rows from the day. */
export function nightMist(h: RngHolder): ZoneId[] {
  const pool = [...CROP];
  const out: ZoneId[] = [];
  while (out.length < NIGHT_MIST && pool.length) out.push(pool.splice(Math.floor(random(h) * pool.length), 1)[0]);
  return out;
}

/** The mist we can see: all of it by day, or when someone reads the night; otherwise only what we smell. */
export function visibleMist(s: GameState): ZoneId[] {
  return s.time === 'day' || s.peekNext || s.darkRevealed ? s.spray.mist : s.spray.shown;
}

/** Where the mist we can see will lie when the hour passes: drifted, and by day where the tractor sprays. */
export function mistAfter(s: GameState): ZoneId[] {
  const wind = s.spray.windPlan[s.turn - 1] ?? 'norr';
  const row = s.time === 'day' ? s.spray.rowPlan[s.turn - 1] : 0;
  return [...new Set([...drift(visibleMist(s), wind), ...(row ? sprayed(row, s.variant === 'hard') : [])])];
}

/** The row the tractor drives this hour, if it drives. */
export const tractorRow = (s: GameState): ZoneId[] => (s.time === 'day' ? rowZones(s.spray.rowPlan[s.turn - 1]) : []);
