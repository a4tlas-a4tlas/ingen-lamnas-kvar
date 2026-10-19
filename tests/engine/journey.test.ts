import { describe, expect, it } from 'vitest';
import { defaultPlan, planProblem } from '../../src/engine/campfire';
import { step } from '../../src/engine/step';
import type { GameState } from '../../src/engine/types';
import { CROW_AWAY, calmGame, classicGame, get, run } from './helpers';

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
    const s = run(classicGame(3), { type: 'swear', verses: ['manen'] });
    expect(s.phase).toBe('map');
    expect(s.journey).toMatchObject({ at: 'dalen', visited: ['dalen'], scouted: [] });
  });

  it('only travels along paths that exist', () => {
    const s = run(classicGame(3), { type: 'swear', verses: ['manen'] });
    const r = step(s, { type: 'travel', to: 'akrarna' });
    expect(r.events[0].kind).toBe('error');
    expect(r.state.journey.at).toBe('dalen');
  });

  it('a place starts what it is: the road is an encounter, the hill a campfire', () => {
    let s = run(classicGame(3), { type: 'swear', verses: ['manen'] }, { type: 'travel', to: 'vagen' });
    expect(s.phase).toBe('play');
    expect(s.encounterId).toBe('road');
    expect(s.trafficPlan).toHaveLength(10);
    s = acrossTheRoad();
    s = run(s, { type: 'travel', to: 'granbacken' }, ...CROW_AWAY);
    expect(s.phase).toBe('campfire');
    expect(s.journey.visited).toEqual(['dalen', 'vagen', 'granbacken']);
  });

  it('at the end of the glen we stop between two landscapes: look back, are asked a promise, and go on to the fields', () => {
    let s = acrossTheRoad();
    s = run(s, { type: 'travel', to: 'granbacken' }, ...CROW_AWAY);
    s = run(s, { type: 'restAtFire', ...defaultPlan(s) });
    s = run(s, { type: 'travel', to: 'garden' });
    for (const a of s.animals) if (a.status === 'active') a.zone = 'godsel';
    s.kraft = 99;
    for (const a of s.animals.filter((x) => x.status === 'active')) s = run(s, { type: 'lead', target: a.id, zone: 'stenmuren' });
    s = run(s, { type: 'travel', to: 'akrarna' });
    expect(s.phase).toBe('map');
    expect(s.run).toMatchObject({ between: true, offered: ['akrarna'] });
    expect(s.meeting).toMatchObject({ id: 'interlude', frame: 'start' });
    // Gamla Ljung grieves the glen; saying it aloud lets it go a little.
    get(s, 'badger').grief = ['dalen'];
    const belief = get(s, 'badger').belief;
    s = run(s, { type: 'respond', option: 'look-0' });
    expect(get(s, 'badger').belief).toBe(Math.min(10, belief + 1));
    expect(get(s, 'badger').grief).toEqual([]);
    expect(step(s, { type: 'respond', option: 'look-0' }).events[0].kind).toBe('error');
    s = run(s, { type: 'respond', option: 'onward' });
    // The glen leaves a promise in someone.
    expect(s.meeting).toMatchObject({ id: 'proposal' });
    expect(s.proposal?.rule).toBe('noCity');
    s = run(s, { type: 'respond', option: 'accept' }, { type: 'respond', option: 'close' });
    expect(s.verses.some((v) => v.promise?.rule === 'noCity')).toBe(true);
    expect(s.meeting).toMatchObject({ id: 'interlude', frame: 'way' });
    const deck = s.draw.length + s.hand.length + s.discard.length;
    s = run(s, { type: 'respond', option: 'go-akrarna' });
    // A new map, the same of us: the deck, the poem and our wounds come along.
    expect(s.meeting).toBeNull();
    expect(s.journey).toMatchObject({ region: 'akrarna', at: 'akerkanten' });
    expect(s.run).toMatchObject({ regions: ['dalen', 'akrarna'], between: false });
    expect(s.draw.length + s.hand.length + s.discard.length).toBe(deck);
    expect(s.journey.nodes.find((n) => n.id === 'grusvagen')?.row).toBe(1);
    s = run(s, { type: 'travel', to: 'grusvagen' });
    expect(s.encounterId).toBe('road');
  });

  it('ends the run where the way runs out, with everyone still alive counted', () => {
    let s = acrossTheRoad();
    s = run(s, { type: 'travel', to: 'granbacken' }, ...CROW_AWAY);
    s = run(s, { type: 'restAtFire', ...defaultPlan(s) });
    s = run(s, { type: 'travel', to: 'garden' });
    expect(s.encounterId).toBe('farm');
    for (const a of s.animals) if (a.status === 'active') a.zone = 'godsel';
    s.kraft = 99;
    for (const a of s.animals.filter((x) => x.status === 'active')) s = run(s, { type: 'lead', target: a.id, zone: 'stenmuren' });
    expect(s.phase).toBe('map');
    s.run.regions = ['dalen', 'akrarna'];
    s = run(s, { type: 'travel', to: 'akrarna' });
    expect(s.phase).toBe('over');
    expect(s.outcome?.safe).toHaveLength(6);
    expect(s.outcome?.fallen).toBe(false);
  });
});

