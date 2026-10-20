// What the animals say when the way forks: who wants which path, and why.
import type { EncounterId, Species } from '../engine/types';

export interface Leaning {
  /** +1: wants to go there; −1: wants anything but there. */
  pull: 1 | -1;
  line: string;
}

/** Each kind's own nature. */
export const LEANINGS: Partial<Record<Species, Partial<Record<EncounterId, Leaning>>>> = {
  toad: { river: { pull: 1, line: 'Vattnet är mitt hem. Ta ån – jag visar er stenarna.' } },
  mice: {
    river: { pull: -1, line: 'Vi kan inte simma. Inte ån, snälla.' },
    raptor: { pull: -1, line: 'Skuggan. Vi såg skuggan över fälten. Inte där.' },
  },
  fox: { farm: { pull: -1, line: 'Jag har sprungit från hundar förut. Aldrig mer en gård.' } },
  badger: { river: { pull: 1, line: 'Strömmen rubbar inte mig. Håll er i mig, så går vi över.' } },
  owl: {
    farm: { pull: -1, line: 'Jag har sett gården från ovan. Hundarna sover inte så djupt som ni tror.' },
    raptor: { pull: -1, line: 'Där ute är det jag som är bytet. Inte fälten.' },
  },
  hedgehog: { farm: { pull: 1, line: 'Gårdar har sniglar och mjölk. Hundarna biter inte i taggar.' } },
  squirrel: { raptor: { pull: -1, line: 'Inga träd på fälten. Ingenstans att klättra. Inte där.' } },
  mole: { river: { pull: -1, line: 'Jag ser inte vattnet. Jag hör det bara. Inte ån.' } },
  beaver: { river: { pull: 1, line: 'Ån är min. Jag vet var dammen håller.' } },
  fawn: { farm: { pull: -1, line: 'Där bor människor. Mamma sa: aldrig nära människorna.' } },
};

/** What the body says louder than nature: injuries and hunger. */
export const BODY_LEANINGS = {
  halt: { encounter: 'river', pull: -1, line: 'Benet bär inte på hala stenar.' },
  bleeding: { encounter: 'farm', pull: -1, line: 'Hundarna känner lukten av mitt blod.' },
  hungry: { encounter: 'farm', pull: 1, line: 'Det luktar höns från gården…' },
} as const satisfies Record<string, { encounter: EncounterId } & Leaning>;
