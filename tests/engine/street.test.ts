import { describe, expect, it } from 'vitest';
import { STADEN } from '../../src/data/regions/staden';
import { BIKE_LANES, SIDEWALKS, planBikes, planCrowd, planTram, tramKnown } from '../../src/engine/encounters/street';
import { generateRegion } from '../../src/engine/regions';
import { createGame, regionJourney } from '../../src/engine/setup';
import { step } from '../../src/engine/step';
import type { GameState, TimeOfDay, Variant, ZoneId } from '../../src/engine/types';
import { forecast } from '../../src/ui/status';
import { get, plain, run } from './helpers';

/** Straight onto the shopping street, at the start of the city. */
function street(time: TimeOfDay = 'day', variant: Variant = 'normal', seed = 5): GameState {
  let s = run(plain(createGame(seed)), { type: 'swear', verses: ['manen'] });
  s.journey = regionJourney(STADEN, seed);
  s.run.regions = ['dalen', 'akrarna', 'staden'];
  const start = s.journey.nodes[0];
  const first = s.journey.nodes.find((n) => start.next.includes(n.id))!;
  first.encounter = 'street';
  first.name = 'Affärsgatan';
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

/** Everyone in the alley except those named; this hour's crowd, bikes and tram as we say, nothing else. */
function setUp(s: GameState, o: { feet?: ZoneId[]; bike?: ZoneId; tram?: boolean }, at: Record<string, ZoneId> = {}): GameState {
  for (const a of s.animals) if (a.status === 'active') a.zone = 'granden';
  for (const [id, z] of Object.entries(at)) get(s, id).zone = z;
  s.street.crowdPlan = s.street.crowdPlan.map(() => []);
  s.street.crowdPlan[s.turn - 1] = o.feet ?? [];
  s.street.drunks = [];
  s.street.bikePlan = s.street.bikePlan.map(() => null);
  s.street.bikePlan[s.turn - 1] = o.bike ?? null;
  s.street.tramAt = o.tram ? [s.turn] : [];
  calm(s);
  return s;
}

const pass = (s: GameState) => run(s, { type: 'endTurn' });
const letGo = (s: GameState) => { while (s.phase === 'lastMoment') s = run(s, { type: 'lastMoment', choice: 'letGo' }); return s; };

describe('Affärsgatan', () => {
  it('is a street of ten hours, by day or night, the same for a seed', () => {
    const s = street();
    expect(s.encounterId).toBe('street');
    expect(s.maxTurn).toBe(10);
    expect(s.time).toBe('day');
    expect(street().street).toEqual(s.street);
    expect(street('night').time).toBe('night');
  });

  it('by day the crowd surges along one sidewalk an hour – both on a Saturday – and at night not at all', () => {
    for (let seed = 1; seed <= 30; seed++) {
      for (const h of planCrowd({ rng: seed }, 10, 'day', false)) { expect(h).toHaveLength(1); expect(SIDEWALKS).toContain(h[0]); }
      for (const h of planCrowd({ rng: seed }, 10, 'day', true)) expect([...h].sort()).toEqual([...SIDEWALKS].sort());
      expect(planCrowd({ rng: seed }, 10, 'night', false).flat()).toEqual([]);
    }
  });

  it('by day one bike lane is busy every hour; at night only some hours', () => {
    for (let seed = 1; seed <= 30; seed++) for (const b of planBikes({ rng: seed }, 10, 'day')) expect(BIKE_LANES).toContain(b);
    let none = 0;
    for (let seed = 1; seed <= 30; seed++) none += planBikes({ rng: seed }, 10, 'night').filter((b) => b === null).length;
    expect(none).toBeGreaterThan(60);
  });

  it('the tram keeps its timetable: every two or three hours by day, three or four at night, two on a Saturday', () => {
    const gaps = (t: number[]) => t.slice(1).map((x, i) => x - t[i]);
    for (let seed = 1; seed <= 50; seed++) {
      for (const g of gaps(planTram({ rng: seed }, 10, 'day', false))) expect([2, 3]).toContain(g);
      for (const g of gaps(planTram({ rng: seed }, 10, 'night', false))) expect([3, 4]).toContain(g);
      for (const g of gaps(planTram({ rng: seed }, 10, 'day', true))) expect(g).toBe(2);
      expect(planTram({ rng: seed }, 10, 'day', false).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('by day the timetable is read; at night only the bell, the hour before', () => {
    const d = street();
    d.street.tramAt = [d.turn + 4];
    expect(tramKnown(d)).toBe(true);
    const n = street('night');
    n.street.tramAt = [n.turn + 4];
    expect(tramKnown(n)).toBe(false);
    n.street.tramAt = [n.turn + 1];
    expect(tramKnown(n)).toBe(true);
  });

  it('the tram kills whoever is on the tracks, with a last moment – but not those in the air', () => {
    let s = setUp(street(), { tram: true }, { toad: 'sparet', owl: 'sparet' });
    get(s, 'owl').flying = true;
    s = pass(s);
    expect(s.phase).toBe('lastMoment');
    s = letGo(s);
    expect(get(s, 'toad').status).toBe('dead');
    expect(get(s, 'owl').status).toBe('active');
  });

  it('the bikes run down whoever is in their lane', () => {
    const s = pass(setUp(street(), { bike: 'cykelS' }, { fox: 'cykelS', toad: 'cykelN' }));
    expect(get(s, 'fox').injuries.some((i) => i === 'halt' || i === 'broken')).toBe(true);
    expect(get(s, 'toad').injuries).toEqual([]);
  });

  it('the crowd steps on the small and kicks the medium aside – never in the doorway', () => {
    const s = pass(setUp(street(), { feet: ['trottoarenS'] }, { toad: 'trottoarenS', fox: 'trottoarenS', mice: 'butiksdorren' }));
    expect(get(s, 'toad').injuries.some((i) => i === 'halt' || i === 'broken')).toBe(true);
    expect(['butiksdorren', 'cykelS']).toContain(get(s, 'fox').zone);
    expect(get(s, 'fox').injuries).toEqual([]);
    expect(get(s, 'mice').count).toBe(6);
  });

  it('a large one in the crowd is seen, and the scream frightens all of us near', () => {
    const s = pass(setUp(street(), { feet: ['trottoarenS'] }, { badger: 'trottoarenS', toad: 'butiksdorren', owl: 'parken' }));
    expect(get(s, 'badger').injuries).toEqual([]);
    expect(get(s, 'toad').belief).toBe(7);
  });

  it('under the bench neither feet nor bikes reach the small', () => {
    const s = pass(setUp(street(), { feet: ['trottoarenN'], bike: 'cykelN' }, { toad: 'banken' }));
    expect(get(s, 'toad').injuries).toEqual([]);
    expect(get(s, 'toad').status).toBe('active');
  });

  it('at night the drunks stagger where we cannot see – we hear only which side', () => {
    const s = street('night', 'hard');
    expect(s.street.drunks).toHaveLength(2);
    const text = forecast(s).map((l) => l.text).join(' | ');
    expect(text).toMatch(/vinglar i mörkret/);
    expect(text).not.toMatch(/Fötterna i/);
    const t = setUp(street('night'), {}, { toad: 'trottoarenS' });
    t.street.drunks = ['trottoarenS'];
    expect(get(pass(t), 'toad').injuries.length).toBe(1);
  });

  it('the forecast tells who the tram, the bikes and the crowd will reach', () => {
    const s = setUp(street(), { feet: ['trottoarenN'], bike: 'cykelS', tram: true }, { toad: 'sparet', fox: 'cykelS', mice: 'trottoarenN' });
    const text = forecast(s).map((l) => l.text).join(' | ');
    expect(text).toMatch(/Spårvagnen kommer och kör över .*: dödar/);
    expect(text).toMatch(/Cyklarna i .* kör på/);
    expect(text).toMatch(/Fötterna i .* trampar på/);
  });

  it('every hour plays out the same for the same state', () => {
    const s = setUp(street('night'), { tram: true }, { toad: 'trottoarenS' });
    expect(step(s, { type: 'endTurn' }).state).toEqual(step(s, { type: 'endTurn' }).state);
  });

  it('Affärsgatan stands on the city’s maps', () => {
    let found = 0;
    for (let seed = 1; seed <= 100; seed++) if (generateRegion(STADEN, seed).nodes.some((n) => n.encounter === 'street')) found++;
    expect(found).toBeGreaterThan(30);
  });
});
