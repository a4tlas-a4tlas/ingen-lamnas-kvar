// Vägen: two lanes of traffic, a median, and a hidden culvert. By night fewer
// cars but dark ones and the moon; by day more cars, all of them seen.
import { random, pick, randInt, type RngHolder } from '../rng';
import type { LaneId, Strike, TimeOfDay, RoadKind } from '../types';
import type { EncounterDef } from './types';

export const ROAD: EncounterDef = {
  id: 'road',
  title: { night: 'Vägen om natten', day: 'Vägen i dagsljus' },
  crossed: 'kom över vägen',
  timeUp: {
    night: 'Gryningen kom, grå och obeveklig. Vi kunde inte vänta längre.',
    day: 'Kvällens rusning kom, ljus efter ljus. Vi kunde inte vänta längre.',
  },
  leftBehind: { night: 'som blev kvar när gryningen kom', day: 'som blev kvar vid vägen' },
  lastHour: {
    night: 'Himlen ljusnar i öster. Det här är nattens sista timme.',
    day: 'Solen sjunker bakom granarna. Det här är dagens sista timme.',
  },
  maxTurn: 10,
  zones: [
    { id: 'dike', label: 'Diket', name: 'diket', rect: [0, 68, 100, 32], start: true },
    { id: 'lane1', label: 'Körfält 1', name: 'första körfältet', rect: [0, 52, 100, 16], road: true, exposed: true },
    { id: 'median', label: 'Mittremsan', name: 'mittremsan', rect: [0, 44, 100, 8], exposed: true },
    { id: 'lane2', label: 'Körfält 2', name: 'andra körfältet', rect: [0, 28, 100, 16], road: true, exposed: true },
    { id: 'farDike', label: 'Andra diket', name: 'andra diket', rect: [0, 14, 100, 14], goal: true },
    { id: 'culvert', label: 'Trumman', name: 'trumman', rect: [0, 26, 15, 44], hidden: true, smallOnly: true, slow: true },
  ],
  edges: [
    ['dike', 'lane1'],
    ['lane1', 'median'],
    ['median', 'lane2'],
    ['lane2', 'farDike'],
    ['dike', 'culvert'],
    ['culvert', 'farDike'],
  ],
};

export const LANES: LaneId[] = ['lane1', 'lane2'];

function rollTraffic(h: RngHolder, turn: number, darkTurn: number, time: TimeOfDay): Strike[] {
  const strikes: Strike[] = [];
  // Cars injure; trucks kill.
  const car = (lane: LaneId): Strike =>
    random(h) < 0.18 + turn * 0.02
      ? { lane, severity: 'kill', vehicle: 'lastbil', dark: false }
      : { lane, severity: 'injure', vehicle: 'bil', dark: false };

  if (turn === 1) strikes.push(car(pick(h, LANES)));
  else {
    const r = random(h);
    // By day the road is busier: fewer quiet hours, more hours with both lanes.
    const [quiet, both] = time === 'day' ? [0.05, 0.72] : [0.12, 0.55];
    if (r < quiet) {
      // A quiet hour. Tempting.
    } else if (r < both) strikes.push(car('lane1'), car('lane2'));
    else strikes.push(car(pick(h, LANES)));
  }
  if (turn === darkTurn) strikes.push({ lane: pick(h, LANES), severity: 'kill', vehicle: 'mörk bil', dark: true });
  return strikes;
}

/** The gravel road between the fields: tractors, slow and wide – they fill both lanes – and the odd car. Nothing comes unlit. */
function rollGravel(h: RngHolder, turn: number): Strike[] {
  const tractor = (lane: LaneId): Strike => ({ lane, severity: 'kill', vehicle: 'traktor', dark: false });
  const r = random(h);
  if (turn > 1 && r < 0.35) return [tractor('lane1'), tractor('lane2')];
  if (r < 0.6) return [{ lane: pick(h, LANES), severity: 'injure', vehicle: 'bil', dark: false }];
  return [];
}

/** The whole crossing's traffic and moon are decided up front, so they can be telegraphed and peeked. */
export function planRoad(h: RngHolder, maxTurn: number, time: TimeOfDay, kind: RoadKind = 'asphalt'): { trafficPlan: Strike[][]; moonPlan: boolean[] } {
  // Dark cars only come at night: by day every car is seen.
  const darkTurn = time === 'night' ? 4 + randInt(h, 4) : -1;
  const trafficPlan: Strike[][] = [];
  const moonPlan: boolean[] = [];
  for (let t = 1; t <= maxTurn; t++) {
    trafficPlan.push(kind === 'gravel' ? rollGravel(h, t) : rollTraffic(h, t, darkTurn, time));
    moonPlan.push(random(h) < 0.4);
  }
  return { trafficPlan, moonPlan };
}
