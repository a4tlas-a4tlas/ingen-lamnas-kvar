import { describe, expect, it } from 'vitest';
import { meetingOptions } from '../../src/data/meetings';
import { pathsFrom } from '../../src/data/journey';
import { STADEN } from '../../src/data/regions/staden';
import { crowdNow } from '../../src/engine/encounters/fireworks';
import { generateRegion } from '../../src/engine/regions';
import { bondKey, verseStatus } from '../../src/engine/rules';
import { createGame, makeAnimal, regionJourney } from '../../src/engine/setup';
import type { GameState, MeetingId, Species, VerseId } from '../../src/engine/types';
import { get, plain, run } from './helpers';

/** On the city's map, standing right before a story part of the given kind. */
function before(meeting: MeetingId, verse: VerseId = 'ingenLamnas', seed = 3): GameState {
  const s = run(plain(createGame(seed)), { type: 'swear', verses: [verse] });
  s.journey = regionJourney(STADEN, seed);
  s.run.regions = ['dalen', 'akrarna', 'staden'];
  const start = s.journey.nodes[0];
  const t = [...STADEN.meetings, ...STADEN.finds].find((x) => x.meeting === meeting)!;
  const { key: _k, ...rest } = t;
  s.journey.nodes.push({ ...rest, id: 'here', row: 1, x: 50, y: 80, next: [] });
  start.next = ['here'];
  for (const a of s.animals) a.status = 'safe';
  return s;
}

const go = (s: GameState) => run(s, { type: 'travel', to: 'here' });
const say = (s: GameState, option: string, uid?: number) => run(s, { type: 'respond', option, uid });
const ids = (s: GameState) => meetingOptions(s).map((o) => o.id);
/** Only these of the first group stay with us; the others were never here. */
const only = (s: GameState, ...keep: string[]) => { s.animals = s.animals.filter((a) => keep.includes(a.id)); return s; };

function add(s: GameState, species: Species): string {
  const made = makeAnimal({ species }, species, 'Ny', s, () => s.nextUid++, 'dike');
  made.animal.traits = [];
  made.animal.status = 'safe';
  s.animals.push(made.animal);
  return species;
}

