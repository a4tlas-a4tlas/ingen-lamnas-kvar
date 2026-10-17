// Read-only rule helpers shared by the engine (validation) and the UI (targeting).
import { CARDS, type TargetSpec } from '../data/cards';
import type { Animal, Card, GameState, VerseId, ZoneId } from './types';

export const ROAD_LANES: ZoneId[] = ['lane1', 'lane2'];
export const ON_ROAD: ZoneId[] = ['lane1', 'median', 'lane2'];

export function animal(s: GameState, id: string): Animal {
  const a = s.animals.find((x) => x.id === id);
  if (!a) throw new Error(`Okänt djur: ${id}`);
  return a;
}

export const isActive = (a: Animal) => a.status === 'active';
export const isPresent = (a: Animal) => a.status === 'active' || a.status === 'safe';
export const isFrozen = (a: Animal) => a.intent.kind === 'freeze';

export function bondKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function bond(s: GameState, a: string, b: string): number {
  return s.bonds[bondKey(a, b)] ?? 0;
}

export type VerseStatus = 'none' | 'intact' | 'flipped';

export function verseStatus(s: GameState, id: VerseId): VerseStatus {
  const v = s.verses.find((x) => x.base === id);
  if (!v) return 'none';
  return v.flipped ? 'flipped' : 'intact';
}

export function beliefFloor(s: GameState): number {
  return verseStatus(s, 'ingenLamnas') === 'intact' ? 1 : 0;
}

export function huntThreshold(s: GameState): number {
  const v = verseStatus(s, 'viJagarInte');
  return v === 'intact' ? 1 : v === 'flipped' ? 5 : 3;
}

export function handSize(s: GameState): number {
  return s.hope >= 4 ? 5 : s.hope >= 1 ? 4 : 3;
}

export function moonHidden(s: GameState): boolean {
  return s.moonPlan[s.turn - 1] ?? false;
}

/** Zones an animal can step to, both directions (used by leading). */
export function neighbors(s: GameState, a: Animal): ZoneId[] {
  switch (a.zone) {
    case 'dike': return s.culvertRevealed ? ['lane1', 'culvert'] : ['lane1'];
    case 'lane1': return ['dike', 'median'];
    case 'median': return ['lane1', 'lane2'];
    case 'lane2': return ['median', 'farDike'];
    case 'culvert': return a.culvertTime >= 1 ? ['dike', 'farDike'] : ['dike'];
    case 'farDike': return [];
  }
}

function forwardStep(s: GameState, zone: ZoneId, culvertTime: number, ignoreCulvertTime: boolean): ZoneId[] {
  switch (zone) {
    case 'dike': return s.culvertRevealed ? ['lane1', 'culvert'] : ['lane1'];
    case 'lane1': return ['median'];
    case 'median': return ['lane2'];
    case 'lane2': return ['farDike'];
    case 'culvert': return culvertTime >= 1 || ignoreCulvertTime ? ['farDike'] : [];
    case 'farDike': return [];
  }
}

/** Zones reachable moving forward up to `steps`. Entering the culvert ends the move. */
export function forwardReach(s: GameState, a: Animal, steps: number, ignoreCulvertTime = false): ZoneId[] {
  const out = new Set<ZoneId>();
  let frontier: { zone: ZoneId; time: number }[] = [{ zone: a.zone, time: a.culvertTime }];
  for (let i = 0; i < steps; i++) {
    const next: { zone: ZoneId; time: number }[] = [];
    for (const f of frontier) {
      for (const z of forwardStep(s, f.zone, f.time, ignoreCulvertTime && i === 0)) {
        out.add(z);
        if (z !== 'culvert' && z !== 'farDike') next.push({ zone: z, time: 0 });
      }
    }
    frontier = next;
  }
  return [...out];
}

