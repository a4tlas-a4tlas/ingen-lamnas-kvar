import { describe, expect, it } from 'vitest';
import { DARK_TRAITS, LIGHT_TRAITS, TRAITS } from '../../src/data/traits';
import { createGame } from '../../src/engine/setup';
import { huntsAt, lastMomentShields } from '../../src/engine/rules';
import { xpToLearn, XP_TO_LEARN } from '../../src/engine/step';
import { ownWillBelow } from '../../src/engine/will';
import type { GameState } from '../../src/engine/types';
import { CROW_AWAY, calmGame, get, run, truck } from './helpers';

/** Everyone across the road: we stand on the map, ready for the fire. */
function acrossTheRoad(): GameState {
  let s = calmGame(['ingenLamnas']);
  for (const a of s.animals) a.zone = 'lane2';
  s.kraft = 99;
  for (const a of s.animals) s = run(s, { type: 'lead', target: a.id, zone: 'farDike' });
  return s;
}
const atFire = () => run(acrossTheRoad(), { type: 'travel', to: 'granbacken' }, ...CROW_AWAY);

/** A truck is coming for Kvarn in the first lane, at night; the rest wait in the ditch. */
function lethal(): GameState {
  const s = calmGame(['ingenLamnas']);
  get(s, 'toad').zone = 'lane1';
  s.trafficPlan[0] = [truck('lane1')];
  return run(s, { type: 'endTurn' });
}

describe('who we are: one light trait, one dark', () => {
  it('each of us starts with one of each – no one born with a taste for blood, no toad afraid of water', () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const a of createGame(seed).animals) {
        expect(a.traits.filter((t) => TRAITS[t].light)).toHaveLength(1);
        expect(a.traits.filter((t) => !TRAITS[t].light)).toHaveLength(1);
        expect(a.traits).not.toContain('glupsk');
        if (a.swimmer) expect(a.traits).not.toContain('vattenradd');
      }
    }
    expect(LIGHT_TRAITS).toHaveLength(7);
    expect(DARK_TRAITS).toHaveLength(7);
  });

  it('every light trait but the playful one drives out a dark one, and no two the same', () => {
    const out = LIGHT_TRAITS.map((t) => TRAITS[t].drivesOut).filter(Boolean);
    expect(new Set(out).size).toBe(out.length);
    for (const t of out) expect(TRAITS[t!].light).toBe(false);
    expect(TRAITS.lekfull.drivesOut).toBeUndefined();
  });
});