describe('the city has stories of its own', () => {
  it('its maps hold its own meetings and finds, and nothing borrowed', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 80; i++) for (const n of generateRegion(STADEN, i).nodes) if (n.meeting) seen.add(n.meeting);
    expect([...seen].sort()).toEqual(['barnet', 'duvorna', 'kolonilotten', 'parkdammen', 'soptunnan', 'stadsraven']);
  });

  it('every story part on 300 maps comes to an end, answering the first reply each time', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const map = generateRegion(STADEN, seed);
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

describe('Duvorna', () => {
  it('will not come down while a predator is near: one steps back, then they name their price', () => {
    let s = go(before('duvorna'));
    expect(ids(s)).toEqual(['back', 'no']);
    const fox = get(s, 'fox').belief;
    s = say(s, 'back');
    expect(get(s, 'fox').belief).toBe(fox - 1);
    expect(s.meeting?.frame).toBe('price');
    expect(ids(s)).toEqual(['pay', 'no']);
  });

  it('with no predators among us, they come down at once', () => {
    const s = go(only(before('duvorna'), 'badger', 'toad', 'mice'));
    expect(ids(s)).toEqual(['pay', 'no']);
  });

  it('for a card, the next step may go anywhere in the next row – once', () => {
    let s = go(only(before('duvorna'), 'badger', 'toad', 'mice'));
    // A next row of three, of which a path leads only to the first.
    const row = ['a', 'b', 'c'].map((id, i) => ({ id, row: 21, kind: 'find' as const, meeting: 'soptunnan' as const, name: id, fogName: id, arrive: '', x: 20 + i * 20, y: 60, next: [] }));
    s.journey.nodes.push(...row);
    const here = s.journey.nodes.find((n) => n.id === 'here')!;
    here.row = 20;
    here.next = ['a'];
    const cards = s.draw.length + s.hand.length + s.discard.length;
    s = say(s, 'pay', s.draw[0].uid);
    expect(s.draw.length + s.hand.length + s.discard.length).toBe(cards - 1);
    expect(s.journey.roofs).toBe(true);
    s = say(s, 'close');
    expect(pathsFrom(s, 'here').map((p) => p.to)).toEqual(['a', 'b', 'c']);
    s = run(s, { type: 'travel', to: 'c' });
    expect(s.journey.at).toBe('c');
    expect(s.journey.roofs).toBeUndefined();
  });
});

describe('Barnet vid fönstret', () => {
  it('standing still: the hurt heal, hope rises, and the child remembers us', () => {
    const s0 = before('barnet');
    get(s0, 'badger').injuries = ['bleeding'];
    s0.hope = 5;
    const s = say(go(s0), 'still');
    expect(get(s, 'badger').injuries).toEqual([]);
    expect(s.hope).toBe(6);
    expect(s.knowledge).toContain('barnetSag');
  });

  it('hiding costs the one who wanted to be seen: the fawn if there is one', () => {
    let s = go(before('barnet'));
    const b = get(s, 'badger').belief;
    s = say(s, 'hide');
    // Without a fawn, the most trusting of the prey: the badger, at 8.
    expect(get(s, 'badger').belief).toBe(b - 1);
    expect(s.knowledge).not.toContain('barnetSag');

    const s1 = before('barnet');
    add(s1, 'fawn');
    const f = get(s1, 'fawn').belief;
    const s2 = say(go(s1), 'hide');
    expect(get(s2, 'fawn').belief).toBe(f - 1);
  });

  /** At the city's last fire, with only the park ahead – and into it. */
  function park(child: boolean, seed: number): GameState {
    let s = run(plain(createGame(seed)), { type: 'swear', verses: ['manen'] });
    s.journey = regionJourney(STADEN, seed);
    s.run.regions = ['dalen', 'akrarna', 'staden'];
    const end = s.journey.nodes.find((n) => n.encounter === 'fireworks')!;
    s.journey.at = s.journey.nodes.find((n) => n.next.includes(end.id))!.id;
    for (const a of s.animals) a.status = 'safe';
    if (child) s.knowledge.push('barnetSag');
    return run(s, { type: 'travel', to: end.id });
  }

  it('in the park, the child’s family steps aside once – the first hour they would come right up to us', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const plain = park(false, seed);
      expect(plain.fireworks.childHour).toBeUndefined();
      expect(crowdNow(plain)).toBe(plain.fireworks.crowdPlan[0]);

      const s = park(true, seed);
      // In the first hour we all stand at the gate, and the first row of the park lies next to it.
      const nearGate = ['buskarna', 'gangen', 'dammen'].includes(s.fireworks.crowdPlan[0]);
      if (nearGate) {
        expect(s.fireworks.childHour).toBe(1);
        expect(crowdNow(s)).toBeNull();
        expect(s.closed).toEqual([]);
        expect(s.log.some((e) => 'text' in e && /Familjen går åt sidan/.test(e.text))).toBe(true);
      } else {
        expect(s.fireworks.childHour).toBeUndefined();
      }
    }
  });
});

describe('Stadsräven', () => {
  it('tempts the predator least sure of us – on a tie, the hungriest', () => {
    // The owl and the adder both start at 4; the adder is hungry.
    const s = go(before('stadsraven'));
    expect(s.meeting?.tempted).toBe('adder');
    expect(ids(s)).toEqual(['feast', 'stay']);
  });

  it('at belief 5 or more, it says no by itself, and our hunters eat anyway', () => {
    const s0 = before('stadsraven');
    for (const id of ['fox', 'owl', 'adder']) get(s0, id).belief = 6;
    let s = go(s0);
    expect(ids(s)).toEqual(['refuse']);
    const t = get(s, s.meeting!.tempted!);
    const b = t.belief;
    s = say(s, 'refuse');
    expect(get(s, t.id).belief).toBe(b + 1);
    expect(get(s, 'adder').hunger).toBe(0);
  });

  it('letting it stay breaks Ingen lämnas kvar, and the rest of us find hope', () => {
    let s = go(before('stadsraven'));
    s = say(s, 'stay');
    expect(get(s, 'adder').status).toBe('left');
    expect(verseStatus(s, 'ingenLamnas')).toBe('flipped');
    // Under another oath nothing breaks, and the stay itself gives hope.
    let k = go(before('stadsraven', 'manen'));
    k.hope = 5;
    k = say(k, 'stay');
    expect(k.hope).toBe(6);
  });

  it('only one close to it can hold it back', () => {
    const s0 = before('stadsraven');
    s0.bonds[bondKey('badger', 'adder')] = 2;
    let s = go(s0);
    expect(ids(s)).toEqual(['hold', 'feast', 'stay']);
    const b = get(s, 'adder').belief;
    s = say(s, 'hold');
    expect(get(s, 'adder').status).toBe('safe');
    expect(get(s, 'adder').belief).toBe(b - 1);
  });

  it('a feast fills every hunter, and costs the tempted one', () => {
    let s = go(before('stadsraven'));
    const b = get(s, 'adder').belief;
    s = say(s, 'feast');
    expect(get(s, 'adder').hunger).toBe(0);
    expect(get(s, 'adder').belief).toBe(Math.max(b - 2, 0));
    expect(get(s, 'adder').status).toBe('safe');
  });

  it('with no predators among us, it only looks – and the eldest stands before the small', () => {
    let s = go(only(before('stadsraven'), 'badger', 'toad', 'mice'));
    expect(s.meeting?.tempted).toBeUndefined();
    expect(ids(s)).toEqual(['close']);
    const b = get(s, 'badger').belief;
    s = say(s, 'close');
    expect(s.meeting).toBeNull();
    expect(get(s, 'badger').belief).toBe(b - 1);
  });
});

