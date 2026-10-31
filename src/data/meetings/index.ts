// Every meeting in frames, by name.
import { CROW, isHere, type MeetingFrame, type MeetingOption } from './crow.sv';
import { BARSNAR, FRAMLINGEN, GAMMAL_STIG, GRAVSKOPAN, GRYT, HJORTEN, IHALIGT_TRAD, KOLTRASTEN, KVARNS_TVEKAN, MATEN } from './dalen.sv';
import { FARAN, HAREN, KRAKFLOCKEN, SKRAMMAN, SPILLSAD, TRAKTORN } from './akrarna.sv';
import { BARNET, DUVORNA, KOLONILOTTEN, PARKDAMMEN, SOPTUNNAN, STADSRAVEN } from './staden.sv';
import { BOET, EKOT, EREMITEN, HJORTRON, RYGGSACKEN, TJARNEN, VILSNA } from './mossen.sv';
import { BARBUSKEN, DOFTEN } from './skogsbrynet.sv';
import { INTERLUDE } from './interlude.sv';
import { PROPOSAL } from './proposal.sv';
import { crowCards } from '../../engine/campfire';
import { guideName } from '../../engine/roles';
import type { GameState, MeetingId } from '../../engine/types';

export interface MeetingDef {
  title: string | ((s: GameState) => string);
  /** What stands in the picture: the crow, the one asking a promise, or a thing of the place. */
  art: 'crow' | 'proposer' | SceneArt;
  frames: Record<string, MeetingFrame>;
  /** Who takes the card we give, in the card picker. */
  taker?: string;
}

export type SceneArt = 'bird' | 'tree' | 'berries' | 'path' | 'den' | 'deer' | 'basket' | 'fox' | 'tracks' | 'toad' | 'ridge' | 'furrow' | 'scarecrow' | 'crows' | 'grain' | 'tractor' | 'hare' | 'pigeons' | 'window' | 'bin' | 'allotment' | 'pond' | 'mist' | 'hermit' | 'echo' | 'cloudberry' | 'nest' | 'backpack' | 'tarn' | 'forest';

export const MEETINGS: Record<MeetingId, MeetingDef> = {
  crow: { title: 'Kråkan vid elden', art: 'crow', frames: CROW, taker: 'Kråkan' },
  proposal: { title: 'Ett löfte', art: 'proposer', frames: PROPOSAL },
  koltrasten: { title: 'Koltrasten', art: 'bird', frames: KOLTRASTEN },
  ihaligtTrad: { title: 'Det ihåliga trädet', art: 'tree', frames: IHALIGT_TRAD },
  barsnar: { title: 'Ett bärsnår', art: 'berries', frames: BARSNAR },
  gammalStig: { title: 'En gammal stig', art: 'path', frames: GAMMAL_STIG },
  gryt: { title: 'Ett övergivet gryt', art: 'den', frames: GRYT },
  hjorten: { title: 'Den döende hjorten', art: 'deer', frames: HJORTEN },
  maten: { title: 'Människorna med maten', art: 'basket', frames: MATEN },
  framlingen: { title: 'Den hungriga främlingen', art: 'fox', frames: FRAMLINGEN, taker: 'Räven' },
  gravskopan: { title: 'Grävskopans spår', art: 'tracks', frames: GRAVSKOPAN },
  kvarnsTvekan: { title: (s) => `${guideName(s)}s tvekan`, art: 'toad', frames: KVARNS_TVEKAN },
  faran: { title: (s) => (s.meeting?.kind && s.meeting.kind !== 'hedgehog' ? 'Någon i fåran' : 'Igelkotten i fåran'), art: 'furrow', frames: FARAN },
  skramman: { title: 'Fågelskrämman', art: 'scarecrow', frames: SKRAMMAN },
  krakflocken: { title: 'Kråkflocken', art: 'crows', frames: KRAKFLOCKEN, taker: 'Kråkorna' },
  spillsad: { title: 'Spillsäd', art: 'grain', frames: SPILLSAD },
  traktorn: { title: 'Den övergivna traktorn', art: 'tractor', frames: TRAKTORN },
  haren: { title: 'Haren på åkern', art: 'hare', frames: HAREN },
  duvorna: { title: 'Duvorna', art: 'pigeons', frames: DUVORNA, taker: 'Duvorna' },
  barnet: { title: 'Barnet vid fönstret', art: 'window', frames: BARNET },
  stadsraven: { title: 'Stadsräven', art: 'fox', frames: STADSRAVEN },
  soptunnan: { title: 'Soptunnan', art: 'bin', frames: SOPTUNNAN },
  kolonilotten: { title: 'Kolonilotten', art: 'allotment', frames: KOLONILOTTEN },
  parkdammen: { title: 'Parkdammen', art: 'pond', frames: PARKDAMMEN },
  vilsna: { title: 'Den vilsna', art: 'mist', frames: VILSNA },
  eremiten: { title: 'Eremiten', art: 'hermit', frames: EREMITEN },
  ekot: { title: 'Ekot', art: 'echo', frames: EKOT },
  hjortron: { title: 'Hjortronmyren', art: 'cloudberry', frames: HJORTRON },
  boet: { title: 'Det tomma boet', art: 'nest', frames: BOET },
  ryggsacken: { title: 'Ryggsäcken', art: 'backpack', frames: RYGGSACKEN },
  tjarnen: { title: 'Myrstjärnan', art: 'tarn', frames: TJARNEN },
  doften: { title: 'Skogens doft', art: 'forest', frames: DOFTEN },
  barbusken: { title: 'Den sista bärbusken', art: 'berries', frames: BARBUSKEN },
  interlude: { title: 'Mellan två landskap', art: 'ridge', frames: INTERLUDE },
};

export const currentFrame = (s: GameState) => (s.meeting ? MEETINGS[s.meeting.id].frames[s.meeting.frame] : undefined);

/** Who speaks an option, now. */
export const speakerOf = (s: GameState, o: MeetingOption) => (typeof o.by === 'function' ? o.by(s) : o.by);
export const labelOf = (s: GameState, o: MeetingOption) => (typeof o.label === 'function' ? o.label(s) : o.label);

/** The replies we can give now: whoever speaks must be with us, and not already have spoken. A card is asked only of those who have one to give. */
export function meetingOptions(s: GameState): MeetingOption[] {
  const m = s.meeting;
  const frame = currentFrame(s);
  if (!m || !frame) return [];
  return frame.options.filter((o) => {
    if (m.used.includes(o.id) || (o.when && !o.when(s)) || (o.pickCard && !crowCards(s).length)) return false;
    if (!o.by) return true;
    const who = speakerOf(s, o);
    return !!who && isHere(s, who);
  });
}

export type { MeetingFrame, MeetingOption };
