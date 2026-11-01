import { describe, expect, it } from 'vitest';
import { sceneOf } from '../../src/audio/scene';
import { MIDDLE_REGIONS, REGIONS } from '../../src/data/regions';
import { HOGLANDET } from '../../src/data/regions/hoglandet';
import { STORM, STORM_ROWS, gustZones, planStorm } from '../../src/engine/encounters/storm';
import { generateRegion } from '../../src/engine/regions';
import { createGame, regionJourney } from '../../src/engine/setup';
import { step } from '../../src/engine/step';
import type { GameState, Variant, ZoneId } from '../../src/engine/types';
import { forecast } from '../../src/ui/status';
import { get, plain, run } from './helpers';

/** Straight onto the heath, in Höglandet. */
function storm(variant: Variant = 'normal', seed = 5): GameState {
  let s = run(plain(createGame(seed)), { type: 'swear', verses: ['manen'] });
  s.journey = regionJourney(HOGLANDET, seed);
  s.run.regions = ['dalen', 'hoglandet'];
  s.journey.nodes.push({ ...HOGLANDET.first, id: 'here', row: 1, x: 50, y: 80, next: [] });
  s.journey.nodes[0].next = ['here'];
  s.journey.truth.here = variant;
  s.journey.guess.here = variant;
  for (const a of s.animals) a.status = 'safe';
  s = run(s, { type: 'travel', to: 'here' });
  for (const a of s.animals) if (a.status === 'active') { a.belief = 8; a.intent = { kind: 'follow' }; }
  s.kraft = 99;
  return s;
}

/** Everyone at the tree line except those named; the gust sweeping the rows we say this hour. */
function setUp(s: GameState, at: Record<string, ZoneId> = {}, rows: number[] = [0]): GameState {
  for (const a of s.animals) if (a.status === 'active') a.zone = 'tradgransen';
  for (const [id, z] of Object.entries(at)) get(s, id).zone = z;
  s.storm.rows[s.turn - 1] = rows;
  return s;
}
const pass = (s: GameState) => run(s, { type: 'endTurn' });

describe('Höglandet', () => {
  it('is the fourth middle region', () => {
    expect(MIDDLE_REGIONS).toEqual(['akrarna', 'staden', 'mossen', 'hoglandet']);
    expect(REGIONS.hoglandet.name).toBe('Höglandet');
  });

  it('its map starts at the tree line, opens with the storm, and ends at the pass – a storm too, until Snöstormen', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const { nodes } = generateRegion(HOGLANDET, seed);
      expect(nodes[0].id).toBe('tradgransen');
      expect(nodes.find((n) => n.row === 1)).toMatchObject({ encounter: 'storm' });
      expect(nodes[nodes.length - 1]).toMatchObject({ id: 'passet', encounter: 'storm' });
    }
  });

  it('we can come to it from every other middle region, and leave it for each', () => {
    for (const r of MIDDLE_REGIONS.filter((x) => x !== 'hoglandet')) {
      expect(HOGLANDET.arriveFrom?.[r]).toBeTruthy();
      expect(REGIONS[r].arriveFrom?.hoglandet).toBeTruthy();
    }
    expect(REGIONS.skogsbrynet.arriveFrom?.hoglandet).toBeTruthy();
  });

  it('the sound knows where we are', () => {
    expect(sceneOf(storm())).toMatchObject({ phase: 'danger', region: 'hoglandet' });
  });
});

describe('Stormen', () => {
  it('the gusts sweep one row an hour, never the same twice running – two rows in squalls', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const plan = planStorm({ rng: seed }, 8, false);
      plan.forEach((rows, i) => {
        expect(rows).toHaveLength(1);
        if (i) expect(rows[0]).not.toBe(plan[i - 1][0]);
      });
      for (const rows of planStorm({ rng: seed }, 8, true)) expect(new Set(rows).size).toBe(2);
    }
  });

  it('one shelter in every row, never in the same column twice', () => {
    const cols = STORM_ROWS.map((row) => row.findIndex((z) => STORM.zones.find((d) => d.id === z)?.cover));
    expect(cols.every((c) => c >= 0)).toBe(true);
    expect(new Set(cols).size).toBe(3);
  });

  it('whoever stands in the open where the gust sweeps is chilled: −1 belief, and the small shaken', () => {
    const s = setUp(storm(), { badger: 'ljungV', mice: 'ljungO' });
    const r = pass(s);
    expect(get(r, 'badger').belief).toBe(7);
    expect(get(r, 'badger').injuries).not.toContain('shock');
    expect(get(r, 'mice').belief).toBe(7);
    expect(get(r, 'mice').injuries).toContain('shock');
    // No one dies of the wind, and no one is moved.
    expect(get(r, 'mice').zone).toBe('ljungO');
    expect(r.animals.every((a) => a.status !== 'dead')).toBe(true);
  });

  it('the shelter, the hidden and those outside the gust are spared', () => {
    const s = setUp(storm(), { badger: 'stenblocket', fox: 'kalheden' });
    const r = pass(s);
    expect(get(r, 'badger').belief).toBe(8);
    expect(get(r, 'fox').belief).toBe(8);
  });

  it('the forecast names whom the gust chills', () => {
    const s = setUp(storm(), { mice: 'ljungV' });
    expect(forecast(s).map((l) => l.text).join(' | ')).toMatch(/Byn kyler .*(−1 tro).*får chock/);
  });

  it('in squalls we don’t see the next gust coming', () => {
    const calm = storm('normal');
    expect(calm.log.some((e) => 'text' in e && e.text.startsWith('Nästa timme vänder den mot'))).toBe(true);
    const hard = storm('hard');
    expect(hard.log.some((e) => 'text' in e && e.text.startsWith('Nästa timme vänder den mot'))).toBe(false);
    expect(gustZones(hard).length).toBe(6);
  });

  it('each gust is a blow the sound and the board play out; the hour replays the same', () => {
    const s = setUp(storm(), {}, [1]);
    const evs = step(s, { type: 'endTurn' }).events.flatMap((e) => (e.kind === 'blow' ? [`${e.what}@${e.zone}`] : []));
    expect(evs).toEqual(['gust@kalheden']);
    expect(step(s, { type: 'endTurn' }).state).toEqual(step(s, { type: 'endTurn' }).state);
  });
});
