// Gungflyet: the quaking bog. The moss looks like ground, but under it is water. Whoever
// stands still on the soft moss sinks – the heavy fastest – until they are stuck, and then
// pulled under. The tussocks and the old plank hold. Swimmers float; a large one can pull
// a stuck one free.
import type { Animal, GameState, ZoneId } from '../types';
import type { EncounterDef } from './types';
import { WISPS } from './wisps';

export const BOG: EncounterDef = {
  id: 'bog',
  title: { day: 'Gungflyet', night: 'Gungflyet i mörkret' },
  crossed: 'nådde Tallholmen',
  timeUp: {
    day: 'Det börjar skymma över mossen. I mörkret ser ingen var tuvorna är. Vi kan inte vänta längre.',
    night: 'Det ljusnar, och tranorna börjar ropa. Mossen vaknar. Vi kan inte vänta längre.',
  },
  leftBehind: { day: 'som blev kvar på gungflyet', night: 'som blev kvar på gungflyet' },
  lastHour: {
    day: 'Solen står lågt över mossen. Det här är sista timmen.',
    night: 'Det grånar i öster. Det här är sista timmen.',
  },
  maxTurn: 8,
  zones: [
    { id: 'myrkanten', label: 'Myrkanten', name: 'myrkanten', rect: [0, 80, 100, 20], start: true },
    { id: 'starrV', label: 'Starrkärret, väst', name: 'starrkärret i väster', rect: [0, 58, 34, 22], soft: true },
    { id: 'tuvan', label: 'Tuvan', name: 'tuvan', rect: [34, 58, 32, 22], cover: true },
    { id: 'starrO', label: 'Starrkärret, öst', name: 'starrkärret i öster', rect: [66, 58, 34, 22], soft: true },
    { id: 'golen', label: 'Gölen', name: 'gölen', rect: [0, 36, 34, 22], water: true, soft: true },
    { id: 'gungflyet', label: 'Gungflyet', name: 'gungflyet', rect: [34, 36, 32, 22], exposed: true, soft: true },
    { id: 'tuvorna', label: 'Tuvorna', name: 'tuvorna', rect: [66, 36, 34, 22] },
    { id: 'dyn', label: 'Dyn', name: 'dyn', rect: [0, 14, 34, 22], soft: true },
    { id: 'spangen', label: 'Spången', name: 'spången', rect: [34, 14, 32, 22] },
    { id: 'vitmossan', label: 'Vitmossan', name: 'vitmossan', rect: [66, 14, 34, 22], exposed: true, soft: true },
    { id: 'tallholmen', label: 'Tallholmen', name: 'tallholmen', rect: [0, 0, 100, 14], goal: true },
  ],
  // Across the bog to the pine islet – and along each row, from tussock to tussock.
  edges: [
    ['myrkanten', 'tuvan'],
    ['myrkanten', 'starrV'],
    ['myrkanten', 'starrO'],
    ['starrV', 'golen'],
    ['tuvan', 'gungflyet'],
    ['starrO', 'tuvorna'],
    ['starrV', 'tuvan'],
    ['tuvan', 'starrO'],
    ['golen', 'dyn'],
    ['gungflyet', 'spangen'],
    ['tuvorna', 'vitmossan'],
    ['golen', 'gungflyet'],
    ['gungflyet', 'tuvorna'],
    ['dyn', 'spangen'],
    ['spangen', 'vitmossan'],
    ['dyn', 'tallholmen'],
    ['spangen', 'tallholmen'],
    ['vitmossan', 'tallholmen'],
  ],
};

/** The moss that gives way. The tussocks hold – but after rain the far ones are soft too. */
/** The dangers where soft moss sinks us: Gungflyet, and the lit bog. */
export const sinks = (s: GameState) => s.encounterId === 'bog' || s.encounterId === 'wisps';
export const isSoft = (s: GameState, z: ZoneId) =>
  (s.encounterId === 'bog' && (!!BOG.zones.find((d) => d.id === z)?.soft || (z === 'tuvorna' && s.variant === 'hard'))) ||
  (s.encounterId === 'wisps' && !!WISPS.zones.find((d) => d.id === z)?.soft);

/** Sinking is counted in half-steps: stuck at two steps, pulled under at three. */
export const STUCK_AT = 4;
export const UNDER_AT = 6;

/** How far one of us sinks in an hour standing still on soft moss, in half-steps. Light feet sink slowly, the heavy fast; after rain, all a little faster. */
export function sinkRate(s: GameState, a: Animal): number {
  const light = a.size === 'small' || a.species === 'hare' || a.species === 'fawn';
  const base = light ? 1 : a.size === 'large' ? 4 : 2;
  return base + (s.encounterId === 'bog' && s.variant === 'hard' ? 1 : 0);
}

/** Depth in whole steps, as shown: 0–3. */
export const sinkSteps = (a: Animal) => Math.min(3, Math.floor((a.sink ?? 0) / 2));
export const isStuck = (s: GameState, a: Animal) => sinks(s) && (a.sink ?? 0) >= STUCK_AT;
/** A large one of ours in the same zone, who can pull a stuck one free. */
export const puller = (s: GameState, a: Animal) =>
  s.animals.find((o) => o !== a && o.status === 'active' && o.zone === a.zone && o.size === 'large' && !isStuck(s, o));

/** Will this one sink when the hour goes, standing where it stands? */
export const sinksHere = (s: GameState, a: Animal, zone: ZoneId = a.zone) =>
  a.status === 'active' && !a.flying && isSoft(s, zone);
