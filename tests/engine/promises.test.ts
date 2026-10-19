import { describe, expect, it } from 'vitest';
import { defaultPlan } from '../../src/engine/campfire';
import { meetingOptions } from '../../src/data/meetings';
import { keptPromises, proposalAtFire, promises } from '../../src/engine/promises';
import { step } from '../../src/engine/step';
import type { GameState, PromiseRule } from '../../src/engine/types';
import { CROW_AWAY, calmGame, get, run, truck } from './helpers';

/** Everyone across the road, at the map before the fire. */
function acrossTheRoad(): GameState {
  let s = calmGame(['ingenLamnas']);
  for (const a of s.animals) a.zone = 'lane2';
  s.kraft = 99;
  for (const a of s.animals) s = run(s, { type: 'lead', target: a.id, zone: 'farDike' });
  return s;
}

const toFire = (s: GameState) => run(s, { type: 'travel', to: 'granbacken' }, ...CROW_AWAY);
const say = (s: GameState, ...options: string[]) => run(s, ...options.map((option) => ({ type: 'respond' as const, option })));

/** A fire where one particular promise is asked of us. */
function asking(rule: PromiseRule, by = 'toad', other?: string): GameState {
  const s = toFire(acrossTheRoad());
  s.proposal = { by, rule, with: other };
  s.meeting = { id: 'proposal', frame: 'ask', used: [], told: [] };
  return s;
}

describe('promises asked at the fire', () => {
  it('after a death in the light, the one who was closest asks: never into the light again', () => {
    let s = calmGame(['ingenLamnas']);
    get(s, 'toad').zone = 'lane1';
    s.trafficPlan[0] = [truck('lane1')];
    s = run(s, { type: 'endTurn' }, { type: 'lastMoment', choice: 'letGo' });
    expect(get(s, 'toad').diedOf).toBe('lastbil');
    for (const a of s.animals) if (a.status === 'active') a.zone = 'lane2';
    s.kraft = 99;
    for (const a of s.animals.filter((x) => x.status === 'active')) s = run(s, { type: 'lead', target: a.id, zone: 'farDike' });
    expect(proposalAtFire(run(s, { type: 'travel', to: 'granbacken' }))).toMatchObject({ rule: 'light' });
  });

  it('a bond grown close asks that the two never leave each other; fear asks for the dark', () => {
    const s = acrossTheRoad();
    s.bonds['badger|toad'] = 3;
    s.bonds['badger|toad'] = 3;
    const p = proposalAtFire(s);
    expect(p?.rule).toBe('together');
    const f = acrossTheRoad();
    get(f, 'mice').belief = 2;
    expect(proposalAtFire(f)).toEqual({ by: 'mice', rule: 'water' });
  });

  it('the fire waits until the promise is answered', () => {
    const s = asking('night', 'mice');
    expect(step(s, { type: 'restAtFire', ...defaultPlan(s) }).events[0].kind).toBe('error');
  });

  it('accepting gives the one who asked +2 belief and binds us; refusing costs them 2', () => {
    const s = asking('night', 'mice');
    const before = get(s, 'mice').belief;
    const yes = say(s, 'accept', 'close');
    expect(get(yes, 'mice').belief).toBe(Math.min(10, before + 2));
    expect(keptPromises(yes).map((v) => v.text)).toEqual(['Vi går bara i mörkret.']);
    const no = say(s, 'reject', 'close');
    expect(get(no, 'mice').belief).toBe(before - 2);
    expect(promises(no)).toEqual([]);
  });

  it('others speak for and against it: the friend gains with us, the objector loses if we promise anyway', () => {
    const s = asking('water', 'mice');
    s.bonds['badger|mice'] = 2;
    s.bonds['badger|mice'] = 2;
    expect(meetingOptions(s).map((o) => o.id)).toEqual(expect.arrayContaining(['back', 'object']));
    const kvarn = get(s, 'toad').belief;
    const ljung = get(s, 'badger').belief;
    const r = say(s, 'back', 'object', 'accept', 'close');
    expect(get(r, 'toad').belief).toBe(kvarn - 1);
    expect(get(r, 'badger').belief).toBe(Math.min(10, ljung + 1));
  });

  it('while it holds, the one who asked never doubts below 3; kept promises warm the fire', () => {
    let s = say(asking('night', 'mice'), 'accept', 'close');
    get(s, 'mice').belief = 3;
    s.trafficPlan = [];
    const hope = s.hope;
    s = run(s, { type: 'restAtFire', ...defaultPlan(s) });
    expect(s.hope).toBe(Math.min(10, hope + 2));
  });

  it('breaking it turns the words, costs hope, and the one who asked loses faith', () => {
    const s = say(asking('night', 'mice'), 'accept', 'close');
    let r = run(s, { type: 'restAtFire', ...defaultPlan(s) });
    const belief = get(r, 'mice').belief;
    const hope = r.hope;
    r = run(r, { type: 'travel', to: 'garden' }); // by day
    expect(promises(r)[0]).toMatchObject({ flipped: true, flippedText: 'Vi gick i dagsljus.' });
    expect(get(r, 'mice').belief).toBeLessThan(belief); // −2, softened by Fröna's voice at the fork getting its way
    expect(r.hope).toBeLessThan(hope);
  });

  it('“never over water” breaks at the river; “never on a farm” at the farm', () => {
    let s = say(asking('water', 'mice'), 'accept', 'close');
    s = run(s, { type: 'restAtFire', ...defaultPlan(s) });
    expect(keptPromises(run(s, { type: 'travel', to: 'garden' }))).toHaveLength(1);
    expect(keptPromises(run(s, { type: 'travel', to: 'an' }))).toHaveLength(0);
  });

  it('two who never leave each other: broken if one dies while the other lives', () => {
    let s = say(asking('together', 'toad', 'badger'), 'accept', 'close');
    s = run(s, { type: 'restAtFire', ...defaultPlan(s) }, { type: 'travel', to: 'garden' });
    get(s, 'toad').zone = 'gardsplanen';
    s.farmerOut = true;
    s.farmerSweep = 'gardsplanen';
    for (const a of s.animals) if (a.status === 'active') { a.belief = 8; a.intent = { kind: 'follow' }; }
    s = run(s, { type: 'endTurn' });
    while (s.phase === 'lastMoment') s = run(s, { type: 'lastMoment', choice: 'letGo' });
    expect(get(s, 'toad').status).toBe('dead');
    expect(promises(s).find((v) => v.promise.rule === 'together')?.flipped).toBe(true);
  });

  it('in the last moment, the one who was saved may promise never to leave the one who saved it', () => {
    let found = false;
    for (let seed = 1; seed <= 20 && !found; seed++) {
      let s = calmGame(['ingenLamnas'], seed);
      get(s, 'toad').zone = 'lane1';
      get(s, 'badger').zone = 'dike';
      s.trafficPlan[0] = [truck('lane1')];
      s = run(s, { type: 'endTurn' });
      if (s.phase !== 'lastMoment' || s.pending?.victim !== 'toad') continue;
      s = run(s, { type: 'lastMoment', choice: 'shield', by: 'badger' });
      if (s.meeting?.id === 'proposal') {
        found = true;
        expect(s.proposal).toEqual({ by: 'toad', rule: 'stay', with: 'badger' });
        expect(step(s, { type: 'endTurn' }).events[0].kind).toBe('error'); // answer first
        s = say(s, 'accept', 'close');
        expect(keptPromises(s)[0].text).toBe('Jag lämnar dig aldrig, Gamla Ljung.');
      }
    }
    expect(found).toBe(true);
  });
});
