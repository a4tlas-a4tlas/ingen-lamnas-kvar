import { describe, expect, it } from 'vitest';
import { AKRARNA } from '../../src/data/regions/akrarna';
import { FIRST_CUT, STRIPS_PER_HOUR, WHEAT, planHarvest } from '../../src/engine/encounters/harvest';
import { generateRegion } from '../../src/engine/regions';
import { createGame, regionJourney } from '../../src/engine/setup';
import { step } from '../../src/engine/step';
import type { GameState, ZoneId } from '../../src/engine/types';
import { forecast } from '../../src/ui/status';
import { get, plain, run } from './helpers';

/** At Åkrarna's last fire, with only the harvest ahead – and into it. */
function harvest(seed = 5): GameState {
  let s = run(plain(createGame(seed)), { type: 'swear', verses: ['manen'] });
  s.journey = regionJourney(AKRARNA, seed);
  s.run.regions = ['dalen', 'akrarna'];
  s.run.skipped = ['staden'];
  const end = s.journey.nodes.find((n) => n.encounter === 'harvest')!;
  const fire = s.journey.nodes.find((n) => n.next.includes(end.id))!;
  s.journey.at = fire.id;
  s.journey.visited.push(fire.id);
  for (const a of s.animals) a.status = 'safe';
  s = run(s, { type: 'travel', to: end.id });
  calm(s);
  s.kraft = 99;
  // No feint: the harvester goes the way it was planned, and we know it.
  s.feint = [];
  return s;
}

function calm(s: GameState) {
  for (const a of s.animals) if (a.status === 'active') { a.belief = 8; a.intent = { kind: 'follow' }; }
}

const put = (s: GameState, at: Record<string, ZoneId>) => {
  for (const a of s.animals) if (a.status === 'active') a.zone = 'faltkanten';
  for (const [id, z] of Object.entries(at)) get(s, id).zone = z;
  return s;
};
const pass = (s: GameState) => { calm(s); s = run(s, { type: 'endTurn' }); calm(s); s.kraft = 99; return s; };
const letGo = (s: GameState) => (s.phase === 'lastMoment' ? run(s, { type: 'lastMoment', choice: 'letGo' }) : s);

describe('Skördetröskan', () => {
  it('is the end of Åkrarna: every map ends at the wheat field, by day', () => {
    for (let i = 0; i < 20; i++) {
      const last = generateRegion(AKRARNA, i).nodes.find((n) => n.next.length === 0)!;
      expect(last.encounter).toBe('harvest');
    }
    const s = harvest();
    expect(s.encounterId).toBe('harvest');
    expect(s.time).toBe('day');
  });

  it('cuts every stand of wheat, two an hour from the first, round the edge one way or the other', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const { plan, feint } = planHarvest({ rng: seed }, 5);
      expect(plan.slice(0, FIRST_CUT - 1).flat()).toEqual([]);
      expect(plan.flat().sort()).toEqual([...WHEAT].sort());
      for (const h of plan.filter((x) => x.length)) expect(h).toHaveLength(STRIPS_PER_HOUR);
      // The way it didn't take: wheat still standing, never the real strip.
      const cut = new Set<ZoneId>();
      plan.forEach((h, i) => {
        for (const z of feint[i]) { expect(cut.has(z)).toBe(false); expect(h).not.toContain(z); }
        h.forEach((z) => cut.add(z));
      });
    }
    expect(harvest().harvest.plan).toEqual(harvest().harvest.plan);
  });

  it('runs over whoever stands in the strip it cuts – with a last moment – and spares those in the air', () => {
    let s = pass(harvest());
    const strip = s.harvest.plan[s.turn - 1];
    put(s, { toad: strip[0], fox: strip[1] });
    s = run(s, { type: 'lead', target: 'owl', zone: strip[0] }); // the owl lifts off above it
    s = run(s, { type: 'endTurn' });
    expect(s.phase).toBe('lastMoment');
    s = letGo(s);
    while (s.phase === 'lastMoment') s = letGo(s);
    expect(get(s, 'toad').status).toBe('dead');
    expect(get(s, 'owl').status).toBe('active');
    expect(s.harvest.cut).toEqual(expect.arrayContaining(strip));
  });

  it('behind it lies stubble, and the buzzard strikes there: the small carried off, the medium clawed, never the large', () => {
    let s = pass(put(harvest(), {}));
    s = pass(put(s, {}));
    expect(s.harvest.cut.length).toBeGreaterThan(0);
    expect(s.harvest.shadow).not.toBeNull();
    const z = s.harvest.shadow!;
    expect(s.harvest.cut).toContain(z);
    // Keep everyone out of the harvester's way this hour; put the small and the large in the stubble.
    put(s, { mice: z, badger: z });
    s.harvest.plan[s.turn - 1] = s.harvest.plan[s.turn - 1].filter((x) => x !== z);
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'badger').status).toBe('active');
    expect(get(s, 'mice').count).toBeLessThan(6);
  });

  it('standing wheat hides us from the buzzard: its shadow falls only on stubble', () => {
    let s = harvest();
    for (let i = 0; i < 5 && s.phase === 'play'; i++) {
      if (s.harvest.shadow) expect(s.harvest.cut).toContain(s.harvest.shadow);
      s = pass(put(s, {}));
    }
  });

  it('the forecast names who is run over and who the buzzard takes', () => {
    let s = pass(harvest());
    const strip = s.harvest.plan[s.turn - 1];
    put(s, { fox: strip[0] });
    expect(forecast(s).map((l) => l.text).join(' | ')).toMatch(/Skördetröskan skär .* kör över .*: dödar/);
  });

  it('once across, the fields are behind us; with the city passed by, the bog is the one way left', () => {
    let s = harvest();
    for (const a of s.animals) if (a.status === 'active') a.zone = 'vete2m';
    for (const a of s.animals.filter((x) => x.status === 'active')) s = run(s, { type: 'lead', target: a.id, zone: 'hacken' });
    expect(s.phase).toBe('map');
    expect(s.run.between).toBe(true);
    expect(s.run.offered).toEqual(['mossen']);
    expect(s.meeting?.id).toBe('interlude');
  });

  it('every hour plays out the same for the same state', () => {
    const s = pass(harvest());
    expect(step(s, { type: 'endTurn' }).state).toEqual(step(s, { type: 'endTurn' }).state);
  });

  it('until we know which way it turns, the forecast names both; only the real strip is cut', () => {
    let s = pass(harvest());
    const strip = s.harvest.plan[s.turn - 1];
    const other = WHEAT.filter((z) => !s.harvest.cut.includes(z) && !strip.includes(z)).slice(0, 2);
    s.feint[s.turn - 1] = other;
    put(s, { fox: other[0] });
    expect(forecast(s).map((l) => l.text).join(' | ')).toMatch(/Skördetröskan skär .* – eller .*: Rost kan bli överkörda/);
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'fox').status).toBe('active');
  });
});
