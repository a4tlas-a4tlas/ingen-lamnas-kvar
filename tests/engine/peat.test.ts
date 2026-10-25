import { describe, expect, it } from 'vitest';
import { MOSSEN } from '../../src/data/regions/mossen';
import { DITCH_FULL, STACKS, cutZones, planPeat } from '../../src/engine/encounters/peat';
import { generateRegion } from '../../src/engine/regions';
import { canEnter } from '../../src/engine/rules';
import { createGame, regionJourney } from '../../src/engine/setup';
import { step } from '../../src/engine/step';
import type { GameState, Variant, ZoneId } from '../../src/engine/types';
import { forecast } from '../../src/ui/status';
import { get, plain, run } from './helpers';

/** Straight into the peat cutting, in Mossen. */
function peat(variant: Variant = 'normal', seed = 5): GameState {
  let s = run(plain(createGame(seed)), { type: 'swear', verses: ['manen'] });
  s.journey = regionJourney(MOSSEN, seed);
  s.run.regions = ['dalen', 'mossen'];
  s.journey.nodes.push({ ...MOSSEN.dangers.find((t) => t.encounter === 'peat')!, id: 'here', row: 1, x: 50, y: 80, next: [] });
  s.journey.nodes[0].next = ['here'];
  s.journey.truth.here = variant;
  s.journey.guess.here = variant;
  for (const a of s.animals) a.status = 'safe';
  s = run(s, { type: 'travel', to: 'here' });
  for (const a of s.animals) if (a.status === 'active') { a.belief = 8; a.intent = { kind: 'follow' }; }
  s.kraft = 99;
  return s;
}

/** Everyone at the edge except those named; the machine in the row we say, this hour and the next. */
function setUp(s: GameState, at: Record<string, ZoneId> = {}, row: number | null = 1, next: number | null = null): GameState {
  for (const a of s.animals) if (a.status === 'active') a.zone = 'taktkanten';
  for (const [id, z] of Object.entries(at)) get(s, id).zone = z;
  s.peat.rows[s.turn - 1] = row;
  s.peat.rows[s.turn] = next;
  return s;
}
const pass = (s: GameState) => run(s, { type: 'endTurn' });

describe('Torvtäkten', () => {
  it('works only by day, and lies on Mossen’s maps', () => {
    expect(peat().time).toBe('day');
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) for (const n of generateRegion(MOSSEN, i).nodes) if (n.encounter) seen.add(n.encounter);
    expect(seen.has('peat')).toBe(true);
  });

  it('drives back and forth over the rows, resting every other hour – every third, when they work in shifts', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const n = planPeat({ rng: seed }, 8, false);
      expect(n.map((r) => r === null)).toEqual([false, true, false, true, false, true, false, true]);
      const h = planPeat({ rng: seed }, 8, true);
      expect(h.map((r) => r === null)).toEqual([false, false, true, false, false, true, false, false]);
      const worked = n.filter((r): r is number => r !== null);
      for (const r of worked) expect([1, 2, 3]).toContain(r);
    }
  });

  it('runs over whoever is in its row, with a last moment – but never cuts the peat stacks', () => {
    const s = pass(setUp(peat(), { fox: 'falt1m', badger: 'stack1' }, 1));
    expect(s.phase).toBe('lastMoment');
    expect(s.pending).toMatchObject({ victim: 'fox', source: 'torvmaskinen' });
    expect(get(s, 'badger').status).toBe('active');
    for (let r = 1; r <= 3; r++) for (const z of STACKS) expect(cutZones(r)).not.toContain(z);
  });

  it('leaves a ditch behind it that fills, until the small who cannot swim can’t cross', () => {
    let s = pass(setUp(peat(), {}, 2));
    expect(s.peat.ditch.falt2v).toBe(1);
    s.peat.rows[s.turn] = null;
    s = pass(s);
    expect(s.peat.ditch.falt2v).toBe(DITCH_FULL);
    expect(canEnter(s, get(s, 'adder'), 'falt2v')).toBe(false);
    expect(canEnter(s, get(s, 'toad'), 'falt2v')).toBe(true);
    expect(canEnter(s, get(s, 'badger'), 'falt2v')).toBe(true);
    expect(canEnter(s, get(s, 'owl'), 'falt2v')).toBe(true);
  });

  it('the forecast names whom the machine runs over, and says when it rests', () => {
    const s = setUp(peat(), { fox: 'falt1o' }, 1);
    expect(forecast(s).map((l) => l.text).join(' | ')).toMatch(/Maskinen kör över .* i torvfältet i öster: dödar/);
    const r = setUp(peat(), {}, null);
    expect(forecast(r).map((l) => l.text)).toContain('Maskinen vilar den här timmen.');
  });

  it('plays out the same for the same state', () => {
    const s = setUp(peat('hard'), { badger: 'falt2m', fox: 'stack2' }, 2, 3);
    expect(step(s, { type: 'endTurn' }).state).toEqual(step(s, { type: 'endTurn' }).state);
  });
});
