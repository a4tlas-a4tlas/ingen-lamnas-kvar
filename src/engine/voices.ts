// When the way forks, one or two of us speak up for a path. Going their way
// strengthens their belief; going against them weakens it.
import { pathsFrom, place } from '../data/journey';
import { BODY_LEANINGS, BODY_REGION_LEANINGS, LEANINGS, REGION_LEANINGS } from '../data/voices.sv';
import { hasInjury, huntsAt, isPresent, verseStatus } from './rules';
import type { Animal, EncounterId, GameState, RegionId } from './types';

export interface Voice {
  who: string;
  /** The place this animal wants us to go. */
  to: string;
  line: string;
  /** How much it matters: the body speaks louder than nature. */
  weight: number;
}

type Wish<K> = { what: K; pull: 1 | -1; line: string; weight: number };
const hungry = (s: GameState, a: Animal) => a.predator && a.belief <= huntsAt(s, a) + 2;

/** An animal's strongest wish among the ways on, if any: the first that names one of them. */
function wish<K>(a: Animal, wishes: Wish<K>[], options: { to: string; what: K }[]): Voice | null {
  for (const l of wishes) {
    const there = options.find((o) => o.what === l.what);
    if (!there) continue;
    // Not there: then the one other way, if there is exactly one.
    const to = l.pull > 0 ? there.to : options.length === 2 ? options.find((o) => o !== there)!.to : null;
    if (to) return { who: a.id, to, line: l.line, weight: l.weight };
  }
  return null;
}

/** Up to two voices – for different ways if anyone disagrees. */
function strongest(voices: (Voice | null)[]): Voice[] {
  const wishes = voices.filter((v): v is Voice => v !== null).sort((a, b) => b.weight - a.weight);
  if (!wishes.length) return [];
  const first = wishes[0];
  const second = wishes.find((v) => v.to !== first.to) ?? wishes[1];
  return second ? [first, second] : [first];
}

/** What draws one of us toward a danger, or away: the body first, then its nature. */
function dangerWishes(s: GameState, a: Animal): Wish<EncounterId>[] {
  const all: Wish<EncounterId>[] = [];
  if (hasInjury(a, 'halt')) all.push({ what: BODY_LEANINGS.halt.encounter, ...BODY_LEANINGS.halt, weight: 2 });
  if (hasInjury(a, 'bleeding')) all.push({ what: BODY_LEANINGS.bleeding.encounter, ...BODY_LEANINGS.bleeding, weight: 2 });
  if (hungry(s, a)) all.push({ what: BODY_LEANINGS.hungry.encounter, ...BODY_LEANINGS.hungry, weight: 2 });
  for (const [encounter, l] of Object.entries(LEANINGS[a.species] ?? {})) all.push({ what: encounter as EncounterId, ...l!, weight: 1 });
  return all;
}

/** At a fork, up to two voices. Nothing is said where the way doesn't fork. */
export function forkVoices(s: GameState): Voice[] {
  if (s.phase !== 'map') return [];
  const options = pathsFrom(s, s.journey.at)
    .map((p) => place(s, p.to))
    .filter((p) => p.kind === 'encounter')
    .map((p) => ({ to: p.id, what: p.encounter! }));
  if (options.length < 2) return [];
  return strongest(s.animals.filter(isPresent).map((a) => wish(a, dangerWishes(s, a), options)));
}

/** What draws one of us toward a landscape, or away: grief for the glen and hunger first, then its nature. */
function regionWishes(s: GameState, a: Animal): Wish<RegionId>[] {
  const all: Wish<RegionId>[] = [];
  const { grieving, hungry: fed } = BODY_REGION_LEANINGS;
  if (a.grief.includes('dalen')) all.push({ what: grieving.region, ...grieving, weight: 2 });
  if (hungry(s, a)) all.push({ what: fed.region, ...fed, weight: 2 });
  for (const [region, l] of Object.entries(REGION_LEANINGS[a.species] ?? {})) all.push({ what: region as RegionId, ...l!, weight: 1 });
  return all;
}

/** Between two landscapes, when there are two ways on: up to two of us speak for one of them. */
export function regionVoices(s: GameState): Voice[] {
  if (s.run.offered.length < 2) return [];
  const options = s.run.offered.map((r) => ({ to: r, what: r }));
  return strongest(s.animals.filter(isPresent).map((a) => wish(a, regionWishes(s, a), options)));
}

/** How much a voice's belief moves: the elder's counts double while we listen to the eldest. */
export function voiceStake(s: GameState, a: Animal): number {
  return a.elder && verseStatus(s, 'denAldste') === 'intact' ? 2 : 1;
}
