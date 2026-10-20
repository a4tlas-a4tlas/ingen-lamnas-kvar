// Diket och grinden: between the field and the pasture beyond runs a ditch that fills
// hour by hour, and behind it an electric fence. Through it there is the gate, which only
// the large can push open; the rabbit's hole, for the small; and the air, for those who fly.
import { random, type RngHolder } from '../rng';
import type { Animal, GameState, ZoneId } from '../types';
import type { EncounterDef } from './types';

export const FENCE: EncounterDef = {
  id: 'fence',
  title: { day: 'Diket och grinden', night: 'Stängslet om natten' },
  crossed: 'kom in på betet',
  timeUp: {
    day: 'Diket svämmar över åkerkanten. Vi kan inte stanna här längre.',
    night: 'Gryningen kommer, och bonden går längs stängslet. Vi kan inte stanna här längre.',
  },
  leftBehind: { day: 'som blev kvar vid stängslet', night: 'som blev kvar vid stängslet i mörkret' },
  lastHour: {
    day: 'Vattnet når upp till åkerkanten. Det här är sista timmen.',
    night: 'Himlen ljusnar över betet. Det här är nattens sista timme.',
  },
  maxTurn: 9,
  zones: [
    { id: 'akerkanten', label: 'Åkerkanten', name: 'åkerkanten', rect: [0, 72, 100, 28], start: true, cover: true },
    { id: 'diketV', label: 'Diket', name: 'diket', rect: [0, 46, 40, 26], water: true },
    { id: 'spangen', label: 'Spången', name: 'spången', rect: [40, 46, 20, 26] },
    { id: 'diketO', label: 'Diket, öst', name: 'dikets östra del', rect: [60, 46, 40, 26], water: true },
    { id: 'stangslet', label: 'Stängslet', name: 'stängslet', rect: [0, 22, 35, 24], exposed: true, wire: true },
    { id: 'grinden', label: 'Grinden', name: 'grinden', rect: [35, 22, 30, 24], wire: true },
    { id: 'kaninhalet', label: 'Kaninhålet', name: 'kaninhålet', rect: [65, 22, 35, 24], smallOnly: true, slow: true },
    { id: 'betet', label: 'Betet', name: 'betet', rect: [0, 4, 100, 18], goal: true },
  ],
  // Across the ditch or the plank, to the fence – and through it, if we can.
  edges: [
    ['akerkanten', 'spangen'],
    ['akerkanten', 'diketV'],
    ['akerkanten', 'diketO'],
    ['spangen', 'grinden'],
    ['diketV', 'stangslet'],
    ['diketO', 'grinden'],
    ['diketO', 'kaninhalet'],
    // Along the fence: from the wire to the gate, from the gate to the hole.
    ['stangslet', 'grinden'],
    ['grinden', 'kaninhalet'],
    ['grinden', 'betet'],
    ['stangslet', 'betet'],
    ['kaninhalet', 'betet'],
  ],
  fence: { edges: [['stangslet', 'betet'], ['grinden', 'betet']], gate: ['grinden', 'betet'] },
};

/** The water at which the ditch takes the small, and at which it takes the medium too. */
export const SWEEPS_SMALL = 2;
export const SWEEPS_MEDIUM = 3;
export const DITCH_MAX = 4;
/** What it costs, on top of the step, to push the gate open. */
export const GATE_PUSH = 2;

/** Most hours the water rises; the wire hums two hours in five, never in the first. */
export function planFence(h: RngHolder, maxTurn: number): { risePlan: boolean[]; pulsePlan: boolean[] } {
  const risePlan = Array.from({ length: maxTurn }, () => random(h) < 0.7);
  const pulsePlan = Array.from({ length: maxTurn }, (_, i) => i > 0 && random(h) < 0.4);
  return { risePlan, pulsePlan };
}

/** The water when the hour passes. */
export const levelAfter = (s: GameState): number => Math.min(DITCH_MAX, s.fence.level + (s.fence.risePlan[s.turn - 1] ? 1 : 0));

/** Whether the ditch takes one of this size at this level. */
export const sweptAt = (a: Animal, level: number): boolean =>
  !a.swimmer && (a.size === 'small' ? level >= SWEEPS_SMALL : a.size === 'medium' ? level >= SWEEPS_MEDIUM : false);

/** Who the ditch would take at a given level, where they stand (or will stand): not swimmers, not those in the
 * air, and not those beside a large one in the same stretch of water, who hold on to it. */
export function sweptIn(s: GameState, level: number, zoneOf: (a: Animal) => ZoneId = (a) => a.zone): Animal[] {
  const water = (z: ZoneId) => !!FENCE.zones.find((d) => d.id === z)?.water;
  const anchored = (a: Animal) => s.animals.some((o) => o !== a && o.status === 'active' && o.size === 'large' && !o.flying && zoneOf(o) === zoneOf(a));
  return s.animals.filter((a) => a.status === 'active' && water(zoneOf(a)) && !a.flying && sweptAt(a, level) && !anchored(a));
}

/** Whoever the wire would touch where they stand: in a wire zone, on the ground, not dug in. */
export function onTheWire(s: GameState, zoneOf: (a: Animal) => ZoneId = (a) => a.zone): Animal[] {
  const wire = (z: ZoneId) => !!FENCE.zones.find((d) => d.id === z)?.wire;
  return s.animals.filter((a) => a.status === 'active' && wire(zoneOf(a)) && !a.flying && !a.underground);
}
