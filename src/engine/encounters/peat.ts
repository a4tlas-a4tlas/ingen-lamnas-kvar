// Torvtäkten: the peat cutting, by day. A great machine drives along one row of the bog
// each hour – heard and seen well ahead – and whoever is in its way is run over. Behind
// it the row becomes a fresh ditch, and the ditches fill with water hour by hour, until
// the small who cannot swim can no longer cross them. Only the peat stacks it leaves
// standing, one in each row, are never cut.
import { random, type RngHolder } from '../rng';
import type { Animal, GameState, ZoneId } from '../types';
import type { EncounterDef } from './types';

export const PEAT: EncounterDef = {
  id: 'peat',
  title: { day: 'Torvtäkten', night: 'Torvtäkten' },
  fixedTime: 'day',
  crossed: 'nådde tallmon',
  timeUp: {
    day: 'Maskinen har skurit hela mossen i bitar. Det finns ingen väg kvar över. Vi kan inte stanna.',
    night: 'Maskinen har skurit hela mossen i bitar. Det finns ingen väg kvar över. Vi kan inte stanna.',
  },
  leftBehind: { day: 'som blev kvar i torvtäkten', night: 'som blev kvar i torvtäkten' },
  lastHour: {
    day: 'Maskinen vänder för sista gången. Det här är sista timmen.',
    night: 'Maskinen vänder för sista gången. Det här är sista timmen.',
  },
  maxTurn: 8,
  zones: [
    { id: 'taktkanten', label: 'Täktkanten', name: 'täktkanten', rect: [0, 80, 100, 20], start: true },
    { id: 'stack1', label: 'Torvstacken, väst', name: 'den västra torvstacken', rect: [0, 58, 34, 22], cover: true },
    { id: 'falt1m', label: 'Torvfältet', name: 'torvfältet', rect: [34, 58, 32, 22], exposed: true },
    { id: 'falt1o', label: 'Torvfältet, öst', name: 'torvfältet i öster', rect: [66, 58, 34, 22], exposed: true },
    { id: 'falt2v', label: 'Täkten, väst', name: 'täkten i väster', rect: [0, 36, 34, 22], exposed: true },
    { id: 'falt2m', label: 'Täkten', name: 'täkten', rect: [34, 36, 32, 22], exposed: true },
    { id: 'stack2', label: 'Torvstacken, öst', name: 'den östra torvstacken', rect: [66, 36, 34, 22], cover: true },
    { id: 'falt3v', label: 'Myren, väst', name: 'myren i väster', rect: [0, 14, 34, 22] },
    { id: 'stack3', label: 'Torvstacken', name: 'torvstacken i mitten', rect: [34, 14, 32, 22], cover: true },
    { id: 'falt3o', label: 'Myren, öst', name: 'myren i öster', rect: [66, 14, 34, 22] },
    { id: 'tallmon', label: 'Tallmon', name: 'tallmon', rect: [0, 0, 100, 14], goal: true },
  ],
  // Over the cut bog to the pine heath – and along each row, from stack to stack.
  edges: [
    ['taktkanten', 'falt1m'],
    ['taktkanten', 'stack1'],
    ['taktkanten', 'falt1o'],
    ['stack1', 'falt2v'],
    ['falt1m', 'falt2m'],
    ['falt1o', 'stack2'],
    ['stack1', 'falt1m'],
    ['falt1m', 'falt1o'],
    ['falt2v', 'falt3v'],
    ['falt2m', 'stack3'],
    ['stack2', 'falt3o'],
    ['falt2v', 'falt2m'],
    ['falt2m', 'stack2'],
    ['falt3v', 'stack3'],
    ['stack3', 'falt3o'],
    ['falt3v', 'tallmon'],
    ['stack3', 'tallmon'],
    ['falt3o', 'tallmon'],
  ],
};

/** The rows the machine cuts, each without its peat stack. */
const ROWS: ZoneId[][] = [['falt1m', 'falt1o'], ['falt2v', 'falt2m'], ['falt3v', 'falt3o']];
export const STACKS: ZoneId[] = ['stack1', 'stack2', 'stack3'];
export const cutZones = (row: number | null): ZoneId[] => (row ? ROWS[row - 1] : []);

/** A ditch this deep is full: the small who cannot swim can't cross it. */
export const DITCH_FULL = 2;

/** The machine's rows, hour by hour: back and forth over the bog. It rests every other hour – every third, when they work in shifts. */
export function planPeat(h: RngHolder, maxTurn: number, hard: boolean): (number | null)[] {
  const sweep = [1, 2, 3, 2];
  const start = Math.floor(random(h) * sweep.length);
  const rests = (i: number) => (hard ? (i + 1) % 3 === 0 : (i + 1) % 2 === 0);
  return Array.from({ length: maxTurn }, (_, i) => (rests(i) ? null : sweep[(start + i) % sweep.length]));
}

/** The row the machine cuts this hour (or the next), if it works. */
export const machineRow = (s: GameState, turn = s.turn): ZoneId[] => (s.encounterId === 'peat' ? cutZones(s.peat.rows[turn - 1] ?? null) : []);
export const ditchLevel = (s: GameState, z: ZoneId) => (s.encounterId === 'peat' ? s.peat.ditch[z] ?? 0 : 0);
/** A full ditch stops the small who can neither swim nor fly. */
export const blockedByDitch = (s: GameState, a: Animal, z: ZoneId) =>
  ditchLevel(s, z) >= DITCH_FULL && a.size === 'small' && !a.swimmer && !a.flier;
