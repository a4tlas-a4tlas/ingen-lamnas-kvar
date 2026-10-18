import { describe, expect, it } from 'vitest';
import { DOZE_HOURS, TREES, planMachines } from '../../src/engine/encounters/machines';
import { createGame } from '../../src/engine/setup';
import { step } from '../../src/engine/step';
import type { GameState, ZoneId } from '../../src/engine/types';
import { forecast } from '../../src/ui/status';
import { get, run } from './helpers';

/** On the map at the last fire, with only the machines ahead. */
function belowTheRidge(seed = 4): GameState {
  const s = run(createGame(seed), { type: 'swear', verses: ['manen'] });
  s.journey.at = 'granbacken';
  s.journey.visited.push('granbacken');
  s.clock = 'night';
  return s;
}

function calm(s: GameState) {
  for (const a of s.animals) if (a.status === 'active') { a.belief = 8; a.intent = { kind: 'follow' }; }
}

/** The machines, with the trees falling where we say and the bulldozer as planned. */
function morning(fell: ZoneId[] = ['granOst', 'granOst', 'granOst', 'granOst', 'granOst', 'granOst', 'granOst', 'granOst']): GameState {
  const s = run(belowTheRidge(), { type: 'travel', to: 'asen' });
  calm(s);
  s.fellPlan = fell;
  s.dozePlan = [null, 'glantan', null, 'stenroset', null, 'bjorkdungen', null, null];
  s.kraft = 99;
  return s;
}

const pass = (s: GameState) => { calm(s); s = run(s, { type: 'endTurn' }); calm(s); s.kraft = 99; return s; };
const put = (s: GameState, zone: ZoneId, ...ids: string[]) => { for (const id of ids) get(s, id).zone = zone; return s; };

describe('Dalens sista morgon', () => {
  it('is the end of the glen: Åsen is the machines, at dawn, and they do not wait for us', () => {
    const s = belowTheRidge();
    expect(step(s, { type: 'travel', to: 'asen', wait: true }).events[0].kind).toBe('error');
    const m = run(s, { type: 'travel', to: 'asen' });
    expect(m.encounterId).toBe('machines');
    expect(m.time).toBe('day');
    expect(m.maxTurn).toBe(8);
    expect(m.animals.filter((a) => a.status === 'active').every((a) => a.zone === 'glantan')).toBe(true);
  });

  it('is planned up front: the bulldozer takes the clearing first and never the clear-cut; the trees never fall twice in a row', () => {
    for (let seed = 1; seed < 200; seed++) {
      const { fellPlan, dozePlan } = planMachines({ rng: seed }, 8);
      expect(DOZE_HOURS.map((h) => dozePlan[h - 1])).toEqual(['glantan', expect.any(String), expect.any(String)]);
      expect(dozePlan).not.toContain('hygget');
      expect(dozePlan.filter(Boolean).length).toBe(3);
      fellPlan.forEach((z, i) => {
        expect(TREES).toContain(z);
        if (i > 0) expect(z).not.toBe(fellPlan[i - 1]);
        // Ground the bulldozer has taken has no trees left to fell.
        expect(dozePlan.slice(0, i).includes(z)).toBe(false);
      });
    }
  });

  it('the trees fall on whoever stands under them – with a last moment', () => {
    let s = put(morning(), 'granOst', 'kvarn');
    s = run(s, { type: 'endTurn' });
    expect(s.phase).toBe('lastMoment');
    expect(s.pending).toMatchObject({ victim: 'kvarn', source: 'fällaren', severity: 'kill' });
    s = run(s, { type: 'lastMoment', choice: 'letGo' });
    expect(get(s, 'kvarn').status).toBe('dead');
  });

  it('the roar gives shock to those in the open beside the felling, not to those among the trees or in the air', () => {
    let s = morning();
    put(s, 'hygget', 'ljung');
    put(s, 'stenroset', 'sotfot');
    put(s, 'granVast', 'kvarn');
    put(s, 'stenroset', 'skymning');
    get(s, 'skymning').flying = true;
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'ljung').injuries).toContain('shock');
    expect(get(s, 'sotfot').injuries).toContain('shock');
    expect(get(s, 'kvarn').injuries).not.toContain('shock');
    expect(get(s, 'skymning').injuries).not.toContain('shock');
  });

  it('the bulldozer takes the ground behind us: closed for good, and deadly to whoever is still on it', () => {
    let s = morning();
    for (const a of s.animals) a.zone = 'hygget';
    s = pass(s);
    put(s, 'glantan', 'kvarn');
    s = run(s, { type: 'endTurn' });
    expect(s.closed).toEqual(['glantan']);
    expect(s.pending).toMatchObject({ victim: 'kvarn', source: 'schaktaren' });
    // Gamla Ljung is no longer next to Kvarn, but whoever is beside it can throw themselves in.
    put(s, 'glantan', 'ljung');
    s = run(s, { type: 'lastMoment', choice: 'shield', by: 'ljung' });
    expect(get(s, 'kvarn').status).toBe('active');
    // The next hour, whoever survived is pushed up out of the mud – and no one can go back.
    expect(get(s, 'kvarn').zone).not.toBe('glantan');
    expect(step(s, { type: 'lead', target: 'sotfot', zone: 'glantan' }).events[0].kind).toBe('error');
  });

  it('everyone over the ridge ends the glen, and we stop between two landscapes', () => {
    let s = morning();
    for (const a of s.animals) a.zone = 'granVast';
    s.fellPlan = s.fellPlan.map(() => 'granOst');
    for (const a of s.animals) s = run(s, { type: 'lead', target: a.id, zone: 'asen' });
    expect(s.phase).toBe('map');
    expect(s.animals.every((a) => a.status === 'safe')).toBe(true);
    expect(s.meeting).toMatchObject({ id: 'interlude', frame: 'start' });
    expect(s.log.some((e) => e.text.includes('lera och stubbar'))).toBe(true);
  });

  it('when time runs out, whoever is still below is left to the machines', () => {
    let s = morning();
    for (const a of s.animals) a.zone = 'asen';
    get(s, 'kvarn').zone = 'hygget';
    for (const a of s.animals) if (a.id !== 'kvarn') a.status = 'safe';
    s.turn = s.maxTurn;
    s.fellPlan[s.turn - 1] = 'bjorkdungen';
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'kvarn').status).toBe('left');
    expect(s.meeting?.id).toBe('interlude');
  });

  it('having read the tracks, we see where the trees fall next', () => {
    const s = morning(['granOst', 'bjorkdungen', 'granOst', 'granVast', 'granOst', 'granVast', 'granOst', 'granVast']);
    expect(forecast(s).some((l) => l.text.includes('nästa timme'))).toBe(false);
    s.knowledge = ['machines'];
    expect(forecast(s).some((l) => l.text.includes('björkdungen'))).toBe(true);
  });
});