/** Undirected distance between two zones (culvert counts once revealed). */
export function zoneDistance(s: GameState, from: ZoneId, to: ZoneId): number {
  const edges: Record<ZoneId, ZoneId[]> = {
    dike: s.culvertRevealed ? ['lane1', 'culvert'] : ['lane1'],
    lane1: ['dike', 'median'],
    median: ['lane1', 'lane2'],
    lane2: ['median', 'farDike'],
    farDike: s.culvertRevealed ? ['lane2', 'culvert'] : ['lane2'],
    culvert: ['dike', 'farDike'],
  };
  const seen = new Set<ZoneId>([from]);
  let frontier = [from];
  for (let d = 0; frontier.length; d++) {
    if (frontier.includes(to)) return d;
    const next: ZoneId[] = [];
    for (const z of frontier) for (const n of edges[z]) if (!seen.has(n)) { seen.add(n); next.push(n); }
    frontier = next;
  }
  return Infinity;
}

export function cardTarget(card: Card): TargetSpec {
  return CARDS[card.kind].target;
}

export function cardCost(s: GameState, card: Card): number {
  if (card.kind === 'bara') {
    const v = verseStatus(s, 'denStarke');
    return v === 'intact' ? 0 : v === 'flipped' ? 2 : 1;
  }
  return CARDS[card.kind].cost;
}

export function leadCost(a: Animal): number {
  return a.wounds >= 2 ? 2 : 1;
}

const canMove = (a: Animal) => isActive(a) && !isFrozen(a);

/** Animals a card may target (for animal / animalZone cards). */
export function cardAnimals(s: GameState, card: Card): string[] {
  const o = s.animals.find((x) => x.id === card.owner);
  if (!o) return [];
  const others = s.animals.filter((x) => x.id !== o.id && isActive(x));
  switch (card.kind) {
    case 'bara':
      if (!canMove(o)) return [];
      return others.filter((x) => x.zone === o.zone && !isFrozen(x)).map((x) => x.id);
    case 'hallaSigNara':
      if (!canMove(o)) return [];
      return others.filter((x) => neighbors(s, o).includes(x.zone)).map((x) => x.id);
    case 'trosta':
      if (!isPresent(o)) return [];
      return others.filter((x) => zoneDistance(s, o.zone, x.zone) <= 1).map((x) => x.id);
    case 'taEmot':
      if (!isActive(o)) return [];
      return others.filter((x) => x.zone === o.zone).map((x) => x.id);
    default:
      return [];
  }
}

/** Zones a card may move to (for zone / animalZone cards). */
export function cardZones(s: GameState, card: Card): ZoneId[] {
  const o = s.animals.find((x) => x.id === card.owner);
  if (!o || !canMove(o)) return [];
  switch (card.kind) {
    case 'snabbaTassar':
    case 'rusa':
      return forwardReach(s, o, 2);
    case 'vingar':
      return forwardReach(s, o, 1, true);
    case 'smaSteg':
    case 'gaForst':
    case 'bara':
      return forwardReach(s, o, 1);
    default:
      return [];
  }
}

export function canPlay(s: GameState, card: Card): boolean {
  if (s.phase !== 'play' || cardCost(s, card) > s.kraft) return false;
  const o = s.animals.find((x) => x.id === card.owner);
  switch (cardTarget(card)) {
    case 'zone': return cardZones(s, card).length > 0;
    case 'animal': return cardAnimals(s, card).length > 0;
    case 'animalZone': return cardAnimals(s, card).length > 0 && cardZones(s, card).length > 0;
    case 'none':
      if (card.kind === 'minne') return true;
      if (!o) return false;
      if (card.kind === 'lasaNatten' || card.kind === 'gamlaVagar') return isPresent(o);
      return isActive(o);
  }
}

export function leadTargets(s: GameState): string[] {
  return s.animals
    .filter((a) => canMove(a) && neighbors(s, a).length > 0 && leadCost(a) <= s.kraft)
    .map((a) => a.id);
}

/** Who can throw themselves in the way during the last moment. */
export function lastMomentShields(s: GameState): string[] {
  if (!s.pending) return [];
  const v = animal(s, s.pending.victim);
  return s.animals
    .filter((x) => x.id !== v.id && isActive(x) && !isFrozen(x) && zoneDistance(s, x.zone, v.zone) <= 1)
    .map((x) => x.id);
}
