import { describe, expect, it } from 'vitest';
import { MEETINGS, meetingOptions } from '../../src/data/meetings';
import { DALEN } from '../../src/data/regions/dalen';
import { crowCards } from '../../src/engine/campfire';
import { generateRegion } from '../../src/engine/regions';
import { step } from '../../src/engine/step';
import type { GameState, MeetingId } from '../../src/engine/types';
import { animalStatuses } from '../../src/ui/status';
import { classicGame, get, run } from './helpers';

const STORY: MeetingId[] = ['koltrasten', 'ihaligtTrad', 'barsnar', 'gammalStig', 'gryt', 'hjorten', 'maten', 'framlingen', 'gravskopan', 'kvarnsTvekan'];

/** Sworn and standing on the road, with a story part waiting to be answered. */
function meet(id: MeetingId, seed = 3): GameState {
  const s = run(classicGame(seed), { type: 'swear', verses: ['manen'] });
  s.journey.at = 'vagen';
  s.journey.visited.push('vagen');
  s.meeting = { id, frame: 'start', used: [], told: [] };
  return s;
}

const answer = (s: GameState, option: string, uid?: number) => run(s, { type: 'respond', option, uid });
const gone = (s: GameState, id: string) => { get(s, id).status = 'dead'; return s; };
const deck = (s: GameState) => [...s.draw, ...s.hand, ...s.discard];

/** Try seeds until a gamble goes the way we want. */
function rolled(id: MeetingId, option: string, frame: string, prep: (s: GameState) => void = () => {}): GameState {
  for (let seed = 1; seed < 200; seed++) {
    const s = meet(id, seed);
    prep(s);
    const after = answer(s, option);
    if (after.meeting?.frame === frame) return after;
  }
  throw new Error(`no seed gave ${frame}`);
}

describe("Dalen's story parts", () => {
  it('are all on the map, and every frame they lead to exists', () => {
    for (const t of [...DALEN.meetings, ...DALEN.finds]) expect(MEETINGS[t.meeting!]).toBeDefined();
    for (const id of STORY) {
      const frames = MEETINGS[id].frames;
      for (const f of Object.values(frames)) for (const o of f.options) {
        if (o.next) expect(frames[o.next], `${id}: ${o.next}`).toBeDefined();
        if (o.failNext) expect(frames[o.failNext], `${id}: ${o.failNext}`).toBeDefined();
      }
    }
  });

  it('always end: answering the first reply again and again closes every one, whoever is with us', () => {
    for (const id of STORY) for (const missing of [[], ['toad'], ['badger', 'owl', 'mice']]) {
      let s = meet(id);
      missing.forEach((m) => gone(s, m));
      for (let n = 0; n < 6 && s.meeting; n++) {
        const o = meetingOptions(s)[0];
        expect(o, `${id} without ${missing}`).toBeDefined();
        s = answer(s, o.id, o.pickCard ? crowCards(s)[0].uid : undefined);
      }
      expect(s.meeting, id).toBeNull();
    }
  });

  it('come up on generated maps, more than one kind on most', () => {
    let varied = 0;
    for (let seed = 0; seed < 100; seed++) {
      const kinds = new Set(generateRegion(DALEN, seed).nodes.filter((n) => n.meeting).map((n) => n.meeting));
      if (kinds.size >= 3) varied++;
    }
    expect(varied).toBeGreaterThan(80);
  });

  it('only let those who are with us answer', () => {
    const s = gone(meet('gryt'), 'badger');
    expect(meetingOptions(s).map((o) => o.id)).not.toContain('dig');
    const t = gone(meet('kvarnsTvekan'), 'toad');
    expect(meetingOptions(t).map((o) => o.id)).toEqual(['guess']);
  });
});

describe('Ett bärsnår', () => {
  it('feeds us all, and makes Fröna sick', () => {
    const s = meet('barsnar');
    const after = answer(s, 'eat');
    expect(after.hope).toBe(s.hope + 1);
    expect(get(after, 'toad').belief).toBe(get(s, 'toad').belief + 1);
    expect(get(after, 'mice').injuries).toContain('shock');
  });

  it('unless Gamla Ljung watches over them – and they grow closer', () => {
    const s = meet('barsnar');
    const after = answer(s, 'careful');
    expect(get(after, 'mice').injuries).not.toContain('shock');
    expect(after.bonds['badger|mice'] ?? 0).toBe((s.bonds['badger|mice'] ?? 0) + 1);
  });
});

describe('En gammal stig', () => {
  it('teaches whoever goes first a card they did not have', () => {
    const s = meet('gammalStig');
    const before = deck(s).filter((c) => c.owner === 'toad').map((c) => c.kind);
    const after = answer(s, 'first-1'); // the toad, second of us
    const now = deck(after).filter((c) => c.owner === 'toad').map((c) => c.kind);
    expect(now.length).toBe(before.length + 1);
    const learned = now.find((k) => !before.includes(k));
    expect(learned).toBeDefined();
    expect(after.meeting?.card).toBeTruthy();
    expect(MEETINGS.gammalStig.frames.learned.text(after)).toContain(after.meeting!.card!);
  });
});

