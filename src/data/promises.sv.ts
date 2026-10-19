// The promises the animals ask of us: the words, the words if we break them,
// what binds us, and who among us speaks against each one.
import type { PromiseRule, Species } from '../engine/types';

export interface PromiseDef {
  /** {a} is the one who asks; {b} the other one it is about. */
  text: string;
  flipped: string;
  binds: string;
  /** Why the one asking wants it. */
  why: string;
  /** Which kind speaks against it, and how – if one of them is with us. */
  objector?: { species: Species; line: string };
}

export const PROMISES: Record<PromiseRule, PromiseDef> = {
  light: {
    text: 'Vi går aldrig ut i ljuset.',
    flipped: 'Vi gick ut i ljuset igen.',
    binds: 'Bryts om någon av oss träffas av en bil eller av ficklampan.',
    why: '{a} såg ljuset komma. {a} vill aldrig se det igen.',
    objector: { species: 'badger', line: '”Ibland måste man gå ut i ljuset för att nå fram.”' },
  },
  current: {
    text: 'Vi går aldrig i strid ström.',
    flipped: 'Strömmen tog oss ändå.',
    binds: 'Bryts om strömmen drar någon av oss mot forsen.',
    why: '{a} hör fortfarande forsen.',
    objector: { species: 'toad', line: '”Vattnet är inte alltid farligt. Man kan inte lova bort det.”' },
  },
  noneAlone: {
    text: 'Ingen sitter ensam i mörkret.',
    flipped: 'Någon satt ensam i mörkret.',
    binds: 'Bryts om någon sitter ensam vid lägerelden.',
    why: '{a} har förlorat någon och vill inte förlora fler i tystnaden.',
    objector: { species: 'owl', line: '”Jag vakar bäst ensam. Det vet ni.”' },
  },
  together: {
    text: '{a} och {b} lämnar aldrig varandra.',
    flipped: '{a} och {b} skildes åt.',
    binds: 'Bryts om en av dem dör eller blir kvar medan den andra lever.',
    why: '{a} och {b} har kommit varandra nära vid elden.',
  },
  water: {
    text: 'Vi går aldrig över vatten.',
    flipped: 'Vi gick över vattnet.',
    binds: 'Bryts om vi väljer ån.',
    why: '{a} är rädd för vattnet. Rädd på riktigt.',
    objector: { species: 'toad', line: '”Vattnet är mitt hem. Ni kan inte lova bort det.”' },
  },
  farm: {
    text: 'Vi går aldrig in på en gård.',
    flipped: 'Vi gick in på gården.',
    binds: 'Bryts om vi går till gården.',
    why: '{a} har sprungit från hundar förut och vill aldrig mer.',
    objector: { species: 'adder', line: '”Där finns höns. Varmt och mjukt. Varför lova bort det?”' },
  },
  night: {
    text: 'Vi går bara i mörkret.',
    flipped: 'Vi gick i dagsljus.',
    binds: 'Bryts om vi går ut i dagsljus. Att vänta på natten kostar hopp.',
    why: '{a} känner sig sedd i ljuset, och vågar inte längre.',
    objector: { species: 'mice', line: '”Vi ser ingenting i mörkret. Ingenting.”' },
  },
  noCity: {
    text: 'Vi går aldrig dit där maskinerna bor.',
    flipped: 'Vi gick in bland maskinerna.',
    binds: 'Bryts om vi väljer vägen in mot staden.',
    why: '{a} såg dalen bli lera. {a} vill aldrig mer höra en motor.',
    objector: { species: 'fox', line: '”I staden finns mat för alla. Man kan inte lova bort den.”' },
  },
  stay: {
    text: 'Jag lämnar dig aldrig, {b}.',
    flipped: '{a} lämnade {b}.',
    binds: 'Bryts om {b} dör eller blir kvar medan {a} lever.',
    why: '{b} kastade sig emellan för {a}.',
  },
};

/** What every kept promise gives. */
export const PROMISE_GIFT = 'Så länge löftet håller tvivlar {a} aldrig under 3 tro, och elden ger +1 hopp om vi har hållit alla våra löften.';
