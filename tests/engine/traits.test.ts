import { describe, expect, it } from 'vitest';
import { SPECIES } from '../../src/data/animals';
import { BAD_TRAITS, GOOD_TRAITS, TRAITS } from '../../src/data/traits';
import { bondKey, huntsAt, leadCost } from '../../src/engine/rules';
import { createGame } from '../../src/engine/setup';
import { step } from '../../src/engine/step';
import type { GameState, TraitId } from '../../src/engine/types';
import { willOf } from '../../src/engine/will';
import { CROW_AWAY, calmGame, car, get, run, setTraffic, truck } from './helpers';

const traits = (s: GameState, id: string, ...t: TraitId[]) => { get(s, id).traits = t; return s; };

describe('traits are who we are, not cards', () => {
  it('each of us starts with one good and one bad, and gives no card for them', () => {
    for (let seed = 1; seed < 40; seed++) {
      const s = createGame(seed);
      for (const a of s.animals) {
        expect(a.traits.filter((t) => GOOD_TRAITS.includes(t))).toHaveLength(1);
        expect(a.traits.filter((t) => BAD_TRAITS.includes(t))).toHaveLength(1);
        expect(a.belief).toBe(SPECIES[a.species].belief - (a.traits.includes('tvivlande') ? 1 : 0));
        // Doubt never starts anyone below the line where their own will takes over.
        expect(a.belief).toBeGreaterThanOrEqual(Math.min(4, SPECIES[a.species].belief));
      }
    }
    expect(createGame(3)).toEqual(createGame(3));
  });

  it('the earned ones are never rolled at the start', () => {
    for (const t of ['hardad', 'trogen', 'sorjande', 'arrad'] as TraitId[]) {
      expect(TRAITS[t].earned).toBe(true);
      expect([...GOOD_TRAITS, ...BAD_TRAITS]).not.toContain(t);
    }
  });
});

describe('what traits do', () => {
  it('the calm never bolt; the hot-headed never freeze', () => {
    for (let seed = 1; seed < 30; seed++) {
      let s = calmGame(['ingenLamnas'], seed);
      traits(s, 'mice', 'lugn');
      traits(s, 'toad', 'hetsig');
      for (const id of ['mice', 'toad']) get(s, id).belief = 2;
      s = run(s, { type: 'endTurn' });
      expect(get(s, 'mice').intent.kind).not.toBe('bolt');
      expect(get(s, 'toad').intent.kind).not.toBe('freeze');
    }
  });

  it('the tough shrug off the first injury of a danger, not the second', () => {
    let s = calmGame(['ingenLamnas']);
    traits(s, 'fox', 'seglivad');
    get(s, 'fox').zone = 'lane1';
    setTraffic(s, [car('lane1')]);
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'fox').injuries).toEqual([]);
    get(s, 'fox').zone = 'lane1';
    setTraffic(s, [car('lane1')]);
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'fox').injuries.length).toBe(1);
  });

  it('the quick take their first step for free, the clumsy pay one more', () => {
    let s = calmGame(['ingenLamnas']);
    traits(s, 'fox', 'snabbfotad');
    traits(s, 'badger', 'klumpig');
    expect(leadCost(get(s, 'fox'))).toBe(0);
    expect(leadCost(get(s, 'badger'))).toBe(2);
    s.kraft = 3;
    s = run(s, { type: 'lead', target: 'fox', zone: 'lane1' });
    expect(s.kraft).toBe(3);
    expect(leadCost(get(s, 'fox'))).toBe(1);
  });

  it('comfort from the caring gives one more; insight from the wise draws one more', () => {
    let s = calmGame(['ingenLamnas']);
    traits(s, 'badger', 'omtanksam');
    traits(s, 'toad', 'klok');
    get(s, 'mice').belief = 3;
    s.hand.push({ uid: 9001, kind: 'trosta', owner: 'badger' }, { uid: 9002, kind: 'lasaNatten', owner: 'toad' });
    s.kraft = 9;
    const hand = s.hand.length;
    s = run(s, { type: 'play', uid: 9001, target: 'mice' });
    expect(get(s, 'mice').belief).toBe(6);
    s = run(s, { type: 'play', uid: 9002 });
    expect(s.hand.length).toBe(hand - 2 + 2);
  });

  it('a loner’s bonds never grow above nothing; a hungry predator hunts sooner – from the second hour', () => {
    const s = calmGame(['ingenLamnas']);
    traits(s, 'fox', 'ensamvarg', 'hungrig');
    const first = huntsAt(s, get(s, 'fox'));
    s.turn = 2;
    const later = huntsAt(s, get(s, 'fox'));
    expect(later).toBe(first + 1);
    s.turn = 1;
    for (let seed = 1; seed < 30; seed++) for (const a of createGame(seed).animals) if (!a.predator) expect(a.traits).not.toContain('hungrig');
    s.bonds[bondKey('fox', 'owl')] = 0;
    s.hand.push({ uid: 9003, kind: 'bara', owner: 'badger' });
    get(s, 'fox').zone = 'dike';
    const r = run(s, { type: 'play', uid: 9003, target: 'fox', zone: 'lane1' });
    expect(r.bonds[bondKey('badger', 'fox')]).toBe(Math.max(0, s.bonds[bondKey('badger', 'fox')] ?? 0));
  });

  it('the brave and the hardened hold out longer; the grieving give way sooner', () => {
    const s = calmGame(['ingenLamnas']);
    for (const [t, b, w] of [['modig', 4, 'follow'], ['hardad', 4, 'follow'], ['sorjande', 5, 'own']] as const) {
      traits(s, 'mice', t);
      get(s, 'mice').belief = b;
      expect(willOf(s, get(s, 'mice'))).toBe(w);
    }
  });
});

