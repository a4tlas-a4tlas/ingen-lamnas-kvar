import type { EncounterId, ZoneId, TimeOfDay } from '../types';

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
  /** Someone trapped here, the first time we come: where, and the words for it. */
  rescue?: { who: string; zone: ZoneId; found: string; trapped: string; freed: string };
  maxTurn: number;
  zones: ZoneDef[];
  /** Paths toward the goal; walking them in reverse goes back. First listed is the main way. */
  edges: [ZoneId, ZoneId][];
}
