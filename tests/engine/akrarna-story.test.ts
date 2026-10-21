import { describe, expect, it } from 'vitest';
import { meetingOptions } from '../../src/data/meetings';
import { crowMemory } from '../../src/data/meetings/akrarna.sv';
import { AKRARNA } from '../../src/data/regions/akrarna';
import { planRoad } from '../../src/engine/encounters/road';
import { generateRegion } from '../../src/engine/regions';
import { verseStatus } from '../../src/engine/rules';
import { createGame, makeAnimal, regionJourney } from '../../src/engine/setup';
import { step } from '../../src/engine/step';
import type { GameState, MeetingId, Species, VerseId } from '../../src/engine/types';
import { get, plain, run } from './helpers';

/** On Åkrarna's map, standing right before a story part of the given kind. */
function before(meeting: MeetingId, verse: VerseId = 'ingenLamnas', seed = 3): GameState {
  const s = run(plain(createGame(seed)), { type: 'swear', verses: [verse] });
  s.journey = regionJourney(AKRARNA, seed);
  s.run.regions = ['dalen', 'akrarna'];
  const start = s.journey.nodes[0];
  const t = [...AKRARNA.meetings, ...AKRARNA.finds].find((x) => x.meeting === meeting)!;
  const { key: _k, ...rest } = t;
  s.journey.nodes.push({ ...rest, id: 'here', row: 1, x: 50, y: 80, next: [] });
  start.next = ['here'];
  for (const a of s.animals) a.status = 'safe';
  return s;
}

const go = (s: GameState) => run(s, { type: 'travel', to: 'here' });
const say = (s: GameState, option: string, uid?: number) => run(s, { type: 'respond', option, uid });
const ids = (s: GameState) => meetingOptions(s).map((o) => o.id);

function add(s: GameState, species: Species): string {
  const made = makeAnimal({ species }, species, 'Ny', s, () => s.nextUid++, 'dike');
  made.animal.traits = [];
  made.animal.status = 'safe';
  s.animals.push(made.animal);
  return species;
}

describe('Åkrarna has stories of its own', () => {
  it('its maps hold its own meetings and finds', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 80; i++) for (const n of generateRegion(AKRARNA, i).nodes) if (n.meeting) seen.add(n.meeting);
    for (const m of ['faran', 'krakflocken', 'haren', 'skramman', 'spillsad', 'traktorn']) expect(seen.has(m)).toBe(true);
  });

  it('every story part on 300 maps comes to an end, answering the first reply each time', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const map = generateRegion(AKRARNA, seed);
      for (const n of map.nodes.filter((x) => x.meeting)) {
        let s = before(n.meeting!, 'ingenLamnas', seed);
        s = go(s);
        for (let k = 0; k < 12 && s.meeting; k++) {
          const o = meetingOptions(s)[0];
          expect(o).toBeDefined();
          const uid = o.pickCard ? s.draw[0]?.uid : undefined;
          s = say(s, o.id, uid);
        }
        expect(s.meeting).toBeNull();
      }
    }
  });
});

describe('Igelkotten i fåran', () => {
  it('a hedgehog lies in the furrow; helped, it may join us – and it is remembered', () => {
    let s = go(before('faran'));
    expect(s.meeting).toMatchObject({ id: 'faran', kind: 'hedgehog' });
    s = say(s, 'help');
    expect(s.knowledge).toEqual(expect.arrayContaining(['faranHjalpt', 'igelkottHjalpt']));
    const cards = s.discard.length;
    s = say(s, 'join');
    const h = get(s, 'hedgehog');
    expect(h.belief).toBeLessThanOrEqual(4);
    expect(s.discard.length).toBe(cards + 3);
    expect(s.met).toContain('hedgehog');
  });

  it('if a hedgehog is already one of us, it is someone else in the furrow', () => {
    const s0 = before('faran');
    add(s0, 'hedgehog');
    const s = go(s0);
    expect(s.meeting?.kind).toBeDefined();
    expect(s.meeting?.kind).not.toBe('hedgehog');
    expect(s.animals.map((a) => a.species)).not.toContain(s.meeting!.kind);
  });

  it('left behind, the eldest looks back – and the boss will know', () => {
    let s = go(before('faran'));
    const belief = get(s, 'badger').belief;
    s = say(s, 'leave');
    expect(get(s, 'badger').belief).toBe(belief - 1);
    expect(s.knowledge).toContain('faranLamnad');
  });
});

