import { describe, expect, it } from 'vitest';
import { defaultPlan } from '../../src/engine/campfire';
import { moveToSeat, occupants, seatsFromPlan } from '../../src/ui/screens';
import type { GameState } from '../../src/engine/types';
import { CROW_AWAY, calmGame, run } from './helpers';

function atTheFire(): GameState {
  let s = calmGame(['ingenLamnas']);
  for (const a of s.animals) a.zone = 'lane2';
  s.kraft = 99;
  for (const a of s.animals) s = run(s, { type: 'lead', target: a.id, zone: 'farDike' });
  return run(s, { type: 'travel', to: 'granbacken' }, ...CROW_AWAY);
}

describe('dragging animals to their places by the fire', () => {
  it('a free spot takes the animal; a full one swaps it with whoever sat there', () => {
    const s = atTheFire();
    const seats = seatsFromPlan(s, defaultPlan(s));
    const watcher = occupants(s, seats, 'watch')[0];
    const dark = occupants(s, seats, 'dark')[0];
    const r = moveToSeat(s, seats, dark, 'watch');
    expect(r.refusal).toBeUndefined();
    expect(r.seats[dark]).toBe('watch');
    expect(r.seats[watcher]).toBe('dark');
  });

  it('only one who can fly may take the scout’s place', () => {
    const s = atTheFire();
    const seats = seatsFromPlan(s, defaultPlan(s));
    expect(moveToSeat(s, seats, 'kvarn', 'scout').refusal).toBe('Bara den som kan flyga kan spana.');
    expect(moveToSeat(s, seats, 'skymning', 'scout').seats.skymning).toBe('scout');
  });

  it('those the crow placed stay where they are, and the ember the crow took holds no one', () => {
    let s = atTheFire();
    s.meeting = { id: 'crow', frame: 'start', used: [], told: [] };
    s = run(s, { type: 'respond', option: 'lonely' }, { type: 'respond', option: 'story' }, { type: 'respond', option: 'thanks' });
    const seats = seatsFromPlan(s, defaultPlan(s));
    expect(seats.ljung).toBe('apart');
    expect(moveToSeat(s, seats, 'ljung', 'watch').refusal).toMatch(/redan sin plats/);
    s.fireDebt.embers = 1;
    expect(moveToSeat(s, seats, 'kvarn', 'ember1').refusal).toMatch(/Kråkan sitter där/);
  });
});
