// Every meeting in frames, by name.
import { CROW, isHere, type MeetingFrame, type MeetingOption } from './crow.sv';
import { IHALIGT_TRAD, KOLTRASTEN } from './dalen.sv';
import { PROPOSAL } from './proposal.sv';
import type { GameState, MeetingId } from '../../engine/types';

export interface MeetingDef {
  title: string;
  /** What stands in the picture: the crow, the one asking a promise, or a thing of the place. */
  art: 'crow' | 'proposer' | 'bird' | 'tree';
  frames: Record<string, MeetingFrame>;
}

export const MEETINGS: Record<MeetingId, MeetingDef> = {
  crow: { title: 'Kråkan vid elden', art: 'crow', frames: CROW },
  proposal: { title: 'Ett löfte', art: 'proposer', frames: PROPOSAL },
  koltrasten: { title: 'Koltrasten', art: 'bird', frames: KOLTRASTEN },
  ihaligtTrad: { title: 'Det ihåliga trädet', art: 'tree', frames: IHALIGT_TRAD },
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
