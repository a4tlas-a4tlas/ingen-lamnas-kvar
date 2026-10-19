import { describe, expect, it } from 'vitest';
import { SPECIES, START_GROUP } from '../../src/data/animals';
import { meetingOptions } from '../../src/data/meetings';
import { guide, guideName, kin } from '../../src/engine/roles';
import { createGame } from '../../src/engine/setup';
import type { GameState } from '../../src/engine/types';
import { DARK_WILL_BELOW, ownWillBelow, willOf } from '../../src/engine/will';
import { get, run } from './helpers';

describe('who we are', () => {
  it('is someone new of each kind every run: names drawn from the species, ids by kind', () => {
    const s = createGame(1);
    expect(s.animals.map((a) => a.id)).toEqual(START_GROUP.map((m) => m.species));
    for (const a of s.animals) expect(SPECIES[a.species].names.some((n) => a.name.endsWith(n))).toBe(true);
    const names = new Set(Array.from({ length: 30 }, (_, i) => createGame(i * 101 + 7).animals.map((a) => a.name).join()));
    expect(names.size).toBeGreaterThan(10);
    expect(createGame(5).animals.map((a) => a.name)).toEqual(createGame(5).animals.map((a) => a.name));
  });

  it('the eldest is called "Gamla …", and the one who remembers the way is the guide', () => {
    const s = createGame(3);
    expect(get(s, 'badger').elder).toBe(true);
    expect(get(s, 'badger').name.startsWith('Gamla ')).toBe(true);
    expect(guide(s)?.id).toBe('toad');
    expect(guideName(s)).toBe(get(s, 'toad').name);
  });

  it('the rest of the run is the same as before for the same seed: names come from their own stream', () => {
    const a = createGame(9);
    const b = createGame(9);
    for (const x of b.animals) x.name = 'Någon';
    expect(a.rng).toBe(b.rng);
    expect(a.draw.map((c) => c.kind)).toEqual(b.draw.map((c) => c.kind));
  });
});

describe('our own will', () => {
  const one = (belief: number, traits: string[] = [], time: 'day' | 'night' = 'night') => {
    const s = createGame(2);
    s.time = time;
    const a = get(s, 'mice');
    a.belief = belief;
    a.traits = traits as never;
    return { s, a };
  };

  it('at five and above we follow; below five our own will; below three it is worse', () => {
    expect(willOf(one(5).s, one(5).a)).toBe('follow');
    for (const b of [4, 3]) { const { s, a } = one(b); expect(willOf(s, a)).toBe('own'); }
    for (const b of [2, 1]) { const { s, a } = one(b); expect(willOf(s, a)).toBe('dark'); }
    expect(DARK_WILL_BELOW).toBe(3);
  });

  it('the brave hold out longer; the shy give way sooner in the light', () => {
    const brave = one(4, ['modig']);
    expect(ownWillBelow(brave.s, brave.a)).toBe(4);
    expect(willOf(brave.s, brave.a)).toBe('follow');
    const shy = one(5, ['skygg'], 'day');
    expect(willOf(shy.s, shy.a)).toBe('own');
    const shyNight = one(5, ['skygg'], 'night');
    expect(willOf(shyNight.s, shyNight.a)).toBe('follow');
  });

  it('shock and grief weigh like lost belief', () => {
    const { s, a } = one(5);
    a.injuries = ['shock'];
    expect(willOf(s, a)).toBe('own');
    a.grief = ['dalen'];
    expect(willOf(s, a)).toBe('own');
    a.belief = 4;
    expect(willOf(s, a)).toBe('dark');
  });

  it('those who follow never show a will of their own', () => {
    let s = run(createGame(4), { type: 'swear', verses: ['manen'] }, { type: 'travel', to: 'vagen' });
    for (let h = 0; h < 6 && s.phase === 'play'; h++) {
      for (const a of s.animals) if (a.status === 'active') a.belief = 6;
      s = run(s, { type: 'endTurn' });
      if (s.phase !== 'play') break;
      expect(s.animals.filter((a) => a.status === 'active').every((a) => a.intent.kind === 'follow' || a.belief < 5)).toBe(true);
    }
  });
});

describe('the story speaks to roles, not names', () => {
  const meet = (id: 'crow' | 'kvarnsTvekan', without: string[]): GameState => {
    const s = run(createGame(6), { type: 'swear', verses: ['manen'] });
    for (const w of without) get(s, w).status = 'dead';
    s.meeting = { id, frame: 'start', used: [], told: [] };
    return s;
  };

  it('a reply is only offered when someone of that kind or role is with us', () => {
    const all = meetingOptions(meet('crow', [])).map((o) => o.id);
    expect(all).toEqual(expect.arrayContaining(['guide', 'fox', 'owl', 'lonely']));
    const few = meetingOptions(meet('crow', ['toad', 'fox', 'owl', 'badger'])).map((o) => o.id);
    expect(few).not.toEqual(expect.arrayContaining(['guide']));
    expect(few).not.toContain('fox');
    expect(few).not.toContain('owl');
    expect(few).not.toContain('lonely');
  });

  it('without the guide, Kvarn’s doubt becomes guessing – named by whoever the guide was', () => {
    const s = meet('kvarnsTvekan', ['toad']);
    expect(meetingOptions(s).map((o) => o.id)).toEqual(['guess']);
    expect(kin(s, 'toad')).toBeUndefined();
  });
});
