// The regions of the way, by name. The glen comes first; after it, we choose between
// those we have not yet walked.
import type { RegionId } from '../../engine/types';
import { AKRARNA } from './akrarna';
import { DALEN, type RegionDef } from './dalen';

export const REGIONS: Record<RegionId, RegionDef> = { dalen: DALEN, akrarna: AKRARNA };

/** The regions that may come after the glen, in any order. */
export const MIDDLE_REGIONS: RegionId[] = ['akrarna'];

/** How many regions we are offered to choose between after each boss. */
export const OFFERED = 2;

export type { RegionDef };
