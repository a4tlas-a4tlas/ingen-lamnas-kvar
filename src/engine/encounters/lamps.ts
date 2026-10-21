// Gatlyktorna: the edge of town at dusk. The street lights come on one by one, on a
// timer we can read, and a man walks his dog round the block. Whoever stands in the
// light where he passes is found: bitten, or chased back. In the dark he sees no one.
import { random, type RngHolder } from '../rng';
import type { Animal, GameState, ZoneId } from '../types';
import type { EncounterDef } from './types';

export const LAMPS: EncounterDef = {
  id: 'lamps',
  title: { day: 'Gatlyktorna', night: 'Gatlyktorna' },
  fixedTime: 'night',
  crossed: 'nådde trädgårdarna',
  timeUp: {
    day: 'Alla lyktor lyser nu, och fler hundar kommer ut. Vi kan inte stanna på gatan längre.',
    night: 'Alla lyktor lyser nu, och fler hundar kommer ut. Vi kan inte stanna på gatan längre.',
  },
  leftBehind: { day: 'som blev kvar under lyktorna', night: 'som blev kvar under lyktorna' },
  lastHour: {
    day: 'Gatan lyser nästan överallt nu. Det här är sista timmen.',
    night: 'Gatan lyser nästan överallt nu. Det här är sista timmen.',
  },
  maxTurn: 8,
  zones: [
    { id: 'dikeskanten', label: 'Dikeskanten', name: 'dikeskanten', rect: [0, 78, 100, 22], start: true, cover: true },
    { id: 'gatanV', label: 'Gatan, väst', name: 'gatan i väster', rect: [0, 50, 38, 28], exposed: true },
    { id: 'busskuren', label: 'Busskuren', name: 'busskuren', rect: [38, 50, 24, 28], cover: true },
    { id: 'gatanO', label: 'Gatan, öst', name: 'gatan i öster', rect: [62, 50, 38, 28], exposed: true },
    { id: 'gardV', label: 'Framgården, väst', name: 'den västra framgården', rect: [0, 22, 38, 28] },
    { id: 'soptunnorna', label: 'Soptunnorna', name: 'soptunnorna', rect: [38, 22, 24, 28], cover: true },
    { id: 'gardO', label: 'Framgården, öst', name: 'den östra framgården', rect: [62, 22, 38, 28] },
    { id: 'tradgardarna', label: 'Trädgårdarna', name: 'trädgårdarna', rect: [0, 6, 100, 16], goal: true },
  ],
  // Over the street, through the front yards, into the gardens – and along each row, out of the light.
  edges: [
    ['dikeskanten', 'busskuren'],
    ['dikeskanten', 'gatanV'],
    ['dikeskanten', 'gatanO'],
    ['gatanV', 'gardV'],
    ['busskuren', 'soptunnorna'],
    ['gatanO', 'gardO'],
    ['gatanV', 'busskuren'],
    ['busskuren', 'gatanO'],
    ['gardV', 'soptunnorna'],
    ['soptunnorna', 'gardO'],
    ['gardV', 'tradgardarna'],
    ['soptunnorna', 'tradgardarna'],
    ['gardO', 'tradgardarna'],
  ],
};

/** The zones with a lamp: the street and the front yards. The bus shelter and the bins stay dark. */
export const LAMPED: ZoneId[] = ['gatanV', 'gatanO', 'gardV', 'gardO'];
/** The walker's round, one zone an hour. */
export const ROUND: ZoneId[] = ['gatanV', 'gatanO', 'gardO', 'gardV'];

/** When each lamp comes on: one at a time, between the second hour and the sixth. */
export function planLamps(h: RngHolder): Record<ZoneId, number> {
  const hours = [2, 3, 4, 5, 6];
  const out: Record<ZoneId, number> = {};
  const pool = [...hours];
  for (const z of LAMPED) out[z] = pool.splice(Math.floor(random(h) * pool.length), 1)[0];
  return out;
}

/** Where each walker starts on his round, and which way he goes. The second, on the hard street, goes the other way. */
export function planWalkers(h: RngHolder, hard: boolean): { at: number; dir: 1 | -1 }[] {
  const first = { at: Math.floor(random(h) * ROUND.length), dir: 1 as const };
  return hard ? [first, { at: (first.at + 2) % ROUND.length, dir: -1 as const }] : [first];
}

/** Is the lamp over this zone on, this hour? */
export const lit = (s: GameState, z: ZoneId, turn = s.turn) => (s.lamps.litAt[z] ?? Infinity) <= turn;

/** Where a walker stands this hour. */
export const walkerZone = (w: { at: number }) => ROUND[((w.at % ROUND.length) + ROUND.length) % ROUND.length];

/** Whom the dog goes for where the walker stands, if it is lit: the smallest on the ground, not hidden. */
export function bitten(s: GameState, z: ZoneId, zoneOf: (a: Animal) => ZoneId = (a) => a.zone): Animal | undefined {
  const rank = { small: 0, medium: 1, large: 2 } as const;
  if (!lit(s, z)) return undefined;
  return s.animals
    .filter((a) => a.status === 'active' && zoneOf(a) === z && !a.flying && !a.hidden)
    .sort((a, b) => rank[a.size] - rank[b.size])[0];
}
