/** Zones are defined per encounter (see encounters/); ids are plain strings. */
export type ZoneId = string;
export type LaneId = 'lane1' | 'lane2';
export type EncounterId = 'road' | 'farm' | 'river' | 'machines' | 'raptor' | 'sprayer' | 'fence' | 'harvest' | 'lamps' | 'cats' | 'street' | 'sewer' | 'fireworks' | 'bog' | 'wisps' | 'cranes' | 'peat' | 'fog' | 'hunt';
/** Which way the wind carries the mist over the sprayed field. */
/** Asphalt with cars, or gravel with tractors. */
export type RoadKind = 'asphalt' | 'gravel';
export type Wind = 'norr' | 'söder' | 'öster' | 'väster';

/** The river's current in a given hour. */
export type Current = 'lugn' | 'strid';

/**
 * Lasting harm from an injuring hit. Halt and broken never heal; bleeding and
 * shock heal by the campfire.
 */
export type InjuryKind = 'halt' | 'broken' | 'bleeding' | 'shock' | 'poisoned';

/** Every danger is telegraphed as one or the other. */
export type Severity = 'injure' | 'kill';
/** The groups that may leave the glen (see `CASTS` in data/animals). */
export type CastId = 'dalensSista' | 'rovdjurensPakt' | 'deSma' | 'slumpad';
export type Species = 'fox' | 'badger' | 'toad' | 'owl' | 'mice' | 'adder' | 'hare' | 'hedgehog' | 'squirrel' | 'mole' | 'beaver' | 'fawn';
/** Only small animals fit through the culvert. */
export type Size = 'small' | 'medium' | 'large';
export type TraitId =
  | 'modig'
  | 'lugn'
  | 'omtanksam'
  | 'seglivad'
  | 'snabbfotad'
  | 'klok'
  | 'skygg'
  | 'hetsig'
  | 'hungrig'
  | 'tvivlande'
  | 'ensamvarg'
  | 'klumpig'
  | 'hardad'
  | 'trogen'
  | 'sorjande'
  | 'arrad';
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
  | 'trosta'
  | 'lasaNatten'
  | 'skratt'
  | 'taEmot'
  | 'giftIReserv'
  | 'sprang'
  | 'minne'
  // The species' own skills.
  | 'gravaNer'
  | 'gamlesRost'
  | 'staSomSten'
  | 'simma'
  | 'talamod'
  | 'lyssnaIMarken'
  | 'giftIHuden'
  | 'smyga'
  | 'lockbete'
  | 'list'
  | 'mattForStunden'
  | 'flyga'
  | 'tystVinge'
  | 'vaka'
  | 'ropINatten'
  | 'baraLiten'
  | 'ringla'
  | 'gommaSig'
  | 'hota'
  | 'varmaSig'
  | 'omsaSkinn'
  | 'spridaSig'
  | 'krypaIn'
  | 'baraIhop'
  | 'mangaOgon'
  | 'hacka'
  | 'frysaStilla'
  | 'stampa'
  | 'lockaBort'
  | 'vidoga'
  | 'rullaIhop'
  | 'taggar'
  | 'snoka'
  | 'tystGang'
  | 'vintersomn'
  | 'tryggRygg'
  | 'klattra'
  | 'hoppa'
  | 'gommaForrad'
  | 'varna'
  | 'kastaKottar'
  | 'pigg'
  | 'gravaGang'
  | 'underJord'
  | 'kannaSkakningar'
  | 'mjukJord'
  | 'gamlaGangar'
  | 'fastMark'
  | 'lagaDammen'
  | 'svansslag'
  | 'fallaTrad'
  | 'pipa'
  | 'vittring'
  | 'ledaFlocken';

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
  | { kind: 'raid' }
  /** On the lit bog: drawn toward a light. */
  | { kind: 'lured'; to: ZoneId };

