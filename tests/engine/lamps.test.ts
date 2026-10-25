import { describe, expect, it } from 'vitest';
import { meetingOptions } from '../../src/data/meetings';
import { STADEN } from '../../src/data/regions/staden';
import { LAMPED, ROUND, lit, planLamps, walkerZone } from '../../src/engine/encounters/lamps';
import { generateRegion } from '../../src/engine/regions';
import { verseStatus } from '../../src/engine/rules';
import { createGame, regionJourney } from '../../src/engine/setup';
import { step } from '../../src/engine/step';
import type { GameState, Variant, ZoneId } from '../../src/engine/types';
import { forecast } from '../../src/ui/status';
import { get, plain, run } from './helpers';

/** Straight onto the lit street, at the start of the city. */
function street(variant: Variant = 'normal', seed = 5): GameState {
  let s = run(plain(createGame(seed)), { type: 'swear', verses: ['manen'] });
  s.journey = regionJourney(STADEN, seed);
  s.run.regions = ['dalen', 'akrarna', 'staden'];
  const start = s.journey.nodes[0];
  const first = s.journey.nodes.find((n) => start.next.includes(n.id))!;
  s.journey.truth[first.id] = variant;
  s.journey.guess[first.id] = variant;
  start.next = [first.id];
  for (const a of s.animals) a.status = 'safe';
  s = run(s, { type: 'travel', to: first.id });
  calm(s);
  s.kraft = 99;
  return s;
}

function calm(s: GameState) {
  for (const a of s.animals) if (a.status === 'active') { a.belief = 8; a.intent = { kind: 'follow' }; }
}

/** Everyone in the ditch except those named; the lamps and the walker where we say. */
function setUp(s: GameState, o: { litNow?: ZoneId[]; walker?: ZoneId }, at: Record<string, ZoneId> = {}): GameState {
  for (const a of s.animals) if (a.status === 'active') a.zone = 'dikeskanten';
  for (const [id, z] of Object.entries(at)) get(s, id).zone = z;
  for (const z of LAMPED) s.lamps.litAt[z] = (o.litNow ?? []).includes(z) ? 1 : 99;
  if (o.walker) s.lamps.walkers = [{ at: ROUND.indexOf(o.walker), dir: 1 }];
  return s;
}

const pass = (s: GameState) => run(s, { type: 'endTurn' });

describe('Gatlyktorna', () => {
  it('is the first danger of the city, at night, and the same street for a seed', () => {
    const s = street();
    expect(s.encounterId).toBe('lamps');
    expect(s.time).toBe('night');
    expect(street().lamps).toEqual(s.lamps);
  });

  it('each lamp comes on at its own hour, from the second to the sixth, and stays on', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const plan = planLamps({ rng: seed });
      const hours = LAMPED.map((z) => plan[z]);
      expect(new Set(hours).size).toBe(LAMPED.length);
      for (const h of hours) expect(h).toBeGreaterThanOrEqual(2);
      for (const h of hours) expect(h).toBeLessThanOrEqual(6);
    }
    const s = street();
    const z = LAMPED[0];
    expect(lit(s, z, s.lamps.litAt[z] - 1)).toBe(false);
    expect(lit(s, z, s.lamps.litAt[z])).toBe(true);
    expect(lit(s, z, 8)).toBe(true);
  });

  it('the man walks his round, one zone an hour', () => {
    let s = setUp(street(), { walker: 'gatanV' });
    const order: ZoneId[] = [];
    for (let i = 0; i < 4; i++) {
      order.push(walkerZone(s.lamps.walkers[0]));
      calm(s);
      s = pass(setUp(s, {}));
    }
    expect(order).toEqual(ROUND);
  });

  it('in the light, the dog bites the smallest and chases the rest back', () => {
    let s = setUp(street(), { litNow: ['gatanV'], walker: 'gatanV' }, { toad: 'gatanV', fox: 'gatanV' });
    s = pass(s);
    expect(get(s, 'toad').injuries).toContain('bleeding');
    expect(get(s, 'fox').zone).toBe('dikeskanten');
    expect(get(s, 'fox').injuries).toEqual([]);
  });

  it('in the dark he passes, and the hidden and those in the air are never found', () => {
    let s = setUp(street(), { walker: 'gatanO' }, { toad: 'gatanO' });
    s = pass(s);
    expect(get(s, 'toad').injuries).toEqual([]);
    let t = setUp(street(), { litNow: ['gatanO'], walker: 'gatanO' }, { toad: 'gatanO' });
    get(t, 'toad').hidden = true;
    t = pass(t);
    expect(get(t, 'toad').injuries).toEqual([]);
  });

  it('the bus shelter and the bins are never lit', () => {
    const s = street();
    expect(lit(s, 'busskuren', 8)).toBe(false);
    expect(lit(s, 'soptunnorna', 8)).toBe(false);
  });

  it('the hard street has two men, going opposite ways', () => {
    const s = street('hard');
    expect(s.lamps.walkers).toHaveLength(2);
    expect(s.lamps.walkers.map((w) => w.dir).sort()).toEqual([-1, 1]);
  });

  it('the forecast tells who the dog finds', () => {
    const s = setUp(street(), { litNow: ['gardO'], walker: 'gardO' }, { mice: 'gardO' });
    expect(forecast(s).map((l) => l.text).join(' | ')).toMatch(/Hunden får syn på oss .* biter/);
  });

  it('every hour plays out the same for the same state', () => {
    const s = setUp(street(), { litNow: ['gatanV'], walker: 'gatanV' }, { toad: 'gatanV' });
    expect(step(s, { type: 'endTurn' }).state).toEqual(step(s, { type: 'endTurn' }).state);
  });
});

