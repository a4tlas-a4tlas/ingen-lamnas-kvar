// An animal's own will: at five belief and above it follows us. Below five it has
// a will of its own – hesitating, mostly. Below three it is worse: fleeing back,
// bolting into the open. Traits move the lines; shock and grief weigh like lost belief.
import { hasInjury, mood } from './rules';
import type { Animal, GameState } from './types';

/** Below this belief, an animal follows its own will. Brave ones hold out longer; shy ones less long in the light. Trust carries us all; despair weighs on us all. */
export function ownWillBelow(s: GameState, a: Animal): number {
  let line = 5 + ({ fortvivlan: 1, oro: 0, tillit: -1 } as const)[mood(s)];
  if (a.traits.includes('modig') || a.traits.includes('hardad')) line -= 1;
  if (a.traits.includes('skygg') && s.time === 'day') line += 1;
  if (a.traits.includes('sorjande')) line += 1;
  return line;
}

/** Below this belief, the own will turns dark. */
export const DARK_WILL_BELOW = 3;

/** Belief as it is felt: shock and grief weigh like a point less each. */
export const beliefFelt = (a: Animal) => a.belief - (hasInjury(a, 'shock') ? 1 : 0) - (a.grief.length ? 1 : 0);

export function willOf(s: GameState, a: Animal): 'follow' | 'own' | 'dark' {
  const b = beliefFelt(a);
  if (b >= ownWillBelow(s, a)) return 'follow';
  return b < DARK_WILL_BELOW ? 'dark' : 'own';
}