export interface Animal {
  /** What took this animal, if it died: a hit's source, or how it went. */
  diedOf?: string;
  id: string;
  name: string;
  species: Species;
  predator: boolean;
  elder: boolean;
  /** The one who remembers the way: whose memory the map is. */
  guide: boolean;
  size: Size;
  /** Swimmers: the current doesn't take them. */
  swimmer: boolean;
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
  /** What this one of its kind knows how to do, and the ones it carries: its cards. */
  skills: CardKind[];
  loadout: CardKind[];
  /** Dangers survived since it last learned something: at three, it may learn. */
  xp: number;
  /** What it may learn now, from what it has lived through: one of these. */
  offer?: CardKind[];
  /** In this danger: steps led so far, and whether its toughness has taken a blow. */
  steps?: number;
  toughUsed?: boolean;
  /** Nights in a row by the embers: two, and a bad trait may fade. */
  emberNights?: number;
  /** On the quaking bog: how far it has sunk, in half-steps. Stuck at 4, pulled under at 6. */
  sink?: number;
  /** Fed for this danger: it will not hunt here. */
  sated?: boolean;
  // Per-turn flags.
  protectedBy?: string;
  braced: boolean;
  flying: boolean;
  /** Unseen this hour: nothing that hunts by sight or scent finds it. */
  hidden?: boolean;
  /** Dug in or holding still: it cannot move this hour. */
  rooted?: boolean;
  /** A swarm spread out: the next hit takes only one. */
  scattered?: boolean;
  /** Rolled into a ball of spines: bites, claws and talons miss this hour. Cars do not. */
  curled?: boolean;
  /** Up a tree: what runs on the ground can't reach it, but birds can – and a felled tree takes it down. */
  climbing?: boolean;
  /** Dug down into the earth: the mist does not reach it, and the tractor rolls over it. */
  underground?: boolean;
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
export type PromiseRule = 'light' | 'current' | 'noneAlone' | 'together' | 'water' | 'farm' | 'night' | 'stay' | 'noCity';

/** The regions of the way: the glen first, the forest's edge last, the others in between in any order. */
export type RegionId = 'dalen' | 'akrarna' | 'staden' | 'mossen' | 'skogsbrynet';

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
  vehicle: 'bil' | 'lastbil' | 'mörk bil' | 'traktor';
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

/** A boss's or a danger's blow landing, for the sound and the board to play out. */
export type BlowKind = 'fell' | 'doze' | 'cut' | 'burst' | 'bigBurst' | 'shot' | 'bark' | 'suck' | 'crane' | 'light';

/** Side effects the UI and audio react to; the log keeps the readable text. */
export type GameEvent =
  | { kind: 'blow'; what: BlowKind; zone: ZoneId }
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
  /** A road of gravel between the fields: slow tractors instead of cars. */
  road?: RoadKind;
  /** Position on the map, in percent (x right, y down). */
  x: number;
  y: number;
  next: string[];
}

export interface Journey {
  /** The region we walk through, and its map, drawn anew every run. */
  region: RegionId;
  nodes: MapNode[];
  at: string;
  visited: string[];
  /** What each place really is, rolled when the run starts. */
  truth: Record<string, Variant>;
  /** What Kvarn remembers: right about two in three. */
  guess: Record<string, Variant>;
  /** Places the owl has flown ahead to see. */
  scouted: string[];
  /** The pigeons showed us the roofs: the next step may go to any place in the next row. */
  roofs?: boolean;
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
  | 'kvarnsTvekan'
  // Åkrarna's.
  | 'faran'
  | 'skramman'
  | 'krakflocken'
  | 'spillsad'
  | 'traktorn'
  | 'haren'
  // The city's.
  | 'duvorna'
  | 'barnet'
  | 'stadsraven'
  | 'soptunnan'
  | 'kolonilotten'
  | 'parkdammen'
  // Mossen's.
  | 'vilsna'
  | 'eremiten'
  | 'ekot'
  | 'hjortron'
  | 'boet'
  | 'ryggsacken'
  | 'tjarnen'
  // Skogsbrynet's.
  | 'doften'
  | 'barbusken'
  | 'interlude';

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
  /** Someone met in the story: their kind and name (the one in the furrow, the hare's kin). */
  kind?: Species;
  name?: string;
  /** Who of us helped them, for the bond. */
  helper?: string;
  /** Who of us the city fox tempts with the butcher's meat. */
  tempted?: string;
}

