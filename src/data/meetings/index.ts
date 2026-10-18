// Every meeting in frames, by name.
import { CROW, isHere, type MeetingFrame, type MeetingOption } from './crow.sv';
import { BARSNAR, FRAMLINGEN, GAMMAL_STIG, GRAVSKOPAN, GRYT, HJORTEN, IHALIGT_TRAD, KOLTRASTEN, KVARNS_TVEKAN, MATEN } from './dalen.sv';
import { PROPOSAL } from './proposal.sv';
import type { GameState, MeetingId } from '../../engine/types';

export interface MeetingDef {
  title: string;
  /** What stands in the picture: the crow, the one asking a promise, or a thing of the place. */
  art: 'crow' | 'proposer' | SceneArt;
  frames: Record<string, MeetingFrame>;
  /** Who takes the card we give, in the card picker. */
  taker?: string;
}

export type SceneArt = 'bird' | 'tree' | 'berries' | 'path' | 'den' | 'deer' | 'basket' | 'fox' | 'tracks' | 'toad';

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
  kvarnsTvekan: { title: 'Kvarns tvekan', art: 'toad', frames: KVARNS_TVEKAN },
};

export const currentFrame = (s: GameState) => (s.meeting ? MEETINGS[s.meeting.id].frames[s.meeting.frame] : undefined);

/** Who speaks an option, now. */
export const speakerOf = (s: GameState, o: MeetingOption) => (typeof o.by === 'function' ? o.by(s) : o.by);
export const labelOf = (s: GameState, o: MeetingOption) => (typeof o.label === 'function' ? o.label(s) : o.label);

/** The replies we can give now: whoever speaks must be with us, and not already have spoken. */
export function meetingOptions(s: GameState): MeetingOption[] {
  const m = s.meeting;
  const frame = currentFrame(s);
  if (!m || !frame) return [];
  return frame.options.filter((o) => {
    if (m.used.includes(o.id) || (o.when && !o.when(s))) return false;
    if (!o.by) return true;
    const who = speakerOf(s, o);
    return !!who && isHere(s, who);
  });
}

export type { MeetingFrame, MeetingOption };
