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
  // No feint: the feller goes where we say, and we know it.
  s.feint = [];
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
    expect(m.maxTurn).toBe(6);
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
    let s = put(morning(), 'granOst', 'toad');
    s = run(s, { type: 'endTurn' });
    expect(s.phase).toBe('lastMoment');
    expect(s.pending).toMatchObject({ victim: 'toad', source: 'fällaren', severity: 'kill' });
    s = run(s, { type: 'lastMoment', choice: 'letGo' });
    expect(get(s, 'toad').status).toBe('dead');
  });

  it('the roar gives shock to those in the open beside the felling, not to those among the trees or in the air', () => {
    let s = morning();
    put(s, 'hygget', 'badger');
    put(s, 'stenroset', 'fox');
    put(s, 'granVast', 'toad');
    put(s, 'stenroset', 'owl');
    get(s, 'owl').flying = true;
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'badger').injuries).toContain('shock');
    expect(get(s, 'fox').injuries).toContain('shock');
    expect(get(s, 'toad').injuries).not.toContain('shock');
    expect(get(s, 'owl').injuries).not.toContain('shock');
  });

  it('the bulldozer takes the ground behind us: closed for good, and deadly to whoever is still on it', () => {
    let s = morning();
    for (const a of s.animals) a.zone = 'hygget';
    s = pass(s);
    put(s, 'glantan', 'toad');
    s = run(s, { type: 'endTurn' });
    expect(s.closed).toEqual(['glantan']);
    expect(s.pending).toMatchObject({ victim: 'toad', source: 'schaktaren' });
    // Gamla Ljung is no longer next to Kvarn, but whoever is beside it can throw themselves in.
    put(s, 'glantan', 'badger');
    s = run(s, { type: 'lastMoment', choice: 'shield', by: 'badger' });
    expect(get(s, 'toad').status).toBe('active');
    // The next hour, whoever survived is pushed up out of the mud – and no one can go back.
    expect(get(s, 'toad').zone).not.toBe('glantan');
    expect(step(s, { type: 'lead', target: 'fox', zone: 'glantan' }).events[0].kind).toBe('error');
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
    get(s, 'toad').zone = 'hygget';
    for (const a of s.animals) if (a.id !== 'toad') a.status = 'safe';
    s.turn = s.maxTurn;
    s.fellPlan[s.turn - 1] = 'bjorkdungen';
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'toad').status).toBe('left');
    expect(s.meeting?.id).toBe('interlude');
  });

  it('having read the tracks, we see where the trees fall next', () => {
    const s = morning(['granOst', 'bjorkdungen', 'granOst', 'granVast', 'granOst', 'granVast', 'granOst', 'granVast']);
    expect(forecast(s).some((l) => l.text.includes('nästa timme'))).toBe(false);
    s.knowledge = ['machines'];
    expect(forecast(s).some((l) => l.text.includes('björkdungen'))).toBe(true);
  });

  it('the feller shows two places, only one real: another standing tree, a spruce line when one stands', () => {
    for (let seed = 1; seed < 200; seed++) {
      const { fellPlan, dozePlan, feint } = planMachines({ rng: seed }, 6);
      const gone = new Set<ZoneId>();
      feint.forEach(([z], i) => {
        expect(z).toBeDefined();
        expect(z).not.toBe(fellPlan[i]);
        expect(TREES).toContain(z);
        expect(gone.has(z)).toBe(false);
        const d = dozePlan[i];
        if (d) gone.add(d);
      });
    }
  });

  it('until we know, the forecast names both places; only the real one falls; the tracks tell which', () => {
    const s = put(morning(['granOst', 'granOst', 'granOst', 'granOst', 'granOst', 'granOst']), 'granVast', 'toad');
    s.feint = [['granVast'], ['granVast'], [], [], [], []];
    const text = forecast(s).map((l) => l.text).join(' | ');
    expect(text).toMatch(/Fällaren går in i (västra|östra) granridån eller (västra|östra) granridån: .*kan dö/);
    const r = pass(s);
    expect(get(r, 'toad').status).toBe('active');
    s.knowledge.push('machines');
    expect(forecast(s).map((l) => l.text).join(' | ')).not.toMatch(/ eller /);
  });
});
