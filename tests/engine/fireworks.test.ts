import { describe, expect, it } from 'vitest';
import { STADEN } from '../../src/data/regions/staden';
import { PARK, parkDistance, planBursts, planCrowd, reaches } from '../../src/engine/encounters/fireworks';
import { generateRegion } from '../../src/engine/regions';
import { bondKey } from '../../src/engine/rules';
import { createGame, regionJourney } from '../../src/engine/setup';
import { step } from '../../src/engine/step';
import type { GameState, Variant, ZoneId } from '../../src/engine/types';
import { forecast } from '../../src/ui/status';
import { get, plain, run } from './helpers';

/** At the city's last fire, with only the park ahead – and into it. */
function park(variant: Variant = 'normal', seed = 5): GameState {
  let s = run(plain(createGame(seed)), { type: 'swear', verses: ['manen'] });
  s.journey = regionJourney(STADEN, seed);
  s.run.regions = ['dalen', 'akrarna', 'staden'];
  const end = s.journey.nodes.find((n) => n.encounter === 'fireworks')!;
  const fire = s.journey.nodes.find((n) => n.next.includes(end.id))!;
  s.journey.at = fire.id;
  s.journey.visited.push(fire.id);
  s.journey.truth[end.id] = variant;
  s.journey.guess[end.id] = variant;
  for (const a of s.animals) a.status = 'safe';
  s = run(s, { type: 'travel', to: end.id });
  calm(s);
  s.kraft = 99;
  return s;
}

function calm(s: GameState) {
  for (const a of s.animals) if (a.status === 'active') { a.belief = 8; a.intent = { kind: 'follow' }; }
}

/** Everyone at the gate except those named; this hour's bursts and crowd as we say; no bonds. */
function setUp(s: GameState, bursts: { zone: ZoneId; strength: 1 | 2 }[], at: Record<string, ZoneId> = {}, crowd: ZoneId | null = null): GameState {
  for (const a of s.animals) if (a.status === 'active') a.zone = 'parkgrinden';
  for (const [id, z] of Object.entries(at)) get(s, id).zone = z;
  s.fireworks.plan[s.turn - 1] = bursts;
  s.fireworks.crowdPlan[s.turn - 1] = crowd as ZoneId;
  s.closed = crowd ? [crowd] : [];
  s.bonds = {};
  calm(s);
  return s;
}

const pass = (s: GameState) => run(s, { type: 'endTurn' });

