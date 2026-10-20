import { describe, expect, it } from 'vitest';
import { AKRARNA } from '../../src/data/regions/akrarna';
import { GATE_PUSH, SWEEPS_MEDIUM, SWEEPS_SMALL } from '../../src/engine/encounters/fence';
import { generateRegion } from '../../src/engine/regions';
import { cardZones, leadZones } from '../../src/engine/rules';
import { createGame, makeAnimal } from '../../src/engine/setup';
import { step } from '../../src/engine/step';
import type { GameState, Species, TimeOfDay, Variant, ZoneId } from '../../src/engine/types';
import { forecast } from '../../src/ui/status';
import { get, plain, run } from './helpers';

/** Straight to the ditch and the gate from the glen's start. */
function fence(time: TimeOfDay = 'day', variant: Variant = 'normal', seed = 5): GameState {
  let s = run(plain(createGame(seed)), { type: 'swear', verses: ['manen'] });
  const start = s.journey.nodes[0];
  const { key: _k, ...rest } = AKRARNA.dangers.find((d) => d.key === 'stangslet')!;
  s.journey.nodes.push({ ...rest, id: 'stangslet', row: 1, x: 50, y: 80, next: [] });
  start.next = ['stangslet'];
  s.journey.truth.stangslet = variant;
  s.journey.guess.stangslet = variant;
  s.clock = time;
  s = run(s, { type: 'travel', to: 'stangslet' });
  for (const a of s.animals) if (a.status === 'active') { a.belief = 8; a.intent = { kind: 'follow' }; }
  s.kraft = 99;
  return s;
}

