// Ån: two slippery stepping stones, a current that carries the small toward
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
  zones: [
    { id: 'strand', label: 'Strandbrinken', name: 'strandbrinken', rect: [0, 78, 100, 22], start: true, cover: true },
    { id: 'dammen', label: 'Bäverdammen', name: 'bäverdammen', rect: [0, 26, 22, 52] },
    { id: 'sten1', label: 'Första stenen', name: 'första stenen', rect: [22, 52, 30, 26], water: true, stone: true },
    { id: 'sten2', label: 'Andra stenen', name: 'andra stenen', rect: [22, 26, 30, 26], water: true, stone: true },
    { id: 'strommen', label: 'Strömmen', name: 'strömmen', rect: [52, 26, 48, 52], water: true },
    { id: 'farStrand', label: 'Andra stranden', name: 'andra stranden', rect: [0, 12, 100, 14], goal: true },
  ],
  edges: [
    ['strand', 'sten1'],
    ['strand', 'dammen'],
    ['sten1', 'sten2'],
    ['sten1', 'strommen'],
    ['sten2', 'farStrand'],
    ['sten2', 'strommen'],
    ['dammen', 'farStrand'],
    ['strommen', 'farStrand'],
  ],
};

export const DAM: ZoneId = 'dammen';
export const CURRENT: ZoneId = 'strommen';
export const STONES: ZoneId[] = ['sten1', 'sten2'];
export const DAM_MAX = 4;
/** After the dam breaks, the flood wave keeps the current strong this many hours. */
export const FLOOD_HOURS = 2;

/** The whole crossing's current and spray are decided up front, so they can be telegraphed and peeked. */
export function planRiver(h: RngHolder, maxTurn: number): { currentPlan: Current[]; slipPlan: ZoneId[][] } {
  const currentPlan: Current[] = [];
  const slipPlan: ZoneId[][] = [];
  for (let t = 1; t <= maxTurn; t++) {
    currentPlan.push(t > 1 && random(h) < 0.5 ? 'strid' : 'lugn');
    const r = random(h);
    slipPlan.push(r < 0.25 ? [] : r < 0.85 ? [pick(h, STONES)] : [...STONES]);
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
