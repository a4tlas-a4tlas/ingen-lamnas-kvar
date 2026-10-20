import { describe, expect, it } from 'vitest';
import { CARDS } from '../../src/data/cards';
import { LOADOUT, SKILLS, allSkills } from '../../src/data/skills';
import { defaultPlan } from '../../src/engine/campfire';
import { canPlay, cardBlockReason } from '../../src/engine/rules';
import { createGame } from '../../src/engine/setup';
import { step } from '../../src/engine/step';
import type { CardKind, GameState, Species } from '../../src/engine/types';
import { CROW_AWAY, calmGame, car, get, run, setTraffic, truck } from './helpers';

const deck = (s: GameState) => [...s.draw, ...s.hand, ...s.discard];
/** Put one of an animal's skills in our hand, whether it knows it or not. */
function give(s: GameState, owner: string, kind: CardKind): number {
  const uid = 9000 + s.hand.length;
  s.hand.push({ uid, kind, owner });
  s.kraft = 9;
  return uid;
}
const play = (s: GameState, uid: number, more: { target?: string; zone?: string } = {}) => run(s, { type: 'play', uid, ...more });

/** On the map after the road, where skills may be changed. */
function onTheMap(): GameState {
  let s = calmGame(['ingenLamnas']);
  for (const a of s.animals) a.zone = 'lane2';
  s.kraft = 99;
  for (const a of s.animals) s = run(s, { type: 'lead', target: a.id, zone: 'farDike' });
  return s;
}

describe('the skills of each kind', () => {
  it('six per kind, four first and two learned on the way, all distinct', () => {
    for (const sp of Object.keys(SKILLS) as Species[]) {
      expect(SKILLS[sp].basic).toHaveLength(4);
      expect(SKILLS[sp].advanced).toHaveLength(2);
      expect(new Set(allSkills(sp)).size).toBe(6);
      for (const k of allSkills(sp)) expect(CARDS[k]).toBeDefined();
    }
  });

  it('each of us starts knowing three of its kind’s first four, carries them all, and the deck is three per animal', () => {
    const s = createGame(8);
    for (const a of s.animals) {
      expect(a.skills).toHaveLength(LOADOUT);
      for (const k of a.skills) expect(SKILLS[a.species].basic).toContain(k);
      expect(a.loadout).toEqual(a.skills);
      expect(deck(s).filter((c) => c.owner === a.id).map((c) => c.kind).sort()).toEqual([...a.loadout].sort());
    }
  });
});

describe('choosing what to carry', () => {
  it('only on the map or by the fire – never in danger', () => {
    const s = calmGame(['ingenLamnas']);
    const a = get(s, 'badger');
    expect(step(s, { type: 'equip', animal: 'badger', skills: a.skills.slice(0, 2) }).events[0]).toMatchObject({ kind: 'error' });
  });

  it('only what it knows, one to three; the deck is rebuilt to match', () => {
    let s = onTheMap();
    const a = get(s, 'badger');
    a.skills = ['bara', 'taEmot', 'trosta', 'gravaNer'];
    expect(step(s, { type: 'equip', animal: 'badger', skills: ['bara', 'gamlesRost'] }).events[0]).toMatchObject({ kind: 'error' });
    expect(step(s, { type: 'equip', animal: 'badger', skills: ['bara', 'taEmot', 'trosta', 'gravaNer'] }).events[0]).toMatchObject({ kind: 'error' });
    expect(step(s, { type: 'equip', animal: 'badger', skills: [] }).events[0]).toMatchObject({ kind: 'error' });
    s = run(s, { type: 'equip', animal: 'badger', skills: ['gravaNer', 'trosta'] });
    expect(get(s, 'badger').loadout).toEqual(['gravaNer', 'trosta']);
    expect(deck(s).filter((c) => c.owner === 'badger').map((c) => c.kind).sort()).toEqual(['gravaNer', 'trosta']);
  });

  it('by the fire too', () => {
    let s = onTheMap();
    s = run(s, { type: 'travel', to: 'granbacken' }, ...CROW_AWAY);
    const a = get(s, 'fox');
    s = run(s, { type: 'equip', animal: 'fox', skills: [a.skills[0]] });
    expect(get(s, 'fox').loadout).toHaveLength(1);
    s = run(s, { type: 'restAtFire', ...defaultPlan(s) });
    expect(s.phase).toBe('map');
  });
});

