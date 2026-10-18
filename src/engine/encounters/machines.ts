// Maskinerna – Dalens sista morgon: the boss of the glen. The felling machine
// takes the trees zone by zone, the bulldozer takes the ground behind us, and
// the roar of it all gets into the small ones. Get everyone up over the ridge.
import { pick, type RngHolder } from '../rng';
import type { GameState, ZoneId } from '../types';
import type { EncounterDef } from './types';

export const MACHINES: EncounterDef = {
  id: 'machines',
  title: { day: 'Dalens sista morgon', night: 'Dalens sista morgon' },
  fixedTime: 'day',
  crossed: 'kom upp över åsen',
  timeUp: {
    day: 'Maskinerna har tagit allt. Det finns ingen mark kvar att stå på.',
    night: 'Maskinerna har tagit allt. Det finns ingen mark kvar att stå på.',
  },
  leftBehind: { day: 'som blev kvar när maskinerna kom', night: 'som blev kvar när maskinerna kom' },
  lastHour: {
    day: 'Schaktaren är nästan framme. Det här är sista timmen.',
    night: 'Schaktaren är nästan framme. Det här är sista timmen.',
  },
  maxTurn: 8,
  zones: [
    { id: 'glantan', label: 'Gläntan', name: 'gläntan', rect: [0, 76, 100, 24], start: true, exposed: true },
    { id: 'bjorkdungen', label: 'Björkdungen', name: 'björkdungen', rect: [0, 46, 34, 30], cover: true, trees: true },
    { id: 'hygget', label: 'Hygget', name: 'hygget', rect: [34, 46, 32, 30], exposed: true },
    { id: 'stenroset', label: 'Stenröset', name: 'stenröset', rect: [66, 46, 34, 30], exposed: true },
    { id: 'granVast', label: 'Västra granridån', name: 'västra granridån', rect: [0, 24, 50, 22], cover: true, trees: true },
    { id: 'granOst', label: 'Östra granridån', name: 'östra granridån', rect: [50, 24, 50, 22], cover: true, trees: true },
    { id: 'asen', label: 'Åsen', name: 'åsen', rect: [0, 10, 100, 14], goal: true },
  ],
  // Three steps up, whichever way: through the birches, over the clear-cut or across the stones.
  edges: [
    ['glantan', 'hygget'],
    ['glantan', 'bjorkdungen'],
    ['glantan', 'stenroset'],
    ['bjorkdungen', 'granVast'],
    ['hygget', 'granVast'],
    ['hygget', 'granOst'],
    ['stenroset', 'granOst'],
    ['granVast', 'asen'],
    ['granOst', 'asen'],
  ],
};

/** Where trees stand: the felling machine wants them, and they hide us from the roar. */
export const TREES: ZoneId[] = MACHINES.zones.filter((z) => z.trees).map((z) => z.id);
/** The bulldozer takes the ground behind us at the end of these hours. */
export const DOZE_HOURS = [3, 5, 7];

/**
 * The morning is decided up front, so it can be telegraphed – and read from the tracks:
 * which trees fall each hour, and which ground the bulldozer takes.
 * The bulldozer takes the clearing first, then the birches and the stones in either order;
 * the clear-cut, where both ways up meet, is left to the end.
 */
export function planMachines(h: RngHolder, maxTurn: number): { fellPlan: ZoneId[]; dozePlan: (ZoneId | null)[] } {
  const first = pick(h, ['bjorkdungen', 'stenroset'] as ZoneId[]);
  const order: ZoneId[] = ['glantan', first, first === 'bjorkdungen' ? 'stenroset' : 'bjorkdungen'];
  const dozePlan: (ZoneId | null)[] = Array.from({ length: maxTurn }, (_, i) => {
    const k = DOZE_HOURS.indexOf(i + 1);
    return k >= 0 ? order[k] : null;
  });
  const fellPlan: ZoneId[] = [];
  const gone = new Set<ZoneId>();
  for (let t = 1; t <= maxTurn; t++) {
    const standing = TREES.filter((z) => !gone.has(z) && z !== fellPlan[t - 2]);
    fellPlan.push(pick(h, standing.length ? standing : TREES.filter((z) => !gone.has(z))));
    const dozed = dozePlan[t - 1];
    if (dozed) gone.add(dozed);
  }
  return { fellPlan, dozePlan };
}

/** Zones beside the felling: the roar reaches in – unless trees stand around us and take it. */
export function roarZones(s: GameState): ZoneId[] {
  const fell = s.fellPlan[s.turn - 1];
  if (!fell) return [];
  const near = new Set(MACHINES.edges.flatMap(([a, b]) => (a === fell ? [b] : b === fell ? [a] : [])));
  const zone = (id: ZoneId) => MACHINES.zones.find((z) => z.id === id)!;
  return [...near].filter((z) => !zone(z).trees && !zone(z).goal && !s.closed.includes(z));
}
