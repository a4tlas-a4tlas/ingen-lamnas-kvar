import type { EncounterId, GameState, TimeOfDay, ZoneId } from '../types';
import { FARM } from './farm';
import { FENCE } from './fence';
import { HARVEST } from './harvest';
import { LAMPS } from './lamps';
import { CATS } from './cats';
import { STREET } from './street';
import { SEWER } from './sewer';
import { FIREWORKS } from './fireworks';
import { BOG } from './bog';
import { MACHINES } from './machines';
import { RAPTOR } from './raptor';
import { RIVER } from './river';
import { ROAD } from './road';
import { SPRAYER } from './sprayer';
import type { ByTime, EncounterDef, ZoneDef } from './types';

export const ENCOUNTERS: Record<EncounterId, EncounterDef> = { road: ROAD, farm: FARM, river: RIVER, machines: MACHINES, raptor: RAPTOR, sprayer: SPRAYER, fence: FENCE, harvest: HARVEST, lamps: LAMPS, cats: CATS, street: STREET, sewer: SEWER, fireworks: FIREWORKS, bog: BOG };

export function encounterOf(s: GameState): EncounterDef {
  return ENCOUNTERS[s.encounterId];
}

/** An encounter's text for the time of day we're in. */
export function byTime(s: GameState, t: ByTime): string {
  return t[s.time];
}

export const otherTime = (t: TimeOfDay): TimeOfDay => (t === 'day' ? 'night' : 'day');

export function zoneDef(s: GameState, id: ZoneId): ZoneDef {
  const z = encounterOf(s).zones.find((x) => x.id === id);
  if (!z) throw new Error(`Okänd zon: ${id}`);
  return z;
}

export type { ByTime, EncounterDef, ZoneDef };
