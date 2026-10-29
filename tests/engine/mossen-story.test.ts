import { describe, expect, it } from 'vitest';
import { meetingOptions } from '../../src/data/meetings';
import { MOSSEN } from '../../src/data/regions/mossen';
import { defaultPlan } from '../../src/engine/campfire';
import { generateRegion } from '../../src/engine/regions';
import { bondKey, verseStatus } from '../../src/engine/rules';
import { createGame, regionJourney } from '../../src/engine/setup';
import type { GameState, MeetingId, VerseId } from '../../src/engine/types';
import { get, plain, run } from './helpers';

/** On Mossen's map, standing right before a story part of the given kind. */
function before(meeting: MeetingId, verse: VerseId = 'ingenLamnas', seed = 3): GameState {
  const s = run(plain(createGame(seed)), { type: 'swear', verses: [verse] });
  s.journey = regionJourney(MOSSEN, seed);
  s.run.regions = ['dalen', 'mossen'];
  const start = s.journey.nodes[0];
  const t = [...MOSSEN.meetings, ...MOSSEN.finds].find((x) => x.meeting === meeting)!;
  const { key: _k, ...rest } = t;
  s.journey.nodes.push({ ...rest, id: 'here', row: 1, x: 50, y: 80, next: [] });
  start.next = ['here'];
  for (const a of s.animals) a.status = 'safe';
  return s;
}
const go = (s: GameState) => run(s, { type: 'travel', to: 'here' });
const say = (s: GameState, option: string, uid?: number) => run(s, { type: 'respond', option, uid });
const ids = (s: GameState) => meetingOptions(s).map((o) => o.id);

describe('Mossen has stories of its own', () => {
  it('its maps hold its own meetings and finds, and nothing borrowed', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) for (const n of generateRegion(MOSSEN, i).nodes) if (n.meeting) seen.add(n.meeting);
    expect([...seen].sort()).toEqual(['boet', 'ekot', 'eremiten', 'hjortron', 'ryggsacken', 'tjarnen', 'vilsna']);
  });

  it('every story part on 300 maps comes to an end, answering the first reply each time', () => {
    for (let seed = 1; seed <= 300; seed++) {
      for (const n of generateRegion(MOSSEN, seed).nodes.filter((x) => x.meeting)) {
        let s = go(before(n.meeting!, 'ingenLamnas', seed));
        for (let k = 0; k < 12 && s.meeting; k++) {
          const o = meetingOptions(s)[0];
          expect(o).toBeDefined();
          s = say(s, o.id, o.pickCard ? s.draw[0]?.uid : undefined);
        }
        expect(s.meeting).toBeNull();
      }
    }
  });
});

describe('Den vilsna', () => {
  it('searching costs the weakest a moment in the mist; then the lost one may join us, or be led home', () => {
    let s = go(before('vilsna'));
    expect(s.meeting?.kind).toBeDefined();
    const owl = get(s, 'owl').belief;
    s = say(s, 'search');
    // The owl and the adder both start at 4; the first of them gets lost a while.
    expect(get(s, 'owl').belief).toBe(owl - 1);
    // Remembered, for the fog at the end of the bog.
    expect(s.knowledge).toContain('vilsnaHittad');
    const kind = s.meeting!.kind!;
    const joined = say(s, 'join');
    expect(joined.animals.some((a) => a.species === kind && a.status === 'safe')).toBe(true);
    s.hope = 5;
    const home = say(s, 'home');
    expect(home.hope).toBe(6);
    expect(home.met).toContain(kind);
  });

  it('walking on, the eldest hears it calling long after', () => {
    const s0 = go(before('vilsna'));
    const b = get(s0, 'badger').belief;
    expect(get(say(s0, 'on'), 'badger').belief).toBe(b - 1);
  });
});