describe('Soptunnan', () => {
  it('tipping it over feeds us all – and sometimes the greediest eats something rotten', () => {
    let sick = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const s0 = before('soptunnan', 'ingenLamnas', seed);
      s0.hope = 5;
      const s = say(go(s0), 'eat');
      expect(s.hope).toBe(7);
      expect(get(s, 'adder').hunger).toBe(0);
      const poisoned = s.animals.filter((a) => a.injuries.includes('poisoned'));
      if (s.meeting?.frame === 'sick') {
        sick++;
        // The adder starts hungry: it eats first.
        expect(poisoned.map((a) => a.id)).toEqual(['adder']);
      } else expect(poisoned).toEqual([]);
    }
    expect(sick).toBeGreaterThan(5);
    expect(sick).toBeLessThan(35);
  });

  it('a nose picks out what is good: no poison, a little less hope', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s0 = before('soptunnan', 'ingenLamnas', seed);
      s0.hope = 5;
      const s = say(go(s0), 'sniff');
      expect(s.meeting?.by).toBe('badger');
      expect(s.hope).toBe(6);
      expect(get(s, 'adder').hunger).toBe(0);
      expect(s.animals.some((a) => a.injuries.includes('poisoned'))).toBe(false);
    }
  });
});

describe('Kolonilotten', () => {
  it('we sleep long: the hurt heal, and we wake at the other time of day', () => {
    const s0 = before('kolonilotten');
    get(s0, 'toad').injuries = ['shock'];
    const clock = s0.clock;
    const s = say(go(s0), 'sleep');
    expect(get(s, 'toad').injuries).toEqual([]);
    expect(s.clock).not.toBe(clock);
  });

  it('counts as a night by the embers: a fading trait lets go after one more', () => {
    const s0 = before('kolonilotten');
    get(s0, 'fox').traits = ['hetsig'];
    get(s0, 'fox').emberNights = 1;
    const s = say(go(s0), 'sleep');
    expect(get(s, 'fox').traits).toEqual([]);

    const s1 = before('kolonilotten');
    get(s1, 'fox').traits = ['hetsig'];
    const s2 = say(go(s1), 'sleep');
    expect(get(s2, 'fox').traits).toEqual(['hetsig']);
    expect(get(s2, 'fox').emberNights).toBe(1);
  });
});

describe('Parkdammen', () => {
  it('washes off poison and shock, and the swimmers feel at home; the badger keeps the swan off', () => {
    const s0 = before('parkdammen');
    get(s0, 'fox').injuries = ['poisoned', 'shock', 'halt'];
    const toad = get(s0, 'toad').belief;
    const badger = get(s0, 'badger').belief;
    const s = say(go(s0), 'drink');
    expect(get(s, 'fox').injuries).toEqual(['halt']);
    expect(get(s, 'toad').belief).toBe(toad + 1);
    expect(s.meeting?.frame).toBe('swan');
    expect(get(s, 'badger').belief).toBe(badger + 1);
    expect(s.animals.some((a) => a.injuries.includes('bleeding'))).toBe(false);
  });

  it('with no large one among us, the swan bites one of the small', () => {
    const s = say(go(only(before('parkdammen'), 'toad', 'adder', 'fox')), 'drink');
    expect(s.meeting?.frame).toBe('bitten');
    const bitten = get(s, s.meeting!.by!);
    expect(bitten.size).toBe('small');
    expect(bitten.injuries).toContain('bleeding');
  });
});
