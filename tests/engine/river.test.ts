import { describe, expect, it } from 'vitest';
import { defaultPlan } from '../../src/engine/campfire';
import { DAM_MAX } from '../../src/engine/encounters/river';
import { oathVerse } from '../../src/engine/setup';
import { forkVoices, voiceStake } from '../../src/engine/voices';
import type { GameState } from '../../src/engine/types';
import { calmGame, get, run } from './helpers';

/** Across the road and through the fire: the map at Granbacken, where the way forks. */
function atTheFork(verse: 'ingenLamnas' | 'denAldste' = 'ingenLamnas'): GameState {
  let s = calmGame([verse]);
  for (const a of s.animals) a.zone = 'lane2';
  s.kraft = 99;
  for (const a of s.animals) s = run(s, { type: 'lead', target: a.id, zone: 'farDike' });
  s = run(s, { type: 'travel', to: 'granbacken' });
  return run(s, { type: 'restAtFire', ...defaultPlan(s) });
}

function riverGame(wait = false): GameState {
  const s = run(atTheFork(), { type: 'travel', to: 'an', wait });
  calm(s);
  s.currentPlan = s.currentPlan.map(() => 'lugn');
  s.slipPlan = s.slipPlan.map(() => []);
  s.kraft = 99;
  return s;
}

function calm(s: GameState) {
  for (const a of s.animals) if (a.status === 'active') { a.belief = 8; a.intent = { kind: 'follow' }; }
}

function pass(s: GameState): GameState {
  calm(s);
  s = run(s, { type: 'endTurn' });
  calm(s);
  return s;
}

/** Everyone else safely on the far bank, so only the animals under test remain. */
function only(s: GameState, ...ids: string[]) {
  for (const a of s.animals) if (!ids.includes(a.id) && a.status === 'active') a.status = 'safe';
}

describe('the fork', () => {
  it('from Granbacken the way forks: the farm or the river, both onward to the fields', () => {
    const s = atTheFork();
    expect(run(s, { type: 'travel', to: 'garden' }).encounterId).toBe('farm');
    const r = run(s, { type: 'travel', to: 'an' });
    expect(r.encounterId).toBe('river');
    expect(r.animals.filter((a) => a.status === 'active').every((a) => a.zone === 'strand')).toBe(true);
  });

  it('two voices speak up for different paths', () => {
    const voices = forkVoices(atTheFork());
    expect(voices).toHaveLength(2);
    expect(new Set(voices.map((v) => v.to)).size).toBe(2);
  });

  it('going their way strengthens a voice; going against it weakens', () => {
    const s = atTheFork();
    const voices = forkVoices(s);
    const forRiver = voices.find((v) => v.to === 'an')!;
    const against = voices.find((v) => v.to !== 'an')!;
    const r = run(s, { type: 'travel', to: 'an' });
    expect(get(r, forRiver.who).belief).toBe(Math.min(10, get(s, forRiver.who).belief + 1));
    expect(get(r, against.who).belief).toBe(get(s, against.who).belief - 1);
  });

  it('an injury speaks louder than nature: a limping animal fears the stones', () => {
    const s = atTheFork();
    get(s, 'frona').injuries = [];
    get(s, 'sotfot').injuries = ['halt'];
    const v = forkVoices(s).find((x) => x.who === 'sotfot');
    expect(v?.to).toBe('garden');
    expect(v?.weight).toBe(2);
  });

  it('under "Vi lyssnar på den äldste" the elder’s voice counts double', () => {
    const s = atTheFork();
    s.verses = [oathVerse('denAldste')];
    expect(voiceStake(s, get(s, 'ljung'))).toBe(2);
    expect(voiceStake(s, get(s, 'kvarn'))).toBe(1);
  });
});

describe('Ån', () => {
  it('a slippery stone throws whoever stands there into the current', () => {
    let s = riverGame();
    get(s, 'frona').zone = 'sten1';
    s.slipPlan[0] = ['sten1'];
    s = pass(s);
    expect(get(s, 'frona').zone).toBe('strommen');
    expect(get(s, 'frona').status).toBe('active');
  });

  it('biting down holds you on the stone', () => {
    let s = riverGame();
    get(s, 'frona').zone = 'sten1';
    get(s, 'frona').braced = true;
    s.slipPlan[0] = ['sten1'];
    s = pass(s);
    expect(get(s, 'frona').zone).toBe('sten1');
  });

  it('a strong current carries the small toward the rapids: the last moment', () => {
    let s = riverGame();
    only(s, 'sotfot', 'kvarn');
    get(s, 'sotfot').zone = 'strommen';
    s.currentPlan[0] = 'strid';
    s = run(s, { type: 'endTurn' });
    expect(s.phase).toBe('lastMoment');
    expect(s.pending?.source).toBe('forsen');
    s = run(s, { type: 'lastMoment', choice: 'letGo' });
    expect(get(s, 'sotfot').status).toBe('dead');
  });

  it('whoever stands next to the badger holds on; the toad swims; the owl lifts off', () => {
    let s = riverGame();
    only(s, 'sotfot', 'ljung', 'kvarn', 'skymning');
    for (const id of ['sotfot', 'ljung', 'kvarn', 'skymning']) get(s, id).zone = 'strommen';
    s.currentPlan[0] = 'strid';
    s = pass(s);
    expect(s.phase).toBe('play');
    expect(['sotfot', 'ljung', 'kvarn', 'skymning'].every((id) => get(s, id).status === 'active')).toBe(true);
  });

  it(`the dam creaks under every step and breaks at ${DAM_MAX}; the large count twice`, () => {
    let s = riverGame();
    s = run(s, { type: 'lead', target: 'ljung', zone: 'dammen' });
    expect(s.damCreak).toBe(2);
    s = run(s, { type: 'lead', target: 'kvarn', zone: 'dammen' });
    expect(s.damCreak).toBe(3);
    s = run(s, { type: 'lead', target: 'frona', zone: 'dammen' });
    expect(s.closed).toContain('dammen');
    expect(['ljung', 'kvarn', 'frona'].every((id) => get(s, id).zone === 'strommen')).toBe(true);
    expect(s.currentPlan.slice(0, 2)).toEqual(['strid', 'strid']);
  });

  it('by day the heron watches a stone and strikes the small ones there', () => {
    let s = riverGame();
    expect(s.time).toBe('day');
    s = pass(s);
    get(s, 'kvarn').zone = 'sten1';
    get(s, 'frona').zone = 'sten2';
    get(s, 'sicksack').zone = 'sten2';
    s.slipPlan[s.turn - 1] = [];
    s.currentPlan[s.turn - 1] = 'lugn';
    // Re-run the hour's telegraph by passing once more from a fresh hour.
    s = pass(s);
    expect(s.heron).not.toBeNull();
  });

  it('a pecked small animal bleeds', () => {
    let s = riverGame();
    s = pass(s);
    s.heron = 'sten1';
    get(s, 'kvarn').zone = 'sten1';
    s.slipPlan[s.turn - 1] = [];
    s = pass(s);
    expect(get(s, 'kvarn').injuries).toContain('bleeding');
  });

  it('at night there is no heron, but the cold water bites', () => {
    let s = riverGame(true);
    expect(s.time).toBe('night');
    get(s, 'ljung').zone = 'sten1';
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'ljung').belief).toBe(7);
    s.slipPlan = s.slipPlan.map(() => []);
    s = pass(s);
    expect(s.heron).toBeNull();
  });
});
