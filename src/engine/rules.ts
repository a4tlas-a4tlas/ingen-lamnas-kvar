// Read-only rule helpers shared by the engine (validation) and the UI (targeting).
import { isStuck, puller } from './encounters/bog';
import { blockedByDitch } from './encounters/peat';
import { SPECIES } from '../data/animals';
import { CARDS, type TargetSpec } from '../data/cards';
import { encounterOf, zoneDef } from './encounters';
import { GATE_PUSH } from './encounters/fence';
import type { Animal, Card, GameState, Hit, InjuryKind, VerseId, ZoneId } from './types';

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

/** The belief at or below which this predator forgets the oath and hunts. */
export function huntsAt(s: GameState, a: Animal): number {
  // The hungry give way to hunger sooner – but never in the first hour of a danger, before anyone can see it coming.
  return huntThreshold(s) + a.hunger + (a.traits.includes('hungrig') && s.turn > 1 ? 1 : 0);
}

const SIZE_RANK: Record<Animal['size'], number> = { small: 0, medium: 1, large: 2 };

/** Predators only hunt prey their own size or smaller. */
export function canPrey(pred: Animal, prey: Animal): boolean {
  return pred.predator && !prey.predator && SIZE_RANK[prey.size] <= SIZE_RANK[pred.size];
}

/** The group's mood, from its hope: despair, worry or trust. */
export type Mood = 'fortvivlan' | 'oro' | 'tillit';
export const mood = (s: GameState): Mood => moodAt(s.hope);
export const moodAt = (hope: number): Mood => (hope <= 2 ? 'fortvivlan' : hope >= 7 ? 'tillit' : 'oro');
/** What the mood adds to each hour's Kraft. */
export const moodKraft = (s: GameState) => ({ fortvivlan: -1, oro: 0, tillit: 1 })[mood(s)];
/** At the fire, belief this far from hope drifts one step toward it. */
export const DRIFT_FROM = 3;

export function handSize(s: GameState): number {
  return s.hope >= 4 ? 5 : s.hope >= 1 ? 4 : 3;
}

/** The moon matters where it shines on open asphalt: the road at night. */
function underMoon(s: GameState): boolean {
  return s.time === 'night' && s.encounterId === 'road';
}

export function moonHidden(s: GameState): boolean {
  return underMoon(s) && (s.moonPlan[s.turn - 1] ?? false);
}

export function moonVisible(s: GameState): boolean {
  return underMoon(s) && !(s.moonPlan[s.turn - 1] ?? false);
}

export const hasInjury = (a: Animal, k: InjuryKind) => a.injuries.includes(k);

/** Fliers fly unless a wing is broken. */
export const canFly = (a: Animal) => a.flier && !hasInjury(a, 'broken');

// ---------------------------------------------------------------- the zone graph

export function zoneOpen(s: GameState, z: ZoneId): boolean {
  return (!zoneDef(s, z).hidden || s.revealed.includes(z)) && !s.closed.includes(z);
}

/** Whether this animal can step into a zone at all (it must be found, and fit). */
export function canEnter(s: GameState, a: Animal, z: ZoneId): boolean {
  const d = zoneDef(s, z);
  return zoneOpen(s, z) && (!d.smallOnly || a.size === 'small') && !blockedByDitch(s, a, z);
}

const forwardOf = (s: GameState, z: ZoneId) => encounterOf(s).edges.filter(([f]) => f === z).map(([, t]) => t);
const backOf = (s: GameState, z: ZoneId) => encounterOf(s).edges.filter(([, t]) => t === z).map(([f]) => f);

/** A slow zone (the culvert) holds you for one full hour before you can go on. */
const heldBySlowZone = (s: GameState, z: ZoneId, slowTime: number) => !!zoneDef(s, z).slow && slowTime < 1;

/** A fence across the way: only fliers cross it – and the gate, once it stands open, or when a large one
 * pushes it, or two of us together. */