describe('Ett övergivet gryt', () => {
  it('heals everyone, but Gamla Ljung grieves for home', () => {
    const s = meet('gryt');
    get(s, 'toad').injuries = ['bleeding', 'halt'];
    get(s, 'mice').injuries = ['shock'];
    const after = answer(s, 'rest');
    expect(get(after, 'toad').injuries).toEqual(['halt']);
    expect(get(after, 'mice').injuries).toEqual([]);
    expect(get(after, 'badger').grief).toContain('dalen');
    expect(animalStatuses(after, get(after, 'badger')).map((x) => x.label)).toContain('sörjer dalen');
  });

  it('or Ljung finds the old passages, and learns from them', () => {
    const s = meet('gryt');
    const after = answer(s, 'dig');
    expect(deck(after).length).toBe(deck(s).length + 1);
    expect(get(after, 'badger').grief).toEqual([]);
  });
});

describe('Den döende hjorten', () => {
  it('staying binds us all closer, through a cold night', () => {
    const s = meet('hjorten');
    const after = answer(s, 'stay');
    expect(after.hope).toBe(s.hope - 1);
    expect(after.bonds['fox|toad'] ?? 0).toBe((s.bonds['fox|toad'] ?? 0) + 1);
  });

  it('a hungry predator is tested: it may let the deer be, or eat while the small ones watch', () => {
    const hunger = (s: GameState) => { get(s, 'fox').belief = 3; get(s, 'adder').belief = 9; };
    const ok = rolled('hjorten', 'tempted', 'resisted', hunger);
    expect(get(ok, 'fox').belief).toBe(5);
    const bad = rolled('hjorten', 'tempted', 'ate', hunger);
    expect(get(bad, 'fox').belief).toBe(3);
    expect(get(bad, 'toad').belief).toBeLessThan(meet('hjorten').animals.find((a) => a.id === 'toad')!.belief);
  });

  it('the predator only comes into it when it is hungry', () => {
    const s = meet('hjorten');
    for (const a of s.animals) a.belief = 9;
    expect(meetingOptions(s).map((o) => o.id)).not.toContain('tempted');
  });
});

describe('Människorna med maten', () => {
  it('sneaking in feeds us – or the dog bites one of the small', () => {
    const fed = rolled('maten', 'sneak', 'fed');
    expect(fed.hope).toBe(meet('maten').hope + 2);
    const bitten = rolled('maten', 'sneak', 'bitten');
    expect(bitten.animals.some((a) => !a.predator && a.injuries.includes('bleeding'))).toBe(true);
  });

  it("Sotfot's theft is a gamble on how much Sotfot believes", () => {
    const stolen = rolled('maten', 'steal', 'stolen');
    expect(get(stolen, 'fox').belief).toBe(get(meet('maten'), 'fox').belief + 1);
    const caught = rolled('maten', 'steal', 'caught');
    expect(get(caught, 'fox').injuries).toContain('bleeding');
  });

  it('Fröna in the basket: fed, and frightened', () => {
    const after = answer(meet('maten'), 'basket');
    expect(get(after, 'mice').injuries).toContain('shock');
  });
});

describe('Den hungriga främlingen', () => {
  it('takes the card we share, and tells us what lies ahead', () => {
    const s = meet('framlingen');
    const card = crowCards(s)[0];
    expect(() => answer(s, 'share')).toThrow(/räven/);
    const after = answer(s, 'share', card.uid);
    expect(deck(after).some((c) => c.uid === card.uid)).toBe(false);
    expect(after.meeting?.told.length).toBeGreaterThan(0);
    expect(after.journey.scouted).toEqual(expect.arrayContaining(after.meeting!.told));
  });

  it('chasing it off hurts Sotfot: it was one of Sotfot’s kind', () => {
    const s = meet('framlingen');
    const after = answer(s, 'chase');
    expect(get(after, 'fox').belief).toBe(get(s, 'fox').belief - 1);
  });
});

describe('Grävskopans spår', () => {
  it('Kvarn reads how the machines move: we will remember it on the ridge', () => {
    const s = meet('gravskopan');
    const after = answer(s, 'read');
    expect(after.knowledge).toEqual(['machines']);
    expect(get(after, 'toad').belief).toBe(get(s, 'toad').belief + 1);
  });

  it('following them teaches us too, but the diesel frightens Fröna', () => {
    const after = answer(meet('gravskopan'), 'follow');
    expect(after.knowledge).toEqual(['machines']);
    expect(get(after, 'mice').injuries).toContain('shock');
  });
});

describe('Kvarns tvekan', () => {
  it('trusting Kvarn gives Kvarn faith; doubting sends the owl, and costs Kvarn', () => {
    const s = meet('kvarnsTvekan');
    expect(get(answer(s, 'trust'), 'toad').belief).toBe(get(s, 'toad').belief + 1);
    const doubted = answer(s, 'scout');
    expect(get(doubted, 'toad').belief).toBe(get(s, 'toad').belief - 2);
    expect(doubted.journey.scouted.length).toBeGreaterThan(0);
  });

  it('without Kvarn we can only guess, and that costs hope', () => {
    const s = gone(meet('kvarnsTvekan'), 'toad');
    const after = answer(s, 'guess');
    expect(after.hope).toBe(s.hope - 1);
    expect(after.meeting).toBeNull();
  });
});

describe('a gamble', () => {
  it('is seeded: the same game rolls the same way', () => {
    const s = meet('maten', 9);
    expect(step(s, { type: 'respond', option: 'sneak' }).state).toEqual(step(s, { type: 'respond', option: 'sneak' }).state);
  });
});
