import { describe, expect, it } from 'vitest';
import { STADEN } from '../../src/data/regions/staden';
import { SEWER, SOUND, TUNNELS, depthIn, isFound, planKinds, planRats, planRise } from '../../src/engine/encounters/sewer';
import { generateRegion } from '../../src/engine/regions';
import { createGame, regionJourney } from '../../src/engine/setup';
import { step } from '../../src/engine/step';
import type { GameState, TimeOfDay, Variant, ZoneId } from '../../src/engine/types';
import { forecast } from '../../src/ui/status';
import { get, plain, run } from './helpers';

/** Straight down into the sewer, at the start of the city. */
function sewer(time: TimeOfDay = 'day', variant: Variant = 'normal', seed = 5): GameState {
  let s = run(plain(createGame(seed)), { type: 'swear', verses: ['manen'] });
  s.journey = regionJourney(STADEN, seed);
  s.run.regions = ['dalen', 'akrarna', 'staden'];
  const start = s.journey.nodes[0];
  const first = s.journey.nodes.find((n) => start.next.includes(n.id))!;
  first.encounter = 'sewer';
  first.name = 'Avloppet';
  s.journey.truth[first.id] = variant;
  s.journey.guess[first.id] = variant;
  start.next = [first.id];
  s.clock = time;
  for (const a of s.animals) a.status = 'safe';
  s = run(s, { type: 'travel', to: first.id });
  calm(s);
  s.kraft = 99;
  return s;
}

function calm(s: GameState) {
  for (const a of s.animals) if (a.status === 'active') { a.belief = 8; a.intent = { kind: 'follow' }; }
}

/** Everyone in the shaft except those named; the tunnels, rats, level and rain as we say. */
function setUp(s: GameState, o: { kinds?: Record<ZoneId, 'low' | 'walk' | 'ledge'>; rats?: ZoneId[]; level?: number; rise?: boolean }, at: Record<string, ZoneId> = {}): GameState {
  for (const a of s.animals) if (a.status === 'active') a.zone = 'brunnen';
  for (const [id, z] of Object.entries(at)) get(s, id).zone = z;
  s.sewer.kinds = { ...Object.fromEntries(TUNNELS.map((z) => [z, 'walk'])), ...o.kinds };
  s.sewer.rats = o.rats ?? [];
  s.sewer.level = o.level ?? 0;
  s.sewer.risePlan = s.sewer.risePlan.map(() => false);
  s.sewer.risePlan[s.turn - 1] = !!o.rise;
  calm(s);
  return s;
}

const pass = (s: GameState) => run(s, { type: 'endTurn' });
const letGo = (s: GameState) => { while (s.phase === 'lastMoment') s = run(s, { type: 'lastMoment', choice: 'letGo' }); return s; };