describe('what the skills do', () => {
  it('hiding: dug in, under a stone or holding still – nothing finds it, but it stays where it is', () => {
    let s = calmGame(['ingenLamnas']);
    get(s, 'badger').zone = 'lane1';
    s = play(s, give(s, 'badger', 'gravaNer'));
    expect(get(s, 'badger')).toMatchObject({ hidden: true, braced: true, rooted: true });
    expect(step(s, { type: 'lead', target: 'badger', zone: 'median' }).events[0]).toMatchObject({ kind: 'error' });
    setTraffic(s, [truck('lane1')]);
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'badger').status).toBe('active');
  });

  it('standing like a stone, or stamping a warning: everyone in the zone braces', () => {
    let s = calmGame(['ingenLamnas']);
    for (const id of ['badger', 'toad', 'mice']) get(s, id).zone = 'lane1';
    s = play(s, give(s, 'badger', 'staSomSten'));
    for (const id of ['badger', 'toad', 'mice']) expect(get(s, id).braced).toBe(true);
    setTraffic(s, [car('lane1')]);
    s = run(s, { type: 'endTurn' });
    for (const id of ['badger', 'toad']) expect(get(s, id).injuries).toEqual([]);
  });

  it('a scattered swarm loses only one to a killing blow', () => {
    let s = calmGame(['ingenLamnas']);
    get(s, 'mice').zone = 'lane1';
    s = play(s, give(s, 'mice', 'spridaSig'));
    setTraffic(s, [truck('lane1')]);
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'mice').count).toBe(5);
    expect(get(s, 'mice').status).toBe('active');
  });

  it('the eldest’s voice: everyone within a step gets +1 belief and follows', () => {
    let s = calmGame(['ingenLamnas']);
    for (const id of ['toad', 'mice']) { get(s, id).belief = 3; get(s, id).intent = { kind: 'freeze' }; }
    s = play(s, give(s, 'badger', 'gamlesRost'));
    for (const id of ['toad', 'mice']) {
      expect(get(s, id).belief).toBe(4);
      expect(get(s, id).intent.kind).toBe('follow');
    }
  });

  it('a call in the night: the frozen and the fleeing within two steps follow again', () => {
    let s = calmGame(['ingenLamnas']);
    get(s, 'mice').intent = { kind: 'flee' };
    get(s, 'toad').intent = { kind: 'freeze' };
    s = play(s, give(s, 'owl', 'ropINatten'));
    expect(get(s, 'mice').intent.kind).toBe('follow');
    expect(get(s, 'toad').intent.kind).toBe('follow');
  });

  it('poison in the skin: a hunt in its zone is given up', () => {
    let s = calmGame(['ingenLamnas']);
    get(s, 'fox').intent = { kind: 'hunt', target: 'toad' };
    const before = get(s, 'fox').belief;
    s = play(s, give(s, 'toad', 'giftIHuden'));
    expect(get(s, 'fox').intent.kind).toBe('follow');
    expect(get(s, 'fox').belief).toBe(before - 2);
  });

  it('fed for now: the fox does not hunt in this danger, however low its belief', () => {
    let s = calmGame(['ingenLamnas']);
    s = play(s, give(s, 'fox', 'mattForStunden'));
    expect(get(s, 'fox').sated).toBe(true);
    get(s, 'fox').belief = 1;
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'fox').intent.kind).not.toBe('hunt');
  });

  it('carrying a small one: up to two steps on wings, protected', () => {
    let s = calmGame(['ingenLamnas']);
    const uid = give(s, 'owl', 'baraLiten');
    expect(step(s, { type: 'play', uid, target: 'badger', zone: 'median' }).events[0]).toMatchObject({ kind: 'error' });
    s = play(s, uid, { target: 'toad', zone: 'median' });
    expect(get(s, 'toad').zone).toBe('median');
    expect(get(s, 'toad').protectedBy).toBe('owl');
  });

  it('a threat: dogs back off from the zone where the adder rises', () => {
    let s = onTheMap();
    s = run(s, { type: 'travel', to: 'granbacken' }, ...CROW_AWAY);
    s = run(s, { type: 'restAtFire', ...defaultPlan(s) });
    s.journey.truth = { garden: 'normal', an: 'normal' };
    s = run(s, { type: 'travel', to: 'garden' });
    for (const a of s.animals) { a.belief = 8; a.intent = { kind: 'follow' }; a.zone = 'snaret'; }
    get(s, 'adder').zone = 'gardsplanen';
    get(s, 'mice').zone = 'gardsplanen';
    s = play(s, give(s, 'adder', 'hota'));
    expect(s.warded).toEqual(['gardsplanen']);
    s.dogsAwake = true;
    for (const d of s.dogs) { d.zone = 'gardsplanen'; d.target = 'gardsplanen'; }
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'mice').count).toBe(6);
  });

  it('a broken wing or paw: no moving skills', () => {
    const s = calmGame(['ingenLamnas']);
    get(s, 'fox').injuries = ['broken'];
    const uid = give(s, 'fox', 'snabbaTassar');
    const card = s.hand.find((c) => c.uid === uid)!;
    expect(canPlay(s, card)).toBe(false);
    expect(cardBlockReason(s, card)).toContain('tass');
    expect(canPlay(s, s.hand[give(s, 'fox', 'list') - 9000])).toBe(true);
  });
});

describe('learning and losing', () => {
  it('the crow takes a card for good: its owner forgets that skill', () => {
    let s = onTheMap();
    s = run(s, { type: 'travel', to: 'granbacken' });
    s = run(s, { type: 'respond', option: 'ask' });
    const card = deck(s).find((c) => c.owner === 'fox')!;
    s = run(s, { type: 'respond', option: 'card', uid: card.uid });
    expect(get(s, 'fox').skills).not.toContain(card.kind);
    expect(get(s, 'fox').loadout).not.toContain(card.kind);
  });
});
