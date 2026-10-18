// Read-only campfire rules, shared by the engine (resolution) and the UI (planning).
import { TRAITS } from '../data/traits';
import { bond, canFly, canPrey, huntsAt, isPresent } from './rules';
import { place, placesAhead } from '../data/journey';
import type { Animal, GameState, MourningChoice, TraitId } from './types';

/** Two pairs of places by the embers. Whoever has none sits alone in the dark. */
export const EMBER_PAIRS = 2;

export interface FirePlan {
  watch?: string;
  /** A flier who flies ahead in the dark to see what Kvarn only remembers. */
  scout?: string;
  pairs: [string, string][];
  mourning: Record<string, MourningChoice>;
}

export const living = (s: GameState) => s.animals.filter(isPresent);

/** The living animal who was closest to the dead, and so tells the memory. */
export function closestTo(s: GameState, deadId: string): Animal | undefined {
  return [...living(s)].sort((a, b) => bond(s, b.id, deadId) - bond(s, a.id, deadId) || b.belief - a.belief)[0];
}

/** The trait the teller takes over from the dead: the first one the teller doesn't already have. */
export function inheritedTrait(s: GameState, deadId: string, teller: Animal): TraitId | undefined {
  const dead = s.animals.find((a) => a.id === deadId);
  return dead?.traits.find((t) => !teller.traits.includes(t));
}

export function inheritanceLine(s: GameState, deadId: string): string | null {
  const teller = closestTo(s, deadId);
  const dead = s.animals.find((a) => a.id === deadId);
  if (!teller || !dead) return null;
  const t = inheritedTrait(s, deadId, teller);
  return t ? `${teller.name} berättar om ${dead.name}, och bär sedan ${dead.name}s ${TRAITS[t].noun}.` : `${teller.name} berättar om ${dead.name}.`;
}

/** A hungry predator keeping watch over sleeping prey is a test of trust. */
export function hungryWatcher(s: GameState, a: Animal): boolean {
  return a.predator && a.belief <= huntsAt(s, a) + 1 && living(s).some((p) => p.id !== a.id && canPrey(a, p));
}

export function sitsAlone(s: GameState, plan: FirePlan): Animal[] {
  const seated = new Set(plan.pairs.flat());
  return living(s).filter((a) => a.id !== plan.watch && a.id !== plan.scout && !seated.has(a.id) && !s.fireDebt.apart.includes(a.id));
}

/** A sensible starting plan: a calm, trusted watcher and the closest pairs by the embers. */
/** Animals the meeting has already placed tonight: apart, telling, or in the dark. */
export const lockedAtFire = (s: GameState) => [...s.fireDebt.apart, ...s.fireDebt.dark];

/** Places by the embers tonight, after what the meeting cost. */
export const emberPairs = (s: GameState) => Math.max(0, EMBER_PAIRS - s.fireDebt.embers);

export function defaultPlan(s: GameState): FirePlan {
  const locked = lockedAtFire(s);
  const alive = living(s).filter((a) => !locked.includes(a.id));
  // Someone calm who doesn't need the rest: not hungry, not bleeding or in shock.
  const needsRest = (a: Animal) => a.injuries.some((k) => k === 'bleeding' || k === 'shock');
  const watcher =
    [...alive]
      .filter((a) => !a.predator)
      .sort((a, b) => Number(needsRest(a)) - Number(needsRest(b)) || Number(b.elder) - Number(a.elder) || b.belief - a.belief)[0] ?? alive[0];
  const rest = alive.filter((a) => a !== watcher);
  const pairs: [string, string][] = [];
  const used = new Set<string>();
  const candidates: [Animal, Animal][] = [];
  for (let i = 0; i < rest.length; i++) for (let j = i + 1; j < rest.length; j++) candidates.push([rest[i], rest[j]]);
  candidates.sort((x, y) => bond(s, y[0].id, y[1].id) - bond(s, x[0].id, x[1].id));
  for (const [a, b] of candidates) {
    if (pairs.length >= emberPairs(s)) break;
    if (used.has(a.id) || used.has(b.id)) continue;
    pairs.push([a.id, b.id]);
    used.add(a.id).add(b.id);
  }
  const mourning: Record<string, MourningChoice> = {};
  for (const d of s.unmourned) mourning[d] = 'bury';
  return { watch: living(s).length >= 2 ? watcher?.id : undefined, pairs, mourning };
}

/** Places ahead that are still only Kvarn's memory. */
export function unseenAhead(s: GameState): string[] {
  return placesAhead(s.journey.at, 2).filter((id) => place(id).memory && !s.journey.scouted.includes(id) && !s.journey.visited.includes(id));
}

/** The crow comes when there is still something ahead it could tell us. */
export const crowOffers = (s: GameState) => s.phase === 'campfire' && unseenAhead(s).length > 0;

/** Cards the crow will take: anything but a memory of the dead. */
export function crowCards(s: GameState) {
  return [...s.draw, ...s.hand, ...s.discard].filter((c) => c.kind !== 'minne');
}

/** What's wrong with a plan, in words, or null if it can be carried out. */
export function planProblem(s: GameState, plan: FirePlan): string | null {
  const ids = new Set(living(s).map((a) => a.id));
  if (ids.size >= 2 && (!plan.watch || !ids.has(plan.watch))) return 'Någon måste hålla vakt.';
  if (plan.pairs.length > EMBER_PAIRS) return `Glöden räcker bara till ${EMBER_PAIRS} par.`;
  const seated = plan.pairs.flat();
  if (seated.some((id) => !ids.has(id) || id === plan.watch)) return 'Den som vakar kan inte sitta vid glöden.';
  if (new Set(seated).size !== seated.length) return 'Ingen kan sitta på två platser.';
  if (s.meeting) return 'Kråkan väntar på svar.';
  if (plan.pairs.length > emberPairs(s)) return emberPairs(s) === 1 ? 'Kråkan har tagit en plats vid glöden – bara ett par får plats.' : 'Ingen plats vid glöden i natt.';
  const locked = lockedAtFire(s);
  const misplaced = [plan.watch, plan.scout, ...plan.pairs.flat()].find((id) => id && locked.includes(id));
  if (misplaced) return `${living(s).find((a) => a.id === misplaced)?.name ?? 'Någon'} har redan sin plats i natt.`;
  if (plan.scout !== undefined) {
    const sc = living(s).find((a) => a.id === plan.scout);
    if (!sc || !canFly(sc)) return 'Bara den som kan flyga kan spana.';
    if (sc.id === plan.watch || seated.includes(sc.id)) return 'Den som spanar kan inte också vaka eller sitta vid glöden.';
  }
  for (const d of s.unmourned) if (plan.mourning[d] !== 'bury' && plan.mourning[d] !== 'carry') return 'Välj hur vi minns de döda.';
  return null;
}
