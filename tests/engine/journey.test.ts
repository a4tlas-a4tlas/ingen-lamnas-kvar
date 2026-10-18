import { describe, expect, it } from 'vitest';
import { defaultPlan, planProblem } from '../../src/engine/campfire';
import { createGame } from '../../src/engine/setup';
import { step } from '../../src/engine/step';
import type { GameState } from '../../src/engine/types';
import { calmGame, get, run } from './helpers';

/** Everyone across the road: we stand on the map, ready for the fire. */
function acrossTheRoad(): GameState {
  let s = calmGame(['ingenLamnas']);
  for (const a of s.animals) a.zone = 'lane2';
  s.kraft = 99;
  for (const a of s.animals) s = run(s, { type: 'lead', target: a.id, zone: 'farDike' });
  return s;
}

describe('the journey', () => {
  it('starts on the map in the glen after the oath', () => {
    const s = run(createGame(3), { type: 'swear', verses: ['manen'] });
    expect(s.phase).toBe('map');
    expect(s.journey).toMatchObject({ at: 'dalen', visited: ['dalen'], scouted: [] });
  });

  it('only travels along paths that exist', () => {
    const s = run(createGame(3), { type: 'swear', verses: ['manen'] });
    const r = step(s, { type: 'travel', to: 'akrarna' });
    expect(r.events[0].kind).toBe('error');
    expect(r.state.journey.at).toBe('dalen');
  });

  it('a place starts what it is: the road is an encounter, the hill a campfire', () => {
    let s = run(createGame(3), { type: 'swear', verses: ['manen'] }, { type: 'travel', to: 'vagen' });
    expect(s.phase).toBe('play');
    expect(s.encounterId).toBe('road');
    expect(s.trafficPlan).toHaveLength(10);
    s = acrossTheRoad();
    s = run(s, { type: 'travel', to: 'granbacken' });
    expect(s.phase).toBe('campfire');
    expect(s.journey.visited).toEqual(['dalen', 'vagen', 'granbacken']);
  });

  it('ends the run at the fields, with everyone still alive counted', () => {
    let s = acrossTheRoad();
    s = run(s, { type: 'travel', to: 'granbacken' });
    s = run(s, { type: 'restAtFire', ...defaultPlan(s) });
    s = run(s, { type: 'travel', to: 'garden' });
    expect(s.encounterId).toBe('farm');
    for (const a of s.animals) if (a.status === 'active') a.zone = 'godsel';
    s.kraft = 99;
    for (const a of s.animals.filter((x) => x.status === 'active')) s = run(s, { type: 'lead', target: a.id, zone: 'stenmuren' });
    expect(s.phase).toBe('map');
    s = run(s, { type: 'travel', to: 'akrarna' });
    expect(s.phase).toBe('over');
    expect(s.outcome?.safe).toHaveLength(6);
    expect(s.outcome?.fallen).toBe(false);
  });
});

describe('the campfire', () => {
  function atFire(): GameState {
    return run(acrossTheRoad(), { type: 'travel', to: 'granbacken' });
  }

  it('pairs by the embers grow closer; whoever has no place sits alone', () => {
    let s = atFire();
    const before = (id: string) => get(s, id).belief;
    const b = { ljung: before('ljung'), kvarn: before('kvarn'), sotfot: before('sotfot'), skymning: before('skymning'), frona: before('frona'), sicksack: before('sicksack') };
    s = run(s, { type: 'restAtFire', watch: 'ljung', pairs: [['kvarn', 'frona'], ['sotfot', 'skymning']], mourning: {} });
    expect(get(s, 'kvarn').belief).toBe(b.kvarn + 1);
    expect(get(s, 'sotfot').belief).toBe(b.sotfot + 1);
    expect(get(s, 'sicksack').belief).toBe(b.sicksack - 1);
    expect(s.bonds['frona|kvarn']).toBe(2);
    expect(s.phase).toBe('map');
  });

  it('rest heals bleeding and shock for all but the watcher; limps stay', () => {
    let s = atFire();
    get(s, 'kvarn').injuries = ['bleeding', 'halt'];
    get(s, 'ljung').injuries = ['shock'];
    s = run(s, { type: 'restAtFire', watch: 'ljung', pairs: [], mourning: {} });
    expect(get(s, 'kvarn').injuries).toEqual(['halt']);
    expect(get(s, 'ljung').injuries).toEqual(['shock']);
  });

  it('needs a watcher, and no one can be in two places', () => {
    const s = atFire();
    expect(planProblem(s, { pairs: [], mourning: {} })).toBe('Någon måste hålla vakt.');
    expect(planProblem(s, { watch: 'ljung', pairs: [['ljung', 'kvarn']], mourning: {} })).toBe('Den som vakar kan inte sitta vid glöden.');
  });

  it('a hungry predator on watch either hunts or earns our trust', () => {
    let s = atFire();
    const fox = get(s, 'sotfot');
    fox.belief = 1;
    s = run(s, { type: 'restAtFire', watch: 'sotfot', pairs: [], mourning: {} });
    const hunted = s.animals.some((a) => a.id !== 'sotfot' && (a.injuries.includes('bleeding') || (a.count !== undefined && a.count < 6)));
    const trusted = get(s, 'sotfot').belief === 3;
    expect(hunted !== trusted).toBe(true);
  });

  it('mourning: the closest inherits a trait card; burying makes the memory gentler', () => {
    let s = atFire();
    // Kvarn has died on the road; Gamla Ljung was closest.
    const k = get(s, 'kvarn');
    k.status = 'dead';
    s.unmourned = ['kvarn'];
    s.discard.push({ uid: 999, kind: 'minne', owner: 'kvarn', memoryOf: 'kvarn' });
    const trait = k.traits.find((t) => !get(s, 'ljung').traits.includes(t))!;
    s = run(s, { type: 'restAtFire', watch: 'frona', pairs: [], mourning: { kvarn: 'bury' } });
    expect(get(s, 'ljung').traits).toContain(trait);
    expect(s.discard.some((c) => c.owner === 'ljung' && c.inheritedFrom === 'kvarn')).toBe(true);
    expect(s.discard.find((c) => c.uid === 999)?.buried).toBe(true);
    expect(get(s, 'ljung').grief).toEqual([]);
  });

  it('carrying the dead leaves the closest in mourning', () => {
    let s = atFire();
    get(s, 'kvarn').status = 'dead';
    s.unmourned = ['kvarn'];
    s = run(s, { type: 'restAtFire', watch: 'frona', pairs: [], mourning: { kvarn: 'carry' } });
    expect(get(s, 'ljung').grief).toEqual(['kvarn']);
    expect(s.unmourned).toEqual([]);
  });
});
