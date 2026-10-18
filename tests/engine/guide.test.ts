import { describe, expect, it } from 'vitest';
import { GUIDES } from '../../src/data/guides.sv';
import { ENCOUNTERS } from '../../src/engine/encounters';
import { ALARM_MAX } from '../../src/engine/encounters/farm';
import { zoneSketchSvg } from '../../src/ui/screens';

describe('the guide', () => {
  it('every area has a guide', () => {
    for (const id of Object.keys(ENCOUNTERS)) expect(GUIDES[id as keyof typeof GUIDES]?.title).toBeTruthy();
  });

  it('the numbers come from the rules', () => {
    expect(GUIDES.farm.goal).toContain(`${ENCOUNTERS.farm.maxTurn} timmar`);
    expect(GUIDES.road.goal).toContain(`${ENCOUNTERS.road.maxTurn} timmar`);
    expect(GUIDES.farm.dangers.map((d) => d.name).join()).toContain(`0–${ALARM_MAX}`);
  });

  it('the sketch draws every zone, and hides the culvert until it is found', () => {
    const road = ENCOUNTERS.road;
    const svg = zoneSketchSvg(road, []);
    expect(svg.match(/<rect /g)).toHaveLength(road.zones.length);
    expect(svg).not.toContain('Trumman');
    expect(zoneSketchSvg(road, ['culvert'])).toContain('Trumman');
    expect(zoneSketchSvg(ENCOUNTERS.farm, []).match(/<rect /g)).toHaveLength(ENCOUNTERS.farm.zones.length);
  });
});
