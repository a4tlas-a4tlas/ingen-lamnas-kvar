import type { EncounterId, ZoneId } from '../types';

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
}

export interface EncounterDef {
  id: EncounterId;
  title: string;
  /** "Fem av oss {crossed}." */
  crossed: string;
  night: boolean;
  maxTurn: number;
  zones: ZoneDef[];
  /** Paths toward the goal; walking them in reverse goes back. First listed is the main way. */
  edges: [ZoneId, ZoneId][];
}