export function canCross(s: GameState, a: Animal, from: ZoneId, to: ZoneId): boolean {
  const f = encounterOf(s).fence;
  if (!f || !f.edges.some(([x, y]) => x === from && y === to)) return true;
  if (canFly(a)) return true;
  const [gf, gt] = f.gate;
  if (gf !== from || gt !== to) return false;
  const together = s.animals.filter((x) => isActive(x) && x.zone === gf && !x.flying).length >= 2;
  return s.fence.gateOpen || a.size === 'large' || together;
}

/** Pushing the closed gate open costs this much more than the step. */
export function gatePush(s: GameState, a: Animal, to: ZoneId): number {
  const f = encounterOf(s).fence;
  if (!f || s.fence.gateOpen || canFly(a)) return 0;
  return f.gate[0] === a.zone && f.gate[1] === to ? GATE_PUSH : 0;
}

/** Zones one step away, both directions. */
export function neighbors(s: GameState, a: Animal): ZoneId[] {
  if (zoneDef(s, a.zone).goal) return [];
  const fwd = heldBySlowZone(s, a.zone, a.slowTime) ? [] : forwardOf(s, a.zone).filter((z) => canCross(s, a, a.zone, z));
  return [...fwd, ...backOf(s, a.zone)].filter((z) => canEnter(s, a, z));
}

/** Zones reachable moving forward up to `steps`. Slow zones and the goal end the move. A limp allows 1.
 * `under` goes beneath a fence: the mole's tunnel. */
export function forwardReach(s: GameState, a: Animal, steps: number, under = false): ZoneId[] {
  const n = hasInjury(a, 'halt') ? Math.min(steps, 1) : steps;
  const out = new Set<ZoneId>();
  let frontier: { zone: ZoneId; time: number }[] = [{ zone: a.zone, time: a.slowTime }];
  for (let i = 0; i < n; i++) {
    const next: { zone: ZoneId; time: number }[] = [];
    for (const f of frontier) {
      if (heldBySlowZone(s, f.zone, f.time)) continue;
      for (const z of forwardOf(s, f.zone)) {
        if (!canEnter(s, a, z) || (!under && !canCross(s, a, f.zone, z))) continue;
        out.add(z);
        const d = zoneDef(s, z);
        if (!d.slow && !d.goal) next.push({ zone: z, time: 0 });
      }
    }
    frontier = next;
  }
  return [...out];
}

/** The fast – the hare, the fawn – run: two steps on the ground when led. */
export const isFast = (a: Animal) => !!SPECIES[a.species].fast;

/** Where leading can take an animal. Fliers cover two steps forward in one flight; the fast run two. */
export function leadZones(s: GameState, a: Animal): ZoneId[] {
  const zones = new Set(neighbors(s, a));
  if ((canFly(a) || isFast(a)) && !hasInjury(a, 'halt')) for (const z of forwardReach(s, a, 2)) if (!zoneDef(s, z).slow) zones.add(z);
  // The gate is only a way for one with the strength left to push it.
  return [...zones].filter((z) => !gatePush(s, a, z) || leadCost(a, s) + gatePush(s, a, z) <= s.kraft);
}

/** Where an animal that flees on its own goes: one step back along the main way. */
export function backZone(s: GameState, a: Animal): ZoneId | null {
  return backOf(s, a.zone).find((z) => canEnter(s, a, z) && !zoneDef(s, z).hidden) ?? backOf(s, a.zone).find((z) => canEnter(s, a, z)) ?? null;
}

/** Where an animal that bolts on its own goes: one step forward along the main way, danger or not. */
export function boltZone(s: GameState, a: Animal): ZoneId | null {
  if (zoneDef(s, a.zone).goal || heldBySlowZone(s, a.zone, a.slowTime)) return null;
  return forwardOf(s, a.zone).find((z) => canEnter(s, a, z) && canCross(s, a, a.zone, z) && !zoneDef(s, z).hidden) ?? null;
}

