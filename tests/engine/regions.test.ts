import { describe, expect, it } from 'vitest';
import { DALEN } from '../../src/data/regions/dalen';
import { REGIONS } from '../../src/data/regions';
import { generateRegion } from '../../src/engine/regions';
import { createGame } from '../../src/engine/setup';
import { step } from '../../src/engine/step';
import type { MapNode } from '../../src/engine/types';
import { run } from './helpers';

/** Every way from the glen to the end, as lists of places. */
function ways(nodes: MapNode[]): MapNode[][] {
  const by = new Map(nodes.map((n) => [n.id, n]));
  const out: MapNode[][] = [];
  const walk = (n: MapNode, acc: MapNode[]) => {
    const here = [...acc, n];
    if (!n.next.length) return void out.push(here);
    for (const id of n.next) walk(by.get(id)!, here);
  };
  walk(nodes[0], []);
  return out;
}

const SEEDS = Array.from({ length: 300 }, (_, i) => i * 7919 + 1);

describe('the region map of Dalen', () => {
  it('is the same for the same seed, and differs between seeds', () => {
    expect(generateRegion(DALEN, 42)).toEqual(generateRegion(DALEN, 42));
    const shapes = new Set(SEEDS.slice(0, 40).map((s) => generateRegion(DALEN, s).nodes.map((n) => n.id).join()));
    expect(shapes.size).toBeGreaterThan(10);
  });

  it('has six rows and the boss: the road first, the last fire before the machines', () => {
    for (const seed of SEEDS) {
      const { nodes } = generateRegion(DALEN, seed);
      const rows = Math.max(...nodes.map((n) => n.row));
      expect(rows).toBe(7);
      expect(nodes.filter((n) => n.row === 1).map((n) => n.id)).toEqual(['vagen']);
      expect(nodes.filter((n) => n.row === 6).map((n) => n.id)).toEqual(['granbacken']);
      expect(nodes.find((n) => n.row === 7)).toMatchObject({ kind: 'encounter', encounter: 'machines', next: [] });
      for (let r = 2; r <= 5; r++) expect(nodes.filter((n) => n.row === r).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('keeps its rules on every way through', () => {
    for (const seed of SEEDS) {
      const { nodes } = generateRegion(DALEN, seed);
      for (const way of ways(nodes)) {
        const kinds = way.map((n) => n.kind);
        expect(kinds.filter((k) => k === 'encounter').length).toBeGreaterThanOrEqual(2);
        expect(kinds.filter((k) => k === 'meeting' || k === 'find').length).toBeGreaterThanOrEqual(1);
        expect(kinds.filter((k) => k === 'campfire').length).toBeLessThanOrEqual(2); // one along the way at most, and the last
        expect(kinds.some((k, i) => k === 'find' && kinds[i + 1] === 'find')).toBe(false);
        // The same place never twice in a row (a road after the first road is the country road).
        expect(way.some((n, i) => i > 0 && n.encounter && n.id.split('-')[0] === way[i - 1].id.split('-')[0])).toBe(false);
      }
    }
  });

  it('leaves no place out: every place can be reached, and paths go only to the next row', () => {
    for (const seed of SEEDS) {
      const { nodes } = generateRegion(DALEN, seed);
      const by = new Map(nodes.map((n) => [n.id, n]));
      for (const n of nodes) {
        if (n.row > 0) expect(nodes.some((m) => m.next.includes(n.id))).toBe(true);
        for (const id of n.next) expect(by.get(id)!.row).toBe(n.row + 1);
      }
    }
  });

  it('remembers what Kvarn believes only for places that have a memory', () => {
    const { nodes, truth, guess } = generateRegion(DALEN, 5);
    const remembered = nodes.filter((n) => n.memory).map((n) => n.id).sort();
    expect(Object.keys(truth).sort()).toEqual(remembered);
    expect(Object.keys(guess).sort()).toEqual(remembered);
  });
});

describe('walking the map', () => {
  it('goes only to a place a path leads to', () => {
    let s = run(createGame(11), { type: 'swear', verses: ['manen'] });
    const far = s.journey.nodes.find((n) => n.row === 3)!;
    const r = step(s, { type: 'travel', to: far.id });
    expect(r.events[0].kind).toBe('error');
    s = run(s, { type: 'travel', to: 'vagen' });
    expect(s.phase).toBe('play');
  });

  it('a meeting or a find opens its story when we arrive', () => {
    const seed = SEEDS.find((x) => generateRegion(DALEN, x).nodes.some((n) => n.row === 2 && (n.kind === 'meeting' || n.kind === 'find')))!;
    let s = run(createGame(seed), { type: 'swear', verses: ['manen'] });
    const story = s.journey.nodes.find((n) => n.row === 2 && (n.kind === 'meeting' || n.kind === 'find'))!;
    // Skip the road: stand on it, as if we had crossed.
    s.journey.at = 'vagen';
    s.journey.visited.push('vagen');
    s.phase = 'map';
    s = run(s, { type: 'travel', to: story.id });
    expect(s.meeting).toMatchObject({ id: story.meeting, frame: 'start' });
    expect(s.phase).toBe('map');
    // Nothing else until we answer, and the first answer of each leads on.
    expect(step(s, { type: 'travel', to: story.next[0] }).events[0].kind).toBe('error');
  });
});

describe('the forks', () => {
  it('never offer the same danger twice', () => {
    for (const seed of SEEDS) {
      const { nodes } = generateRegion(DALEN, seed);
      const by = new Map(nodes.map((n) => [n.id, n]));
      for (const n of nodes) {
        const dangers = n.next.map((id) => by.get(id)!).filter((m) => m.encounter).map((m) => m.id.split('-')[0]);
        expect(new Set(dangers).size, `${seed} ${n.id}`).toBe(dangers.length);
      }
    }
  });
});

describe('every region', () => {
  for (const def of Object.values(REGIONS)) {
    it(`${def.name}: its maps keep the rules, start at its edge and end at its last place`, () => {
      for (const seed of SEEDS.slice(0, 150)) {
        const { nodes } = generateRegion(def, seed);
        expect(nodes[0].id).toBe(def.start.key);
        expect(nodes.find((n) => n.row === 7)!.id).toBe(def.end.key);
        for (const way of ways(nodes)) {
          const kinds = way.map((n) => n.kind);
          expect(kinds.filter((k) => k === 'encounter').length).toBeGreaterThanOrEqual(2);
          expect(kinds.filter((k) => k === 'meeting' || k === 'find').length).toBeGreaterThanOrEqual(1);
          expect(way.some((n, i) => i > 0 && n.encounter && n.id.split('-')[0] === way[i - 1].id.split('-')[0])).toBe(false);
        }
      }
    });
  }
});
