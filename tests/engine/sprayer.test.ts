import { describe, expect, it } from 'vitest';
import { AKRARNA } from '../../src/data/regions/akrarna';
import { CROP, drift, mistAfter, rowZones, sprayed } from '../../src/engine/encounters/sprayer';
import { generateRegion } from '../../src/engine/regions';
import { canPlay, cardBlockReason } from '../../src/engine/rules';
import { createGame, makeAnimal } from '../../src/engine/setup';
import { step } from '../../src/engine/step';
import type { GameState, Species, TimeOfDay, Variant, ZoneId } from '../../src/engine/types';
import { forecast } from '../../src/ui/status';
import { get, plain, run } from './helpers';

/** Straight onto the sprayed field from the glen's start. */
function field(time: TimeOfDay = 'day', variant: Variant = 'normal', seed = 5): GameState {
  let s = run(plain(createGame(seed)), { type: 'swear', verses: ['manen'] });
  const start = s.journey.nodes[0];
  const t = AKRARNA.dangers.find((d) => d.key === 'sprutan')!;
  const { key: _k, ...rest } = t;
  s.journey.nodes.push({ ...rest, id: 'sprutan', row: 1, x: 50, y: 80, next: [] });
  start.next = ['sprutan'];
  s.journey.truth.sprutan = variant;
  s.journey.guess.sprutan = variant;
  s.clock = time;
  s = run(s, { type: 'travel', to: 'sprutan' });
  calm(s);
  s.kraft = 99;
  return s;
}

function calm(s: GameState) {
  for (const a of s.animals) if (a.status === 'active') { a.belief = 8; a.intent = { kind: 'follow' }; }
}

/** Everyone waits at the ditch edge except those named; the plans say exactly what this hour holds. */
function setUp(s: GameState, opts: { row?: number; wind?: 'norr' | 'söder' | 'öster' | 'väster'; mist?: ZoneId[] }, at: Record<string, ZoneId> = {}): GameState {
  for (const a of s.animals) a.zone = 'dikesrenen';
  for (const [id, z] of Object.entries(at)) get(s, id).zone = z;
  if (opts.row) s.spray.rowPlan[s.turn - 1] = opts.row;
  if (opts.wind) s.spray.windPlan[s.turn - 1] = opts.wind;
  if (opts.mist) s.spray.mist = [...opts.mist];
  return s;
}

const pass = (s: GameState) => run(s, { type: 'endTurn' });
const letGo = (s: GameState) => (s.phase === 'lastMoment' ? run(s, { type: 'lastMoment', choice: 'letGo' }) : s);

function add(s: GameState, species: Species, zone: ZoneId): string {
  const made = makeAnimal({ species }, species, 'Ny', s, () => s.nextUid++, zone);
  made.animal.traits = [];
  made.animal.belief = 8;
  s.animals.push(made.animal);
  return species;
}

