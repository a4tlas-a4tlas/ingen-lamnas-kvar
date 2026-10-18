import type { EncounterId, GameState, ZoneId } from '../types';
import { FARM } from './farm';
import { ROAD } from './road';
import type { EncounterDef, ZoneDef } from './types';

export const ENCOUNTERS: Record<EncounterId, EncounterDef> = { road: ROAD, farm: FARM };

export function encounterOf(s: GameState): EncounterDef {
  return ENCOUNTERS[s.encounterId];
}

export function zoneDef(s: GameState, id: ZoneId): ZoneDef {
  const z = encounterOf(s).zones.find((x) => x.id === id);
  if (!z) throw new Error(`Okänd zon: ${id}`);
  return z;
}

export type { EncounterDef, ZoneDef };