describe('what traits do', () => {
  it('the afraid of the dark doubt sooner at night; the afraid of water by the river', () => {
    const s = createGame(2);
    const a = get(s, 'mice');
    a.traits = ['morkradd'];
    s.time = 'night';
    expect(ownWillBelow(s, a)).toBe(6);
    s.time = 'day';
    expect(ownWillBelow(s, a)).toBe(5);
    a.traits = ['vattenradd'];
    s.encounterId = 'river';
    s.phase = 'play';
    expect(ownWillBelow(s, a)).toBe(6);
    s.phase = 'map';
    expect(ownWillBelow(s, a)).toBe(5);
  });

  it('one who has tasted blood forgets the oath a belief sooner', () => {
    const s = createGame(2);
    const fox = get(s, 'fox');
    fox.traits = [];
    const before = huntsAt(s, fox);
    fox.traits = ['glupsk'];
    expect(huntsAt(s, fox)).toBe(before + 1);
  });

  it('comfort from the caring gives one more; to the bitter, one less', () => {
    const comfort = (giver: 'omtanksam' | null, taker: 'bitter' | null) => {
      const s = calmGame(['ingenLamnas']);
      get(s, 'badger').traits = giver ? [giver] : [];
      get(s, 'toad').traits = taker ? [taker] : [];
      get(s, 'toad').belief = 4;
      s.hand = [{ uid: 500, kind: 'trosta', owner: 'badger' }];
      s.kraft = 3;
      return get(run(s, { type: 'play', uid: 500, target: 'toad' }), 'toad').belief;
    };
    expect(comfort(null, null)).toBe(6);
    expect(comfort('omtanksam', null)).toBe(7);
    expect(comfort(null, 'bitter')).toBe(5);
    expect(comfort('omtanksam', 'bitter')).toBe(6);
  });

  it('the wise learn from two dangers instead of three', () => {
    const s = acrossTheRoad();
    const fox = get(s, 'fox');
    expect(xpToLearn(fox)).toBe(XP_TO_LEARN);
    fox.traits = ['klok'];
    expect(xpToLearn(fox)).toBe(2);
  });

  it('the stubborn bleed without doubting', () => {
    let s = calmGame(['ingenLamnas']);
    get(s, 'badger').injuries = ['bleeding'];
    get(s, 'badger').traits = ['envis'];
    get(s, 'toad').injuries = ['bleeding'];
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'badger').belief).toBe(8);
    expect(get(s, 'toad').belief).toBe(7);
  });

  it('the loyal reach the last moment from two steps away, even frozen', () => {
    const s = calmGame(['ingenLamnas']);
    get(s, 'toad').zone = 'lane2';
    s.trafficPlan[0] = [truck('lane2')];
    const fox = get(s, 'fox');
    fox.zone = 'lane1';
    fox.traits = ['trogen'];
    fox.intent = { kind: 'freeze' };
    get(s, 'owl').zone = 'lane1';
    const r = run(s, { type: 'endTurn' });
    expect(r.phase).toBe('lastMoment');
    // Two steps off, only the loyal one reaches Kvarn; the rest wait further back, in the ditch.
    expect(lastMomentShields(r)).toEqual(['fox']);
  });

  it('by the embers: the playful light up the night; the withdrawn come no closer', () => {
    const base = atFire();
    base.bonds['mice|toad'] = 1;
    const plan = { watch: 'badger', pairs: [['toad', 'mice']] as [string, string][], mourning: {} };
    const plain = run(structuredClone(base), { type: 'restAtFire', ...plan });
    const merry = structuredClone(base);
    get(merry, 'mice').traits = ['lekfull'];
    expect(run(merry, { type: 'restAtFire', ...plan }).hope).toBe(Math.min(10, plain.hope + 1));
    const shut = structuredClone(base);
    get(shut, 'toad').traits = ['sluten'];
    const after = run(shut, { type: 'restAtFire', ...plan });
    expect(plain.bonds['mice|toad']).toBe(2);
    expect(after.bonds['mice|toad']).toBe(1);
    expect(get(after, 'toad').belief).toBe(get(plain, 'toad').belief);
  });

  it('the watchful rest while they watch; one who watches though it hurts becomes watchful', () => {
    let s = atFire();
    get(s, 'badger').injuries = ['bleeding'];
    s = run(s, { type: 'restAtFire', watch: 'badger', pairs: [], mourning: {} });
    expect(get(s, 'badger').injuries).toEqual(['bleeding']);
    expect(get(s, 'badger').traits).toEqual(['vaksam']);
    let t = atFire();
    get(t, 'badger').injuries = ['bleeding'];
    get(t, 'badger').traits = ['vaksam'];
    t = run(t, { type: 'restAtFire', watch: 'badger', pairs: [], mourning: {} });
    expect(get(t, 'badger').injuries).toEqual([]);
  });
});

