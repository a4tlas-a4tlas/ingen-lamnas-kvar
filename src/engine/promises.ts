// Promises the animals ask of us: when one is asked, what holds it, and what breaks it.
import { PROMISES } from '../data/promises.sv';
import { place, placesAhead } from '../data/journey';
import { closestTo } from './campfire';
import { bond, hasInjury, isPresent } from './rules';
import type { GameState, PromiseRule, Proposal, TimeOfDay, Verse } from './types';

/** The danger that took someone, as a promise against it. */
const DEATH_RULE: Record<string, PromiseRule> = { bil: 'light', lastbil: 'light', 'mörk bil': 'light', bonde: 'light', forsen: 'current' };

const name = (s: GameState, id?: string) => s.animals.find((a) => a.id === id)?.name ?? '';

/** The words of a promise, with the names put in. */
export function promiseText(s: GameState, p: Proposal, flipped = false): string {
  const def = PROMISES[p.rule];
  return (flipped ? def.flipped : def.text).replace(/\{a\}/g, name(s, p.by)).replace(/\{b\}/g, name(s, p.with));
}

export const fill = (s: GameState, p: Proposal, text: string) => text.replace(/\{a\}/g, name(s, p.by)).replace(/\{b\}/g, name(s, p.with));

export const promises = (s: GameState) => s.verses.filter((v): v is Verse & { promise: Proposal } => v.kind === 'promise' && !!v.promise);
export const keptPromises = (s: GameState) => promises(s).filter((v) => !v.flipped);
const sworn = (s: GameState, rule: PromiseRule, by?: string, other?: string) =>
  promises(s).some((v) => v.promise.rule === rule && (!by || v.promise.by === by) && (!other || v.promise.with === other));

/** While an animal's own promise holds, it never doubts below 3. */
export const promiseFloor = (s: GameState, id: string) => keptPromises(s).some((v) => v.promise.by === id);

/** Which encounters still lie ahead of us. */
const encountersAhead = (s: GameState) =>
  placesAhead(s.journey.at, 3).map(place).filter((p) => p.kind === 'encounter' && !s.journey.visited.includes(p.id)).map((p) => p.encounter!);

/**
 * The promise asked of us at tonight's fire, if any: from a death first, then from
 * a bond grown close, then from fear. Only one a night, and never one we already swore.
 */
export function proposalAtFire(s: GameState): Proposal | null {
  const alive = s.animals.filter(isPresent);
  for (const dead of s.unmourned) {
    const rule = DEATH_RULE[s.animals.find((a) => a.id === dead)?.diedOf ?? ''] ?? 'noneAlone';
    const teller = closestTo(s, dead);
    if (teller && !sworn(s, rule)) return { by: teller.id, rule };
  }
  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      const [a, b] = [alive[i], alive[j]];
      if (bond(s, a.id, b.id) >= 3 && !sworn(s, 'together', a.id, b.id) && !sworn(s, 'together', b.id, a.id)) return { by: a.id, rule: 'together', with: b.id };
    }
  }
  const ahead = encountersAhead(s);
  for (const a of alive.filter((x) => hasInjury(x, 'shock') || x.belief <= 3)) {
    const rule: PromiseRule | null =
      a.id === 'frona' && ahead.includes('river') ? 'water' : a.id === 'sotfot' && ahead.includes('farm') ? 'farm' : ahead.length ? 'night' : null;
    if (rule && !sworn(s, rule)) return { by: a.id, rule };
  }
  return null;
}

/** The kept promises a step on the map would break. */
export function brokenByTravel(s: GameState, to: string, time: TimeOfDay): (Verse & { promise: Proposal })[] {
  const p = place(to);
  if (p.kind !== 'encounter') return [];
  return keptPromises(s).filter((v) =>
    (v.promise.rule === 'water' && p.encounter === 'river') ||
    (v.promise.rule === 'farm' && p.encounter === 'farm') ||
    (v.promise.rule === 'night' && time === 'day'));
}
