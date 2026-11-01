// The regions of the way, by name. The glen comes first; after it, we choose between
// those we have not yet walked.
import type { RegionId } from '../../engine/types';
import { AKRARNA } from './akrarna';
import { DALEN, type RegionDef } from './dalen';
import { STADEN } from './staden';
import { MOSSEN } from './mossen';
import { HOGLANDET } from './hoglandet';
import { SKOGSBRYNET } from './skogsbrynet';

export const REGIONS: Record<RegionId, RegionDef> = { dalen: DALEN, akrarna: AKRARNA, staden: STADEN, mossen: MOSSEN, hoglandet: HOGLANDET, skogsbrynet: SKOGSBRYNET };

/** The regions that may come after the glen, in any order. */
export const MIDDLE_REGIONS: RegionId[] = ['akrarna', 'staden', 'mossen', 'hoglandet'];

/** Where the way ends, once no middle region is left: the forest edge. */
export const FINAL_REGION: RegionId = 'skogsbrynet';

/** How many regions we are offered to choose between after each boss. */
export const OFFERED = 2;

export type { RegionDef };
