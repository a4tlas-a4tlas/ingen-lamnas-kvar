// The feint: a boss shows two places for its blow, and only one is real. We learn which
// from a card that sees far – wings, keen eyes – or, below the ridge, from the tracks.
import type { GameState, ZoneId } from '../types';

/** Do we know, this hour, which of the two places is real? */
export function feintKnown(s: GameState): boolean {
  if (!(s.feint[s.turn - 1] ?? []).length) return true;
  if (s.darkRevealed) return true;
  return s.encounterId === 'machines' && s.knowledge.includes('machines');
}

/** The false places this hour, as far as we can tell: none once we know. */
export const feintNow = (s: GameState): ZoneId[] => (feintKnown(s) ? [] : s.feint[s.turn - 1] ?? []);

/** Where the blow may fall this hour, as far as we can tell: the real place, and the false one until we know – sorted, so the order tells nothing. */
export const maybeZones = (s: GameState, real: ZoneId[]): ZoneId[] => [...new Set([...real, ...feintNow(s)])].sort();

/** Is next hour's blow still half-hidden? Then we can't see it ahead either. */
export const feintNext = (s: GameState): boolean => (s.feint[s.turn] ?? []).length > 0;

/** The places named, real and false together, in the map's own order – so the order tells nothing. */
export function eitherOf(s: GameState, real: ZoneId[], zones: ZoneId[]): ZoneId[] {
  const all = new Set([...real, ...feintNow(s)]);
  return zones.filter((z) => all.has(z));
}
