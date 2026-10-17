// Vägen om natten: two lanes of night traffic, a median, and a hidden culvert.
import { random, pick, randInt, type RngHolder } from '../rng';
import type { LaneId, Strike } from '../types';
import type { EncounterDef } from './types';

export const ROAD: EncounterDef = {
  id: 'road',
  title: 'Vägen om natten',
  night: true,
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

function rollTraffic(h: RngHolder, turn: number, darkTurn: number): Strike[] {
  const strikes: Strike[] = [];
  // Cars injure; trucks kill.
  const car = (lane: LaneId): Strike =>
    random(h) < 0.18 + turn * 0.02
      ? { lane, severity: 'kill', vehicle: 'lastbil', dark: false }
      : { lane, severity: 'injure', vehicle: 'bil', dark: false };

  if (turn === 1) strikes.push(car(pick(h, LANES)));
  else {
    const r = random(h);
    if (r < 0.12) {
      // A quiet hour. Tempting.
    } else if (r < 0.55) strikes.push(car('lane1'), car('lane2'));
    else strikes.push(car(pick(h, LANES)));
  }
  if (turn === darkTurn) strikes.push({ lane: pick(h, LANES), severity: 'kill', vehicle: 'mörk bil', dark: true });
  return strikes;
}

/** The whole night's traffic and moon are decided up front, so they can be telegraphed and peeked. */
export function planRoad(h: RngHolder, maxTurn: number): { trafficPlan: Strike[][]; moonPlan: boolean[] } {
  const darkTurn = 4 + randInt(h, 4);
  const trafficPlan: Strike[][] = [];
  const moonPlan: boolean[] = [];
  for (let t = 1; t <= maxTurn; t++) {
    trafficPlan.push(rollTraffic(h, t, darkTurn));
    moonPlan.push(random(h) < 0.4);
  }
  return { trafficPlan, moonPlan };
}
