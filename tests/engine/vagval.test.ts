import { describe, expect, it } from 'vitest';
import { SPECIES } from '../../src/data/animals';
import { meetingOptions } from '../../src/data/meetings';
import { LOOK_BACK } from '../../src/data/meetings/interlude.sv';
import { REGIONS } from '../../src/data/regions';
import { generateRegion } from '../../src/engine/regions';
import { createGame, oathVerse } from '../../src/engine/setup';
import { hardChanceAfter } from '../../src/engine/step';
import type { GameState, RegionId, Species } from '../../src/engine/types';
import { regionVoices } from '../../src/engine/voices';
import { get, plain, run } from './helpers';

/** Past the machines, at the crossroads: both ways offered, no one hungry, no one grieving. */
function crossroads(seed = 3): GameState {
  const s = run(plain(createGame(seed)), { type: 'swear', verses: ['manen'] });
  s.run = { regions: ['dalen'], offered: ['akrarna', 'staden'], skipped: [], between: true };
  s.phase = 'map';
  s.meeting = { id: 'interlude', frame: 'way', used: [], told: [] };
  for (const a of s.animals) {
    a.status = 'safe';
    if (a.predator) a.belief = 8;
  }
  return s;
}
const go = (s: GameState, to: RegionId) => run(s, { type: 'respond', option: `go-${to}` });
const text = (s: GameState) => s.log.map((e) => ('text' in e ? String(e.text) : '')).join('\n');

describe('Vägvalet: the choice between two ways', () => {
  it('we walk one, and the other is passed by for good', () => {
    const s = go(crossroads(), 'akrarna');
    expect(s.run).toMatchObject({ regions: ['dalen', 'akrarna'], skipped: ['staden'], offered: [], between: false });
    expect(text(s)).toMatch(/Vägen mot stadens utkant går vi aldrig/);
    expect(s.journey.region).toBe('akrarna');
  });

  it('the way frame says we can only walk one, and lets the animals speak', () => {
    const s = crossroads();
    const frame = meetingOptions(s).map((o) => o.id).sort();
    expect(frame).toEqual(['go-akrarna', 'go-staden']);
    const voices = regionVoices(s);
    expect(voices).toHaveLength(2);
    expect(new Set(voices.map((v) => v.to)).size).toBe(2);
  });

  it('each kind leans by its nature: the mice away from the city, the hare toward the fields', () => {
    const s = crossroads();
    s.animals = s.animals.filter((a) => a.species === 'mice');
    expect(regionVoices(s)).toEqual([expect.objectContaining({ who: 'mice', to: 'akrarna' })]);
  });

  it('grief for the glen and hunger speak louder than nature', () => {
    const s = crossroads();
    get(s, 'toad').grief = ['dalen'];
    get(s, 'adder').belief = 4;
    const voices = regionVoices(s);
    expect(voices.map((v) => [v.who, v.to, v.weight])).toEqual(expect.arrayContaining([
      ['toad', 'akrarna', 2],
      ['adder', 'staden', 2],
    ]));
  });

  it('going their way strengthens those who asked; going the other weakens them', () => {
    const s = crossroads();
    const voices = regionVoices(s);
    const before = Object.fromEntries(voices.map((v) => [v.who, get(s, v.who).belief]));
    const to = voices[0].to as RegionId;
    const after = go(s, to);
    for (const v of voices) expect(get(after, v.who).belief).toBe(Math.min(10, before[v.who] + (v.to === to ? 1 : -1)));
  });

  it('the eldest’s wish weighs double while we listen to the eldest', () => {
    const s = crossroads();
    s.verses = [oathVerse('denAldste')];
    const badger = regionVoices(s).find((v) => v.who === 'badger');
    expect(badger?.to).toBe('akrarna');
    const b = get(s, 'badger').belief;
    expect(get(go(s, 'staden'), 'badger').belief).toBe(b - 2);
  });
});

describe('arriving, and looking back', () => {
  it('a region greets us by where we come from', () => {
    expect(text(go(crossroads(), 'staden'))).toMatch(/Dalen ligger bakom oss\. Framför oss börjar staden/);
    const s = crossroads();
    s.run.regions = ['dalen', 'akrarna'];
    s.run.offered = ['staden'];
    expect(text(go(s, 'staden'))).toMatch(/Åkrarna tar slut vid en skylt/);
    expect(REGIONS.akrarna.arriveFrom?.staden).toBeDefined();
  });

  it('every kind has its own words for the fields and the city', () => {
    for (const r of ['akrarna', 'staden'] as RegionId[])
      for (const k of Object.keys(SPECIES) as Species[]) expect(LOOK_BACK[r]?.[k], `${r} ${k}`).toBeTruthy();
  });
});

describe('harder the later it comes', () => {
  it('each middle region walked makes places likelier to be hard', () => {
    expect(hardChanceAfter(0)).toBeCloseTo(0.4);
    expect(hardChanceAfter(1)).toBeCloseTo(0.55);
    const hard = (chance: number) => {
      let n = 0;
      for (let seed = 1; seed <= 300; seed++) n += Object.values(generateRegion(REGIONS.staden, seed, chance).truth).filter((v) => v === 'hard').length;
      return n;
    };
    expect(hard(0.55)).toBeGreaterThan(hard(0.4) * 1.2);
    // The default is still what the glen and the first middle region get.
    expect(generateRegion(REGIONS.akrarna, 9)).toEqual(generateRegion(REGIONS.akrarna, 9, 0.4));
  });

  it('the first region after the glen is drawn at the ordinary chance', () => {
    const s = go(crossroads(7), 'akrarna');
    const seed = s.seed + 7919 * 2;
    expect(s.journey.truth).toEqual(generateRegion(REGIONS.akrarna, seed, 0.4).truth);
  });
});
