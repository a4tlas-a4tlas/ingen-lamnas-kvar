// What the animals say when the way forks: who wants which path, and why.
import type { EncounterId } from '../engine/types';

export interface Leaning {
  /** +1: wants to go there; −1: wants anything but there. */
  pull: 1 | -1;
  line: string;
}

/** Each animal's own nature. */
export const LEANINGS: Record<string, Partial<Record<EncounterId, Leaning>>> = {
  kvarn: { river: { pull: 1, line: 'Vattnet är mitt hem. Ta ån – jag visar er stenarna.' } },
  frona: { river: { pull: -1, line: 'Vi kan inte simma. Inte ån, snälla.' } },
  sotfot: { farm: { pull: -1, line: 'Jag har sprungit från hundar förut. Aldrig mer en gård.' } },
  ljung: { river: { pull: 1, line: 'Strömmen rubbar inte mig. Håll er i mig, så går vi över.' } },
  skymning: { farm: { pull: -1, line: 'Jag har sett gården från ovan. Hundarna sover inte så djupt som ni tror.' } },
};

/** What the body says louder than nature: injuries and hunger. */
export const BODY_LEANINGS = {
  halt: { encounter: 'river', pull: -1, line: 'Benet bär inte på hala stenar.' },
  bleeding: { encounter: 'farm', pull: -1, line: 'Hundarna känner lukten av mitt blod.' },
  hungry: { encounter: 'farm', pull: 1, line: 'Det luktar höns från gården…' },
} as const satisfies Record<string, { encounter: EncounterId } & Leaning>;
