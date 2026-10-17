import { describe, expect, it } from 'vitest';
import { animalStatuses, forecast } from '../../src/ui/status';
import { calmGame, car, get } from './helpers';

describe('status and forecast', () => {
  it('names every state an animal is in', () => {
    const s = calmGame(['ingenLamnas', 'viJagarInte', 'denStarke']);
    get(s, 'sotfot').intent = { kind: 'freeze' };
    get(s, 'kvarn').wounds = 2;
    const fox = animalStatuses(s, get(s, 'sotfot')).map((x) => x.label);
    expect(fox).toContain('fryser');
    expect(animalStatuses(s, get(s, 'kvarn')).map((x) => x.label)).toContain('sår 2/3');
  });

  it('warns that a bolting animal will run into a deadly car', () => {
    const s = calmGame(['ingenLamnas', 'viJagarInte', 'denStarke']);
    const k = get(s, 'kvarn');
    k.wounds = 2;
    k.intent = { kind: 'bolt' };
    s.trafficPlan[0] = [car('lane1')];
    const lines = forecast(s).map((f) => f.text);
    expect(lines).toContain('Kvarn rusar ut i första körfältet.');
    expect(lines.some((l) => l.includes('träffar Kvarn') && l.includes('dödligt'))).toBe(true);
  });

  it('keeps an unseen dark car vague', () => {
    const s = calmGame(['ingenLamnas', 'viJagarInte', 'denStarke']);
    get(s, 'kvarn').zone = 'lane2';
    s.trafficPlan[0] = [{ lane: 'lane2', wounds: 2, vehicle: 'mörk bil', dark: true }];
    const lines = forecast(s).map((f) => f.text);
    expect(lines.some((l) => l.includes('Kvarn'))).toBe(false);
    expect(lines.some((l) => l.includes('mullrar'))).toBe(true);
  });
});
