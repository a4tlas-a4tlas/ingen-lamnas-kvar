// Avloppet: under the city, in the dark. We climb down a manhole and walk the tunnels to
// the outlet by the river. We cannot see what lies ahead – only hear it: water running
// in a low pipe, a dry echo off a ledge, rats squeaking. The rain above fills the tunnels,
// the low ones first, and the rats take their toll from whoever passes – a card, or a bite.
import { random, type RngHolder } from '../rng';
import type { Animal, GameState, TimeOfDay, ZoneId } from '../types';
import { SWEEPS_MEDIUM, SWEEPS_SMALL, sweptAt } from './fence';
import type { EncounterDef } from './types';

export const SEWER: EncounterDef = {
  id: 'sewer',
  title: { day: 'Avloppet', night: 'Avloppet om natten' },
  crossed: 'kom ut vid utloppet',
  timeUp: {
    day: 'Vattnet fyller tunnlarna upp till taket. Vi kan inte stanna här nere längre.',
    night: 'Råttorna är för många nu, och vattnet stiger. Vi kan inte stanna här nere längre.',
  },
  leftBehind: { day: 'som blev kvar i tunnlarna', night: 'som blev kvar i tunnlarna' },
  lastHour: {
    day: 'Vattnet forsar genom tunnlarna. Det här är sista timmen.',
    night: 'Ljuset från gallren blir grått. Det här är sista timmen.',
  },
  maxTurn: 8,
  zones: [
    { id: 'brunnen', label: 'Brunnen', name: 'brunnen', rect: [0, 80, 100, 20], start: true, cover: true },
    { id: 'tunnel1', label: 'Tunnel 1', name: 'den första tunneln', rect: [0, 52, 34, 28], water: true },
    { id: 'tunnel2', label: 'Tunnel 2', name: 'den andra tunneln', rect: [34, 52, 32, 28], water: true },
    { id: 'tunnel3', label: 'Tunnel 3', name: 'den tredje tunneln', rect: [66, 52, 34, 28], water: true },
    { id: 'tunnel4', label: 'Tunnel 4', name: 'den fjärde tunneln', rect: [0, 24, 34, 28], water: true },
    { id: 'tunnel5', label: 'Tunnel 5', name: 'den femte tunneln', rect: [34, 24, 32, 28], water: true },
    { id: 'tunnel6', label: 'Tunnel 6', name: 'den sjätte tunneln', rect: [66, 24, 34, 28], water: true },
    { id: 'utloppet', label: 'Utloppet', name: 'utloppet', rect: [0, 6, 100, 18], goal: true },
  ],
  // Down the tunnels to the outlet – and through the side passages between them.
  edges: [
    ['brunnen', 'tunnel2'],
    ['brunnen', 'tunnel1'],
    ['brunnen', 'tunnel3'],
    ['tunnel1', 'tunnel4'],
    ['tunnel2', 'tunnel5'],
    ['tunnel3', 'tunnel6'],
    ['tunnel1', 'tunnel2'],
    ['tunnel2', 'tunnel3'],
    ['tunnel4', 'tunnel5'],
    ['tunnel5', 'tunnel6'],
    ['tunnel4', 'utloppet'],
    ['tunnel5', 'utloppet'],
    ['tunnel6', 'utloppet'],
  ],
};

export const TUNNELS: ZoneId[] = ['tunnel1', 'tunnel2', 'tunnel3', 'tunnel4', 'tunnel5', 'tunnel6'];

/** What a tunnel is: a low pipe where the water stands deeper, a walkway, or a dry ledge above it. */
export type TunnelKind = 'low' | 'walk' | 'ledge';
/** How much deeper – or shallower – the water is than the level, by kind. */
export const DEPTH_BY_KIND: Record<TunnelKind, number> = { low: 1, walk: 0, ledge: -1 };
/** What we hear from a tunnel we have not found. */
export const SOUND: Record<TunnelKind | 'rats', string> = { low: 'det porlar', walk: 'steg som ekar', ledge: 'torrt eko', rats: 'det piper' };

export { SWEEPS_MEDIUM, SWEEPS_SMALL };

/** Each tunnel's kind: two of each, laid out anew for every sewer. */
export function planKinds(h: RngHolder): Record<ZoneId, TunnelKind> {
  const pool: TunnelKind[] = ['low', 'low', 'walk', 'walk', 'ledge', 'ledge'];
  const out: Record<ZoneId, TunnelKind> = {};
  for (const z of TUNNELS) out[z] = pool.splice(Math.floor(random(h) * pool.length), 1)[0];
  return out;
}

/** Where the rats hold their junctions: one by day, two at night. */
export function planRats(h: RngHolder, time: TimeOfDay): ZoneId[] {
  const pool = [...TUNNELS];
  return Array.from({ length: time === 'night' ? 2 : 1 }, () => pool.splice(Math.floor(random(h) * pool.length), 1)[0]);
}

/** Whether the rain raises the water each hour: the storm by day most hours, the soft night rain seldom. */
export function planRise(h: RngHolder, maxTurn: number, time: TimeOfDay): boolean[] {
  return Array.from({ length: maxTurn }, (_, i) => i > 0 && random(h) < (time === 'day' ? 0.5 : 0.3));
}

/** The water level once this hour's rain has come. */
export const levelNow = (s: GameState): number => s.sewer.level + (s.sewer.risePlan[s.turn - 1] ? 1 : 0);

/** How deep the water stands in a zone at a level. Only the tunnels hold water. */
export const depthIn = (s: GameState, z: ZoneId, level = levelNow(s)): number =>
  TUNNELS.includes(z) ? Math.max(0, level + DEPTH_BY_KIND[s.sewer.kinds[z]]) : 0;

/** Have we found this tunnel – seen what it is? Insight that shows the dark shows them all. */
export const isFound = (s: GameState, z: ZoneId) => !TUNNELS.includes(z) || s.sewer.found.includes(z) || s.darkRevealed;

/** Tunnels in or next to where one of us stands: found, for good. */
export function foundBy(s: GameState, near: (from: ZoneId, to: ZoneId) => boolean): ZoneId[] {
  const here = s.animals.filter((a) => a.status === 'active').map((a) => a.zone);
  return TUNNELS.filter((z) => here.some((h) => h === z || near(h, z)));
}

/** Who the water takes where they stand: not swimmers, not those in the air, not those beside a large one. */
export function sweptHere(s: GameState, zoneOf: (a: Animal) => ZoneId = (a) => a.zone): Animal[] {
  const anchored = (a: Animal) => s.animals.some((o) => o !== a && o.status === 'active' && o.size === 'large' && !o.flying && zoneOf(o) === zoneOf(a));
  return s.animals.filter((a) => a.status === 'active' && !a.flying && sweptAt(a, depthIn(s, zoneOf(a))) && !anchored(a));
}

/** Whom the rats bite where they hold a junction, if no toll is paid: the smallest of us there they can reach. */
export function bittenByRats(s: GameState, z: ZoneId, zoneOf: (a: Animal) => ZoneId = (a) => a.zone): Animal | undefined {
  const rank = { small: 0, medium: 1, large: 2 } as const;
  if (s.sewer.paid || !s.sewer.rats.includes(z)) return undefined;
  return s.animals
    .filter((a) => a.status === 'active' && zoneOf(a) === z && !a.flying && !a.hidden)
    .sort((a, b) => rank[a.size] - rank[b.size])[0];
}
