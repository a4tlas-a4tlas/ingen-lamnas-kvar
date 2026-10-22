import { describe, expect, it } from 'vitest';
import { STADEN } from '../../src/data/regions/staden';
import { YARD, eyesFor, nextHide, placeCats, yardDistance } from '../../src/engine/encounters/cats';
import { generateRegion } from '../../src/engine/regions';
import { createGame, regionJourney } from '../../src/engine/setup';
import { step } from '../../src/engine/step';
import type { GameState, TimeOfDay, Variant, ZoneId } from '../../src/engine/types';
import { forecast } from '../../src/ui/status';
import { get, plain, run } from './helpers';

/** Straight into the courtyard, at the start of the city. */
function yard(time: TimeOfDay = 'day', variant: Variant = 'normal', seed = 5): GameState {
  let s = run(plain(createGame(seed)), { type: 'swear', verses: ['manen'] });
  s.journey = regionJourney(STADEN, seed);
  s.run.regions = ['dalen', 'akrarna', 'staden'];
  const start = s.journey.nodes[0];
  const first = s.journey.nodes.find((n) => start.next.includes(n.id))!;
  first.encounter = 'cats';
  first.name = 'Bakgården';
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

/** Everyone on the cellar steps except those named; the cats where we say. */
function setUp(s: GameState, cats: ZoneId[], at: Record<string, ZoneId> = {}): GameState {
  for (const a of s.animals) if (a.status === 'active') a.zone = 'kallartrappan';
  for (const [id, z] of Object.entries(at)) get(s, id).zone = z;
  s.cats.at = cats;
  s.cats.scared = cats.map(() => false);
  calm(s);
  return s;
}

const pass = (s: GameState) => run(s, { type: 'endTurn' });
const letGo = (s: GameState) => { while (s.phase === 'lastMoment') s = run(s, { type: 'lastMoment', choice: 'letGo' }); return s; };

describe('Katterna', () => {
  it('is a courtyard, by day or night, with two cats in two places – the same yard for a seed', () => {
    const s = yard();
    expect(s.encounterId).toBe('cats');
    expect(s.time).toBe('day');
    expect(s.cats.at).toHaveLength(2);
    expect(new Set(s.cats.at).size).toBe(2);
    for (const z of s.cats.at) expect(YARD).toContain(z);
    expect(yard().cats).toEqual(s.cats);
    expect(yard('night').time).toBe('night');
  });

  it('the hard courtyard has three cats', () => {
    expect(yard('day', 'hard').cats.at).toHaveLength(3);
    for (let seed = 1; seed <= 30; seed++) expect(new Set(placeCats({ rng: seed }, 3)).size).toBe(3);
  });

  it('each hour a cat slips to a neighbouring place – two away, if it was scared off', () => {
    for (let seed = 1; seed <= 50; seed++) {
      for (const z of YARD) {
        expect(yardDistance(z, nextHide({ rng: seed }, z, false, []))).toBe(1);
        expect(yardDistance(z, nextHide({ rng: seed }, z, true, []))).toBe(2);
      }
    }
    let s = setUp(yard(), ['sandladan', 'lonnen']);
    s = pass(s);
    expect(yardDistance('sandladan', s.cats.at[0])).toBe(1);
    expect(yardDistance('lonnen', s.cats.at[1])).toBe(1);
    expect(s.cats.at[0]).not.toBe(s.cats.at[1]);
  });

  it('at night we see only eyes: two places for each cat, and one of them is real', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const e = eyesFor({ rng: seed }, 'grasmattan');
      expect(e).toHaveLength(2);
      expect(e).toContain('grasmattan');
      expect(new Set(e).size).toBe(2);
    }
    const s = pass(setUp(yard('night'), ['sandladan', 'lonnen']));
    s.cats.eyes.forEach((e, i) => expect(e).toContain(s.cats.at[i]));
  });

  it('pounces on the smallest where it lies: a small one is taken, with a last moment', () => {
    let s = setUp(yard(), ['sandladan', 'lonnen'], { toad: 'sandladan' });
    s = pass(s);
    expect(s.phase).toBe('lastMoment');
    s = letGo(s);
    expect(get(s, 'toad').status).toBe('dead');
  });

  it('a medium one is scratched, never killed', () => {
    const s0 = setUp(yard(), ['sandladan', 'lonnen'], { fox: 'sandladan' });
    get(s0, 'fox').predator = false; // a medium one that frightens no cat
    const s = pass(s0);
    expect(get(s, 'fox').status).toBe('active');
    expect(get(s, 'fox').injuries).toContain('bleeding');
  });

  it('never where one of the large stands guard', () => {
    const s = pass(setUp(yard(), ['sandladan', 'lonnen'], { toad: 'sandladan', badger: 'sandladan' }));
    expect(s.phase).toBe('play');
    expect(get(s, 'toad').status).toBe('active');
    expect(get(s, 'toad').injuries).toEqual([]);
  });

  it('one of our predators scares it off – and next hour it hides two places away', () => {
    let s = setUp(yard(), ['sandladan', 'lonnen'], { toad: 'sandladan', adder: 'sandladan' });
    s = pass(s);
    expect(get(s, 'toad').status).toBe('active');
    expect(get(s, 'toad').injuries).toEqual([]);
    expect(yardDistance('sandladan', s.cats.at[0])).toBe(2);
  });

  it('cats climb too: up the maple is no escape – but the air is, and the hidden are not found', () => {
    const up = setUp(yard(), ['lonnen', 'sandladan'], { toad: 'lonnen' });
    Object.assign(get(up, 'toad'), { flying: true, climbing: true });
    expect(pass(up).phase).toBe('lastMoment');

    const air = setUp(yard(), ['grasmattan', 'sandladan'], { owl: 'grasmattan' });
    get(air, 'owl').predator = false;
    get(air, 'owl').flying = true;
    expect(get(pass(air), 'owl').injuries).toEqual([]);

    const hid = setUp(yard(), ['rabatten', 'sandladan'], { toad: 'rabatten' });
    get(hid, 'toad').hidden = true;
    const after = pass(hid);
    expect(after.phase).toBe('play');
    expect(get(after, 'toad').status).toBe('active');
  });

  it('Kasta mat: ◆1, once in the courtyard, and that hour no one is pounced on', () => {
    let s = setUp(yard(), ['sandladan', 'lonnen'], { toad: 'sandladan' });
    s.kraft = 3;
    s = run(s, { type: 'throwFood' });
    expect(s.kraft).toBe(2);
    expect(step(s, { type: 'throwFood' }).events.some((e) => e.kind === 'error')).toBe(true);
    expect(forecast(s).map((l) => l.text).join(' | ')).toMatch(/slåss om maten/);
    s = pass(s);
    expect(s.phase).toBe('play');
    expect(get(s, 'toad').status).toBe('active');
    expect(s.cats.fed).toBe(false);
    expect(s.cats.foodUsed).toBe(true);
    // Nowhere else is there food to throw.
    const far = run(plain(createGame(3)), { type: 'swear', verses: ['manen'] });
    expect(step(far, { type: 'throwFood' }).events.some((e) => e.kind === 'error')).toBe(true);
  });

  it('the forecast tells whom the cat takes, and who keeps it off', () => {
    const s = setUp(yard(), ['sandladan', 'lonnen'], { mice: 'sandladan', fox: 'lonnen', toad: 'lonnen' });
    const text = forecast(s).map((l) => l.text).join(' | ');
    expect(text).toMatch(/Katten i sandlådan slår till mot .*: dödar/);
    expect(text).toMatch(/Katten i lönnen – .* skrämmer bort den/);
  });

  it('every hour plays out the same for the same state', () => {
    const s = setUp(yard('night'), ['sandladan', 'lonnen'], { toad: 'sandladan' });
    expect(step(s, { type: 'endTurn' }).state).toEqual(step(s, { type: 'endTurn' }).state);
  });

  it('Bakgården stands on the city’s maps', () => {
    let found = 0;
    for (let seed = 1; seed <= 100; seed++) if (generateRegion(STADEN, seed).nodes.some((n) => n.encounter === 'cats')) found++;
    expect(found).toBeGreaterThan(30);
  });
});