describe('the crows remember', () => {
  it('the crow at the fire is remembered: paid, tricked or scared', () => {
    const s = createGame(1);
    expect(crowMemory(s)).toBe('none');
    s.knowledge.push('krakanBetald');
    expect(crowMemory(s)).toBe('kind');
    s.knowledge.push('krakanSkramd');
    expect(crowMemory(s)).toBe('cruel');
  });

  it('by the scarecrow, kind crows let us rest; cruel ones peck', () => {
    const kind = before('skramman');
    kind.knowledge.push('krakanBetald');
    let s = say(go(kind), 'rest');
    expect(s.meeting?.frame).toBe('calm');
    const cruel = before('skramman');
    cruel.knowledge.push('krakanSkramd');
    get(cruel, 'fox').injuries = ['bleeding'];
    const deck = cruel.draw.length + cruel.discard.length + cruel.hand.length;
    s = say(go(cruel), 'rest');
    expect(s.meeting?.frame).toBe('pecked');
    const after = s.draw.length + s.discard.length + s.hand.length;
    expect(after < deck || s.animals.some((a) => a.injuries.includes('bleeding'))).toBe(true);
  });

  it('the flock shows the way to friends, mobs the cruel, and names a price to strangers', () => {
    const kind = before('krakflocken');
    kind.knowledge.push('krakanBetald');
    expect(ids(go(kind))).toContain('listen');
    const cruel = before('krakflocken');
    cruel.knowledge.push('krakanLurad');
    let s = go(cruel);
    expect(ids(s)).toEqual(expect.arrayContaining(['scare', 'endure']));
    const hope = s.hope;
    s = say(s, 'endure');
    expect(s.hope).toBe(hope - 1);
    const none = go(before('krakflocken'));
    expect(ids(none)).toEqual(['pay', 'no']);
    expect(step(none, { type: 'respond', option: 'pay' }).events.some((e) => e.kind === 'error')).toBe(true);
  });
});

describe('Spillsäd', () => {
  it('feeds us, and the mice want to stay: letting them breaks "Ingen lämnas kvar"', () => {
    let s = go(before('spillsad'));
    const hope = s.hope;
    s = say(s, 'eat');
    expect(s.hope).toBe(hope + 2);
    expect(s.meeting?.frame).toBe('mice');
    s = say(s, 'stay');
    expect(get(s, 'mice').status).toBe('left');
    expect(verseStatus(s, 'ingenLamnas')).toBe('flipped');
  });

  it('the eldest can ask them to come – it costs them', () => {
    let s = say(go(before('spillsad')), 'eat');
    const b = get(s, 'mice').belief;
    s = say(s, 'need');
    expect(get(s, 'mice').status).not.toBe('left');
    expect(get(s, 'mice').belief).toBe(b - 2);
  });
});

describe('Den övergivna traktorn', () => {
  it('heals everyone – but the diesel gets into the most fearful', () => {
    const s0 = before('traktorn');
    get(s0, 'toad').injuries = ['poisoned', 'shock'];
    get(s0, 'owl').belief = 2;
    const s = say(go(s0), 'rest');
    expect(get(s, 'toad').injuries).toEqual([]);
    expect(get(s, 'owl').belief).toBe(1);
    expect(s.meeting?.by).toBe('owl');
  });
});

describe('Haren på åkern', () => {
  it('without a hare there are only tracks', () => {
    const s = go(before('haren'));
    expect(ids(s)).toEqual(['tracks']);
  });

  it('with a hare, one of its kin can join – or it stays with them, and the oath breaks', () => {
    const a = before('haren');
    add(a, 'hare');
    let s = go(a);
    expect(ids(s)).toEqual(['join', 'stay', 'goodbye']);
    s = say(s, 'join');
    expect(s.animals.filter((x) => x.species === 'hare')).toHaveLength(2);
    const b = before('haren');
    add(b, 'hare');
    s = say(go(b), 'stay');
    expect(get(s, 'hare').status).toBe('left');
    expect(verseStatus(s, 'ingenLamnas')).toBe('flipped');
  });
});

describe('Grusvägen', () => {
  it('is gravel: tractors fill both lanes, nothing comes unlit, and the next hour is always heard', () => {
    let tractorsBoth = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const plan = planRoad({ rng: seed }, 10, 'night', 'gravel').trafficPlan;
      expect(plan.flat().some((x) => x.dark)).toBe(false);
      tractorsBoth += plan.filter((h) => h.length === 2 && h.every((x) => x.vehicle === 'traktor')).length;
    }
    expect(tractorsBoth).toBeGreaterThan(50);
    let s = before('faran');
    const first = { ...AKRARNA.first };
    const { key: _k, ...rest } = first;
    s.journey.nodes.find((n) => n.id === 'here')!.kind = 'encounter';
    Object.assign(s.journey.nodes.find((n) => n.id === 'here')!, rest, { meeting: undefined });
    s = go(s);
    expect(s.roadKind).toBe('gravel');
    expect(s.peekNext).toBe(true);
  });
});
