// Irrbloss: the bog at night, and lights over it. They hang over the deep pools and the
// soft moss, and whoever has a will of their own and sees one close by walks toward it.
// Once in the night one light is true: it hangs over firm ground. Telling which takes a
// nose for the dark – or a toad, who has seen them all its life.
import { random, type RngHolder } from '../rng';
import type { ZoneId } from '../types';
import type { EncounterDef } from './types';

export const WISPS: EncounterDef = {
  id: 'wisps',
  title: { day: 'Irrblosskärret', night: 'Irrblosskärret' },
  fixedTime: 'night',
  crossed: 'nådde granskogen',
  timeUp: {
    day: 'Det ljusnar. Ljusen slocknar ett efter ett, och mossen blir grå. Vi kan inte vänta längre.',
    night: 'Det ljusnar. Ljusen slocknar ett efter ett, och mossen blir grå. Vi kan inte vänta längre.',
  },
  leftBehind: { day: 'som följde ljusen', night: 'som följde ljusen' },
  lastHour: {
    day: 'Det grånar i öster. Det här är sista timmen.',
    night: 'Det grånar i öster. Det här är sista timmen.',
  },
  maxTurn: 8,
  zones: [
    { id: 'ljungkanten', label: 'Ljungkanten', name: 'ljungkanten', rect: [0, 80, 100, 20], start: true },
    { id: 'karretV', label: 'Kärret, väst', name: 'kärret i väster', rect: [0, 58, 34, 22], soft: true },
    { id: 'stenen', label: 'Stenen', name: 'stenen', rect: [34, 58, 32, 22], cover: true },
    { id: 'karretO', label: 'Kärret, öst', name: 'kärret i öster', rect: [66, 58, 34, 22], soft: true },
    { id: 'svartgolen', label: 'Svartgölen', name: 'svartgölen', rect: [0, 36, 34, 22], water: true, pool: true },
    { id: 'mossen', label: 'Mossen', name: 'mossen', rect: [34, 36, 32, 22], soft: true, exposed: true },
    { id: 'djupgolen', label: 'Djupgölen', name: 'djupgölen', rect: [66, 36, 34, 22], water: true, pool: true },
    { id: 'starren', label: 'Starren', name: 'starren', rect: [0, 14, 34, 22], soft: true },
    { id: 'kavelbron', label: 'Kavelbron', name: 'kavelbron', rect: [34, 14, 32, 22] },
    { id: 'tuvbacken', label: 'Tuvbacken', name: 'tuvbacken', rect: [66, 14, 34, 22] },
    { id: 'granskogen', label: 'Granskogen', name: 'granskogen', rect: [0, 0, 100, 14], goal: true },
  ],
  // Across the lit bog to the spruce wood – and along each row.
  edges: [
    ['ljungkanten', 'stenen'],
    ['ljungkanten', 'karretV'],
    ['ljungkanten', 'karretO'],
    ['karretV', 'svartgolen'],
    ['stenen', 'mossen'],
    ['karretO', 'djupgolen'],
    ['karretV', 'stenen'],
    ['stenen', 'karretO'],
    ['svartgolen', 'starren'],
    ['mossen', 'kavelbron'],
    ['djupgolen', 'tuvbacken'],
    ['svartgolen', 'mossen'],
    ['mossen', 'djupgolen'],
    ['starren', 'kavelbron'],
    ['kavelbron', 'tuvbacken'],
    ['starren', 'granskogen'],
    ['kavelbron', 'granskogen'],
    ['tuvbacken', 'granskogen'],
  ],
};

/** Where the false lights hang: over the pools and the soft moss. */
export const LURES: ZoneId[] = ['karretV', 'karretO', 'svartgolen', 'mossen', 'djupgolen', 'starren'];
/** Where the true light may hang: over firm ground. */
export const FIRM: ZoneId[] = ['stenen', 'kavelbron', 'tuvbacken'];

export interface WispPlan {
  /** The lights of each hour, false ones first; the true one, in its hour, last. */
  plan: ZoneId[][];
  /** The hour the true light shows, and where. */
  trueAt: number;
  trueZone: ZoneId;
  /** Whether we know which light is true. */
  known: boolean;
}

/** The night's lights: one an hour, two or three when the bog is full of them – and once, a true one. */
export function planWisps(h: RngHolder, maxTurn: number, hard: boolean): WispPlan {
  const plan: ZoneId[][] = [];
  for (let i = 0; i < maxTurn; i++) {
    const n = hard ? 2 + (random(h) < 0.5 ? 1 : 0) : 1;
    const pool = [...LURES];
    plan.push(Array.from({ length: n }, () => pool.splice(Math.floor(random(h) * pool.length), 1)[0]));
  }
  const trueAt = 2 + Math.floor(random(h) * 6);
  const trueZone = FIRM[Math.floor(random(h) * FIRM.length)];
  plan[trueAt - 1].push(trueZone);
  return { plan, trueAt, trueZone, known: false };
}
