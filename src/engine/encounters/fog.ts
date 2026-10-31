// Dimman: Mossen's last day, and its boss. The fog lies so thick we lose each other. We
// only see where we stand and just beside it; which zones are soft moss, deep pools or
// firm ground we learn by coming close. Only one who has someone close nearby – a bond of
// two or more, in the same zone or the next – hears a call and can be led. Whoever has
// no one near drifts with the fog. If we found the lost one in the mist, it calls to us
// from the far side, and the last stretch is never lonely.
import { random, type RngHolder } from '../rng';
import type { GameState, ZoneId } from '../types';
import type { EncounterDef } from './types';

export const FOG: EncounterDef = {
  id: 'fog',
  title: { day: 'Dimman', night: 'Dimman i natten' },
  crossed: 'kom ut ur dimman',
  timeUp: {
    day: 'Dimman sluter sig helt. Vi ropar och ropar, men ingen svarar längre. Vi kan inte vänta mer.',
    night: 'Dimman sluter sig helt. Vi ropar och ropar, men ingen svarar längre. Vi kan inte vänta mer.',
  },
  leftBehind: { day: 'som dimman tog', night: 'som dimman tog' },
  lastHour: {
    day: 'Det här är sista timmen. Ropa nu.',
    night: 'Det här är sista timmen. Ropa nu.',
  },
  maxTurn: 10,
  zones: [
    { id: 'myrranden', label: 'Myrranden', name: 'myrranden', rect: [0, 80, 100, 20], start: true },
    { id: 'dimma1v', label: 'Kärret, väst', name: 'kärret i väster', rect: [0, 58, 34, 22] },
    { id: 'dimma1m', label: 'Kärret', name: 'kärret', rect: [34, 58, 32, 22] },
    { id: 'dimma1o', label: 'Kärret, öst', name: 'kärret i öster', rect: [66, 58, 34, 22] },
    { id: 'dimma2v', label: 'Det grå, väst', name: 'det grå i väster', rect: [0, 36, 34, 22] },
    { id: 'dimma2m', label: 'Det grå', name: 'det grå', rect: [34, 36, 32, 22] },
    { id: 'dimma2o', label: 'Det grå, öst', name: 'det grå i öster', rect: [66, 36, 34, 22] },
    { id: 'dimma3v', label: 'Det vita, väst', name: 'det vita i väster', rect: [0, 14, 34, 22] },
    { id: 'dimma3m', label: 'Det vita', name: 'det vita', rect: [34, 14, 32, 22] },
    { id: 'dimma3o', label: 'Det vita, öst', name: 'det vita i öster', rect: [66, 14, 34, 22] },
    { id: 'skogsranden', label: 'Skogsranden', name: 'skogsranden', rect: [0, 0, 100, 14], goal: true },
  ],
  edges: [
    ['myrranden', 'dimma1m'],
    ['myrranden', 'dimma1v'],
    ['myrranden', 'dimma1o'],
    ['dimma1v', 'dimma2v'],
    ['dimma1m', 'dimma2m'],
    ['dimma1o', 'dimma2o'],
    ['dimma1v', 'dimma1m'],
    ['dimma1m', 'dimma1o'],
    ['dimma2v', 'dimma3v'],
    ['dimma2m', 'dimma3m'],
    ['dimma2o', 'dimma3o'],
    ['dimma2v', 'dimma2m'],
    ['dimma2m', 'dimma2o'],
    ['dimma3v', 'dimma3m'],
    ['dimma3m', 'dimma3o'],
    ['dimma3v', 'skogsranden'],
    ['dimma3m', 'skogsranden'],
    ['dimma3o', 'skogsranden'],
  ],
};

export type FogKind = 'firm' | 'soft' | 'pool';
const ROWS: ZoneId[][] = [['dimma1v', 'dimma1m', 'dimma1o'], ['dimma2v', 'dimma2m', 'dimma2o'], ['dimma3v', 'dimma3m', 'dimma3o']];
/** The last row, beside the far side: where the lost one we found calls from. */
export const LAST_ROW = ROWS[2];

/** What lies under the fog: in each row one firm zone, and of the rest, soft moss or – twice in all – a deep pool. */
export function planFogKinds(h: RngHolder): Record<ZoneId, FogKind> {
  const out: Record<ZoneId, FogKind> = {};
  const others: ZoneId[] = [];
  for (const row of ROWS) {
    const firm = row[Math.floor(random(h) * row.length)];
    for (const z of row) {
      out[z] = z === firm ? 'firm' : 'soft';
      if (z !== firm) others.push(z);
    }
  }
  for (let i = 0; i < 2; i++) out[others.splice(Math.floor(random(h) * others.length), 1)[0]] = 'pool';
  return out;
}

/** Does the lost one we found call to us from the far side? */
export const lostOneCalls = (s: GameState) => s.encounterId === 'fog' && s.knowledge.includes('vilsnaHittad');

/** From this hour, thick fog lets us see and hear only those in our own zone. */
export const THICK_FROM = 4;
