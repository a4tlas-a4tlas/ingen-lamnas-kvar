import { describe, expect, it } from 'vitest';
import { SKOGSBRYNET } from '../../src/data/regions/skogsbrynet';
import { COLUMNS, HUNT, ROWS, huntDogDestination, planHunt, planHuntFeint, watched } from '../../src/engine/encounters/hunt';
import { generateRegion } from '../../src/engine/regions';
import { createGame, regionJourney } from '../../src/engine/setup';
import { step } from '../../src/engine/step';
import type { GameState, Variant, ZoneId } from '../../src/engine/types';
import { forecast } from '../../src/ui/status';
import { get, plain, run } from './helpers';

/** At the last fire of the forest edge, with only the hunter ahead – and into the hunt. */
function hunt(variant: Variant = 'normal', seed = 5): GameState {
  let s = run(plain(createGame(seed)), { type: 'swear', verses: ['manen'] });
  s.journey = regionJourney(SKOGSBRYNET, seed);
  s.run.regions = ['dalen', 'akrarna', 'mossen', 'skogsbrynet'];
  const end = s.journey.nodes.find((n) => n.encounter === 'hunt')!;
  s.journey.at = s.journey.nodes.find((n) => n.next.includes(end.id))!.id;
  s.journey.truth[end.id] = variant;
  s.journey.guess[end.id] = variant;
  for (const a of s.animals) a.status = 'safe';
  s = run(s, { type: 'travel', to: end.id });
  for (const a of s.animals) if (a.status === 'active') { a.belief = 8; a.intent = { kind: 'follow' }; }
  s.kraft = 99;
  return s;
}

/** Everyone at the road except those named; the hunter looking where we say; the dogs far away, with no scent. */
function setUp(s: GameState, at: Record<string, ZoneId> = {}, look: ZoneId[] = [], barked: ZoneId[] = []): GameState {
  s.feint = [];
  for (const a of s.animals) if (a.status === 'active') a.zone = 'vagkanten';
  for (const [id, z] of Object.entries(at)) get(s, id).zone = z;
  s.hunt.plan[s.turn - 1] = look;
  s.hunt.barked = barked;
  s.scent = {};
  for (const d of s.dogs) { d.zone = 'vagkanten'; d.target = null; }
  return s;
}
const pass = (s: GameState) => run(s, { type: 'endTurn' });

describe('Jägaren', () => {
  it('is the forest edge’s end: the final boss, always by day', () => {
    for (let i = 0; i < 20; i++) {
      const { nodes } = generateRegion(SKOGSBRYNET, i);
      expect(nodes[nodes.length - 1]).toMatchObject({ encounter: 'hunt', name: 'Jägaren' });
    }
    expect(hunt().time).toBe('day');
  });

  it('the hunter looks over a row and a column each hour', () => {
    for (let seed = 1; seed <= 30; seed++) {
      for (const look of planHunt({ rng: seed }, 6)) {
        expect(look.length).toBe(5);
        expect(ROWS.some((r) => r.every((z) => look.includes(z)))).toBe(true);
        expect(COLUMNS.some((c) => c.every((z) => look.includes(z)))).toBe(true);
      }
    }
    expect(hunt().maxTurn).toBe(6);
  });

  it('shoots whoever stands in the open where he looks, with a last moment; cover and the hidden are safe', () => {
    const s = pass(setUp(hunt(), { fox: 'kalytan', badger: 'ormbunkarna' }, ROWS[0]));
    expect(s.phase).toBe('lastMoment');
    expect(s.pending).toMatchObject({ victim: 'fox', source: 'skott' });
    expect(get(s, 'badger').status).toBe('active');
  });

  it('where the dog barked, he looks into cover too', () => {
    const s = setUp(hunt(), { badger: 'ormbunkarna' }, [], ['ormbunkarna']);
    expect(watched(s)).toContain('ormbunkarna');
    const r = pass(s);
    expect(r.pending).toMatchObject({ victim: 'badger', source: 'skott' });
  });

  it('in the first hour the dog is still leashed', () => {
    const s = setUp(hunt(), { toad: 'kalytan' });
    s.dogs[0].target = 'kalytan';
    const r = pass(s);
    expect(r.dogs[0].zone).toBe('vagkanten');
    expect(r.hunt.barked).toEqual([]);
  });

  it('then it follows our scent two steps an hour, and barks where it finds us', () => {
    const s = setUp(hunt(), { toad: 'granplanteringen' });
    s.turn = 2;
    s.scent = { granplanteringen: 3 };
    const d = s.dogs[0];
    d.target = 'granplanteringen';
    expect(huntDogDestination(d)).toBe('granplanteringen');
    s.hunt.plan[s.turn - 1] = [];
    const r = pass(s);
    expect(r.dogs[0].zone).toBe('granplanteringen');
    expect(r.hunt.barked).toEqual(['granplanteringen']);
    expect(watched(r)).toContain('granplanteringen');
  });

  it('the brook breaks the scent', () => {
    const s = setUp(hunt(), { toad: 'backen' });
    const r = pass(s);
    expect(r.scent.backen ?? 0).toBe(0);
  });

  it('a fox can show itself and draw the dog away', () => {
    let s = setUp(hunt(), { fox: 'stenroset' });
    s = run(s, { type: 'lure', target: 'fox', zone: 'backen' });
    expect(s.dogs.every((d) => d.target === 'backen')).toBe(true);
  });

  it('a whole hunting party brings two dogs', () => {
    expect(hunt('hard').dogs).toHaveLength(2);
    expect(hunt().dogs).toHaveLength(1);
  });

  it('the forecast names whom the hunter shoots', () => {
    const s = setUp(hunt(), { fox: 'stigen' }, ROWS[1]);
    expect(forecast(s).map((l) => l.text).join(' | ')).toMatch(new RegExp(`Jägaren skjuter ${get(s, 'fox').name} i stigen: dödar`));
  });

  it('past the hunter, the run ends in the forest – titled by how it went', () => {
    let s = hunt();
    for (const a of s.animals) if (a.status === 'active') a.status = 'safe';
    s = pass(s);
    expect(s.phase).toBe('over');
    expect(s.outcome).toMatchObject({ forest: true, fallen: false });
  });

  it('plays out the same for the same state', () => {
    const s = setUp(hunt('hard'), { fox: 'kalytan', toad: 'granplanteringen' }, ROWS[0]);
    expect(step(s, { type: 'endTurn' }).state).toEqual(step(s, { type: 'endTurn' }).state);
  });

  it('he turns, and we see two ways he might look; only the real one shoots', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const plan = planHunt({ rng: seed }, 6);
      planHuntFeint({ rng: seed }, plan).forEach((f, i) => {
        expect(f).toHaveLength(5);
        expect([...f].sort().join()).not.toBe([...plan[i]].sort().join());
      });
    }
    const s = setUp(hunt(), { fox: 'stigen' }, ROWS[0]);
    s.feint = [[...ROWS[1], ...COLUMNS[1].filter((z) => !ROWS[1].includes(z))]];
    expect(forecast(s).map((l) => l.text).join(' | ')).toMatch(/Jägaren kanske spanar över stigen: .* kan bli skjuten/);
    const r = pass(s);
    expect(get(r, 'fox').status).toBe('active');
  });

  it('the forest’s last row has no cover: the windfall lies open', () => {
    expect(HUNT.zones.find((z) => z.id === 'vindfallet')?.cover).toBeFalsy();
  });
});
