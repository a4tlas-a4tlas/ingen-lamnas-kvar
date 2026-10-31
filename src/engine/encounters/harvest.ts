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

/**
 * Which wheat falls in each hour. It starts at a random place on the edge; then, each
 * hour, it goes on round one way or turns and goes the other – a real choice, made by
 * the driver. The feint is the way it didn't take: we see it turn, not which way.
 */
export function planHarvest(h: RngHolder, maxTurn: number): { plan: ZoneId[][]; feint: ZoneId[][] } {
  const n = WHEAT.length;
  const at = (i: number) => WHEAT[((i % n) + n) % n];
  const plan: ZoneId[][] = [];
  const feint: ZoneId[][] = [];
  // The arc already cut: from lo to hi, round the edge.
  let lo = 0;
  let hi = -1;
  for (let t = 1; t <= maxTurn; t++) {
    const left = n - (hi - lo + 1);
    if (t < FIRST_CUT || left <= 0) { plan.push([]); feint.push([]); continue; }
    const k = Math.min(STRIPS_PER_HOUR, left);
    if (hi < lo) {
      // The first cut: a random place on the edge – and it could as well have been the far side.
      const start = Math.floor(random(h) * n);
      const real = Array.from({ length: k }, (_, j) => at(start + j));
      const far = Array.from({ length: k }, (_, j) => at(start + n / 2 + j));
      plan.push(real);
      feint.push(far);
      lo = start;
      hi = start + k - 1;
      continue;
    }
    const ahead = Array.from({ length: k }, (_, j) => at(hi + 1 + j));
    const back = Array.from({ length: k }, (_, j) => at(lo - 1 - j));
    const same = [...ahead].sort().join() === [...back].sort().join();
    const forward = random(h) < 0.5;
    plan.push(forward ? ahead : back);
    feint.push(same ? [] : forward ? back : ahead);
    if (forward) hi += k;
    else lo -= k;
  }
  return { plan, feint };
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