/** Everyone at the field edge except those named; this hour's water and wire as given. */
function setUp(s: GameState, o: { rise?: boolean; pulse?: boolean; level?: number }, at: Record<string, ZoneId> = {}): GameState {
  for (const a of s.animals) a.zone = 'akerkanten';
  for (const [id, z] of Object.entries(at)) get(s, id).zone = z;
  if (o.rise !== undefined) s.fence.risePlan[s.turn - 1] = o.rise;
  if (o.pulse !== undefined) s.fence.pulsePlan[s.turn - 1] = o.pulse;
  if (o.level !== undefined) s.fence.level = o.level;
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

describe('Diket och grinden', () => {
  it('lies on Åkrarna: the fence is drawn on its maps', () => {
    const maps = Array.from({ length: 40 }, (_, i) => generateRegion(AKRARNA, i));
    expect(maps.filter((m) => m.nodes.some((n) => n.encounter === 'fence')).length).toBeGreaterThan(8);
  });

  it('the fence stops those who walk – the fliers go over it', () => {
    const s = setUp(fence(), { pulse: false }, { fox: 'stangslet', owl: 'stangslet', mice: 'kaninhalet' });
    expect(leadZones(s, get(s, 'fox'))).not.toContain('betet');
    expect(leadZones(s, get(s, 'owl'))).toContain('betet');
    // The rabbit's hole is slow: an hour under the fence, then out.
    expect(leadZones(s, get(s, 'mice'))).not.toContain('betet');
    get(s, 'mice').slowTime = 1;
    expect(leadZones(s, get(s, 'mice'))).toContain('betet');
    expect(leadZones(s, get(s, 'fox'))).not.toContain('kaninhalet');
  });

  it('a large one pushes the gate open – it costs more, and then it stands open for all', () => {
    let s = setUp(fence(), { pulse: false }, { badger: 'grinden' });
    expect(leadZones(s, get(s, 'badger'))).toContain('betet');
    get(s, 'fox').zone = 'grinden';
    s.kraft = 1 + GATE_PUSH - 1;
    expect(leadZones(s, get(s, 'badger'))).not.toContain('betet'); // not enough strength left
    s.kraft = 1 + GATE_PUSH;
    s = run(s, { type: 'lead', target: 'badger', zone: 'betet' });
    expect(s.kraft).toBe(0);
    expect(s.fence.gateOpen).toBe(true);
    s.kraft = 3;
    expect(leadZones(s, get(s, 'fox'))).toContain('betet');
  });

  it('two of us together can push the gate open, one alone of medium size cannot', () => {
    let s = setUp(fence(), { pulse: false }, { fox: 'grinden' });
    expect(leadZones(s, get(s, 'fox'))).not.toContain('betet');
    get(s, 'mice').zone = 'grinden';
    expect(leadZones(s, get(s, 'fox'))).toContain('betet');
    s.kraft = 1 + GATE_PUSH;
    s = run(s, { type: 'lead', target: 'fox', zone: 'betet' });
    expect(s.fence.gateOpen).toBe(true);
  });

  it('the owl carries a small one over; the mole digs under and the small ones follow', () => {
    const s = setUp(fence(), { pulse: false }, { owl: 'stangslet', toad: 'stangslet', mice: 'stangslet' });
    s.hand.push({ uid: 9101, kind: 'baraLiten', owner: 'owl' });
    expect(cardZones(s, s.hand.at(-1)!)).toContain('betet');
    const m = add(s, 'mole', 'stangslet');
    s.hand.push({ uid: 9102, kind: 'gravaGang', owner: m });
    expect(cardZones(s, s.hand.at(-1)!)).toContain('betet');
    const after = run(s, { type: 'play', uid: 9102, zone: 'betet' });
    for (const id of [m, 'toad', 'mice']) expect(get(after, id).zone === 'betet' || get(after, id).status === 'safe').toBe(true);
  });

  it('the ditch rises with the plan; at two it takes the small, at three the medium – not the large, not swimmers', () => {
    expect([SWEEPS_SMALL, SWEEPS_MEDIUM]).toEqual([2, 3]);
    let s = setUp(fence(), { pulse: false, level: 1, rise: true }, { fox: 'diketO', toad: 'diketO' });
    const h = add(s, 'hedgehog', 'diketV');
    s = pass(s);
    expect(s.fence.level).toBe(2);
    expect(s.phase).toBe('lastMoment');
    expect(s.pending).toMatchObject({ victim: h, source: 'diket' });
    s = letGo(s);
    expect(get(s, 'fox').status).toBe('active');
    expect(get(s, 'toad').status).toBe('active');
    for (const a of s.animals) if (a.status === 'active') { a.belief = 8; a.intent = { kind: 'follow' }; }
    setUp(s, { pulse: false, rise: true }, { fox: 'diketO', toad: 'diketO' });
    s = pass(s);
    expect(s.fence.level).toBe(3);
    expect(s.pending).toMatchObject({ victim: 'fox', source: 'diket' });
  });

  it('beside a large one in the water, the small hold on', () => {
    let s = setUp(fence(), { pulse: false, level: 2, rise: false }, { mice: 'diketV', badger: 'diketV' });
    s = pass(s);
    expect(s.phase).toBe('play');
    expect(get(s, 'mice').status).toBe('active');
  });

  it('the beaver dams the ditch: the water sinks a level', () => {
    let s = setUp(fence(), { pulse: false, level: 2, rise: false });
    const b = add(s, 'beaver', 'akerkanten');
    s.hand.push({ uid: 9103, kind: 'lagaDammen', owner: b });
    s = run(s, { type: 'play', uid: 9103 });
    expect(s.fence.level).toBe(1);
  });

  it('when the wire hums it kills the small at the fence and shocks the rest – the dug-in and those in the hole are spared', () => {
    let s = setUp(fence(), { pulse: true, rise: false }, { toad: 'stangslet', fox: 'grinden', mice: 'kaninhalet' });
    const m = add(s, 'mole', 'grinden'); // beside the fox, not where anyone dies
    get(s, m).underground = true;
    s = pass(s);
    expect(s.pending).toMatchObject({ victim: 'toad', source: 'stängslet' });
    s = letGo(s);
    expect(get(s, 'fox').injuries).toContain('shock');
    expect(get(s, 'mice').status).toBe('active');
    expect(get(s, m).injuries).toEqual([]);
  });

  it('by day we see the next pulse; by night only the hum of this one, and the water is cold', () => {
    const day = setUp(fence(), { pulse: false });
    expect(forecast(day).some((l) => /Nästa timme är strömmen/.test(l.text))).toBe(true);
    let night = setUp(fence('night'), { pulse: false, rise: false }, { toad: 'diketV' });
    expect(forecast(night).some((l) => /Nästa timme är strömmen/.test(l.text))).toBe(false);
    const before = get(night, 'toad').belief;
    night = pass(night);
    expect(get(night, 'toad').belief).toBe(before - 1);
  });

  it('the hard ditch is already full: the water starts at one', () => {
    expect(fence('day', 'hard').fence.level).toBe(1);
    expect(fence().fence.level).toBe(0);
  });

  it('every hour plays out the same for the same state', () => {
    const s = setUp(fence(), { pulse: true, level: 1, rise: true }, { fox: 'diketV', toad: 'stangslet' });
    expect(step(s, { type: 'endTurn' }).state).toEqual(step(s, { type: 'endTurn' }).state);
    expect(fence().fence).toEqual(fence().fence);
  });
});
