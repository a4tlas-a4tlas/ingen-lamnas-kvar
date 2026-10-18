// The way, as Kvarn remembers it: a region's map of places in rows, drawn anew
// for every run (see engine/regions.ts). Here: reading it.
import type { GameState, MapNode } from '../engine/types';

export type { PlaceKind } from '../engine/types';
export type Place = MapNode;

export interface Path {
  from: string;
  to: string;
  /** Shown when choosing between several paths. */
  note?: string;
}

/** The forest we're walking toward: always on the map, always in fog. */
export const FOREST = { name: 'Skogen', x: 50, y: 4 };

export function place(s: GameState, id: string): Place {
  const p = s.journey.nodes.find((x) => x.id === id);
  if (!p) throw new Error(`Okänd plats: ${id}`);
  return p;
}

export function pathsFrom(s: GameState, id: string): Path[] {
  const from = s.journey.nodes.find((x) => x.id === id);
  return (from?.next ?? []).map((to) => ({ from: id, to, note: place(s, to).note }));
}

/** Every place within `depth` paths ahead of here: how far the owl flies in a night. */
export function placesAhead(s: GameState, from: string, depth: number): string[] {
  const out: string[] = [];
  let frontier = [from];
  for (let d = 0; d < depth; d++) {
    frontier = frontier.flatMap((id) => pathsFrom(s, id).map((p) => p.to)).filter((id) => !out.includes(id));
    out.push(...new Set(frontier));
  }
  return out;
}
