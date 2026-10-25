import { describe, expect, it } from 'vitest';
import { MOSSEN } from '../../src/data/regions/mossen';
import { CRANES, DANCE, planFlocks } from '../../src/engine/encounters/cranes';
import { generateRegion } from '../../src/engine/regions';
import { zoneDistance } from '../../src/engine/rules';
import { createGame, regionJourney } from '../../src/engine/setup';
import { step } from '../../src/engine/step';
import type { GameState, Variant, ZoneId } from '../../src/engine/types';
import { forecast } from '../../src/ui/status';
import { get, plain, run } from './helpers';

/** Straight onto the cranes' bog, in Mossen. */
function cranes(variant: Variant = 'normal', seed = 5): GameState {
  let s = run(plain(createGame(seed)), { type: 'swear', verses: ['manen'] });
  s.journey = regionJourney(MOSSEN, seed);
  s.run.regions = ['dalen', 'mossen'];
  s.journey.nodes.push({ ...MOSSEN.dangers.find((t) => t.encounter === 'cranes')!, id: 'here', row: 1, x: 50, y: 80, next: [] });
  s.journey.nodes[0].next = ['here'];
  s.journey.truth.here = variant;
  s.journey.guess.here = variant;
  for (const a of s.animals) a.status = 'safe';
  s = run(s, { type: 'travel', to: 'here' });
  for (const a of s.animals) if (a.status === 'active') { a.belief = 8; a.intent = { kind: 'follow' }; }
  s.kraft = 99;
  return s;
}

/** Everyone at the edge except those named; one flock, dancing where we say this hour. */
function setUp(s: GameState, at: Record<string, ZoneId> = {}, flock: ZoneId = 'dansplatsen'): GameState {
  for (const a of s.animals) if (a.status === 'active') a.zone = 'myrkanten';
  for (const [id, z] of Object.entries(at)) get(s, id).zone = z;
  s.cranes.flocks = [Array(s.maxTurn).fill(flock)];
  return s;
}
const pass = (s: GameState) => run(s, { type: 'endTurn' });
const adjacent = (a: ZoneId, b: ZoneId) => CRANES.edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

describe('Tranorna', () => {
  it('is always at dawn, and lies on Mossen’s maps', () => {
    expect(cranes().time).toBe('day');
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) for (const n of generateRegion(MOSSEN, i).nodes) if (n.encounter) seen.add(n.encounter);
    expect(seen.has('cranes')).toBe(true);
  });

  it('each flock dances one step an hour over the open bog, never straight back – two flocks when the whole bog dances', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const n = planFlocks({ rng: seed }, 8, false);
      expect(n).toHaveLength(1);
      expect(planFlocks({ rng: seed }, 8, true)).toHaveLength(2);
      const p = n[0];
      p.forEach((z, i) => {
        expect(DANCE).toContain(z);
        if (i > 0) expect(adjacent(p[i - 1], z)).toBe(true);
        if (i > 1 && p[i - 2] === z) expect(['starrmyren']).toContain(p[i - 1]);
      });
    }
  });

  it('whoever stands in the dance is driven out one zone, aside or ahead, and loses belief; the small are trampled; no one dies', () => {
    const s = pass(setUp(cranes(), { badger: 'dansplatsen', adder: 'dansplatsen' }));
    for (const id of ['badger', 'adder']) {
      const a = get(s, id);
      expect(a.status).toBe('active');
      expect(a.zone).not.toBe('dansplatsen');
      expect(zoneDistance(s, a.zone, 'dansplatsen')).toBe(1);
      // Aside or ahead, never back toward the edge.
      expect(a.zone).not.toBe('myrslogen');
      expect(a.belief).toBe(7);
    }
    expect(get(s, 'adder').injuries).toContain('shock');
    expect(get(s, 'badger').injuries).toEqual([]);
  });

  it('the thickets are safe: the cranes never dance there', () => {
    for (let seed = 1; seed <= 40; seed++) for (const f of planFlocks({ rng: seed }, 8, true)) for (const z of f) expect(['videsnaret', 'bjorkdungen']).not.toContain(z);
  });

  it('when the flock is far from all of us, its call tells us what lies ahead – once', () => {
    const near = pass(setUp(cranes(), { badger: 'myrslogen' }, 'myrslogen'));
    expect(near.cranes.called).toBe(false);
    const far0 = setUp(cranes(), {}, 'starrmyren');
    const far = pass(far0);
    expect(far.cranes.called).toBe(true);
    const calls = (st: GameState) => st.log.filter((e) => 'text' in e && /Tranornas rop/.test(e.text)).length;
    expect(calls(pass(far))).toBe(calls(far));
  });

  it('the forecast names who is driven out and trampled', () => {
    const s = setUp(cranes(), { adder: 'dansplatsen' });
    const name = get(s, 'adder').name;
    expect(forecast(s).map((l) => l.text).join(' | ')).toContain(`Tranorna knuffar ${name} ut ur dansplatsen (−1 tro) och trampar ${name} (chock).`);
  });

  it('plays out the same for the same state', () => {
    const s = setUp(cranes('hard'), { badger: 'dansplatsen', fox: 'myrslogen' });
    expect(step(s, { type: 'endTurn' }).state).toEqual(step(s, { type: 'endTurn' }).state);
  });
});
