// Katterna: an inner courtyard between the blocks. The cats lie in wait – under the bikes,
// in the sandbox, by the bins – and slip to a new hiding place each hour. Whoever ends the
// hour where a cat waits is pounced on: the small taken, the medium scratched, never the
// large. Our predators scare them, food draws them away, and up a tree is no escape.
import { random, type RngHolder } from '../rng';
import type { Animal, GameState, ZoneId } from '../types';
import type { EncounterDef } from './types';

export const CATS: EncounterDef = {
  id: 'cats',
  title: { day: 'Bakgården', night: 'Bakgården om natten' },
  crossed: 'kom ut genom porten',
  timeUp: {
    day: 'Folk kommer hem, och dörrarna slår. Fler katter släpps ut. Vi kan inte stanna på gården längre.',
    night: 'Gryningen kommer, och fler katter släpps ut. Vi kan inte stanna på gården längre.',
  },
  leftBehind: { day: 'som blev kvar på bakgården', night: 'som blev kvar på bakgården' },
  lastHour: {
    day: 'Någon öppnar ett fönster och ropar på sin katt. Det här är sista timmen.',
    night: 'Himlen ljusnar över taken. Det här är sista timmen.',
  },
  maxTurn: 8,
  zones: [
    { id: 'kallartrappan', label: 'Källartrappan', name: 'källartrappan', rect: [0, 78, 100, 22], start: true, cover: true },
    { id: 'cykelstallet', label: 'Cykelstället', name: 'cykelstället', rect: [0, 50, 34, 28] },
    { id: 'sandladan', label: 'Sandlådan', name: 'sandlådan', rect: [34, 50, 32, 28], exposed: true },
    { id: 'soprummet', label: 'Soprummet', name: 'soprummet', rect: [66, 50, 34, 28] },
    { id: 'rabatten', label: 'Rabatten', name: 'rabatten', rect: [0, 22, 34, 28] },
    { id: 'grasmattan', label: 'Gräsmattan', name: 'gräsmattan', rect: [34, 22, 32, 28], exposed: true },
    { id: 'lonnen', label: 'Lönnen', name: 'lönnen', rect: [66, 22, 34, 28], trees: true },
    { id: 'porten', label: 'Porten', name: 'porten', rect: [0, 6, 100, 16], goal: true },
  ],
  // Up through the yard to the gate – and along each row, away from the cat.
  edges: [
    ['kallartrappan', 'sandladan'],
    ['kallartrappan', 'cykelstallet'],
    ['kallartrappan', 'soprummet'],
    ['cykelstallet', 'rabatten'],
    ['sandladan', 'grasmattan'],
    ['soprummet', 'lonnen'],
    ['cykelstallet', 'sandladan'],
    ['sandladan', 'soprummet'],
    ['rabatten', 'grasmattan'],
    ['grasmattan', 'lonnen'],
    ['rabatten', 'porten'],
    ['grasmattan', 'porten'],
    ['lonnen', 'porten'],
  ],
};

/** The courtyard, where the cats lie in wait: two rows of three. */
export const YARD: ZoneId[] = ['cykelstallet', 'sandladan', 'soprummet', 'rabatten', 'grasmattan', 'lonnen'];

const pick = <T>(h: RngHolder, xs: T[]): T => xs[Math.floor(random(h) * xs.length)];

/** How many cat-steps apart two places in the yard are: along a row, or across to the other. */
export function yardDistance(a: ZoneId, b: ZoneId): number {
  const i = YARD.indexOf(a);
  const j = YARD.indexOf(b);
  return Math.abs((i % 3) - (j % 3)) + (Math.floor(i / 3) === Math.floor(j / 3) ? 0 : 1);
}

/** Places in the yard exactly this far from z. */
export const yardAt = (z: ZoneId, d: number) => YARD.filter((y) => yardDistance(z, y) === d);

/** Where the cats lie when we come: each in its own place. */
export function placeCats(h: RngHolder, n: number): ZoneId[] {
  const pool = [...YARD];
  return Array.from({ length: n }, () => pool.splice(Math.floor(random(h) * pool.length), 1)[0]);
}

/** Where a cat slips to next: a neighbouring place – or, scared off, two away. Not where another cat lies. */
export function nextHide(h: RngHolder, from: ZoneId, scared: boolean, taken: ZoneId[]): ZoneId {
  const options = yardAt(from, scared ? 2 : 1).filter((z) => !taken.includes(z));
  return options.length ? pick(h, options) : from;
}

/** At night only eyes are seen: the real place, and one more where something glints. */
export function eyesFor(h: RngHolder, at: ZoneId): ZoneId[] {
  const decoy = pick(h, YARD.filter((z) => z !== at));
  return random(h) < 0.5 ? [at, decoy] : [decoy, at];
}

/** Can a cat get at this one? On the ground or up the maple, yes. In the air, or hidden, no. */
const reachable = (a: Animal) => !(a.flying && !a.climbing) && !a.hidden;

/** One of ours that a cat won't face: a predator, on the ground, in the same place. */
export const scarer = (s: GameState, z: ZoneId, zoneOf: (a: Animal) => ZoneId = (a) => a.zone): Animal | undefined =>
  s.animals.find((a) => a.status === 'active' && a.predator && !(a.flying && !a.climbing) && zoneOf(a) === z);

/** One of the large standing guard in the same place: no cat pounces there. */
export const guard = (s: GameState, z: ZoneId, zoneOf: (a: Animal) => ZoneId = (a) => a.zone): Animal | undefined =>
  s.animals.find((a) => a.status === 'active' && a.size === 'large' && zoneOf(a) === z);

/** Whom a cat pounces on where it lies: the smallest of us it can reach, not the large – unless something stops it. */
export function pounced(s: GameState, z: ZoneId, zoneOf: (a: Animal) => ZoneId = (a) => a.zone): Animal | undefined {
  const rank = { small: 0, medium: 1, large: 2 } as const;
  if (s.cats.fed || guard(s, z, zoneOf) || scarer(s, z, zoneOf)) return undefined;
  return s.animals
    .filter((a) => a.status === 'active' && zoneOf(a) === z && a.size !== 'large' && reachable(a))
    .sort((a, b) => rank[a.size] - rank[b.size])[0];
}

/** Where we believe the cats lie: by day we see them; at night only eyes, unless something showed us. */
export const catSigns = (s: GameState): ZoneId[][] =>
  s.cats.at.map((z, i) => (s.time === 'night' && !s.darkRevealed ? s.cats.eyes[i] ?? [z] : [z]));
