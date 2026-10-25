import { describe, expect, it } from 'vitest';
import { MOSSEN } from '../../src/data/regions/mossen';
import { STUCK_AT } from '../../src/engine/encounters/bog';
import { FIRM, LURES, planWisps } from '../../src/engine/encounters/wisps';
import { generateRegion } from '../../src/engine/regions';
import { leadTargets } from '../../src/engine/rules';
import { createGame, regionJourney } from '../../src/engine/setup';
import { step } from '../../src/engine/step';
import type { GameState, Variant, ZoneId } from '../../src/engine/types';
import { forecast } from '../../src/ui/status';
import { get, plain, run } from './helpers';

/** Straight onto the lit bog, in Mossen. */
function wisps(variant: Variant = 'normal', seed = 5): GameState {
  let s = run(plain(createGame(seed)), { type: 'swear', verses: ['manen'] });
  s.journey = regionJourney(MOSSEN, seed);
  s.run.regions = ['dalen', 'mossen'];
  const start = s.journey.nodes[0];
  const node = { ...MOSSEN.dangers.find((t) => t.encounter === 'wisps')!, id: 'here', row: 1, x: 50, y: 80, next: [] };
  s.journey.nodes.push(node);
  start.next = ['here'];
  s.journey.truth.here = variant;
  s.journey.guess.here = variant;
  for (const a of s.animals) a.status = 'safe';
  s = run(s, { type: 'travel', to: 'here' });
  for (const a of s.animals) if (a.status === 'active') { a.belief = 8; a.intent = { kind: 'follow' }; }
  s.kraft = 99;
  return s;
}

/** Everyone at the heath edge except those named; this hour's lights as we say; the next hour's too, so the lure is set when the hour turns. */
function setUp(s: GameState, at: Record<string, ZoneId> = {}, lights: ZoneId[] = [], next: ZoneId[] = []): GameState {
  for (const a of s.animals) if (a.status === 'active') a.zone = 'ljungkanten';
  for (const [id, z] of Object.entries(at)) get(s, id).zone = z;
  s.wisps.plan[s.turn - 1] = lights;
  s.wisps.plan[s.turn] = next;
  s.wisps.trueAt = 99;
  s.bogFrom = Object.fromEntries(s.animals.map((a) => [a.id, a.zone]));
  return s;
}
const pass = (s: GameState) => run(s, { type: 'endTurn' });
const lines = (s: GameState) => s.log.map((e) => ('text' in e ? String(e.text) : ''));

describe('Irrbloss', () => {
  it('is always at night, and lies on Mossen’s maps', () => {
    expect(wisps().time).toBe('night');
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) for (const n of generateRegion(MOSSEN, i).nodes) if (n.encounter) seen.add(n.encounter);
    expect(seen.has('wisps')).toBe(true);
  });

  it('one light an hour over pools and soft moss, two or three when many – and once a true one, over firm ground', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const n = planWisps({ rng: seed }, 8, false);
      const h = planWisps({ rng: seed }, 8, true);
      n.plan.forEach((l, i) => {
        const falses = i + 1 === n.trueAt ? l.slice(0, -1) : l;
        expect(falses).toHaveLength(1);
        for (const z of falses) expect(LURES).toContain(z);
      });
      h.plan.forEach((l, i) => expect((i + 1 === h.trueAt ? l.length - 1 : l.length)).toBeGreaterThanOrEqual(2));
      expect(FIRM).toContain(n.trueZone);
      expect(n.plan[n.trueAt - 1]).toContain(n.trueZone);
      expect(n.trueAt).toBeGreaterThanOrEqual(2);
      expect(n.trueAt).toBeLessThanOrEqual(7);
    }
  });

  it('draws whoever has a will of their own and stands beside a light – and walks them into it', () => {
    const s0 = setUp(wisps(), { owl: 'karretV' }, [], ['svartgolen']);
    get(s0, 'owl').belief = 3;
    let s = pass(s0);
    expect(get(s, 'owl').intent).toEqual({ kind: 'lured', to: 'svartgolen' });
    // The badger follows us, and is not drawn.
    expect(get(s, 'badger').intent.kind).toBe('follow');
    s.wisps.plan[s.turn] = [];
    s = pass(s);
    expect(get(s, 'owl').zone).toBe('svartgolen');
  });

  it('comfort breaks the pull; in trust, fewer are drawn', () => {
    const s0 = setUp(wisps(), { owl: 'karretV' }, [], ['svartgolen']);
    get(s0, 'owl').belief = 4;
    s0.hope = 8;
    const s = pass(s0);
    // Trust lowers the line: at 4, the owl still follows.
    expect(get(s, 'owl').intent.kind).not.toBe('lured');
  });

  it('the deep pools drown the small who cannot swim, chill the rest, and leave swimmers be', () => {
    const s = pass(setUp(wisps(), { adder: 'djupgolen', fox: 'svartgolen', toad: 'svartgolen' }));
    expect(s.phase).toBe('lastMoment');
    expect(s.pending).toMatchObject({ victim: 'adder', source: 'gölen' });
    expect(get(s, 'fox').belief).toBe(7);
    expect(get(s, 'toad').belief).toBe(8);
  });

  it('the soft moss sinks us here too, as on Gungflyet', () => {
    const s = pass(setUp(wisps(), { badger: 'mossen', fox: 'karretO' }));
    expect(get(s, 'badger').sink).toBe(STUCK_AT);
    expect(get(s, 'fox').sink).toBe(2);
    expect(leadTargets(s)).not.toContain('badger');
  });

  it('the true light lifts those who stand in it; the toad knows it, and a nose for the dark shows it', () => {
    const s0 = setUp(wisps(), { fox: 'stenen' });
    s0.wisps.trueAt = s0.turn;
    s0.wisps.trueZone = 'stenen';
    s0.wisps.plan[s0.turn - 1] = ['karretV', 'stenen'];
    const s = pass(s0);
    expect(get(s, 'fox').belief).toBe(9);
    expect(lines(s).some((l) => /var sant/.test(l))).toBe(true);

    const t0 = setUp(wisps(), {}, [], ['karretV', 'kavelbron']);
    t0.wisps.trueAt = t0.turn + 1;
    t0.wisps.trueZone = 'kavelbron';
    const t = pass(t0);
    expect(t.wisps.known).toBe(true);
    expect(forecast(t).map((l) => l.text).join(' | ')).toMatch(/kavelbron är sant/);
  });

  it('plays out the same for the same state', () => {
    const s = setUp(wisps('hard'), { owl: 'karretV', badger: 'mossen' }, ['svartgolen']);
    expect(step(s, { type: 'endTurn' }).state).toEqual(step(s, { type: 'endTurn' }).state);
  });
});
