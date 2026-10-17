/** Zones are defined per encounter (see encounters/); ids are plain strings. */
export type ZoneId = string;
export type LaneId = 'lane1' | 'lane2';
export type EncounterId = 'road' | 'farm';

/**
 * Lasting harm from an injuring hit. Halt and broken never heal; bleeding and
 * shock heal by the campfire.
 */
export type InjuryKind = 'halt' | 'broken' | 'bleeding' | 'shock';

/** Every danger is telegraphed as one or the other. */
export type Severity = 'injure' | 'kill';
export type Species = 'fox' | 'badger' | 'toad' | 'owl' | 'mice' | 'adder';
/** Only small animals fit through the culvert. */
export type Size = 'small' | 'medium' | 'large';
export type TraitId =
  | 'modig'
  | 'skygg'
  | 'omtanksam'
  | 'otalig'
  | 'klok'
  | 'envis'
  | 'lekfull'
  | 'trogen';
export type VerseId =
  | 'ingenLamnas'
  | 'viJagarInte'
  | 'denStarke'
  | 'denAldste'
  | 'manen'
  | 'ingenEnsam';
export type CardKind =
  | 'snabbaTassar'
  | 'bara'
  | 'gamlaVagar'
  | 'vingar'
  | 'smaSteg'
  | 'gaForst'
  | 'hallaSigNara'
  | 'trosta'
  | 'rusa'
  | 'lasaNatten'
  | 'bitaIhop'
  | 'skratt'
  | 'taEmot'
  | 'giftIReserv'
  | 'minne';

/** active = still on the road side, safe = reached the far ditch. */
export type Status = 'active' | 'safe' | 'dead' | 'left';

export type Intent =
  | { kind: 'follow' }
  | { kind: 'freeze' }
  | { kind: 'flee' }
  | { kind: 'bolt' }
  | { kind: 'leave' }
  | { kind: 'hunt'; target: string }
  /** A hungry predator by the farm goes for the hens instead of one of us. */
  | { kind: 'raid' };

export interface Animal {
  id: string;
  name: string;
  species: Species;
  predator: boolean;
  elder: boolean;
  size: Size;
  /** Fliers take to the air whenever they move, and can't be hit while airborne. */
  flier: boolean;
  /** Hungry predators forget the oath earlier: added to the belief level they hunt at. */
  hunger: number;
  traits: TraitId[];
  belief: number;
  injuries: InjuryKind[];
  /** The dead this animal carries with it (mourned by the fire, not buried). */
  grief: string[];
  /** Swarms (a mouse family) lose members instead of taking injuries. */
  count?: number;
  zone: ZoneId;
  status: Status;
  intent: Intent;
  /** End-of-turns spent in a slow zone (the culvert); 1 is needed to get out. */
  slowTime: number;
  // Per-turn flags.
  protectedBy?: string;
  braced: boolean;
  flying: boolean;
}

/** The farm's dogs can never be beaten, only misled. */
export interface Dog {
  id: string;
  name: string;
  zone: ZoneId;
  /** Where the dog is heading this hour (telegraphed). */
  target: ZoneId | null;
}

export interface Verse {
  id: string;
  kind: 'oath' | 'memorial';
  base?: VerseId;
  text: string;
  flippedText?: string;
  flipped: boolean;
}

export interface Card {
  uid: number;
  kind: CardKind;
  owner: string;
  /** Memory cards remember who they were made from. */
  memoryOf?: string;
  /** A buried memory is gentler: less belief, but no hope lost. */
  buried?: boolean;
  /** A card the owner took over when telling a memory of the dead by the fire. */
  inheritedFrom?: string;
}

export interface Strike {
  lane: LaneId;
  severity: Severity;
  vehicle: 'bil' | 'lastbil' | 'mörk bil';
  dark: boolean;
}

export interface Hit {
  victim: string;
  severity: Severity;
  /** Sudden hits (a car without lights) give no last moment. */
  sudden: boolean;
  zone: ZoneId;
  /** What hit, for narration: "bil", "lastbil", "hund" … */
  source: string;
}

export interface LogEntry {
  kind: 'narrate' | 'line' | 'turn' | 'grief';
  text: string;
  who?: string;
}

/** Why hope moved, so the UI can let an animal speak about it. */
export type HopeReason = 'death' | 'flip' | 'hunt' | 'leave' | 'dawn' | 'memory' | 'laugh' | 'fire';

/** Side effects the UI and audio react to; the log keeps the readable text. */
export type GameEvent =
  | { kind: 'log'; entry: LogEntry }
  | { kind: 'car'; lane: LaneId; vehicle: Strike['vehicle'] }
  | { kind: 'hit'; who: string }
  | { kind: 'death'; who: string }
  | { kind: 'flip'; verse: string }
  | { kind: 'safe'; who: string }
  | { kind: 'hope'; delta: number; reason: HopeReason; who?: string }
  | { kind: 'error'; text: string };

/** oath → map → (encounter: play/lastMoment | campfire) → map … → over */
export type Phase = 'oath' | 'map' | 'play' | 'lastMoment' | 'campfire' | 'over';

export interface Journey {
  at: string;
  visited: string[];
}

export type MourningChoice = 'bury' | 'carry';

export interface Outcome {
  safe: string[];
  dead: string[];
  left: string[];
  fallen: boolean;
}

export interface GameState {
  version: 4;
  journey: Journey;
  /** The dead not yet mourned by a fire. */
  unmourned: string[];
  encounterId: EncounterId;
  seed: number;
  rng: number;
  phase: Phase;
  turn: number;
  maxTurn: number;
  kraft: number;
  hope: number;
  animals: Animal[];
  bonds: Record<string, number>;
  verses: Verse[];
  draw: Card[];
  hand: Card[];
  discard: Card[];
  nextUid: number;
  trafficPlan: Strike[][];
  moonPlan: boolean[];
  /** Hidden zones (the culvert) that have been found this encounter. */
  revealed: ZoneId[];
  // The farm.
  dogs: Dog[];
  dogsAwake: boolean;
  /** How strongly each zone smells of us, 0–3. */
  scent: Record<ZoneId, number>;
  /** Barking wakes the farm: at 5 the farmer comes out. */
  alarm: number;
  farmerOut: boolean;
  /** The zone the farmer's flashlight will sweep this hour. */
  farmerSweep: ZoneId | null;
  peekNext: boolean;
  darkRevealed: boolean;
  hitQueue: Hit[];
  pending?: Hit;
  log: LogEntry[];
  outcome?: Outcome;
}

export type Action =
  | { type: 'swear'; verses: VerseId[] }
  | { type: 'play'; uid: number; target?: string; zone?: ZoneId }
  | { type: 'lead'; target: string; zone: ZoneId }
  | { type: 'lure'; target: string; zone: ZoneId }
  | { type: 'endTurn' }
  | { type: 'travel'; to: string }
  | { type: 'restAtFire'; watch?: string; pairs: [string, string][]; mourning: Record<string, MourningChoice> }
  | { type: 'lastMoment'; choice: 'shield'; by: string }
  | { type: 'lastMoment'; choice: 'letGo' };