/** What a meeting cost us at tonight's fire: fewer places by the embers, someone apart, someone in the dark. */
export interface FireDebt {
  embers: number;
  /** Sit apart, telling: no watch, no embers, no rest – but not alone. */
  apart: string[];
  /** Sit in the dark by their own choice: alone, and no place by the embers. */
  dark: string[];
  /** We scattered on the bog, and haven't found our way back to one another: no bonds grow tonight. */
  noBonds?: boolean;
}

/** By the embers, one of a pair teaches the other a skill instead of resting. */
export interface Teaching {
  teacher: string;
  learner: string;
  skill: CardKind;
}

export interface Rescue {
  /** The id the trapped one will have among us, its kind and its name. */
  who: string;
  species: Species;
  name: string;
  zone: ZoneId;
  trust: number;
  /** How much trust it needs: a trapped predator trusts more slowly. */
  need: number;
}

export interface Outcome {
  safe: string[];
  dead: string[];
  left: string[];
  fallen: boolean;
  /** We reached the forest: the end of the way. */
  forest?: boolean;
}

export interface GameState {
  version: 40;
  /** The road we cross: asphalt, or Åkrarna's gravel. */
  roadKind: RoadKind;
  /** Which group left the glen. */
  cast: CastId;
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
  // The machines.
  /** The trees that fall at the end of each hour. */
  fellPlan: ZoneId[];
  /** A boss's false blow, hour by hour: where it might strike, but won't. Shown with the real one until a card or a find tells which. */
  feint: ZoneId[][];
  /** Zones where hunters back off this hour: someone stands there and threatens. */
  warded: ZoneId[];
  /** The ground the bulldozer takes at the end of each hour, if any. */
  dozePlan: (ZoneId | null)[];
  // The fields.
  /** Where the birds will strike this hour: one zone each by day; at night, only where they might. */
  raptors: { zone: ZoneId | null; maybe: ZoneId[] }[];
  /** The sprayed field: the tractor's rows and the wind, hour by hour; where the mist lies; what of it we can see at night. */
  spray: { rowPlan: number[]; windPlan: Wind[]; mist: ZoneId[]; shown: ZoneId[] };
  /** The ditch and the gate: the water's level, when it rises, when the wire hums, whether the gate stands open. */
  fence: { level: number; risePlan: boolean[]; pulsePlan: boolean[]; gateOpen: boolean };
  /** The harvest: which wheat falls each hour, what is already stubble, where the buzzard's shadow lies. */
  harvest: { plan: ZoneId[][]; cut: ZoneId[]; shadow: ZoneId | null };
  /** The street lights: the hour each lamp comes on, and the men walking their dogs round the block. */
  lamps: { litAt: Record<ZoneId, number>; walkers: { at: number; dir: 1 | -1 }[] };
  /** The courtyard: where each cat lies in wait, the eyes we see of it at night, which were scared off, and the food thrown to them. */
  cats: { at: ZoneId[]; eyes: ZoneId[][]; scared: boolean[]; fed: boolean; foodUsed: boolean };
  /** The shopping street: where the crowd surges and which bike lane is busy, hour by hour; the hours the tram passes; where the drunks stagger this hour. */
  street: { crowdPlan: ZoneId[][]; bikePlan: (ZoneId | null)[]; tramAt: number[]; drunks: ZoneId[] };
  /** The sewer: what each tunnel is, where the rats hold, which tunnels we have found, what we hear this hour, the water's level and when it rises, and whether the toll is paid this hour. */
  /** New Year's Eve in the park: the bursts hour by hour, each with a zone and a strength; where the people walk each hour. */
  /** New Year's Eve: the bursts and the people, hour by hour – and the hour the child's family stepped aside for us. */
  /** The quaking bog: where each of us stood when the hour began – whoever is still there sinks. */
  bogFrom: Record<string, ZoneId>;
  /** The lit bog: the lights of each hour, and the one true light. */
  wisps: { plan: ZoneId[][]; trueAt: number; trueZone: ZoneId; known: boolean };
  /** The cranes' dance: each flock's zone, hour by hour, and whether their call has carried to us. */
  cranes: { flocks: ZoneId[][]; called: boolean };
  /** The peat cutting: the machine's row each hour (null when it rests), and how full each cut ditch is. */
  peat: { rows: (number | null)[]; ditch: Record<ZoneId, number> };
  /** The fog: what lies under it, and the zones we have come close enough to know. */
  fog: { kinds: Record<ZoneId, 'firm' | 'soft' | 'pool'>; known: ZoneId[] };
  /** The hunt: where the hunter looks each hour, and where a dog barked last hour – he looks there too. */
  hunt: { plan: ZoneId[][]; barked: ZoneId[]; lured?: boolean };
  fireworks: { plan: { zone: ZoneId; strength: 1 | 2 }[][]; crowdPlan: ZoneId[]; childHour?: number };
  sewer: { kinds: Record<ZoneId, 'low' | 'walk' | 'ledge'>; rats: ZoneId[]; found: ZoneId[]; heard: ZoneId[]; level: number; risePlan: boolean[]; paid: boolean };
  /** Someone trapped in this encounter, not yet one of us: they must come to trust us before we can free them. */
  rescue: Rescue | null;
  /** Newcomers we have met this run – rescued or left behind. Each is met only once. */
  met: string[];
  /** Regions where someone has already waited to be rescued: one in each. */
  rescues: string[];
  /** What we have learned along the way that helps later: 'machines' – how the machines move. */
  knowledge: string[];
  /** The regions we have walked through, the ones offered next, and whether we stand between two. */
  /** The run's regions: walked, offered now, passed by for good, and whether we stand between two. */
  run: { regions: RegionId[]; offered: RegionId[]; skipped: RegionId[]; between: boolean };
  meeting: Meeting | null;
  /** A promise an animal waits to ask of us, once the meeting before it is over. */
  proposal: Proposal | null;
  fireDebt: FireDebt;
  peekNext: boolean;
  /** Cards hidden away for the next hour, drawn on top of the hand. */
  stash: number;
  darkRevealed: boolean;
  hitQueue: Hit[];
  pending?: Hit;
  log: LogEntry[];
  outcome?: Outcome;
}