describe('Avloppet', () => {
  it('is a sewer of six tunnels – two low pipes, two walkways, two ledges – the same for a seed', () => {
    const s = sewer();
    expect(s.encounterId).toBe('sewer');
    for (let seed = 1; seed <= 30; seed++) {
      const k = Object.values(planKinds({ rng: seed })).sort();
      expect(k).toEqual(['ledge', 'ledge', 'low', 'low', 'walk', 'walk']);
    }
    expect(sewer().sewer).toEqual(s.sewer);
  });

  it('the rats hold one junction by day, two at night', () => {
    for (let seed = 1; seed <= 30; seed++) {
      expect(planRats({ rng: seed }, 'day')).toHaveLength(1);
      expect(new Set(planRats({ rng: seed }, 'night')).size).toBe(2);
    }
    expect(sewer('night').sewer.rats).toHaveLength(2);
  });

  it('the storm by day raises the water more often than the soft rain at night', () => {
    let day = 0;
    let night = 0;
    for (let seed = 1; seed <= 100; seed++) {
      day += planRise({ rng: seed }, 8, 'day').filter(Boolean).length;
      night += planRise({ rng: seed }, 8, 'night').filter(Boolean).length;
      expect(planRise({ rng: seed }, 8, 'day')[0]).toBe(false);
    }
    expect(day).toBeGreaterThan(night * 1.5);
    expect(sewer('day', 'hard').sewer.level).toBe(1);
  });

  it('from the shaft we find the front tunnels; the back ones are found when one of us stands beside them', () => {
    let s = sewer();
    expect(['tunnel1', 'tunnel2', 'tunnel3'].every((z) => isFound(s, z))).toBe(true);
    expect(isFound(s, 'tunnel5')).toBe(false);
    s = run(s, { type: 'lead', target: 'badger', zone: 'tunnel1' });
    expect(isFound(s, 'tunnel4')).toBe(true);
    expect(isFound(s, 'tunnel6')).toBe(false);
  });

  it('what we hear of a tunnel not yet found is true', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = pass(sewer('day', 'normal', seed));
      const said = s.log.map((l) => l.text).join(' | ');
      for (const z of s.sewer.heard) {
        const name = SEWER.zones.find((d) => d.id === z)!.name;
        expect(said).toContain(`Från ${name}: ${s.sewer.rats.includes(z) ? SOUND.rats : SOUND[s.sewer.kinds[z]]}.`);
      }
    }
  });

  it('the water stands deeper in a low pipe and shallower on a ledge', () => {
    const s = setUp(sewer(), { kinds: { tunnel1: 'low', tunnel2: 'walk', tunnel3: 'ledge' }, level: 1 });
    expect(depthIn(s, 'tunnel1')).toBe(2);
    expect(depthIn(s, 'tunnel2')).toBe(1);
    expect(depthIn(s, 'tunnel3')).toBe(0);
    expect(depthIn(s, 'brunnen')).toBe(0);
  });

  it('at depth 2 the small are swept away, with a last moment; the medium stand until 3', () => {
    let s = setUp(sewer(), { kinds: { tunnel1: 'low' }, level: 1 }, { toad: 'tunnel1', fox: 'tunnel1', adder: 'tunnel1' });
    get(s, 'toad').swimmer = true;
    s = pass(s);
    expect(s.phase).toBe('lastMoment');
    s = letGo(s);
    expect(get(s, 'adder').status).toBe('dead');
    expect(get(s, 'toad').status).toBe('active');
    expect(get(s, 'fox').status).toBe('active');
    let t = setUp(sewer(), { kinds: { tunnel1: 'low' }, level: 2 }, { fox: 'tunnel1' });
    t = letGo(pass(t));
    expect(get(t, 'fox').status).toBe('dead');
  });

  it('those beside a large one hold on, and the rain comes at the hour’s end', () => {
    const held = pass(setUp(sewer(), { kinds: { tunnel1: 'low' }, level: 1 }, { mice: 'tunnel1', badger: 'tunnel1' }));
    expect(held.phase).toBe('play');
    expect(get(held, 'mice').count).toBe(6);
    const rain = setUp(sewer(), { kinds: { tunnel2: 'walk' }, level: 1, rise: true }, { adder: 'tunnel2' });
    expect(forecast(rain).map((l) => l.text).join(' | ')).toMatch(/Vattnet drar med sig/);
    expect(pass(rain).phase).toBe('lastMoment');
  });

  it('the rats bite the smallest where they hold, unless the toll is paid with a card from the hand', () => {
    const bitten = pass(setUp(sewer(), { rats: ['tunnel2'] }, { toad: 'tunnel2', fox: 'tunnel2' }));
    expect(get(bitten, 'toad').injuries).toContain('bleeding');
    expect(get(bitten, 'fox').injuries).toEqual([]);

    let paid = setUp(sewer(), { rats: ['tunnel2'] }, { toad: 'tunnel2' });
    const uid = paid.hand[0].uid;
    const hand = paid.hand.length;
    paid = run(paid, { type: 'payToll', uid });
    expect(paid.hand).toHaveLength(hand - 1);
    expect(paid.discard.some((c) => c.uid === uid)).toBe(true);
    expect(step(paid, { type: 'payToll', uid: paid.hand[0].uid }).events.some((e) => e.kind === 'error')).toBe(true);
    paid = pass(paid);
    expect(get(paid, 'toad').injuries).toEqual([]);
    expect(paid.sewer.paid).toBe(false);
  });

  it('the hidden are not found by the rats, and the curled are let go', () => {
    const hid = setUp(sewer(), { rats: ['tunnel2'] }, { toad: 'tunnel2' });
    get(hid, 'toad').hidden = true;
    expect(get(pass(hid), 'toad').injuries).toEqual([]);
    const curled = setUp(sewer(), { rats: ['tunnel2'] }, { toad: 'tunnel2' });
    get(curled, 'toad').curled = true;
    expect(get(pass(curled), 'toad').injuries).toEqual([]);
  });

  it('nowhere else is there a toll to pay', () => {
    const s = run(plain(createGame(3)), { type: 'swear', verses: ['manen'] });
    expect(step(s, { type: 'payToll', uid: 1 }).events.some((e) => e.kind === 'error')).toBe(true);
  });

  it('every hour plays out the same for the same state', () => {
    const s = setUp(sewer('night'), { kinds: { tunnel1: 'low' }, rats: ['tunnel2'], level: 1, rise: true }, { toad: 'tunnel2', mice: 'tunnel1' });
    expect(step(s, { type: 'endTurn' }).state).toEqual(step(s, { type: 'endTurn' }).state);
  });

  it('Avloppet stands on the city’s maps', () => {
    let found = 0;
    for (let seed = 1; seed <= 100; seed++) if (generateRegion(STADEN, seed).nodes.some((n) => n.encounter === 'sewer')) found++;
    expect(found).toBeGreaterThan(25);
  });
});
