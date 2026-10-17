import { describe, expect, it } from 'vitest';
import { animalStatuses, forecast } from '../../src/ui/status';
import { calmGame, get, truck } from './helpers';

describe('status and forecast', () => {
  it('names every state an animal is in', () => {
    const s = calmGame(['ingenLamnas', 'viJagarInte', 'denStarke']);
    get(s, 'sotfot').intent = { kind: 'freeze' };
    get(s, 'kvarn').injuries = ['halt', 'bleeding'];
    const fox = animalStatuses(s, get(s, 'sotfot')).map((x) => x.label);
    expect(fox).toContain('fryser');
    expect(animalStatuses(s, get(s, 'kvarn')).map((x) => x.label)).toEqual(expect.arrayContaining(['haltar', 'blöder']));
  });

  it('warns that a bolting animal will run into a deadly car', () => {
    const s = calmGame(['ingenLamnas', 'viJagarInte', 'denStarke']);
    get(s, 'kvarn').intent = { kind: 'bolt' };
    s.trafficPlan[0] = [truck('lane1')];
    const lines = forecast(s).map((f) => f.text);
    expect(lines).toContain('Kvarn rusar ut i första körfältet.');
    expect(lines.some((l) => l.includes('träffar Kvarn') && l.includes('dödar'))).toBe(true);
  });

  it('keeps an unseen dark car vague', () => {
    const s = calmGame(['ingenLamnas', 'viJagarInte', 'denStarke']);
    get(s, 'kvarn').zone = 'lane2';
    s.trafficPlan[0] = [{ lane: 'lane2', severity: 'kill', vehicle: 'mörk bil', dark: true }];
    const lines = forecast(s).map((f) => f.text);
    expect(lines.some((l) => l.includes('Kvarn'))).toBe(false);
    expect(lines.some((l) => l.includes('mullrar'))).toBe(true);
  });
});
