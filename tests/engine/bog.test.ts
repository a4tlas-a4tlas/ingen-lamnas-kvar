import { describe, expect, it } from 'vitest';
import { MOSSEN } from '../../src/data/regions/mossen';
import { STUCK_AT, isSoft, sinkSteps } from '../../src/engine/encounters/bog';
import { generateRegion } from '../../src/engine/regions';
import { leadCost, leadTargets } from '../../src/engine/rules';
import { createGame, regionJourney } from '../../src/engine/setup';
import { step } from '../../src/engine/step';
import type { GameState, Variant, ZoneId } from '../../src/engine/types';
import { forecast } from '../../src/ui/status';
import { get, plain, run } from './helpers';

/** Straight onto the bog, at the start of Mossen. */
function bog(variant: Variant = 'normal', seed = 5): GameState {
  let s = run(plain(createGame(seed)), { type: 'swear', verses: ['manen'] });
  s.journey = regionJourney(MOSSEN, seed);
  s.run.regions = ['dalen', 'mossen'];
  const start = s.journey.nodes[0];
  const first = s.journey.nodes.find((n) => start.next.includes(n.id))!;
  s.journey.truth[first.id] = variant;
  s.journey.guess[first.id] = variant;
  for (const a of s.animals) a.status = 'safe';
  s = run(s, { type: 'travel', to: first.id });
  for (const a of s.animals) if (a.status === 'active') { a.belief = 8; a.intent = { kind: 'follow' }; }
  s.kraft = 99;
  return s;
}

/** Everyone at the edge except those named – and that is where each of us began the hour. */
function setUp(s: GameState, at: Record<string, ZoneId> = {}, sink: Record<string, number> = {}): GameState {
  for (const a of s.animals) if (a.status === 'active') a.zone = 'myrkanten';
  for (const [id, z] of Object.entries(at)) get(s, id).zone = z;
  for (const [id, d] of Object.entries(sink)) get(s, id).sink = d;
  s.bogFrom = Object.fromEntries(s.animals.map((a) => [a.id, a.zone]));
  return s;
}
const pass = (s: GameState) => run(s, { type: 'endTurn' });

describe('Gungflyet', () => {
  it('is Mossen’s first danger: every map opens with the bog and ends in the fog', () => {
    for (let i = 0; i < 20; i++) {
      const map = generateRegion(MOSSEN, i);
      const start = map.nodes[0];
      expect(map.nodes.find((n) => n.id === start.next[0])?.encounter).toBe('bog');
      expect(map.nodes[map.nodes.length - 1]).toMatchObject({ kind: 'encounter', encounter: 'fog', name: 'Dimman' });
    }
  });

  it('standing still on soft moss, the heavy sink fastest: large two steps, medium one, small half', () => {
    const s = pass(setUp(bog(), { badger: 'gungflyet', fox: 'gungflyet', adder: 'gungflyet' }));
    expect(get(s, 'badger').sink).toBe(4);
    expect(get(s, 'fox').sink).toBe(2);
    expect(get(s, 'adder').sink).toBe(1);
    expect(sinkSteps(get(s, 'badger'))).toBe(2);
  });

  it('the tussocks and the plank hold, and moving lets go', () => {
    let s = setUp(bog(), { badger: 'tuvan', fox: 'gungflyet' }, { fox: 2 });
    s = run(s, { type: 'lead', target: 'fox', zone: 'spangen' });
    expect(get(s, 'fox').sink).toBe(0);
    s = pass(s);
    expect(get(s, 'badger').sink).toBe(0);
    expect(get(s, 'fox').sink).toBe(0);
  });

  it('stuck at two steps: no one can lead it – unless a large one stands beside it, and that costs more', () => {
    const s = setUp(bog(), { fox: 'gungflyet' }, { fox: STUCK_AT });
    expect(leadTargets(s)).not.toContain('fox');
    const t = setUp(bog(), { fox: 'gungflyet', badger: 'gungflyet' }, { fox: STUCK_AT });
    expect(leadTargets(t)).toContain('fox');
    expect(leadCost(get(t, 'fox'), t)).toBe(2);
    const k = t.kraft;
    const r = run(t, { type: 'lead', target: 'fox', zone: 'spangen' });
    expect(r.kraft).toBe(k - 2);
    expect(get(r, 'fox').sink).toBe(0);
  });

  it('at three steps the moss pulls one under, with a last moment; swimmers float', () => {
    const s = pass(setUp(bog(), { fox: 'gungflyet', toad: 'gungflyet' }, { fox: STUCK_AT, toad: 5 }));
    expect(s.phase).toBe('lastMoment');
    expect(s.pending).toMatchObject({ victim: 'fox', source: 'gungfly', severity: 'kill' });
    expect(get(s, 'toad').status).toBe('active');
    const after = run(s, { type: 'lastMoment', choice: 'letGo' });
    expect(get(after, 'fox').status).toBe('dead');
    expect(get(after, 'toad').status).toBe('active');
  });

  it('the forecast says who sinks, who gets stuck, who is pulled under', () => {
    const s = setUp(bog(), { badger: 'gungflyet', fox: 'golen', adder: 'dyn' }, { fox: STUCK_AT });
    const text = forecast(s).map((l) => l.text).join(' | ');
    expect(text).toMatch(/fastnar i mossan/);
    expect(text).toMatch(/drar ner .*: dödar/);
  });

  it('after rain, the far tussocks are soft too, and everyone sinks a half-step faster', () => {
    const s = bog('hard');
    expect(isSoft(s, 'tuvorna')).toBe(true);
    expect(isSoft(bog(), 'tuvorna')).toBe(false);
    const r = pass(setUp(s, { fox: 'tuvorna', adder: 'gungflyet' }));
    expect(get(r, 'fox').sink).toBe(3);
    expect(get(r, 'adder').sink).toBe(2);
  });

  it('plays out the same for the same state', () => {
    const s = setUp(bog(), { badger: 'gungflyet', fox: 'starrV' });
    const a = step(s, { type: 'endTurn' });
    const b = step(s, { type: 'endTurn' });
    expect(a.state).toEqual(b.state);
  });
});