describe('traits earned on the way', () => {
  it('saved in the last moment: hardened; the one who threw itself in: loyal', () => {
    let s = calmGame(['ingenLamnas']);
    get(s, 'toad').zone = 'lane1';
    get(s, 'badger').zone = 'lane1';
    setTraffic(s, [truck('lane1')]);
    get(s, 'badger').protectedBy = undefined;
    s = run(s, { type: 'endTurn' });
    const victim = s.pending!.victim;
    const other = victim === 'toad' ? 'badger' : 'toad';
    s = run(s, { type: 'lastMoment', choice: 'shield', by: other });
    if (s.phase === 'lastMoment') s = run(s, { type: 'lastMoment', choice: 'letGo' });
    expect(get(s, victim).traits).toContain('hardad');
    expect(get(s, other).traits).toContain('trogen');
  });

  it('a lasting injury leaves a scar; losing a close friend leaves grief', () => {
    let s = calmGame(['ingenLamnas']);
    get(s, 'toad').zone = 'lane1';
    setTraffic(s, [car('lane1')]);
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'toad').traits).toContain('arrad');
    get(s, 'toad').zone = 'lane2';
    setTraffic(s, [truck('lane2')]);
    s = run(s, { type: 'endTurn' }, { type: 'lastMoment', choice: 'letGo' });
    // Gamla Ljung and Kvarn were close.
    expect(get(s, 'badger').traits).toContain('sorjande');
  });

  it('two nights in a row by the embers, and a bad trait that can fade, fades', () => {
    let s = calmGame(['ingenLamnas']);
    for (const a of s.animals) a.zone = 'lane2';
    s.kraft = 99;
    for (const a of s.animals) s = run(s, { type: 'lead', target: a.id, zone: 'farDike' });
    s = run(s, { type: 'travel', to: 'granbacken' }, ...CROW_AWAY);
    traits(s, 'mice', 'tvivlande');
    get(s, 'mice').emberNights = 1;
    const plan = { watch: 'badger', pairs: [['mice', 'toad'], ['fox', 'owl']] as [string, string][], mourning: {} };
    const r = step(s, { type: 'restAtFire', ...plan });
    expect(r.events.find((e) => e.kind === 'error')).toBeUndefined();
    expect(get(r.state, 'mice').traits).not.toContain('tvivlande');
  });
});
