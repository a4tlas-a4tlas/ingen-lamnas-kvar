// What the sound should be doing now: the region and the time of day, where in the run
// we are, the group's mood, and whether this is a boss. Pure, so it can be tested.
import { mood, type Mood } from '../engine/rules';
import type { GameState, RegionId } from '../engine/types';

export type ScenePhase = 'title' | 'oath' | 'map' | 'danger' | 'fire' | 'end';

export interface Scene {
  phase: ScenePhase;
  region: RegionId | null;
  night: boolean;
  mood: Mood;
  /** A region's last danger: the boss. */
  boss: boolean;
}

export const TITLE_SCENE: Scene = { phase: 'title', region: null, night: false, mood: 'oro', boss: false };

export function sceneOf(s: GameState | null): Scene {
  if (!s) return TITLE_SCENE;
  const inDanger = s.phase === 'play' || s.phase === 'lastMoment';
  const here = s.journey.nodes.find((n) => n.id === s.journey.at);
  const phase: ScenePhase = s.phase === 'oath' ? 'oath' : s.phase === 'over' ? 'end' : s.phase === 'campfire' ? 'fire' : inDanger ? 'danger' : 'map';
  return {
    phase,
    region: s.journey.region,
    night: (inDanger ? s.time : s.clock) === 'night',
    mood: mood(s),
    boss: inDanger && !!here && here.next.length === 0,
  };
}

/** Is it the same sound world? A change of any of these crossfades. */
export const sameScene = (a: Scene, b: Scene) =>
  a.phase === b.phase && a.region === b.region && a.night === b.night && a.mood === b.mood && a.boss === b.boss;
