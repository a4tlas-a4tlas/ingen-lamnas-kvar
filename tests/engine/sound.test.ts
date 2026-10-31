import { describe, expect, it } from 'vitest';
import { sceneOf, TITLE_SCENE } from '../../src/audio/scene';
import { createGame } from '../../src/engine/setup';
import { step } from '../../src/engine/step';
import type { GameEvent, GameState, ZoneId } from '../../src/engine/types';
import { get, plain, run } from './helpers';

const blows = (evs: GameEvent[]) => evs.flatMap((e) => (e.kind === 'blow' ? [`${e.what}@${e.zone}`] : []));

describe('the sound scene', () => {
  it('follows where we are: title, oath, map, danger (a boss at a region’s end), the fire, the end', () => {
    expect(sceneOf(null)).toEqual(TITLE_SCENE);
    let s = createGame(3);
    expect(sceneOf(s).phase).toBe('oath');
    s = run(s, { type: 'swear', verses: ['ingenLamnas'] });
    expect(sceneOf(s)).toMatchObject({ phase: 'map', region: 'dalen', boss: false });
    s.journey.at = 'granbacken';
    s.journey.visited.push('granbacken');
    s.clock = 'night';
    const m = run(s, { type: 'travel', to: 'asen' });
    expect(sceneOf(m)).toMatchObject({ phase: 'danger', region: 'dalen', boss: true, night: false });
  });

  it('carries the mood of hope', () => {
    const s = run(createGame(3), { type: 'swear', verses: ['ingenLamnas'] });
    s.hope = 1;
    expect(sceneOf(s).mood).toBe('fortvivlan');
    s.hope = 8;
    expect(sceneOf(s).mood).toBe('tillit');
  });
});

describe('blows, for the sound and the board', () => {
  /** Into the machines, everyone safe at the ridge but one. */
  function machines(): GameState {
    const s = run(plain(createGame(4)), { type: 'swear', verses: ['manen'] });
    s.journey.at = 'granbacken';
    s.journey.visited.push('granbacken');
    const m = run(s, { type: 'travel', to: 'asen' });
    for (const a of m.animals) if (a.status === 'active') { a.belief = 8; a.intent = { kind: 'follow' }; }
    return m;
  }

  it('the feller and the bulldozer land where they were planned', () => {
    const s = machines();
    s.fellPlan[0] = 'granOst';
    s.dozePlan[0] = 'glantan';
    for (const a of s.animals) if (a.status === 'active') a.zone = 'hygget';
    const r = step(s, { type: 'endTurn' });
    expect(blows(r.events)).toEqual(['fell@granOst', 'doze@glantan']);
  });

  it('every hour plays out the same blows for the same state', () => {
    const s = machines();
    expect(step(s, { type: 'endTurn' }).events).toEqual(step(s, { type: 'endTurn' }).events);
  });

  it('no blow outside a danger that has one', () => {
    const s = machines();
    s.fellPlan = [];
    s.dozePlan = [];
    for (const a of s.animals) if (a.status === 'active') a.zone = 'hygget' as ZoneId;
    expect(blows(step(s, { type: 'endTurn' }).events)).toEqual([]);
    expect(get(s, 'toad')).toBeDefined();
  });
});
