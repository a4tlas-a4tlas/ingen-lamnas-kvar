// Affärsgatan: a busy shopping street in the middle of town. We cross it: a sidewalk,
// the tram tracks, the far sidewalk – with a bike lane on each side. By day the crowd
// surges along the sidewalks and steps on the small; the bikes take one lane an hour;
// the tram keeps its timetable and kills whoever is on the tracks. At night the street
// is near empty – but those who are out stagger where no one can tell.
import { random, type RngHolder } from '../rng';
import type { Animal, GameState, TimeOfDay, ZoneId } from '../types';
import type { EncounterDef } from './types';

export const STREET: EncounterDef = {
  id: 'street',
  title: { day: 'Affärsgatan', night: 'Affärsgatan om natten' },
  crossed: 'nådde parken',
  timeUp: {
    day: 'Butikerna stänger, och hela staden går hem på samma gata. Vi kan inte stanna här längre.',
    night: 'Gryningen kommer, och de första spårvagnarna börjar gå tätt. Vi kan inte stanna här längre.',
  },
  leftBehind: { day: 'som blev kvar på affärsgatan', night: 'som blev kvar på affärsgatan' },
  lastHour: {
    day: 'Det är nästan stängningsdags. Det här är sista timmen.',
    night: 'Himlen ljusnar över taken. Det här är sista timmen.',
  },
  maxTurn: 10,
  zones: [
    { id: 'granden', label: 'Gränden', name: 'gränden', rect: [0, 84, 100, 16], start: true, cover: true },
    { id: 'butiksdorren', label: 'Butiksdörren', name: 'butiksdörren', rect: [0, 64, 30, 20], cover: true },
    { id: 'trottoarenS', label: 'Trottoaren', name: 'trottoaren på vår sida', rect: [30, 64, 40, 20], exposed: true },
    { id: 'cykelS', label: 'Cykelbanan', name: 'cykelbanan på vår sida', rect: [70, 64, 30, 20], exposed: true },
    { id: 'sparet', label: 'Spåret', name: 'spåret', rect: [0, 46, 100, 18], exposed: true },
    { id: 'cykelN', label: 'Cykelbanan', name: 'cykelbanan på andra sidan', rect: [0, 26, 30, 20], exposed: true },
    { id: 'trottoarenN', label: 'Trottoaren', name: 'trottoaren på andra sidan', rect: [30, 26, 40, 20], exposed: true },
    { id: 'banken', label: 'Bänken', name: 'under bänken', rect: [70, 26, 30, 20], smallOnly: true, slow: true, cover: true },
    { id: 'parken', label: 'Parken', name: 'parken', rect: [0, 6, 100, 20], goal: true },
  ],
  // Across the street – and along each sidewalk, out of the crowd's way.
  edges: [
    ['granden', 'trottoarenS'],
    ['granden', 'butiksdorren'],
    ['granden', 'cykelS'],
    ['butiksdorren', 'trottoarenS'],
    ['trottoarenS', 'cykelS'],
    ['trottoarenS', 'sparet'],
    ['butiksdorren', 'sparet'],
    ['cykelS', 'sparet'],
    ['sparet', 'trottoarenN'],
    ['sparet', 'cykelN'],
    ['sparet', 'banken'],
    ['cykelN', 'trottoarenN'],
    ['trottoarenN', 'banken'],
    ['trottoarenN', 'parken'],
    ['cykelN', 'parken'],
    ['banken', 'parken'],
  ],
};

/** The sidewalks, where the crowd surges. */
export const SIDEWALKS: ZoneId[] = ['trottoarenS', 'trottoarenN'];
/** The two bike lanes, one on each side. */
export const BIKE_LANES: ZoneId[] = ['cykelS', 'cykelN'];
/** Where a drunk can stagger at night: the open street on either side, never the doorway or under the bench. */
export const STAGGER: ZoneId[] = ['trottoarenS', 'cykelS', 'trottoarenN', 'cykelN'];
/** Which side of the tracks a zone is on. */
export const sideOf = (z: ZoneId): 'near' | 'far' | null =>
  ['butiksdorren', 'trottoarenS', 'cykelS'].includes(z) ? 'near' : ['cykelN', 'trottoarenN', 'banken'].includes(z) ? 'far' : null;

const pick = <T>(h: RngHolder, xs: T[]): T => xs[Math.floor(random(h) * xs.length)];

/** Where the crowd surges each hour: one sidewalk – or, on a Saturday, both. By night there is no crowd. */
export function planCrowd(h: RngHolder, maxTurn: number, time: TimeOfDay, hard: boolean): ZoneId[][] {
  return Array.from({ length: maxTurn }, () => (time === 'night' ? [] : hard ? [...SIDEWALKS] : [pick(h, SIDEWALKS)]));
}

/** Which bike lane is busy each hour. By night only some hours bring a bike. */
export function planBikes(h: RngHolder, maxTurn: number, time: TimeOfDay): (ZoneId | null)[] {
  return Array.from({ length: maxTurn }, () => {
    const lane = pick(h, BIKE_LANES);
    return time === 'night' && random(h) < 0.5 ? null : lane;
  });
}

/** The hours the tram passes: by day every two or three hours, at night every three or four – on a Saturday every two. */
export function planTram(h: RngHolder, maxTurn: number, time: TimeOfDay, hard: boolean): number[] {
  const gap = () => (hard ? 2 : time === 'night' ? 3 + Math.floor(random(h) * 2) : 2 + Math.floor(random(h) * 2));
  const out: number[] = [];
  for (let t = (time === 'night' ? 3 : 2) + Math.floor(random(h) * 2); t <= maxTurn; t += gap()) out.push(t);
  return out;
}

/** Does the tram pass when this hour ends? */
export const tramNow = (s: GameState, turn = s.turn) => s.street.tramAt.includes(turn);
/** Hours until the next tram passes, counting this one as 0; null if no more come. */
export function tramIn(s: GameState): number | null {
  const next = s.street.tramAt.find((t) => t >= s.turn);
  return next === undefined ? null : next - s.turn;
}
/** What we know of the tram: by day the whole timetable; at night only the bell, the hour before – and the tram itself. */
export const tramKnown = (s: GameState) => {
  const n = tramIn(s);
  return n !== null && (s.time === 'day' || n <= 1);
};

/** Where feet will fall this hour: the crowd by day, the drunks by night. */
export const feetAt = (s: GameState): ZoneId[] => [...(s.street.crowdPlan[s.turn - 1] ?? []), ...s.street.drunks];
/** The bike lane in use this hour. */
export const bikesAt = (s: GameState): ZoneId | null => s.street.bikePlan[s.turn - 1] ?? null;

/** What the feet do to one of us: the small are stepped on, the medium kicked aside, the large are seen. */
export function underfoot(a: Animal): 'stepped' | 'kicked' | 'seen' {
  return a.size === 'small' ? 'stepped' : a.size === 'medium' ? 'kicked' : 'seen';
}
