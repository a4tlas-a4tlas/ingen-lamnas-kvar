/** Zones are defined per encounter (see encounters/); ids are plain strings. */
export type ZoneId = string;
export type LaneId = 'lane1' | 'lane2';
export type EncounterId = 'road' | 'farm' | 'river';

/** The river's current in a given hour. */
export type Current = 'lugn' | 'strid';

/**
 * Lasting harm from an injuring hit. Halt and broken never heal; bleeding and
 * shock heal by the campfire.
 */
export type InjuryKind = 'halt' | 'broken' | 'bleeding' | 'shock';

/** Every danger is telegraphed as one or the other. */
export type Severity = 'injure' | 'kill';
export type Species = 'fox' | 'badger' | 'toad' | 'owl' | 'mice' | 'adder' | 'hare';
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
  | 'sprang'
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
  /** What took this animal, if it died: a hit's source, or how it went. */
  diedOf?: string;
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

/** What an animal's promise binds us to – and so what breaks it. */
export type PromiseRule = 'light' | 'current' | 'noneAlone' | 'together' | 'water' | 'farm' | 'night' | 'stay';

/** A promise an animal asked of us: who asked, what it binds us to, and – for two – who else it is about. */
export interface Proposal {
  by: string;
  rule: PromiseRule;
  with?: string;
}

export interface Verse {
  id: string;
  kind: 'oath' | 'memorial' | 'promise';
  base?: VerseId;
  text: string;
  flippedText?: string;
  flipped: boolean;
  /** For a promise: who asked it of us, and what it binds. */
  promise?: Proposal;
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
export type HopeReason = 'death' | 'flip' | 'hunt' | 'leave' | 'dawn' | 'memory' | 'laugh' | 'fire' | 'wait' | 'trapped' | 'song' | 'food' | 'cold' | 'lost';

export type TimeOfDay = 'day' | 'night';

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

/** Every place but the road can be easier or harder than it looks: the farm asleep or awake, the river calm or in flood. */
export type Variant = 'normal' | 'hard';

export type PlaceKind = 'start' | 'encounter' | 'campfire' | 'meeting' | 'find' | 'end';

/** A place on the region's map: what it is, where it is drawn, and where we can go from it. */
export interface MapNode {
  id: string;
  /** The row it lies in: 0 is where the region starts. */
  row: number;
  kind: PlaceKind;
  encounter?: EncounterId;
  /** The story part held here, for meetings and finds. */
  meeting?: MeetingId;
  name: string;
  /** What Kvarn half remembers before we get there. */
  fogName: string;
  /** Said when we arrive; an encounter can say something else by day or by night. */
  arrive: string;
  arriveDay?: string;
  arriveNight?: string;
  /** Kvarn's memory of the place, normal or hard: "hundarna sover" / "gården är vaken". */
  memory?: { normal: string; hard: string };
  /** Shown when choosing the way here. */
  note?: string;
  /** Position on the map, in percent (x right, y down). */
  x: number;
  y: number;
  next: string[];
}

export interface Journey {
  /** The region we walk through, and its map, drawn anew every run. */
  region: string;
  nodes: MapNode[];
  at: string;
  visited: string[];
  /** What each place really is, rolled when the run starts. */
  truth: Record<string, Variant>;
  /** What Kvarn remembers: right about two in three. */
  guess: Record<string, Variant>;
  /** Places the owl has flown ahead to see. */
  scouted: string[];
}

export type MourningChoice = 'bury' | 'carry';

/** A meeting in frames (the crow at the fire): where we are in it, and what has been said. */
export type MeetingId =
  | 'crow'
  | 'proposal'
  | 'koltrasten'
  | 'ihaligtTrad'
  | 'barsnar'
  | 'gammalStig'
  | 'gryt'
  | 'hjorten'
  | 'maten'
  | 'framlingen'
  | 'gravskopan'
  | 'kvarnsTvekan';

export interface Meeting {
  id: MeetingId;
  frame: string;
  /** Replies already spoken: they aren't offered again. */
  used: string[];
  /** Places the crow told us about. */
  told: string[];
  /** A card one of us learned or lost in this meeting, by name. */
  card?: string;
  /** Who of us spoke last, to stand facing the crow in the picture. */
  by?: string;
  /** In a proposal: those who spoke for it, and against it. */
  backers?: string[];
  objectors?: string[];
}

/** What a meeting cost us at tonight's fire: fewer places by the embers, someone apart, someone in the dark. */
export interface FireDebt {
  embers: number;
  /** Sit apart, telling: no watch, no embers, no rest – but not alone. */
  apart: string[];
  /** Sit in the dark by their own choice: alone, and no place by the embers. */
  dark: string[];
}

export interface Rescue {
  /** The newcomer's id in NEWCOMERS. */
  who: string;
  zone: ZoneId;
  trust: number;
}

export interface Outcome {
  safe: string[];
  dead: string[];
  left: string[];
  fallen: boolean;
}

export interface GameState {
  version: 12;
  /** The variant of the encounter we're in. */
  variant: Variant;
  journey: Journey;
  /** The time of day of the encounter we're in. */
  time: TimeOfDay;
  /** The natural time of the next leg: it follows the last one, unless we wait. */
  clock: TimeOfDay;
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
  // The river.
  /** Calm or strong, hour by hour: a strong current carries the small toward the rapids. */
  currentPlan: Current[];
  /** The stones that are wet with spray, hour by hour: whoever stands there slips. */
  slipPlan: ZoneId[][];
  /** The beaver dam creaks under every step: at 4 it breaks. */
  damCreak: number;
  /** Zones that are gone for the rest of the encounter (the broken dam). */
  closed: ZoneId[];
  /** The stone the heron watches this hour (by day). */
  heron: ZoneId | null;
  /** Someone trapped in this encounter, not yet one of us: they must come to trust us before we can free them. */
  rescue: Rescue | null;
  /** Newcomers we have met this run – rescued or left behind. Each is met only once. */
  met: string[];
  /** What we have learned along the way that helps later: 'machines' – how the machines move. */
  knowledge: string[];
  meeting: Meeting | null;
  /** A promise an animal waits to ask of us, once the meeting before it is over. */
  proposal: Proposal | null;
  fireDebt: FireDebt;
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
  | { type: 'travel'; to: string; wait?: boolean }
  | { type: 'rescue'; by: string }
  | { type: 'restAtFire'; watch?: string; scout?: string; pairs: [string, string][]; mourning: Record<string, MourningChoice> }
  | { type: 'respond'; option: string; uid?: number }
  | { type: 'lastMoment'; choice: 'shield'; by: string }
  | { type: 'lastMoment'; choice: 'letGo' };
