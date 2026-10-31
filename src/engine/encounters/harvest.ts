// Skördetröskan – Åkrarnas sista dag: the boss of the fields. A harvester cuts the
// wheat from the outside in, two strips an hour, and the cover we hide in shrinks;
// behind it lies stubble, and the buzzard follows to take whoever stands there.
import { random, type RngHolder } from '../rng';
import type { Animal, GameState, ZoneId } from '../types';
import type { EncounterDef } from './types';

export const HARVEST: EncounterDef = {
  id: 'harvest',
  title: { day: 'Skördetröskan', night: 'Skördetröskan' },
  fixedTime: 'day',
  crossed: 'nådde häcken',
  timeUp: {
    day: 'Skördetröskan vänder för sista gången. Det finns inget vete kvar att gömma sig i.',
    night: 'Skördetröskan vänder för sista gången. Det finns inget vete kvar att gömma sig i.',
  },
  leftBehind: { day: 'som blev kvar på stubbfältet', night: 'som blev kvar på stubbfältet' },
  lastHour: {
    day: 'Solen står lågt över stubben. Det här är sista timmen.',
    night: 'Solen står lågt över stubben. Det här är sista timmen.',
  },
  maxTurn: 5,
  zones: [
    { id: 'faltkanten', label: 'Fältkanten', name: 'fältkanten', rect: [0, 78, 100, 22], start: true, cover: true },
    { id: 'vete1v', label: 'Vetet, väst', name: 'vetet i väster', rect: [0, 50, 34, 28], cover: true },
    { id: 'vete1m', label: 'Vetet, mitten', name: 'vetet i mitten', rect: [34, 50, 32, 28], cover: true },
    { id: 'vete1o', label: 'Vetet, öst', name: 'vetet i öster', rect: [66, 50, 34, 28], cover: true },
    { id: 'vete2v', label: 'Bakre vetet, väst', name: 'det bakre vetet i väster', rect: [0, 22, 34, 28], cover: true },
    { id: 'vete2m', label: 'Bakre vetet, mitten', name: 'det bakre vetet i mitten', rect: [34, 22, 32, 28], cover: true },
    { id: 'vete2o', label: 'Bakre vetet, öst', name: 'det bakre vetet i öster', rect: [66, 22, 34, 28], cover: true },
    { id: 'hacken', label: 'Häcken', name: 'häcken', rect: [0, 6, 100, 16], goal: true },
  ],
  // Up through the wheat – and across it, to get out of the harvester's way.
  edges: [
    ['faltkanten', 'vete1m'],
    ['faltkanten', 'vete1v'],
    ['faltkanten', 'vete1o'],
    ['vete1v', 'vete2v'],
    ['vete1m', 'vete2m'],
    ['vete1o', 'vete2o'],
    ['vete1v', 'vete1m'],
    ['vete1m', 'vete1o'],
    ['vete2v', 'vete2m'],
    ['vete2m', 'vete2o'],
    ['vete2v', 'hacken'],
    ['vete2m', 'hacken'],
    ['vete2o', 'hacken'],
  ],
};

/** The wheat, in the order a harvester circles it: around the edge, from the front west. */
export const WHEAT: ZoneId[] = ['vete1v', 'vete1m', 'vete1o', 'vete2o', 'vete2m', 'vete2v'];
/** Strips cut each hour, and the hour the cutting starts. */
export const STRIPS_PER_HOUR = 2;
export const FIRST_CUT = 1;

/** Which wheat falls in each hour: from a random corner, one way or the other round. */
export function planHarvest(h: RngHolder, maxTurn: number): ZoneId[][] {
  const start = Math.floor(random(h) * WHEAT.length);
  const way = random(h) < 0.5 ? 1 : -1;
  const order = WHEAT.map((_, i) => WHEAT[(start + way * i + WHEAT.length * 2) % WHEAT.length]);
  return Array.from({ length: maxTurn }, (_, i) => {
    const k = i + 1 - FIRST_CUT;
    return k < 0 ? [] : order.slice(k * STRIPS_PER_HOUR, (k + 1) * STRIPS_PER_HOUR);
  });
}

/** The strip the harvester cuts this hour. */
export const cutting = (s: GameState): ZoneId[] => s.harvest.plan[s.turn - 1] ?? [];

/** Wheat still standing hides us all; the stubble hides no one. */
export const inWheat = (s: GameState, z: ZoneId) => WHEAT.includes(z) && !s.harvest.cut.includes(z);

/** Whom the buzzard can take in the stubble: the smallest of us there, not the large. */
export function stubblePrey(s: GameState, z: ZoneId, zoneOf: (a: Animal) => ZoneId = (a) => a.zone): Animal | undefined {
  const rank = { small: 0, medium: 1, large: 2 } as const;
  if (!s.harvest.cut.includes(z)) return undefined;
  return s.animals
    .filter((a) => a.status === 'active' && zoneOf(a) === z && a.size !== 'large')
    .sort((a, b) => rank[a.size] - rank[b.size])[0];
}