describe('the campfire', () => {
  function atFire(): GameState {
    return run(acrossTheRoad(), { type: 'travel', to: 'granbacken' }, ...CROW_AWAY);
  }

  it('pairs by the embers grow closer; whoever has no place sits alone', () => {
    let s = atFire();
    const before = (id: string) => get(s, id).belief;
    const b = { ljung: before('badger'), kvarn: before('toad'), sotfot: before('fox'), skymning: before('owl'), frona: before('mice'), sicksack: before('adder') };
    s = run(s, { type: 'restAtFire', watch: 'badger', pairs: [['toad', 'mice'], ['fox', 'owl']], mourning: {} });
    expect(get(s, 'toad').belief).toBe(b.kvarn + 1);
    expect(get(s, 'fox').belief).toBe(b.sotfot + 1);
    expect(get(s, 'adder').belief).toBe(b.sicksack - 1);
    expect(s.bonds['mice|toad']).toBe(2);
    expect(s.phase).toBe('map');
  });

  it('rest heals bleeding and shock for all but the watcher; limps stay', () => {
    let s = atFire();
    get(s, 'toad').injuries = ['bleeding', 'halt'];
    get(s, 'badger').injuries = ['shock'];
    s = run(s, { type: 'restAtFire', watch: 'badger', pairs: [], mourning: {} });
    expect(get(s, 'toad').injuries).toEqual(['halt']);
    expect(get(s, 'badger').injuries).toEqual(['shock']);
  });

  it('needs a watcher, and no one can be in two places', () => {
    const s = atFire();
    expect(planProblem(s, { pairs: [], mourning: {} })).toBe('Någon måste hålla vakt.');
    expect(planProblem(s, { watch: 'badger', pairs: [['badger', 'toad']], mourning: {} })).toBe('Den som vakar kan inte sitta vid glöden.');
  });

  it('a hungry predator on watch either hunts or earns our trust', () => {
    let s = atFire();
    const fox = get(s, 'fox');
    fox.belief = 1;
    s = run(s, { type: 'restAtFire', watch: 'fox', pairs: [], mourning: {} });
    const hunted = s.animals.some((a) => a.id !== 'fox' && (a.injuries.includes('bleeding') || (a.count !== undefined && a.count < 6)));
    const trusted = get(s, 'fox').belief === 3;
    expect(hunted !== trusted).toBe(true);
  });

  it('mourning: the closest inherits a trait card; burying makes the memory gentler', () => {
    let s = atFire();
    // Kvarn has died on the road; Gamla Ljung was closest.
    const k = get(s, 'toad');
    k.status = 'dead';
    s.unmourned = ['toad'];
    s.discard.push({ uid: 999, kind: 'minne', owner: 'toad', memoryOf: 'toad' });
    const trait = k.traits.find((t) => !get(s, 'badger').traits.includes(t))!;
    s = run(s, { type: 'restAtFire', watch: 'mice', pairs: [], mourning: { toad: 'bury' } });
    expect(get(s, 'badger').traits).toContain(trait);
    expect(s.discard.some((c) => c.owner === 'badger' && c.inheritedFrom === 'toad')).toBe(true);
    expect(s.discard.find((c) => c.uid === 999)?.buried).toBe(true);
    expect(get(s, 'badger').grief).toEqual([]);
  });

  it('carrying the dead leaves the closest in mourning', () => {
    let s = atFire();
    get(s, 'toad').status = 'dead';
    s.unmourned = ['toad'];
    s = run(s, { type: 'restAtFire', watch: 'mice', pairs: [], mourning: { toad: 'carry' } });
    expect(get(s, 'badger').grief).toEqual(['toad']);
    expect(s.unmourned).toEqual([]);
  });
});