describe('Eremiten', () => {
  it('the eldest sits with it and learns something', () => {
    let s = go(before('eremiten'));
    const skills = get(s, 'badger').skills.length;
    s = say(s, 'talk');
    expect(get(s, 'badger').skills.length).toBe(skills + 1);
    expect(s.meeting?.card).toBeDefined();
  });

  it('one of us may stay with it – and Ingen lämnas kvar breaks', () => {
    let s = go(before('eremiten'));
    const stayer = meetingOptions(s).find((o) => o.id === 'stay')!;
    expect(stayer).toBeDefined();
    s = say(s, 'stay');
    const left = s.animals.find((a) => a.status === 'left');
    expect(left).toBeDefined();
    expect(left!.elder).toBe(false);
    expect(verseStatus(s, 'ingenLamnas')).toBe('flipped');
    let k = go(before('eremiten', 'manen'));
    k.hope = 5;
    k = say(k, 'stay');
    expect(k.hope).toBe(7);
  });
});

describe('Ekot', () => {
  it('the one who grieves most hears the dead; answering lets one grief go, following lets them all go at a cost', () => {
    const s0 = before('ekot');
    get(s0, 'fox').grief = ['mice', 'dalen'];
    let s = go(s0);
    expect(ids(s)).toEqual(['answer', 'follow']);
    const b = get(s, 'fox').belief;
    const a = say(s, 'answer');
    expect(get(a, 'fox').grief).toEqual(['dalen']);
    expect(get(a, 'fox').belief).toBe(b + 1);
    s.hope = 5;
    const f = say(s, 'follow');
    expect(get(f, 'fox').grief).toEqual([]);
    expect(get(f, 'fox').belief).toBe(b - 1);
    expect(f.hope).toBe(4);
  });

  it('with no one grieving, the echo only mocks us', () => {
    const s = go(before('ekot'));
    expect(ids(s)).toEqual(['close']);
  });
});

describe('Hjortronmyren', () => {
  it('feeds us all – but we scatter, and no bonds grow at the next fire; the one after, they do', () => {
    let s = go(before('hjortron'));
    s.hope = 5;
    s = say(s, 'pick');
    expect(s.hope).toBe(7);
    expect(s.fireDebt.noBonds).toBe(true);
    // A fire with a pair by the embers: the bond stays as it was.
    s.phase = 'campfire';
    s.meeting = null;
    s.proposal = null;
    const plan = defaultPlan(s);
    const [x, y] = plan.pairs[0];
    const before0 = s.bonds[bondKey(x, y)] ?? 0;
    s = run(s, { type: 'restAtFire', ...plan });
    expect(s.bonds[bondKey(x, y)] ?? 0).toBe(before0);
    expect(s.fireDebt.noBonds).toBeFalsy();
  });
});

describe('Det tomma boet', () => {
  it('heals, draws the close closer, and leaves the lonely at the edge', () => {
    const s0 = before('boet');
    s0.bonds = { [bondKey('badger', 'toad')]: 2 };
    get(s0, 'fox').injuries = ['shock'];
    const fox = get(s0, 'fox').belief;
    const s = say(go(s0), 'rest');
    expect(s.bonds[bondKey('badger', 'toad')]).toBe(3);
    expect(get(s, 'fox').injuries).toEqual([]);
    expect(get(s, 'fox').belief).toBe(fox - 1);
    expect(get(s, 'badger').belief).toBe(8);
  });
});

describe('Ryggsäcken', () => {
  it('a map of the way ahead, the smell of people for the fearful, and a sandwich for the hungriest hunter', () => {
    const s0 = go(before('ryggsacken'));
    const s = say(s0, 'search');
    expect(get(s, 'adder').hunger).toBe(0);
    expect(s.animals.some((a) => a.belief < get(s0, a.id).belief)).toBe(true);
  });
});

describe('Myrstjärnan', () => {
  it('the grieving let one grief go, the rest find belief, and time passes', () => {
    const s0 = before('tjarnen');
    get(s0, 'fox').grief = ['mice'];
    const clock = s0.clock;
    const toad = get(s0, 'toad').belief;
    const s = say(go(s0), 'look');
    expect(get(s, 'fox').grief).toEqual([]);
    expect(get(s, 'toad').belief).toBe(toad + 1);
    expect(s.clock).not.toBe(clock);
  });
});
