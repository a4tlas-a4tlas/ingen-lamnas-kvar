import type { EncounterId, Size, ZoneId, TimeOfDay } from '../types';

export interface ZoneDef {
  id: ZoneId;
  /** Shown on the board ("Körfält 1"). */
  label: string;
  /** Used in narration ("första körfältet"). */
  name: string;
  /** Layout in percent of the scene: x, y, width, height. */
  rect: [number, number, number, number];
  start?: boolean;
  goal?: boolean;
  /** Asphalt: walking onto it in moonlight breaks the moon verse. */
  road?: boolean;
  /** Out in the open: standing here alone breaks "Ingen går ensam". */
  exposed?: boolean;
  /** Not on the board until found (the culvert). */
  hidden?: boolean;
  /** Only small animals fit. */
  smallOnly?: boolean;
  /** One full hour inside before you can go on. */
  slow?: boolean;
  /** Bushes and grass: the farmer's flashlight doesn't find you here. */
  cover?: boolean;
  /** Water, grass and dung: we leave no scent for the dogs. */
  breaksScent?: boolean;
  /** In or on the river: the night's cold bites here. */
  water?: boolean;
  /** A stepping stone: spray can make it slippery. */
  stone?: boolean;
  /** Trees stand here: the felling machine wants them. */
  trees?: boolean;
  /** Cover only for these sizes: a furrow hides a mouse, not a fox. */
  coverFor?: Size[];
}

/** A text that differs by day and by night. */
export type ByTime = Record<TimeOfDay, string>;

export interface EncounterDef {
  id: EncounterId;
  title: ByTime;
  /** "Fem av oss {crossed}." */
  crossed: string;
  /** Narrated when time runs out. */
  timeUp: ByTime;
  /** "För X, {leftBehind}." on the memorial stone, for those still here when time runs out. */
  leftBehind: ByTime;
  /** Said in the last hour. */
  lastHour: ByTime;
  /**
   * Someone trapped here, of a kind not yet with us. {en} is "en hare", {Den} "Den", {name} its name.
   * `not` keeps kinds out that the place makes no sense for: a swimmer on a stone, a flier in the water.
   */
  rescue?: { zone: ZoneId; found: string; trapped: string; freed: string; not?: ('swimmer' | 'flier')[] };
  maxTurn: number;
  /** Always at this time of day: there is no waiting for the other. */
  fixedTime?: TimeOfDay;
  zones: ZoneDef[];
  /** Paths toward the goal; walking them in reverse goes back. First listed is the main way. */
  edges: [ZoneId, ZoneId][];
}