export type Action =
  | { type: 'chooseCast'; cast: CastId }
  | { type: 'swear'; verses: VerseId[] }
  | { type: 'play'; uid: number; target?: string; zone?: ZoneId }
  | { type: 'lead'; target: string; zone: ZoneId }
  | { type: 'lure'; target: string; zone: ZoneId }
  | { type: 'endTurn' }
  | { type: 'travel'; to: string; wait?: boolean }
  | { type: 'rescue'; by: string }
  /** Throw the cats something to eat: this hour they pounce on no one. Once in each danger. */
  | { type: 'throwFood' }
  /** Give the rats a card from the hand: this hour they bite no one. */
  | { type: 'payToll'; uid: number }
  | { type: 'restAtFire'; watch?: string; scout?: string; pairs: [string, string][]; mourning: Record<string, MourningChoice>; teach?: Teaching }
  /** Learn one of the skills a danger lived through has offered. */
  | { type: 'learn'; animal: string; skill: CardKind }
  | { type: 'respond'; option: string; uid?: number }
  /** Choose which of its skills an animal carries: on the map or by the fire, never in danger. */
  | { type: 'equip'; animal: string; skills: CardKind[] }
  | { type: 'lastMoment'; choice: 'shield'; by: string }
  | { type: 'lastMoment'; choice: 'letGo' };