describe('Stadens utkant', () => {
  it('its maps start with the street lights and every story part closes', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const map = generateRegion(STADEN, seed);
      const start = map.nodes[0];
      expect(start.next.map((id) => map.nodes.find((n) => n.id === id)!.encounter)).toContain('lamps');
      for (const n of map.nodes.filter((x) => x.meeting)) {
        let s = run(createGame(seed), { type: 'swear', verses: ['ingenLamnas'] });
        s.journey = regionJourney(STADEN, seed);
        s.journey.nodes[0].next = [n.id];
        for (const a of s.animals) a.status = 'safe';
        s = run(s, { type: 'travel', to: n.id });
        for (let k = 0; k < 12 && s.meeting; k++) {
          const o = meetingOptions(s)[0];
          s = run(s, { type: 'respond', option: o.id, uid: o.pickCard ? s.draw[0]?.uid : undefined });
        }
        expect(s.meeting).toBeNull();
      }
    }
  });

  it('past the machines of the glen, both ways are offered: the fields and the city', () => {
    let s = run(createGame(4), { type: 'swear', verses: ['manen'] });
    s.journey.at = 'granbacken';
    s.journey.visited.push('granbacken');
    s.clock = 'night';
    s = run(s, { type: 'travel', to: 'asen' });
    expect(s.encounterId).toBe('machines');
    // Everyone over the ridge at once.
    for (const a of s.animals) if (a.status === 'active') a.status = 'safe';
    s = run(s, { type: 'endTurn' });
    expect([...s.run.offered].sort()).toEqual(['akrarna', 'staden']);
  });

  it('choosing the city breaks the promise never to go where the machines live', () => {
    let s = run(createGame(3), { type: 'swear', verses: ['ingenLamnas'] });
    s.verses.push({ id: 'lofte-x', kind: 'promise', text: 'Vi går aldrig dit där maskinerna bor.', flippedText: 'Vi gick in bland maskinerna.', flipped: false, promise: { by: 'badger', rule: 'noCity' } });
    s.run = { regions: ['dalen'], offered: ['akrarna', 'staden'], skipped: [], between: true };
    s.phase = 'map';
    s.meeting = { id: 'interlude', frame: 'way', used: [], told: [] };
    const go = meetingOptions(s).find((o) => o.id === 'go-staden')!;
    s = run(s, { type: 'respond', option: go.id });
    expect(s.verses.find((v) => v.id === 'lofte-x')!.flipped).toBe(true);
    expect(s.journey.region).toBe('staden');
    expect(verseStatus(s, 'ingenLamnas')).toBe('intact');
    // Straight from the glen, the city says so; and the fields are passed by for good.
    expect(s.run.skipped).toEqual(['akrarna']);
    expect(s.log.some((e) => 'text' in e && /Dalen ligger bakom oss/.test(e.text))).toBe(true);
    expect(s.log.some((e) => 'text' in e && /Vägen mot åkrarna går vi aldrig/.test(e.text))).toBe(true);
  });

});