/** Steps between two zones, ignoring direction (hidden zones count once found). */
export function zoneDistance(s: GameState, from: ZoneId, to: ZoneId): number {
  const seen = new Set<ZoneId>([from]);
  let frontier = [from];
  for (let d = 0; frontier.length; d++) {
    if (frontier.includes(to)) return d;
    const next: ZoneId[] = [];
    for (const z of frontier) {
      for (const n of [...forwardOf(s, z), ...backOf(s, z)]) {
        if (!seen.has(n) && zoneOpen(s, n)) { seen.add(n); next.push(n); }
      }
    }
    frontier = next;
  }
  return Infinity;
}

// ---------------------------------------------------------------- hits

/** A swarm loses 1 member to an injuring hit and 3 to a killing one. */
export const swarmLoss = (hit: Pick<Hit, 'severity'>) => (hit.severity === 'kill' ? 3 : 1);

/** Killing hits kill (a swarm only once it's that small). Injuries never kill by themselves. */
export function isLethal(a: Animal, hit: Pick<Hit, 'severity'>): boolean {
  if (hit.severity !== 'kill') return a.count !== undefined && a.count - swarmLoss(hit) <= 0;
  return a.count === undefined || a.count - swarmLoss(hit) <= 0;
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

/** Leading a limping animal is slow, heavy work. */
export function leadCost(a: Animal, s?: GameState): number {
  // Stuck in the bog: a large one beside it pulls, and that costs one more.
  const base = (hasInjury(a, 'halt') ? 2 : 1) + (s && isStuck(s, a) ? 1 : 0);
  // The first step in a danger: free for the quick, dear for the clumsy.
  if (!a.steps) {
    if (a.traits.includes('snabbfotad')) return 0;
    if (a.traits.includes('klumpig')) return base + 1;
  }
  return base;
}

/** What a night's rest by the fire mends. Halt and broken never heal. */
export const HEALS_AT_FIRE: InjuryKind[] = ['bleeding', 'shock', 'poisoned'];

/** Poisoned, every skill feels too heavy to use: none of the animal's own cards can be played. */
export function poisonedCard(s: GameState, card: Card): boolean {
  const o = s.animals.find((x) => x.id === card.owner);
  return !!o && card.kind !== 'minne' && hasInjury(o, 'poisoned');
}

/** A broken wing or paw takes away how the animal moves: its moving skills can't be played. */
export function speciesCardBroken(s: GameState, card: Card): boolean {
  const o = s.animals.find((x) => x.id === card.owner);
  return !!o && hasInjury(o, 'broken') && (CARDS[card.kind].tag === 'move' || card.kind === 'vingar');
}

export const canMove = (a: Animal) => isActive(a) && !isFrozen(a) && !a.rooted;

/** Animals a card may target (for animal / animalZone cards). */
export function cardAnimals(s: GameState, card: Card): string[] {
  const o = s.animals.find((x) => x.id === card.owner);
  if (!o) return [];
  const others = s.animals.filter((x) => x.id !== o.id && isActive(x));
  switch (card.kind) {
    case 'bara':
      if (!canMove(o)) return [];
      return others.filter((x) => x.zone === o.zone && !isFrozen(x)).map((x) => x.id);
    case 'trosta':
      if (!isPresent(o)) return [];
      return others.filter((x) => zoneDistance(s, o.zone, x.zone) <= 1).map((x) => x.id);
    case 'taEmot':
    case 'tystVinge':
      if (!isActive(o)) return [];
      return others.filter((x) => x.zone === o.zone).map((x) => x.id);
    case 'talamod':
    case 'mjukJord':
      if (!isPresent(o)) return [];
      return others.filter((x) => zoneDistance(s, o.zone, x.zone) <= 1).map((x) => x.id);
    case 'baraLiten':
    case 'baraIhop':
      if (!canMove(o)) return [];
      return others.filter((x) => x.zone === o.zone && !isFrozen(x) && x.size === 'small' && x.count === undefined).map((x) => x.id);
    case 'tryggRygg':
      if (!isActive(o)) return [];
      return others.filter((x) => x.zone === o.zone && x.size === 'small' && !x.curled).map((x) => x.id);
    default:
      return [];
  }
}

/** Water underfoot: a swimmer goes further here. */
const inWater = (s: GameState, z: ZoneId) => !!zoneDef(s, z).water;

/** Zones a card may move to (for zone / animalZone cards). */
export function cardZones(s: GameState, card: Card): ZoneId[] {
  const o = s.animals.find((x) => x.id === card.owner);
  if (!o || !canMove(o)) return [];
  switch (card.kind) {
    case 'snabbaTassar':
    case 'flyga':
    case 'lockbete':
    case 'lockaBort':
    case 'baraLiten':
    case 'hoppa':
    case 'ledaFlocken':
      return forwardReach(s, o, 2);
    case 'sprang':
      return forwardReach(s, o, 3);
    case 'simma':
      return forwardReach(s, o, inWater(s, o.zone) ? 2 : 1);
    case 'smaSteg':
    case 'gaForst':
    case 'bara':
    case 'smyga':
    case 'ringla':
    case 'gravaGang':
      return forwardReach(s, o, 1, true);
    case 'krypaIn':
    case 'baraIhop':
    case 'tystGang':
    case 'fallaTrad':
      return forwardReach(s, o, 1);
    default:
      return [];
  }
}

/** Cards that hold the owner still for the hour: no use playing them twice. */
const STAY_PUT: Card['kind'][] = ['gravaNer', 'gommaSig', 'frysaStilla', 'underJord', 'vintersomn'];

export function canPlay(s: GameState, card: Card): boolean {
  if (s.phase !== 'play' || cardCost(s, card) > s.kraft || speciesCardBroken(s, card) || poisonedCard(s, card)) return false;
  const o = s.animals.find((x) => x.id === card.owner);
  switch (cardTarget(card)) {
    case 'zone': return cardZones(s, card).length > 0;
    case 'animal': return cardAnimals(s, card).length > 0;
    case 'animalZone': return cardAnimals(s, card).length > 0 && cardZones(s, card).length > 0;
    case 'none':
      if (card.kind === 'minne') return true;
      if (!o) return false;
      // Insight and comfort can be given from the far side too.
      if (CARDS[card.kind].tag === 'insight' || card.kind === 'gamlaVagar' || card.kind === 'ropINatten' || card.kind === 'gamlesRost') return isPresent(o);
      // Holding still is no use to one who already stands safe.
      if (STAY_PUT.includes(card.kind)) return isActive(o) && !o.rooted;
      // Trees grow on land: there is nothing to climb in the water, and nothing to climb in the air.
      if (card.kind === 'klattra') return isActive(o) && !o.rooted && !o.flying && !inWater(s, o.zone);
      if (card.kind === 'rullaIhop') return isActive(o) && !o.curled;
      return isActive(o);
  }
}

export function leadTargets(s: GameState): string[] {
  return s.animals
    .filter((a) => canMove(a) && (!isStuck(s, a) || !!puller(s, a)) && leadZones(s, a).length > 0 && leadCost(a, s) <= s.kraft)
    .map((a) => a.id);
}

// ---------------------------------------------------------------- the farm

/** The fox and the owl can show themselves to the dogs and draw them away. */
export function canLure(s: GameState, a: Animal): boolean {
  return s.encounterId === 'farm' && s.time === 'day' && s.dogsAwake && canMove(a) && (a.species === 'fox' || a.species === 'owl') && !hasInjury(a, 'broken');
}

/** Where a lure can be laid: up to two steps away, anywhere on the farm but the wall. */
export function lureZones(s: GameState, a: Animal): ZoneId[] {
  if (!canLure(s, a)) return [];
  return encounterOf(s).zones
    .filter((z) => !z.goal && z.id !== a.zone && canEnter(s, a, z.id) && zoneDistance(s, a.zone, z.id) <= 2)
    .map((z) => z.id);
}

// ---------------------------------------------------------------- the rescue

/** Trust a trapped newcomer needs before letting anyone close enough to free it. */
export const RESCUE_TRUST = 2;

/** Who can help the trapped one right now: reach out (within a step, not a predator) or, once trusted, free it (same zone). */
export function rescueHelpers(s: GameState): string[] {
  const r = s.rescue;
  if (!r || s.phase !== 'play' || s.kraft < 1) return [];
  return s.animals
    .filter((a) => canMove(a))
    .filter((a) => (r.trust >= r.need ? a.zone === r.zone : !a.predator && zoneDistance(s, a.zone, r.zone) <= 1))
    .map((a) => a.id);
}

/** Why an animal can't help the trapped one, in words. */
export function rescueBlockReason(s: GameState, a: Animal): string | null {
  const r = s.rescue;
  if (!r) return null;
  const name = r.name;
  if (s.kraft < 1) return 'Vi har ingen kraft kvar den här timmen.';
  if (!canMove(a)) return `${a.name} kan inte röra sig nu.`;
  if (r.trust >= r.need) return a.zone === r.zone ? null : `${a.name} måste stå bredvid ${name} för att befria.`;
  if (a.predator) return `${name} litar inte på ${a.name}. Ett rovdjur skrämmer bara.`;
  return zoneDistance(s, a.zone, r.zone) <= 1 ? null : `${a.name} är för långt borta för att nå fram.`;
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
  if (leadZones(s, a).length === 0) return zoneDef(s, a.zone).slow ? `${a.name} kryper genom ${zoneDef(s, a.zone).name} – ute om en timme.` : `${a.name} kan inte gå någonstans.`;
  if (isStuck(s, a) && !puller(s, a)) return `${a.name} sitter fast i mossan. Bara en stor bredvid kan dra loss ${a.name}.`;
  if (leadCost(a, s) > s.kraft) return `Att leda ${a.name} kostar ◆${leadCost(a, s)}.`;
  return null;
}

/** Why a card can't be played right now, short. Null if it can. */
export function cardBlockReason(s: GameState, card: Card): string | null {
  if (s.phase !== 'play') return 'Inte nu.';
  if (cardCost(s, card) > s.kraft) return `Behöver ◆${cardCost(s, card)}.`;
  if (canPlay(s, card)) return null;
  const o = s.animals.find((x) => x.id === card.owner);
  if (!o) return 'Kan inte spelas.';
  if (poisonedCard(s, card)) return `${o.name} är förgiftad. Allt är för tungt.`;
  if (speciesCardBroken(s, card)) return o.flier ? `${o.name}s vinge är bruten.` : `${o.name}s tass är bruten.`;
  const spec = cardTarget(card);
  const movesOwner = spec === 'zone' || spec === 'animalZone';
  if (o.status === 'safe' && movesOwner) return `${o.name} är redan över.`;
  if (o.status !== 'active' && o.status !== 'safe') return `${o.name} är borta.`;
  if (isFrozen(o) && movesOwner) return `${o.name} fryser.`;
  if (spec === 'zone') return zoneDef(s, o.zone).slow ? `${o.name} kryper i ${zoneDef(s, o.zone).name}.` : `${o.name} kan inte gå dit.`;
  if (card.kind === 'bara') return `Ingen att bära bredvid ${o.name}.`;
  if (card.kind === 'taEmot') return `Ingen bredvid ${o.name}.`;
  if (spec === 'animal') return `Ingen inom räckhåll för ${o.name}.`;
  return 'Kan inte spelas nu.';
}
