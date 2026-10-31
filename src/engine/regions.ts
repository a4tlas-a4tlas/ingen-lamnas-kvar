// A region's map, drawn anew for every run: rows of places with paths between
// neighbours, like the acts of a long walk. Seeded, so a run can be replayed.
import type { RegionDef, Template } from '../data/regions/dalen';
import { random, type RngHolder } from './rng';
import type { MapNode, Variant } from './types';

/** How the middle rows are mixed (my proposal): danger, meeting, find, and a rare fire. */
const WEIGHTS = { danger: 0.42, meeting: 0.33, find: 0.17, fire: 0.08 };
const MIDDLE = [2, 3, 4, 5];
/** The fire may lie along the way only in the middle of the region. */
const FIRE_ROWS = [3, 4];

type Kind = keyof typeof WEIGHTS;

const pickOf = <T>(h: RngHolder, xs: T[]) => xs[Math.floor(random(h) * xs.length)];

function rollKind(h: RngHolder, row: number): Kind {
  const kinds = (Object.keys(WEIGHTS) as Kind[]).filter((k) => k !== 'fire' || FIRE_ROWS.includes(row));
  const total = kinds.reduce((t, k) => t + WEIGHTS[k], 0);
  let r = random(h) * total;
  for (const k of kinds) if ((r -= WEIGHTS[k]) < 0) return k;
  return 'danger';
}

/** Every way from the first danger to the last fire, as lists of kinds. */
function paths(rows: Kind[][], edges: number[][][]): Kind[][] {
  const out: Kind[][] = [];
  const walk = (row: number, i: number, acc: Kind[]) => {
    const here = [...acc, rows[row][i]];
    if (row === rows.length - 1) return void out.push(here);
    for (const j of edges[row][i]) walk(row + 1, j, here);
  };
  walk(0, 0, []);
  return out;
}

/** The rules every way through must keep: two dangers at least, something else at least once, never two finds in a row, at most one fire. */
function fair(kinds: Kind[]): boolean {
  // A short last stretch – one row to choose in – may be anything along the way.
  if (kinds.length <= 3) return kinds.filter((k) => k === 'fire').length <= 1;
  const dangers = kinds.filter((k) => k === 'danger').length;
  const story = kinds.filter((k) => k === 'meeting' || k === 'find').length;
  const fires = kinds.filter((k) => k === 'fire').length;
  const finds = kinds.some((k, i) => k === 'find' && kinds[i + 1] === 'find');
  return dangers >= 2 && story >= 1 && fires <= 1 && !finds;
}

/** Paths to the nearest places in the next row, and sometimes to a neighbour as well. */
function connect(h: RngHolder, n: number, m: number): number[][] {
  const pos = (i: number, k: number) => (k === 1 ? 0.5 : i / (k - 1));
  const out: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    const order = Array.from({ length: m }, (_, j) => j).sort((a, b) => Math.abs(pos(a, m) - pos(i, n)) - Math.abs(pos(b, m) - pos(i, n)));
    out[i].push(order[0]);
    if (order[1] !== undefined && Math.abs(pos(order[1], m) - pos(i, n)) <= 0.5 && random(h) < 0.5) out[i].push(order[1]);
  }
  // Every place in the next row can be reached.
  for (let j = 0; j < m; j++) {
    if (out.some((t) => t.includes(j))) continue;
    const from = Array.from({ length: n }, (_, i) => i).sort((a, b) => Math.abs(pos(a, n) - pos(j, m)) - Math.abs(pos(b, n) - pos(j, m)))[0];
    out[from].push(j);
  }
  return out.map((t) => [...new Set(t)].sort((a, b) => a - b));
}

export interface RegionMap {
  nodes: MapNode[];
  truth: Record<string, Variant>;
  guess: Record<string, Variant>;
}

/**
 * Which place each kind becomes. The same place never comes twice in a row along a path,
 * places side by side differ where they can, and no fork offers the same danger twice;
 * null when that cannot be kept.
 */
