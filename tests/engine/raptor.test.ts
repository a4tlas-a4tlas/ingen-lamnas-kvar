import { describe, expect, it } from 'vitest';
import { AKRARNA } from '../../src/data/regions/akrarna';
import { shadowOptions } from '../../src/engine/encounters/raptor';
import { generateRegion } from '../../src/engine/regions';
import { createGame } from '../../src/engine/setup';
import type { GameState, TimeOfDay, Variant, ZoneId } from '../../src/engine/types';
import { forecast } from '../../src/ui/status';
import { get, run } from './helpers';

/** Sworn, and walking straight out onto the fields. */
function fields(time: TimeOfDay = 'day', variant: Variant = 'normal', seed = 5): GameState {
  let s = run(createGame(seed), { type: 'swear', verses: ['manen'] });
  const start = s.journey.nodes[0];
  const t = AKRARNA.dangers.find((d) => d.key === 'falten')!;
  const { key: _k, ...rest } = t;
  s.journey.nodes.push({ ...rest, id: 'falten', row: 1, x: 50, y: 80, next: [] });
  start.next = ['falten'];
  s.journey.truth.falten = variant;
  s.journey.guess.falten = variant;
  s.clock = time;
  s = run(s, { type: 'travel', to: 'falten' });
  calm(s);
  s.kraft = 99;
  return s;
}

function calm(s: GameState) {
  for (const a of s.animals) if (a.status === 'active') { a.belief = 8; a.intent = { kind: 'follow' }; }
}

const pass = (s: GameState) => { calm(s); s = run(s, { type: 'endTurn' }); calm(s); s.kraft = 99; return s; };
const put = (s: GameState, zone: ZoneId, ...ids: string[]) => { for (const id of ids) get(s, id).zone = zone; return s; };
/** Everyone tucked away at the field edge except those named. */
const only = (s: GameState, zone: ZoneId, ...ids: string[]) => { for (const a of s.animals) a.zone = 'akerrenen'; return put(s, zone, ...ids); };

describe('Fältet under himlen', () => {
  it('lies on Åkrarna: the fields are drawn on its maps', () => {
    const maps = Array.from({ length: 40 }, (_, i) => generateRegion(AKRARNA, i));
    expect(maps.filter((m) => m.nodes.some((n) => n.encounter === 'raptor')).length).toBeGreaterThan(20);
  });

  it('the first hour the buzzard only circles', () => {
    let s = only(fields(), 'faltet', 'toad');
    expect(s.raptors).toEqual([{ zone: null, maybe: [] }]);
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'toad').status).toBe('active');
    expect(s.raptors[0].zone).not.toBeNull();
  });

  it('the shadow glides toward whoever stands exposed, at most one zone an hour', () => {
    let s = pass(only(fields(), 'faltet', 'fox'));
    expect(s.raptors[0].zone).toBe('faltet');
    // Sotfot moves to the far furrow; the shadow can only come one step closer.
    put(s, 'fara3', 'fox');
    s = pass(s);
    expect(shadowOptions('faltet')).toContain(s.raptors[0].zone);
  });

  it('it carries off a small one in the open (with a last moment), claws a medium one, cannot lift the large', () => {
    let s = pass(only(fields(), 'faltet', 'toad', 'fox', 'badger'));
    expect(s.raptors[0].zone).toBe('faltet');
    s = run(s, { type: 'endTurn' });
    expect(s.pending).toMatchObject({ victim: 'toad', source: 'vråk', severity: 'kill' });
    s = run(s, { type: 'lastMoment', choice: 'letGo' });
    expect(get(s, 'toad').status).toBe('dead');
    let t = pass(only(fields(), 'faltet', 'fox', 'badger'));
    t = run(t, { type: 'endTurn' });
    expect(get(t, 'fox').injuries).toContain('bleeding');
    expect(get(t, 'badger').injuries).toEqual([]);
  });

  it('hides by size: the furrows the small, the stones the small and medium', () => {
    let s = pass(only(fields(), 'fara2', 'toad', 'fox'));
    expect(s.raptors[0].zone).toBe('fara2');
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'toad').status).toBe('active');
    expect(get(s, 'fox').injuries).toContain('bleeding');
    let t = pass(only(fields(), 'stenroset', 'toad', 'fox'));
    t.raptors[0].zone = 'stenroset';
    t = run(t, { type: 'endTurn' });
    expect(get(t, 'fox').injuries).toEqual([]);
    expect(get(t, 'toad').status).toBe('active');
  });

  it('in the air there is no escape: a flying owl is clawed', () => {
    let s = pass(only(fields(), 'faltet', 'owl'));
    get(s, 'owl').flying = true;
    s.raptors[0].zone = 'faltet';
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'owl').injuries).toContain('bleeding');
  });

  it("Gamla Ljung's shelter makes the bird let go", () => {
    let s = pass(only(fields(), 'faltet', 'toad', 'badger'));
    s.raptors[0].zone = 'faltet';
    get(s, 'toad').protectedBy = 'badger';
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'toad').status).toBe('active');
    expect(get(s, 'badger').injuries).toEqual([]);
    expect(s.log.some((e) => e.text.includes('släpper taget'))).toBe(true);
  });

  it('at night the eagle owl is only heard, over one of two places – and it hears wings first', () => {
    let s = pass(only(fields('night'), 'faltet', 'toad'));
    expect(s.raptors[0].zone).toBeNull();
    expect(s.raptors[0].maybe).toHaveLength(2);
    expect(s.raptors[0].maybe).toContain('faltet');
    expect(forecast(s).some((l) => l.text.includes(' eller '))).toBe(true);
    let t = pass(only(fields('night'), 'faltet', 'toad', 'owl'));
    get(t, 'owl').flying = true;
    t = run(t, { type: 'endTurn' });
    expect(get(t, 'owl').injuries).toContain('bleeding');
    expect(get(t, 'toad').status).toBe('active');
  });

  it('where Kvarn remembered too kindly, a pair hunts: two shadows, never over the same place', () => {
    const s = pass(only(fields('day', 'hard'), 'faltet', 'toad', 'fox'));
    expect(s.raptors).toHaveLength(2);
    expect(s.raptors[0].zone).not.toBe(s.raptors[1].zone);
  });
});
