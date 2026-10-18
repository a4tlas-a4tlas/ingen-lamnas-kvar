import { describe, expect, it } from 'vitest';
import { defaultPlan } from '../../src/engine/campfire';
import { ALARM_MAX_NIGHT, alarmMax } from '../../src/engine/encounters/farm';
import { planRoad } from '../../src/engine/encounters/road';
import { canLure, moonVisible } from '../../src/engine/rules';
import { step } from '../../src/engine/step';
import type { GameState } from '../../src/engine/types';
import { CROW_AWAY, calmGame, classicGame, get, run } from './helpers';

const sworn = (seed = 3) => run(classicGame(seed), { type: 'swear', verses: ['manen'] });

/** Across the road and through the fire: the map at Granbacken, the farm ahead. */
function atTheFork(): GameState {
  let s = calmGame(['ingenLamnas']);
  for (const a of s.animals) a.zone = 'lane2';
  s.kraft = 99;
  for (const a of s.animals) s = run(s, { type: 'lead', target: a.id, zone: 'farDike' });
  s = run(s, { type: 'travel', to: 'granbacken' }, ...CROW_AWAY);
  return run(s, { type: 'restAtFire', ...defaultPlan(s) });
}

describe('day and night', () => {
  it('the glen’s last night leads to the road at night', () => {
    const s = run(sworn(), { type: 'travel', to: 'vagen' });
    expect(s.time).toBe('night');
    expect(s.hope).toBe(sworn().hope);
  });

  it('waiting for the other time of day costs one hope', () => {
    const before = sworn();
    const r = step(before, { type: 'travel', to: 'vagen', wait: true });
    expect(r.state.time).toBe('day');
    expect(r.state.hope).toBe(before.hope - 1);
    expect(r.events.some((e) => e.kind === 'hope' && e.reason === 'wait')).toBe(true);
  });

  it('only an encounter can be waited for', () => {
    let s = calmGame(['ingenLamnas']);
    for (const a of s.animals) a.zone = 'lane2';
    s.kraft = 99;
    for (const a of s.animals) s = run(s, { type: 'lead', target: a.id, zone: 'farDike' });
    const r = step(s, { type: 'travel', to: 'granbacken', wait: true });
    expect(r.events[0].kind).toBe('error');
  });

  it('after the night on the road and the fire, the next leg comes at dawn', () => {
    const s = atTheFork();
    expect(s.clock).toBe('day');
    expect(run(s, { type: 'travel', to: 'garden' }).time).toBe('day');
    expect(run(s, { type: 'travel', to: 'garden', wait: true }).time).toBe('night');
  });

  it('the road by day: more cars, but no dark ones and no moon', () => {
    let day = 0;
    let night = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const d = planRoad({ rng: seed }, 10, 'day').trafficPlan.flat();
      const n = planRoad({ rng: seed }, 10, 'night').trafficPlan.flat();
      expect(d.some((x) => x.dark)).toBe(false);
      expect(n.some((x) => x.dark)).toBe(true);
      day += d.length;
      night += n.filter((x) => !x.dark).length;
    }
    expect(day).toBeGreaterThan(night * 1.1);
    const s = run(sworn(), { type: 'travel', to: 'vagen', wait: true });
    expect(moonVisible(s)).toBe(false);
  });

  it('the farm at night: the farmer sleeps deep, and the dogs cannot see a lure', () => {
    let s = run(atTheFork(), { type: 'travel', to: 'garden', wait: true });
    expect(alarmMax(s)).toBe(ALARM_MAX_NIGHT);
    s.alarm = 5;
    s.dogsAwake = true;
    expect(canLure(s, get(s, 'sotfot'))).toBe(false);
    expect(s.farmerOut).toBe(false);
    s.time = 'day';
    expect(canLure(s, get(s, 'sotfot'))).toBe(true);
  });

  it('at night the scent lingers: it fades only every other hour', () => {
    let s = run(atTheFork(), { type: 'travel', to: 'garden', wait: true });
    for (const a of s.animals) if (a.status === 'active') a.zone = 'hogtGras';
    s.scent = { gardsplanen: 3 };
    const pass = (x: GameState) => {
      for (const a of x.animals) if (a.status === 'active') { a.intent = { kind: 'follow' }; a.belief = 8; }
      return run(x, { type: 'endTurn' });
    };
    s = pass(s); // hour 1 → 2: no fading on odd hours
    const afterOne = s.scent.gardsplanen;
    s = pass(s);
    expect(s.scent.gardsplanen).toBe(afterOne - 1);
    expect(afterOne).toBe(3);
  });
});