describe('traits come from what we live through', () => {
  it('throwing oneself in the way makes one brave; being saved, loyal – and at night, afraid of the dark', () => {
    const s = run(lethal(), { type: 'lastMoment', choice: 'shield', by: 'badger' });
    expect(get(s, 'badger').traits).toEqual(['modig']);
    expect(get(s, 'toad').traits).toEqual(['trogen', 'morkradd']);
  });

  it('a light trait drives out the dark one opposite it, and keeps it away', () => {
    const t = lethal();
    get(t, 'badger').traits = ['skygg'];
    get(t, 'toad').traits = ['vaksam'];
    const s = run(t, { type: 'lastMoment', choice: 'shield', by: 'badger' });
    expect(get(s, 'badger').traits).toEqual(['modig']);
    expect(s.log.some((e) => e.text.includes('Det skygga i Gamla Ljung släpper.'))).toBe(true);
    // Watchful, Kvarn isn't made afraid of the dark.
    expect(get(s, 'toad').traits).toEqual(['vaksam', 'trogen']);
  });

  it('one who sees a death while it already shakes turns shy; those close to one we let go turn bitter', () => {
    const t = lethal();
    const ljung = get(t, 'badger');
    ljung.zone = 'lane1';
    ljung.injuries = ['shock'];
    t.bonds['badger|toad'] = 2;
    const s = run(t, { type: 'lastMoment', choice: 'letGo' });
    expect(get(s, 'badger').traits).toEqual(['skygg', 'bitter']);
  });

  it('the brave do not turn shy', () => {
    const t = lethal();
    const ljung = get(t, 'badger');
    ljung.zone = 'lane1';
    ljung.injuries = ['shock'];
    ljung.traits = ['modig'];
    t.bonds['badger|toad'] = 0;
    expect(get(run(t, { type: 'lastMoment', choice: 'letGo' }), 'badger').traits).toEqual(['modig']);
  });

  it('a predator that hunts one of us becomes hungry for more', () => {
    let s = calmGame(['ingenLamnas']);
    get(s, 'fox').intent = { kind: 'hunt', target: 'mice' };
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'fox').traits).toEqual(['glupsk']);
  });

  it('a hungry predator who watches over the small without hunting loses its taste for blood', () => {
    for (let rng = 1; rng < 40; rng++) {
      const s = atFire();
      const fox = get(s, 'fox');
      fox.belief = 1;
      fox.traits = ['glupsk'];
      s.rng = rng;
      const r = run(s, { type: 'restAtFire', watch: 'fox', pairs: [], mourning: {} });
      if (get(r, 'fox').belief !== 3) continue;
      expect(get(r, 'fox').traits).toEqual([]);
      return;
    }
    throw new Error('Räven jagade varje gång.');
  });

  it('teaching makes the teacher caring and the learner wise', () => {
    let s = atFire();
    s.bonds['badger|toad'] = 2;
    get(s, 'badger').skills = ['bara', 'taEmot', 'trosta'];
    get(s, 'toad').skills = ['gamlaVagar', 'simma', 'lasaNatten'];
    s = run(s, { type: 'restAtFire', watch: 'mice', pairs: [['badger', 'toad']], mourning: {}, teach: { teacher: 'badger', learner: 'toad', skill: 'trosta' } });
    expect(get(s, 'badger').traits).toEqual(['omtanksam']);
    expect(get(s, 'toad').traits).toEqual(['klok']);
  });

  it('reaching safety while bleeding makes one stubborn', () => {
    let s = calmGame(['ingenLamnas']);
    const ljung = get(s, 'badger');
    ljung.injuries = ['bleeding'];
    ljung.zone = 'lane2';
    s = run(s, { type: 'lead', target: 'badger', zone: 'farDike' });
    expect(get(s, 'badger').traits).toEqual(['envis']);
  });

  it('sitting alone in the dark while doubting closes one up', () => {
    let s = atFire();
    get(s, 'adder').belief = 5;
    get(s, 'owl').belief = 8;
    s = run(s, { type: 'restAtFire', watch: 'badger', pairs: [['toad', 'mice']], mourning: {} });
    expect(get(s, 'adder').traits).toEqual(['sluten']);
    expect(get(s, 'owl').traits).toEqual([]);
  });

  it('waiting wears on the one who doubts most', () => {
    let s = acrossTheRoad();
    s = run(s, { type: 'travel', to: 'granbacken' }, ...CROW_AWAY, { type: 'restAtFire', watch: 'badger', pairs: [], mourning: {} });
    // At the fork the voices may move belief a little: Skymning still doubts the most.
    for (const a of s.animals) a.belief = 9;
    get(s, 'owl').belief = 2;
    const r = run(s, { type: 'travel', to: 'an', wait: true });
    expect(get(r, 'owl').traits).toEqual(['otalig']);
    expect(r.animals.filter((a) => a.traits.includes('otalig')).map((a) => a.id)).toEqual(['owl']);
  });
});
