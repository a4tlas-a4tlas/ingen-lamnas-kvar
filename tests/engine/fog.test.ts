import { describe, expect, it } from 'vitest';
import { MOSSEN } from '../../src/data/regions/mossen';
import { LAST_ROW, planFogKinds } from '../../src/engine/encounters/fog';
import { generateRegion } from '../../src/engine/regions';
import { bondKey, fogSeen, hearsACall, leadTargets } from '../../src/engine/rules';
import { createGame, regionJourney } from '../../src/engine/setup';
import { step } from '../../src/engine/step';
import type { GameState, Variant, ZoneId } from '../../src/engine/types';
import { forecast } from '../../src/ui/status';
import { get, plain, run } from './helpers';

/** At Mossen's last fire, with only the fog ahead – and into it. */
function fog(variant: Variant = 'normal', seed = 5, found = false): GameState {
  let s = run(plain(createGame(seed)), { type: 'swear', verses: ['manen'] });
  s.journey = regionJourney(MOSSEN, seed);
  s.run.regions = ['dalen', 'mossen'];
  const end = s.journey.nodes.find((n) => n.encounter === 'fog')!;
  s.journey.at = s.journey.nodes.find((n) => n.next.includes(end.id))!.id;
  s.journey.truth[end.id] = variant;
  s.journey.guess[end.id] = variant;
  for (const a of s.animals) a.status = 'safe';
  if (found) s.knowledge.push('vilsnaHittad');
  s = run(s, { type: 'travel', to: end.id });
  for (const a of s.animals) if (a.status === 'active') { a.belief = 8; a.intent = { kind: 'follow' }; }
  s.kraft = 99;
  return s;
}

/** Everyone at the edge except those named; bonds only as we say; all firm ground. */
function setUp(s: GameState, at: Record<string, ZoneId> = {}, bonds: [string, string][] = []): GameState {
  for (const a of s.animals) if (a.status === 'active') a.zone = 'myrranden';
  for (const [id, z] of Object.entries(at)) get(s, id).zone = z;
  s.bonds = Object.fromEntries(bonds.map(([a, b]) => [bondKey(a, b), 2]));
  for (const z of Object.keys(s.fog.kinds)) s.fog.kinds[z] = 'firm';
  s.bogFrom = Object.fromEntries(s.animals.map((a) => [a.id, a.zone]));
  return s;
}
const pass = (s: GameState) => run(s, { type: 'endTurn' });

describe('Dimman', () => {
  it('is Mossen’s boss: every map ends in the fog', () => {
    for (let i = 0; i < 20; i++) {
      const map = generateRegion(MOSSEN, i);
      expect(map.nodes[map.nodes.length - 1]).toMatchObject({ encounter: 'fog', name: 'Dimman' });
    }
  });

  it('under the fog: one firm zone in each row, two deep pools, the rest soft moss', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const k = planFogKinds({ rng: seed });
      const v = Object.values(k);
      expect(v.filter((x) => x === 'firm')).toHaveLength(3);
      expect(v.filter((x) => x === 'pool')).toHaveLength(2);
      expect(v.filter((x) => x === 'soft')).toHaveLength(4);
    }
  });

  it('only one with someone close nearby can be led; the alone drift with the fog', () => {
    const s = setUp(fog(), { badger: 'dimma1m', toad: 'dimma1m', fox: 'dimma2o' }, [['badger', 'toad']]);
    expect(hearsACall(s, get(s, 'badger'))).toBe(true);
    expect(hearsACall(s, get(s, 'fox'))).toBe(false);
    expect(leadTargets(s)).toContain('badger');
    expect(leadTargets(s)).not.toContain('fox');
    const r = pass(s);
    expect(get(r, 'fox').zone).not.toBe('dimma2o');
    expect(get(r, 'badger').zone).toBe('dimma1m');
  });

  it('anyone in the same zone is heard; a friend in the next zone too – until the fog is thick', () => {
    const s = setUp(fog(), { badger: 'dimma1m', toad: 'dimma2m', fox: 'dimma3o', owl: 'dimma3o' }, [['badger', 'toad']]);
    expect(hearsACall(s, get(s, 'toad'))).toBe(true);
    expect(hearsACall(s, get(s, 'fox'))).toBe(true);
    const h = setUp(fog('hard'), { badger: 'dimma1m', toad: 'dimma2m' }, [['badger', 'toad']]);
    h.turn = 4;
    expect(hearsACall(h, get(h, 'toad'))).toBe(false);
  });

  it('the lone drift aside, never back and never into a pool', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = setUp(fog('normal', seed), { fox: 'dimma2m' });
      s.fog.kinds.dimma2v = 'pool';
      const r = pass(s);
      expect(['dimma2o']).toContain(get(r, 'fox').zone);
    }
  });

  it('we see only where we stand and beside it; every third hour the fog lifts; thick fog shows only our own zones from the fourth hour', () => {
    const s = setUp(fog(), { badger: 'dimma1v' });
    const seen = fogSeen(s);
    expect(seen).toContain('dimma1v');
    expect(seen).toContain('dimma2v');
    expect(seen).not.toContain('dimma3o');
    s.turn = 3;
    expect(fogSeen(s)).toContain('dimma3o');
    const h = setUp(fog('hard'), { badger: 'dimma1v' });
    h.turn = 4;
    expect(fogSeen(h)).toContain('dimma1v');
    expect(fogSeen(h)).not.toContain('dimma2v');
  });

  it('if we found the lost one, it calls from the far side: the last row is seen, and no one there is alone', () => {
    const s = setUp(fog('normal', 5, true), { fox: 'dimma3o' });
    expect(hearsACall(s, get(s, 'fox'))).toBe(true);
    for (const z of LAST_ROW) expect(fogSeen(s)).toContain(z);
    const t = setUp(fog(), { fox: 'dimma3o' });
    expect(hearsACall(t, get(t, 'fox'))).toBe(false);
  });

  it('the bog lies under the fog: soft moss sinks us, deep pools drown the small', () => {
    const s = setUp(fog(), { badger: 'dimma2m', mice: 'dimma2m', adder: 'dimma1o', toad: 'dimma1o' }, [['badger', 'mice'], ['adder', 'toad']]);
    s.fog.kinds.dimma2m = 'soft';
    s.fog.kinds.dimma1o = 'pool';
    const r = pass(s);
    expect(get(r, 'badger').sink).toBe(4);
    expect(r.phase).toBe('lastMoment');
    expect(r.pending).toMatchObject({ victim: 'adder', source: 'gölen' });
  });

  it('the forecast names who drifts', () => {
    const s = setUp(fog(), { fox: 'dimma2o' });
    expect(forecast(s).map((l) => l.text).join(' | ')).toMatch(new RegExp(`${get(s, 'fox').name}.*driver bort`));
  });

  it('plays out the same for the same state', () => {
    const s = setUp(fog('hard'), { fox: 'dimma2o', owl: 'dimma1v' });
    expect(step(s, { type: 'endTurn' }).state).toEqual(step(s, { type: 'endTurn' }).state);
  });
});