function choosePlaces(h: RngHolder, def: RegionDef, rows: Kind[][], edges: number[][][], anyway = false): Template[][] | null {
  const out: Template[][] = [];
  for (let r = 0; r < rows.length; r++) {
    out[r] = [];
    for (let i = 0; i < rows[r].length; i++) {
      if (r === 0) out[r][i] = def.first;
      else if (r === rows.length - 1) out[r][i] = def.lastFire;
      else {
        const k = rows[r][i];
        const pool = k === 'danger' ? def.dangers : k === 'meeting' ? def.meetings : k === 'find' ? def.finds : [def.fire];
        const before = edges[r - 1].flatMap((ts, j) => (ts.includes(i) ? [out[r - 1][j].key] : []));
        const fresh = pool.filter((t) => !before.includes(t.key));
        // A story may come back (there are few of them yet); a danger may not.
        if (!fresh.length && k === 'danger' && !anyway) return null;
        const unlike = fresh.filter((t) => !out[r].some((o) => o.key === t.key));
        out[r][i] = pickOf(h, unlike.length ? unlike : fresh.length ? fresh : pool);
      }
    }
    // A fork between two of the same danger is no choice at all.
    if (r > 0 && !anyway)
      for (const targets of edges[r - 1]) {
        const dangers = targets.filter((j) => rows[r][j] === 'danger').map((j) => out[r][j].key);
        if (new Set(dangers).size < dangers.length) return null;
      }
  }
  return out;
}

/** Draw a region's map for this run. The later the region, the likelier a place is harder than it looks. */
export function generateRegion(def: RegionDef, seed: number, hardChance = 0.4): RegionMap {
  const h: RngHolder = { rng: (seed ^ 0x2545f491) | 0 };
  // Rows of kinds: the first danger, rows to choose between (four, or fewer for a short stretch), the last fire.
  const middle = MIDDLE.slice(0, def.middleRows ?? MIDDLE.length);
  let rows: Kind[][] = [];
  let edges: number[][][] = [];
  let places: Template[][] | null = null;
  for (let attempt = 0; attempt < 200; attempt++) {
    rows = [['danger'], ...middle.map((r) => Array.from({ length: random(h) < 0.5 ? 2 : 3 }, () => rollKind(h, r))), ['fire']];
    edges = rows.slice(0, -1).map((row, i) => connect(h, row.length, rows[i + 1].length));
    if (paths(rows, edges).every(fair) && (places = choosePlaces(h, def, rows, edges))) break;
  }
  places ??= choosePlaces(h, def, rows, edges, true)!;

  const nodes: MapNode[] = [];
  const at = (row: number, i: number, n: number, t: Template, id = t.key): MapNode => {
    const { key: _key, ...rest } = t;
    const x = n === 1 ? 50 : 18 + (i * 64) / (n - 1);
    return { ...rest, id, row, x, y: 92 - row * 11.5, next: [] };
  };
  const start = at(0, 0, 1, def.start);
  nodes.push(start);
  const byRow: MapNode[][] = [[start]];
  rows.forEach((kinds, r) => {
    const row = r + 1;
    const placed = kinds.map((_, i) => {
      const t = places[r][i];
      return row === 1 || row === rows.length ? at(row, i, kinds.length, t) : at(row, i, kinds.length, t, `${t.key}-${row}-${i}`);
    });
    nodes.push(...placed);
    byRow.push(placed);
  });
  const end = at(rows.length + 1, 0, 1, def.end);
  nodes.push(end);
  byRow.push([end]);

  start.next = [byRow[1][0].id];
  edges.forEach((rowEdges, r) => rowEdges.forEach((targets, i) => (byRow[r + 1][i].next = targets.map((j) => byRow[r + 2][j].id))));
  byRow[rows.length][0].next = [end.id];

  // What each place really is, and what Kvarn remembers of it.
  const truth: Record<string, Variant> = {};
  const guess: Record<string, Variant> = {};
  for (const n of nodes.filter((x) => x.memory)) {
    truth[n.id] = random(h) < hardChance ? 'hard' : 'normal';
    guess[n.id] = random(h) < 2 / 3 ? truth[n.id] : truth[n.id] === 'hard' ? 'normal' : 'hard';
  }
  return { nodes, truth, guess };
}
