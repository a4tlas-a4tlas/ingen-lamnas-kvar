import { describe, expect, it } from 'vitest';
import { defaultPlan } from '../../src/engine/campfire';
import { dogDestination, farmPath } from '../../src/engine/encounters/farm';
import { lureZones } from '../../src/engine/rules';
import type { GameState } from '../../src/engine/types';
import { calmGame, get, run } from './helpers';

/** Through the road and the fire, into the farm, with everyone calm and at the thicket. */
function farmGame(verse: 'ingenLamnas' | 'viJagarInte' | 'manen' = 'ingenLamnas'): GameState {
  let s = calmGame([verse]);
  for (const a of s.animals) a.zone = 'lane2';
  s.kraft = 99;
  for (const a of s.animals) s = run(s, { type: 'lead', target: a.id, zone: 'farDike' });
  s = run(s, { type: 'travel', to: 'granbacken' });
  s = run(s, { type: 'restAtFire', ...defaultPlan(s) });
  s.journey.truth = { garden: 'normal', an: 'normal' };
  s = run(s, { type: 'travel', to: 'garden' });
  for (const a of s.animals) {
    a.belief = 8;
    a.intent = { kind: 'follow' };
  }
  return s;
}

/** Let the hour pass, keeping everyone calm so only the farm acts. */
function pass(s: GameState): GameState {
  s = run(s, { type: 'endTurn' });
  for (const a of s.animals) if (a.status === 'active') a.intent = { kind: 'follow' };
  return s;
}

describe('Gårdshundarna', () => {
  it('starts at the thicket with the dogs asleep at the kennel', () => {
    const s = farmGame();
    expect(s.encounterId).toBe('farm');
    expect(s.animals.filter((a) => a.status === 'active').every((a) => a.zone === 'snaret')).toBe(true);
    expect(s.dogsAwake).toBe(false);
    expect(s.dogs.map((d) => d.zone)).toEqual(['gardsplanen', 'gardsplanen']);
  });

  it('we leave scent where we end the hour, except in the tall grass', () => {
    let s = farmGame();
    get(s, 'ljung').zone = 'hogtGras';
    s = pass(s);
    expect(s.scent.snaret).toBe(2);
    expect(s.scent.hogtGras ?? 0).toBe(0);
  });

  it('the dogs wake in the second hour and follow the strongest scent', () => {
    let s = farmGame();
    s = pass(s);
    expect(s.dogsAwake).toBe(true);
    expect(s.dogs[0].target).toBe('snaret');
  });

  it('the dogs bite whoever is where they arrive, and their barking raises the alarm', () => {
    let s = farmGame();
    s = pass(s);
    s = pass(s);
    expect(get(s, 'ljung').injuries).toContain('bleeding');
    expect(s.alarm).toBe(1);
  });

  it('the barn stands between the yard and the wall: every way over is three steps', () => {
    expect(farmPath('snaret', 'stenmuren')).toHaveLength(3);
    expect(farmPath('gardsplanen', 'stenmuren')).toEqual(['godsel', 'stenmuren']);
  });

  it('a dog runs at most two steps in an hour', () => {
    // The tall grass to the hen house is three steps: the dog only gets as far as the yard.
    expect(dogDestination({ id: 'x', name: 'X', zone: 'hogtGras', target: 'honshuset' })).toBe('gardsplanen');
  });

  it('a lure draws the dogs; if the bait gets away they bite nothing', () => {
    let s = farmGame();
    s = pass(s);
    s.kraft = 99;
    expect(lureZones(s, get(s, 'sotfot'))).toContain('hogtGras');
    s = run(s, { type: 'lure', target: 'sotfot', zone: 'gardsplanen' });
    expect(s.dogs.every((d) => d.target === 'gardsplanen')).toBe(true);
    // Everyone else slips into the tall grass; the fox runs on to the manure heap.
    for (const a of s.animals.filter((x) => x.status === 'active' && x.id !== 'sotfot')) s = run(s, { type: 'lead', target: a.id, zone: 'hogtGras' });
    s = run(s, { type: 'lead', target: 'sotfot', zone: 'godsel' });
    s = pass(s);
    expect(s.animals.some((a) => a.injuries.includes('bleeding'))).toBe(false);
  });

  it('when the alarm is full the farmer comes out, and the flashlight kills in the open', () => {
    let s = farmGame();
    s.alarm = 5;
    s.farmerOut = true;
    get(s, 'kvarn').zone = 'gardsplanen';
    s = pass(s);
    expect(s.farmerSweep).toBe('gardsplanen');
    s = run(s, { type: 'endTurn' });
    expect(s.phase).toBe('lastMoment');
    expect(s.pending?.source).toBe('bonde');
  });

  it('the flashlight never finds anyone in cover', () => {
    let s = farmGame();
    s.alarm = 5;
    s.farmerOut = true;
    s = pass(s);
    expect(s.farmerSweep).not.toBe('snaret');
  });

  it('a hungry predator next to the hen house takes a hen instead of one of us', () => {
    let s = farmGame();
    const fox = get(s, 'sotfot');
    fox.zone = 'gardsplanen';
    fox.belief = 4;
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'sotfot').intent.kind).toBe('raid');
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'sotfot').zone).toBe('honshuset');
    expect(s.alarm).toBeGreaterThanOrEqual(3);
  });

  it('daylight has no moon: the flipped moon verse costs no kraft here', () => {
    const s = farmGame('manen');
    s.verses[0].flipped = true;
    const r = pass(s);
    expect(r.kraft).toBe(3);
  });
});