describe('Det besprutade fältet', () => {
  it('lies on Åkrarna: Sprutan is drawn on its maps', () => {
    const maps = Array.from({ length: 40 }, (_, i) => generateRegion(AKRARNA, i));
    expect(maps.filter((m) => m.nodes.some((n) => n.encounter === 'sprayer')).length).toBeGreaterThan(10);
  });

  it('is the same field for the same seed', () => {
    expect(field().spray).toEqual(field().spray);
    expect(field('day', 'normal', 6).spray.rowPlan).not.toEqual(field('day', 'normal', 5).spray.rowPlan);
  });

  it('the tractor runs over whoever stands in its row – with a last moment', () => {
    let s = setUp(field(), { row: 1, wind: 'öster', mist: [] }, { toad: 'rad1v', fox: 'rad2v' });
    expect(s.log.some((e) => 'text' in e && /Traktorn vänder/.test(e.text))).toBe(true);
    s = pass(s);
    expect(s.phase).toBe('lastMoment');
    expect(s.pending).toMatchObject({ victim: 'toad', source: 'traktor' });
    s = letGo(s);
    expect(get(s, 'toad').status).toBe('dead');
    expect(get(s, 'fox').status).toBe('active');
  });

  it('the tractor never drives the weeds or the stream, and rolls over the dug-in and the flying', () => {
    let s = setUp(field(), { row: 2, wind: 'norr', mist: [] }, { fox: 'ograset', toad: 'backen1', badger: 'rad2v', owl: 'rad2v' });
    s = run(s, { type: 'lead', target: 'owl', zone: 'rad3v' }); // the owl lifts off – it is in the air over row three
    s.spray.rowPlan[s.turn - 1] = 3;
    get(s, 'badger').zone = 'rad3v';
    get(s, 'badger').underground = true;
    s = pass(s);
    expect(s.phase).not.toBe('lastMoment');
    for (const id of ['fox', 'toad', 'badger', 'owl']) expect(get(s, id).status).toBe('active');
  });

  it('the spray stays in the row behind the tractor, and the wind carries it a zone an hour', () => {
    let s = setUp(field(), { row: 1, wind: 'norr', mist: [] });
    s = pass(s);
    expect(s.spray.mist.sort()).toEqual(['rad1o', 'rad1v']);
    expect(drift(['rad1v', 'rad1o'], 'norr')).toEqual(['rad2v']); // the east end drifts into the weeds and is gone
    expect(drift(['rad3v'], 'norr')).toEqual([]); // off the field, toward the grove: gone
    expect(drift(['rad2v'], 'väster')).toEqual([]); // into the stream: gone
    expect(drift(['rad3v'], 'öster')).toEqual(['rad3o']);
  });

  it('whoever ends the hour in the mist is poisoned – in the air too – but never killed', () => {
    let s = setUp(field(), { row: 3, wind: 'öster', mist: ['rad1v'] }, { mice: 'rad1o', fox: 'rad1o' });
    s = run(s, { type: 'lead', target: 'owl', zone: 'rad1o' });
    s = pass(s);
    for (const id of ['mice', 'fox', 'owl']) expect(get(s, id).injuries).toContain('poisoned');
    expect(get(s, 'mice').count).toBe(6); // the mist makes a swarm sick, it takes no one
    expect(s.phase).toBe('play');
  });

  it('the mole under the ground breathes clean air', () => {
    let s = setUp(field(), { row: 3, wind: 'öster', mist: ['rad1v'] });
    const m = add(s, 'mole', 'rad1o');
    s.hand.push({ uid: 9001, kind: 'underJord', owner: m });
    s = run(s, { type: 'play', uid: 9001 });
    expect(get(s, m).underground).toBe(true);
    s = pass(s);
    expect(get(s, m).injuries).toEqual([]);
    expect(s.log.some((e) => 'text' in e && /når inte ner i jorden/.test(e.text))).toBe(true);
  });

  it('poisoned, an animal\'s own cards are too heavy to play – until the fire, or the stream for those who swim', () => {
    let s = setUp(field(), { row: 3, wind: 'öster', mist: ['rad1v'] }, { toad: 'rad1o' });
    s = pass(s);
    expect(get(s, 'toad').injuries).toContain('poisoned');
    const card = { uid: 9002, kind: 'lasaNatten' as const, owner: 'toad' };
    s.hand.push(card);
    s.kraft = 99;
    expect(canPlay(s, card)).toBe(false);
    expect(cardBlockReason(s, card)).toMatch(/förgiftad/);
    // In the stream the toad washes it off.
    get(s, 'toad').zone = 'backen1';
    s.spray.mist = [];
    s = pass(s);
    expect(get(s, 'toad').injuries).not.toContain('poisoned');
  });

  it('the stream holds back all but those who swim', () => {
    let s = setUp(field(), { row: 3, wind: 'öster', mist: [] });
    s = run(s, { type: 'lead', target: 'toad', zone: 'backen1' }, { type: 'lead', target: 'badger', zone: 'backen1' });
    expect(get(s, 'toad').slowTime).toBe(1);
    expect(get(s, 'badger').slowTime).toBe(0);
  });

  it('the hard field sprays two rows', () => {
    expect(sprayed(1, true).sort()).toEqual([...rowZones(1), ...rowZones(2)].sort());
    expect(sprayed(3, true).sort()).toEqual([...rowZones(3), ...rowZones(2)].sort());
    let s = setUp(field('day', 'hard'), { row: 1, wind: 'norr', mist: [] });
    s = pass(s);
    expect(s.spray.mist.sort()).toEqual(['rad1o', 'rad1v', 'rad2v']);
  });

  it('by night no tractor drives, but the day\'s mist lies in the rows – and we see only some of it', () => {
    const s = field('night');
    expect(s.spray.mist.length).toBeGreaterThan(0);
    expect(s.spray.mist.every((z) => CROP.includes(z))).toBe(true);
    expect(s.spray.shown.every((z) => s.spray.mist.includes(z))).toBe(true);
    let seen = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const n = field('night', 'normal', seed);
      if (n.spray.shown.length < n.spray.mist.length) seen++;
      expect(forecast(n).some((l) => /Traktorn/.test(l.text))).toBe(false);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('reading the night shows all the mist', () => {
    let s = field('night');
    s.spray.shown = [];
    expect(mistAfter(s).length).toBe(0);
    s.hand.push({ uid: 9003, kind: 'lasaNatten', owner: 'toad' });
    s = run(s, { type: 'play', uid: 9003 });
    expect(mistAfter(s).length).toBeGreaterThan(0);
  });

  it('the forecast tells who is run over and who breathes the mist', () => {
    const s = setUp(field(), { row: 2, wind: 'öster', mist: ['rad1v'] }, { fox: 'rad2v', mice: 'rad1o' });
    const lines = forecast(s).map((l) => l.text).join(' | ');
    expect(lines).toMatch(/kör över .*: dödar/);
    expect(lines).toMatch(/andas in dimman/);
  });

  it('every move is seeded: the same hour plays out the same', () => {
    const s = setUp(field(), { row: 1, wind: 'öster', mist: ['rad2v'] }, { fox: 'rad2v' });
    expect(step(s, { type: 'endTurn' }).state).toEqual(step(s, { type: 'endTurn' }).state);
  });
});
