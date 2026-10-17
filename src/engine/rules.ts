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

/** Zones one step away, both directions. The culvert is only for small animals. */
export function neighbors(s: GameState, a: Animal): ZoneId[] {
  const culvert = s.culvertRevealed && a.size === 'small';
  switch (a.zone) {
    case 'dike': return culvert ? ['lane1', 'culvert'] : ['lane1'];
    case 'lane1': return ['dike', 'median'];
    case 'median': return ['lane1', 'lane2'];
    case 'lane2': return ['median', 'farDike'];
    case 'culvert': return a.culvertTime >= 1 ? ['dike', 'farDike'] : ['dike'];
    case 'farDike': return [];
  }
}

function forwardStep(s: GameState, a: Animal, zone: ZoneId, culvertTime: number): ZoneId[] {
  switch (zone) {
    case 'dike': return s.culvertRevealed && a.size === 'small' ? ['lane1', 'culvert'] : ['lane1'];
    case 'lane1': return ['median'];
    case 'median': return ['lane2'];
    case 'lane2': return ['farDike'];
    case 'culvert': return culvertTime >= 1 ? ['farDike'] : [];
    case 'farDike': return [];
  }
}

/** Zones reachable moving forward up to `steps`. Entering the culvert ends the move. */
export function forwardReach(s: GameState, a: Animal, steps: number): ZoneId[] {
  const out = new Set<ZoneId>();
  let frontier: { zone: ZoneId; time: number }[] = [{ zone: a.zone, time: a.culvertTime }];
  for (let i = 0; i < steps; i++) {
    const next: { zone: ZoneId; time: number }[] = [];
    for (const f of frontier) {
      for (const z of forwardStep(s, a, f.zone, f.time)) {
        out.add(z);
        if (z !== 'culvert' && z !== 'farDike') next.push({ zone: z, time: 0 });
      }
    }
    frontier = next;
  }
  return [...out];
}

/** Where leading can take an animal. Fliers cover two steps forward in one flight. */
export function leadZones(s: GameState, a: Animal): ZoneId[] {
  const zones = new Set(neighbors(s, a));
  if (a.flier) for (const z of forwardReach(s, a, 2)) if (z !== 'culvert') zones.add(z);
  return [...zones];
}

/** A car hit costs a swarm 2 (truck: 3) members instead of a wound. */
export const swarmLoss = (wounds: number) => (wounds === 1 ? 2 : 3);

export function isLethal(a: Animal, wounds: number): boolean {
  return a.count !== undefined ? a.count - swarmLoss(wounds) <= 0 : a.wounds + wounds >= 3;
}

/** Where an animal that flees on its own goes: one step back toward the ditch. */
export function backZone(z: ZoneId): ZoneId | null {
  switch (z) {
    case 'lane1': return 'dike';
    case 'median': return 'lane1';
    case 'lane2': return 'median';
    case 'culvert': return 'dike';
    default: return null;
  }
}

/** Where an animal that bolts on its own goes: one step forward, lights or not. */
export function boltZone(a: Animal): ZoneId | null {
  switch (a.zone) {
    case 'dike': return 'lane1';
    case 'lane1': return 'median';
    case 'median': return 'lane2';
    case 'lane2': return 'farDike';
    case 'culvert': return a.culvertTime >= 1 ? 'farDike' : null;
    default: return null;
  }
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

export const canMove = (a: Animal) => isActive(a) && !isFrozen(a);

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
      return others.filter((x) => neighbors(s, o).includes(x.zone) && x.zone !== 'culvert').map((x) => x.id);
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
    .filter((a) => canMove(a) && leadZones(s, a).length > 0 && leadCost(a) <= s.kraft)
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

/** Why an animal can't be led right now, in words for the player. Null if it can. */
export function leadBlockReason(s: GameState, a: Animal): string | null {
  if (a.status === 'safe') return `${a.name} är i säkerhet.`;
  if (a.status !== 'active') return `${a.name} är inte längre med oss.`;
  if (isFrozen(a)) return `${a.name} fryser och kan inte flyttas. Trösta för att bryta det.`;
  if (leadZones(s, a).length === 0) return a.zone === 'culvert' ? `${a.name} kryper genom trumman – ute om en timme.` : `${a.name} kan inte gå någonstans.`;
  if (leadCost(a) > s.kraft) return `Att leda ${a.name} kostar ◆${leadCost(a)}.`;
  return null;
}

/** Why a card can't be played right now, short. Null if it can. */
export function cardBlockReason(s: GameState, card: Card): string | null {
  if (s.phase !== 'play') return 'Inte nu.';
  if (cardCost(s, card) > s.kraft) return `Behöver ◆${cardCost(s, card)}.`;
  if (canPlay(s, card)) return null;
  const o = s.animals.find((x) => x.id === card.owner);
  if (!o) return 'Kan inte spelas.';
  const spec = cardTarget(card);
  const movesOwner = spec === 'zone' || spec === 'animalZone' || card.kind === 'hallaSigNara';
  if (o.status === 'safe' && movesOwner) return `${o.name} är redan över.`;
  if (o.status !== 'active' && o.status !== 'safe') return `${o.name} är borta.`;
  if (isFrozen(o) && movesOwner) return `${o.name} fryser.`;
  if (spec === 'zone') return o.zone === 'culvert' ? `${o.name} kryper i trumman.` : `${o.name} kan inte gå dit.`;
  if (card.kind === 'bara') return `Ingen att bära bredvid ${o.name}.`;
  if (card.kind === 'taEmot') return `Ingen bredvid ${o.name}.`;
  if (spec === 'animal') return `Ingen inom räckhåll för ${o.name}.`;
  return 'Kan inte spelas nu.';
}