describe('Fyrverkerinatten', () => {
  it('is the end of the city: every map ends in the park, at night', () => {
    for (let i = 0; i < 20; i++) {
      const last = generateRegion(STADEN, i).nodes.find((n) => n.next.length === 0)!;
      expect(last.encounter).toBe('fireworks');
    }
    const s = park();
    expect(s.encounterId).toBe('fireworks');
    expect(s.time).toBe('night');
    expect(park().fireworks).toEqual(s.fireworks);
  });

  it('the bursts build: one each hour, three heavy ones at midnight – one more from the fourth hour when the whole city fires', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const plan = planBursts({ rng: seed }, 5, false);
      expect(plan[0]).toHaveLength(1);
      expect(plan[0][0].strength).toBe(1);
      for (const h of plan.slice(1, 4)) expect(h).toHaveLength(1);
      expect(plan[4]).toHaveLength(3);
      expect(plan[4].every((b) => b.strength === 2)).toBe(true);
      for (const h of plan) expect(new Set(h.map((b) => b.zone)).size).toBe(h.length);
      const hard = planBursts({ rng: seed }, 5, true);
      expect(hard[2]).toHaveLength(1);
      expect(hard[3]).toHaveLength(2);
      expect(hard[4]).toHaveLength(4);
    }
  });

  it('the crowd fills one zone of the park each hour, never the same twice running', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const c = planCrowd({ rng: seed }, 8);
      for (const z of c) expect(PARK).toContain(z);
      for (let i = 1; i < c.length; i++) expect(c[i]).not.toBe(c[i - 1]);
    }
  });

  it('a bang drives whoever it reaches one zone away from it, and costs belief', () => {
    const s = pass(setUp(park(), [{ zone: 'gangen', strength: 1 }], { toad: 'gangen' }));
    const toad = get(s, 'toad');
    expect(toad.zone).not.toBe('gangen');
    expect(toad.zone).not.toBe('banvallen');
    expect(toad.belief).toBe(7);
  });

  it('a small bang reaches only its own zone; a big one its neighbours too – driving them farther off', () => {
    expect(reaches({ zone: 'grasplanen', strength: 1 }, 'lekplatsen')).toBe(false);
    expect(reaches({ zone: 'grasplanen', strength: 2 }, 'lekplatsen')).toBe(true);
    const s = pass(setUp(park(), [{ zone: 'grasplanen', strength: 2 }], { toad: 'lekplatsen' }));
    expect(parkDistance('grasplanen', get(s, 'toad').zone)).toBeGreaterThan(1);
  });

  it('fliers are driven off too: it is fear, not a hit', () => {
    const s0 = setUp(park(), [{ zone: 'dammen', strength: 1 }], { owl: 'dammen' });
    get(s0, 'owl').flying = true;
    expect(get(pass(s0), 'owl').zone).not.toBe('dammen');
  });

  it('two who are close hold each other, and neither is driven off', () => {
    const s0 = setUp(park(), [{ zone: 'gangen', strength: 1 }], { toad: 'gangen', fox: 'gangen' });
    s0.bonds[bondKey('toad', 'fox')] = 2;
    expect(forecast(s0).map((l) => l.text).join(' | ')).toMatch(/håller i varandra/);
    const s = pass(s0);
    expect(get(s, 'toad').zone).toBe('gangen');
    expect(get(s, 'fox').zone).toBe('gangen');
  });

  it('cover dulls the bang: only one right overhead reaches it', () => {
    const s = pass(setUp(park(), [{ zone: 'gangen', strength: 2 }], { toad: 'buskarna' }));
    expect(get(s, 'toad').zone).toBe('buskarna');
    expect(get(s, 'toad').belief).toBe(8);
    const t = pass(setUp(park(), [{ zone: 'buskarna', strength: 1 }], { toad: 'buskarna' }));
    expect(get(t, 'toad').zone).not.toBe('buskarna');
  });

  it('no one is driven into the crowd; we cannot walk in either – but those already there can walk out', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = pass(setUp(park('normal', seed), [{ zone: 'gangen', strength: 1 }], { toad: 'gangen' }, 'grasplanen'));
      expect(get(s, 'toad').zone).not.toBe('grasplanen');
    }
    const s = setUp(park(), [], { fox: 'buskarna', toad: 'grasplanen' }, 'gangen');
    expect(step(s, { type: 'lead', target: 'fox', zone: 'gangen' }).events.some((e) => e.kind === 'error')).toBe(true);
    s.closed = ['grasplanen'];
    expect(run(s, { type: 'lead', target: 'toad', zone: 'banvallen' }).animals.find((a) => a.id === 'toad')!.status).toBe('safe');
  });

  it('here, comfort given to one reaches all who stand with it', () => {
    const s = setUp(park(), [], { badger: 'gangen', fox: 'gangen', toad: 'gangen' });
    for (const id of ['fox', 'toad']) get(s, id).belief = 3;
    const card = { uid: 9999, kind: 'trosta' as const, owner: 'badger' };
    s.hand.push(card);
    const t = run(s, { type: 'play', uid: 9999, target: 'fox' });
    expect(get(t, 'fox').belief).toBe(5);
    expect(get(t, 'toad').belief).toBe(5);
  });

  it('once across, the city is behind us – and there is no more road built yet', () => {
    let s = park();
    for (const a of s.animals) if (a.status === 'active') a.zone = 'grasplanen';
    s.closed = [];
    for (const a of s.animals.filter((x) => x.status === 'active')) s = run(s, { type: 'lead', target: a.id, zone: 'banvallen' });
    expect(s.phase).not.toBe('play');
    expect(s.run.regions).toContain('staden');
  });

  it('every hour plays out the same for the same state', () => {
    const s = setUp(park('hard'), [{ zone: 'gangen', strength: 2 }, { zone: 'lekplatsen', strength: 2 }], { toad: 'gangen', fox: 'dammen', mice: 'grasplanen' });
    expect(step(s, { type: 'endTurn' }).state).toEqual(step(s, { type: 'endTurn' }).state);
  });
});
