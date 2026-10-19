import { describe, expect, it } from 'vitest';
import { defaultPlan } from '../../src/engine/campfire';
import { RESCUE_TRUST, bond, cardZones, leadZones, verseStatus } from '../../src/engine/rules';
import { step } from '../../src/engine/step';
import type { GameState } from '../../src/engine/types';
import { CROW_AWAY, calmGame, get, run } from './helpers';

function arrive(to: 'garden' | 'an'): GameState {
  let s = calmGame(['ingenLamnas']);
  for (const a of s.animals) a.zone = 'lane2';
  s.kraft = 99;
  for (const a of s.animals) s = run(s, { type: 'lead', target: a.id, zone: 'farDike' });
  s = run(s, { type: 'travel', to: 'granbacken' }, ...CROW_AWAY);
  s = run(s, { type: 'restAtFire', ...defaultPlan(s) });
  s.journey.truth = { garden: 'normal', an: 'normal' };
  s = run(s, { type: 'travel', to });
  for (const a of s.animals) if (a.status === 'active') { a.belief = 8; a.intent = { kind: 'follow' }; }
  s.kraft = 99;
  return s;
}

const err = (s: GameState, by: string) => step(s, { type: 'rescue', by }).events.find((e) => e.kind === 'error');

describe('the rescue', () => {
  it('someone is trapped the first time we come: by the hen house, or out on the third stone', () => {
    expect(arrive('garden').rescue).toMatchObject({ who: 'hare', species: 'hare', zone: 'honshuset', trust: 0 });
    expect(arrive('an').rescue).toMatchObject({ who: 'hare', species: 'hare', zone: 'sten3', trust: 0 });
  });

  it('reaching out from a step away builds trust; a predator only frightens', () => {
    let s = arrive('garden');
    get(s, 'toad').zone = 'gardsplanen';
    get(s, 'fox').zone = 'gardsplanen';
    expect(err(s, 'fox')).toBeDefined();
    s = run(s, { type: 'rescue', by: 'toad' });
    expect(s.rescue?.trust).toBe(1);
    get(s, 'toad').zone = 'snaret';
    expect(err(s, 'toad')).toBeDefined(); // too far away
  });

  it('once trusted, one standing beside sets it free – and it is one of us, with its own cards', () => {
    let s = arrive('garden');
    get(s, 'toad').zone = 'gardsplanen';
    s = run(s, { type: 'rescue', by: 'toad' }, { type: 'rescue', by: 'toad' });
    expect(s.rescue?.trust).toBe(RESCUE_TRUST);
    expect(err(s, 'toad')).toBeDefined(); // must stand beside it to free it
    get(s, 'toad').zone = 'honshuset';
    s = run(s, { type: 'rescue', by: 'toad' });
    const t = get(s, 'hare');
    expect(t).toMatchObject({ status: 'active', zone: 'honshuset', belief: 4, species: 'hare' });
    expect(t.traits).toContain('skygg');
    expect(s.discard.filter((c) => c.owner === 'hare')).toHaveLength(3);
    expect(bond(s, 'hare', 'toad')).toBe(1);
    expect(s.rescue).toBeNull();
    expect(s.met).toEqual(['hare']);
  });

  it('left behind, it costs hope – but no promise breaks, it was not one of us yet', () => {
    let s = arrive('garden');
    const name = s.rescue!.name;
    for (const a of s.animals) if (a.status === 'active') a.zone = 'godsel';
    const hope = s.hope;
    for (const a of s.animals.filter((x) => x.status === 'active')) s = run(s, { type: 'lead', target: a.id, zone: 'stenmuren' });
    expect(s.phase).toBe('map');
    expect(s.log.some((e) => e.text === `Vi lämnade ${name} i snaran vid hönshuset.`)).toBe(true);
    expect(s.hope).toBeLessThan(hope);
    expect(verseStatus(s, 'ingenLamnas')).toBe('intact');
    expect(s.met).toEqual(['hare']);
  });

  it('the hare runs two steps when led, and leaps three with its own card', () => {
    let s = arrive('garden');
    get(s, 'toad').zone = 'honshuset';
    s = run(s, { type: 'rescue', by: 'toad' }, { type: 'rescue', by: 'toad' }, { type: 'rescue', by: 'toad' });
    const t = get(s, 'hare');
    t.zone = 'snaret';
    expect(leadZones(s, t)).toEqual(expect.arrayContaining(['gardsplanen', 'godsel']));
    const leap = s.discard.find((c) => c.owner === 'hare' && c.kind === 'sprang')!;
    expect(cardZones(s, leap)).toContain('stenmuren');
  });
});
