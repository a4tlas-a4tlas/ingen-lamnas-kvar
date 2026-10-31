import { describe, expect, it } from 'vitest';
import { meetingOptions } from '../../src/data/meetings';
import { FINAL_REGION } from '../../src/data/regions';
import { SKOGSBRYNET } from '../../src/data/regions/skogsbrynet';
import { generateRegion } from '../../src/engine/regions';
import { createGame, regionJourney } from '../../src/engine/setup';
import type { GameState, MeetingId } from '../../src/engine/types';
import { get, plain, run } from './helpers';

/** On Skogsbrynet's map, standing right before a story part. */
function before(meeting: MeetingId, seed = 3): GameState {
  const s = run(plain(createGame(seed)), { type: 'swear', verses: ['ingenLamnas'] });
  s.journey = regionJourney(SKOGSBRYNET, seed);
  s.run.regions = ['dalen', 'akrarna', 'mossen', 'skogsbrynet'];
  const start = s.journey.nodes[0];
  const t = [...SKOGSBRYNET.meetings, ...SKOGSBRYNET.finds].find((x) => x.meeting === meeting)!;
  const { key: _k, ...rest } = t;
  s.journey.nodes.push({ ...rest, id: 'here', row: 1, x: 50, y: 80, next: [] });
  start.next = ['here'];
  for (const a of s.animals) a.status = 'safe';
  return s;
}
const go = (s: GameState) => run(s, { type: 'travel', to: 'here' });
const say = (s: GameState, option: string) => run(s, { type: 'respond', option });

describe('Skogsbrynet, the last stretch', () => {
  it('a short map: the road first, one row to choose in, the last fire, then the hunter', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const { nodes } = generateRegion(SKOGSBRYNET, seed);
      expect(nodes[0].id).toBe('hygget');
      expect(nodes.find((n) => n.row === 1)).toMatchObject({ id: 'skogsvagen', encounter: 'road' });
      expect(nodes.filter((n) => n.row === 2).length).toBeGreaterThanOrEqual(2);
      expect(nodes.find((n) => n.row === 3)?.id).toBe('sistaElden');
      expect(nodes.find((n) => n.row === 4)).toMatchObject({ id: 'jagaren', encounter: 'hunt' });
      expect(nodes.some((n) => n.row > 4)).toBe(false);
    }
  });

  it('once the middle regions are walked, the only way on is the forest edge; past the hunter, the run ends in the forest', () => {
    let s = run(plain(createGame(4)), { type: 'swear', verses: ['manen'] });
    s.run = { regions: ['dalen', 'akrarna'], offered: [], skipped: ['staden'], between: false };
    s.journey = regionJourney(SKOGSBRYNET, 4);
    // Pretend the region we stand at the end of is the last middle one.
    s.journey.region = 'mossen';
    s.run.regions.push('mossen');
    const end = s.journey.nodes[s.journey.nodes.length - 1];
    s.journey.at = s.journey.nodes.find((n) => n.next.includes(end.id))!.id;
    for (const a of s.animals) a.status = 'safe';
    s.phase = 'map';
    // Through the region's last danger, everyone across at once.
    s = run(s, { type: 'travel', to: end.id });
    for (const a of s.animals) if (a.status === 'active') a.status = 'safe';
    s = run(s, { type: 'endTurn' });
    expect(s.run.offered).toEqual([FINAL_REGION]);
    s = run(s, { type: 'respond', option: 'onward' });
    const way = meetingOptions(s).map((o) => o.id);
    expect(way).toEqual(['go-skogsbrynet']);
    s = run(s, { type: 'respond', option: 'go-skogsbrynet' });
    expect(s.journey.region).toBe('skogsbrynet');
    // Now the hunter: past him, the run ends in the forest.
    const fin = s.journey.nodes.find((n) => n.encounter === 'hunt')!;
    s.journey.at = s.journey.nodes.find((n) => n.next.includes(fin.id))!.id;
    s = run(s, { type: 'travel', to: fin.id });
    expect(s.encounterId).toBe('hunt');
    for (const a of s.animals) if (a.status === 'active') a.status = 'safe';
    s = run(s, { type: 'endTurn' });
    expect(s.phase).toBe('over');
    expect(s.outcome?.forest).toBe(true);
    expect(s.log.some((e) => 'text' in e && e.text === 'Vi går in i skogen.')).toBe(true);
  });
});

describe('Skogens doft', () => {
  it('everyone says what they hope for (+1 belief), and the eldest reminds us who we were (+1 hope)', () => {
    let s = go(before('doften'));
    s.hope = 5;
    const b = get(s, 'toad').belief;
    s = say(s, 'speak');
    expect(get(s, 'toad').belief).toBe(b + 1);
    expect(s.hope).toBe(6);
  });
});

describe('Den sista bärbusken', () => {
  it('food and rest – and the night falls', () => {
    const s0 = before('barbusken');
    get(s0, 'fox').injuries = ['bleeding'];
    s0.hope = 5;
    const clock = s0.clock;
    const s = say(go(s0), 'eat');
    expect(s.hope).toBe(7);
    expect(get(s, 'fox').injuries).toEqual([]);
    expect(s.clock).not.toBe(clock);
  });
});
