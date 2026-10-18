// Ån: three slippery stepping stones, a current that carries the small toward
// the rapids, and a beaver dam that is quick but creaks under every step.
import { pick, random, type RngHolder } from '../rng';
import type { Animal, Current, GameState, ZoneId } from '../types';
import type { EncounterDef } from './types';

export const RIVER: EncounterDef = {
  id: 'river',
  title: { day: 'Ån i dagsljus', night: 'Ån om natten' },
  crossed: 'tog sig över ån',
  timeUp: {
    day: 'Kvällen kom, och vattnet steg med den. Vi kunde inte vänta längre.',
    night: 'Gryningen kom över vattnet. Vi kunde inte vänta längre.',
  },
  leftBehind: { day: 'som blev kvar vid ån', night: 'som blev kvar vid ån i mörkret' },
  lastHour: {
    day: 'Solen sjunker över ån. Det här är sista timmen.',
    night: 'Himlen ljusnar över vattnet. Det här är nattens sista timme.',
  },
  maxTurn: 8,
  rescue: {
    who: 'tistel',
    zone: 'sten3',
    found: 'På tredje stenen sitter en hare, avskuren av vattnet. Den darrar och vågar inte hoppa.',
    trapped: 'på tredje stenen',
    freed: 'visar vägen över vattnet',
  },
  zones: [
    { id: 'strand', label: 'Strandbrinken', name: 'strandbrinken', rect: [0, 78, 100, 22], start: true, cover: true },
    { id: 'dammen', label: 'Bäverdammen', name: 'bäverdammen', rect: [0, 26, 22, 52] },
    { id: 'sten1', label: 'Första stenen', name: 'första stenen', rect: [22, 61, 30, 17], water: true, stone: true },
    { id: 'sten2', label: 'Andra stenen', name: 'andra stenen', rect: [22, 43.5, 30, 17.5], water: true, stone: true },
    { id: 'sten3', label: 'Tredje stenen', name: 'tredje stenen', rect: [22, 26, 30, 17.5], water: true, stone: true },
    { id: 'strommen', label: 'Strömmen', name: 'strömmen', rect: [52, 26, 48, 52], water: true },
    { id: 'farStrand', label: 'Andra stranden', name: 'andra stranden', rect: [0, 12, 100, 14], goal: true },
  ],
  // Over the stones or through the current is four steps – no one gets across in a single hour.
  // Only the dam is quicker, and it doesn't hold many.
  edges: [
    ['strand', 'sten1'],
    ['strand', 'dammen'],
    ['sten1', 'sten2'],
    ['sten2', 'sten3'],
    ['sten2', 'strommen'],
    ['sten3', 'farStrand'],
    ['sten3', 'strommen'],
    ['dammen', 'farStrand'],
    ['strommen', 'farStrand'],
  ],
};

export const DAM: ZoneId = 'dammen';
export const CURRENT: ZoneId = 'strommen';
export const STONES: ZoneId[] = ['sten1', 'sten2', 'sten3'];
export const DAM_MAX = 4;
/** After the dam breaks, the flood wave keeps the current strong this many hours. */
export const FLOOD_HOURS = 2;
/** In flood the dam is nearly gone, and the rising water leaves fewer hours. */
export const FLOOD_DAM_CREAK = 3;
export const FLOOD_HOURS_TOTAL = 6;

/** The whole crossing's current and spray are decided up front, so they can be telegraphed and peeked. */
export function planRiver(h: RngHolder, maxTurn: number, flood = false): { currentPlan: Current[]; slipPlan: ZoneId[][] } {
  const currentPlan: Current[] = [];
  const slipPlan: ZoneId[][] = [];
  // In flood the current is strong most hours, and the spray reaches both stones more often.
  const [strong, none, one] = flood ? [0.75, 0, 0.3] : [0.5, 0.25, 0.85];
  for (let t = 1; t <= maxTurn; t++) {
    // A calm first hour to find our feet – unless the river is already in flood.
    currentPlan.push((t > 1 || flood) && random(h) < strong ? 'strid' : 'lugn');
    const r = random(h);
    // In flood, every strong hour washes over both stones.
    const washed = flood && currentPlan[t - 1] === 'strid';
    const first = pick(h, STONES);
    const second = pick(h, STONES.filter((z) => z !== first));
    slipPlan.push(washed ? [...STONES] : r < none ? [] : r < one ? [first] : [first, second]);
  }
  return { currentPlan, slipPlan };
}

/** The toad swims: the current doesn't take Kvarn. */
export const swims = (a: Animal) => a.species === 'toad';

/** A flier with a whole wing just lifts off the water: no slipping, no current, no cold. */
export const aboveTheWater = (a: Animal) => a.flying || (a.flier && !a.injuries.includes('broken'));

/** Whoever stands in the current next to a large animal holds on and isn't carried away. */
export function holdsOnTo(s: GameState, a: Animal): Animal | undefined {
  return s.animals.find((o) => o.id !== a.id && o.status === 'active' && o.size === 'large' && o.zone === CURRENT && !o.flying);
}

/** Carried away if the current is strong: not the large, not the toad, not the one in the air, not the one holding on. */
export function carriedAway(s: GameState, a: Animal): boolean {
  return (
    s.currentPlan[s.turn - 1] === 'strid' &&
    a.status === 'active' && a.zone === CURRENT && !aboveTheWater(a) && a.size !== 'large' && !swims(a) && !holdsOnTo(s, a)
  );
}
