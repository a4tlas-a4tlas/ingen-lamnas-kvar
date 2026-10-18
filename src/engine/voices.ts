// When the way forks, one or two of us speak up for a path. Going their way
// strengthens their belief; going against them weakens it.
import { pathsFrom, place } from '../data/journey';
import { BODY_LEANINGS, LEANINGS } from '../data/voices.sv';
import { hasInjury, huntsAt, isPresent, verseStatus } from './rules';
import type { Animal, EncounterId, GameState } from './types';

export interface Voice {
  who: string;
  /** The place this animal wants us to go. */
  to: string;
  line: string;
  /** How much it matters: the body speaks louder than nature. */
  weight: number;
}

/** An animal's strongest wish for one of the onward places, if any. */
function wish(s: GameState, a: Animal, options: { to: string; encounter: EncounterId }[]): Voice | null {
  const all: { encounter: EncounterId; pull: 1 | -1; line: string; weight: number }[] = [];
  if (hasInjury(a, 'halt')) all.push({ ...BODY_LEANINGS.halt, weight: 2 });
  if (hasInjury(a, 'bleeding')) all.push({ ...BODY_LEANINGS.bleeding, weight: 2 });
  if (a.predator && a.belief <= huntsAt(s, a) + 2) all.push({ ...BODY_LEANINGS.hungry, weight: 2 });
  for (const [encounter, l] of Object.entries(LEANINGS[a.id] ?? {})) all.push({ encounter: encounter as EncounterId, ...l!, weight: 1 });
  for (const l of all) {
    const there = options.find((o) => o.encounter === l.encounter);
    if (!there) continue;
    // Not there: then the one other way, if there is exactly one.
    const to = l.pull > 0 ? there.to : options.length === 2 ? options.find((o) => o !== there)!.to : null;
    if (to) return { who: a.id, to, line: l.line, weight: l.weight };
  }
  return null;
}

/** At a fork, up to two voices – for different paths if anyone disagrees. Nothing is said where the way doesn't fork. */
export function forkVoices(s: GameState): Voice[] {
  if (s.phase !== 'map') return [];
  const options = pathsFrom(s.journey.at)
    .map((p) => place(p.to))
    .filter((p) => p.kind === 'encounter')
    .map((p) => ({ to: p.id, encounter: p.encounter! }));
  if (options.length < 2) return [];
  const wishes = s.animals
    .filter(isPresent)
    .map((a) => wish(s, a, options))
    .filter((v): v is Voice => v !== null)
    .sort((a, b) => b.weight - a.weight);
  if (!wishes.length) return [];
  const first = wishes[0];
  const second = wishes.find((v) => v.to !== first.to) ?? wishes[1];
  return second ? [first, second] : [first];
}

/** How much a voice's belief moves: the elder's counts double while we listen to the eldest. */
export function voiceStake(s: GameState, a: Animal): number {
  return a.elder && verseStatus(s, 'denAldste') === 'intact' ? 2 : 1;
}
