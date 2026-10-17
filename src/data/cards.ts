import type { CardKind } from '../engine/types';

/**
 * none       – played directly
 * zone       – the card's owner moves to a chosen zone
 * animal     – targets another animal
 * animalZone – targets an animal, then a zone they move to together
 */
export type TargetSpec = 'none' | 'zone' | 'animal' | 'animalZone';

export type CardTag = 'move' | 'guard' | 'comfort' | 'insight' | 'memory';

export const TAG_NAMES: Record<CardTag, string> = {
  move: 'Rörelse',
  guard: 'Skydd',
  comfort: 'Tröst',
  insight: 'Insikt',
  memory: 'Minne',
};

export interface CardDef {
  name: string;
  cost: number;
  target: TargetSpec;
  tag: CardTag;
  /** {o} is replaced by the owner's name. */
  text: string;
}

export const CARDS: Record<CardKind, CardDef> = {
  snabbaTassar: { name: 'Snabba tassar', cost: 1, target: 'zone', tag: 'move', text: '{o} springer upp till 2 steg.' },
  bara: { name: 'Bära', cost: 1, target: 'animalZone', tag: 'move', text: '{o} bär ett djur från samma zon 1 steg. Det skyddas denna timme.' },
  gamlaVagar: { name: 'Gamla vägar', cost: 1, target: 'none', tag: 'insight', text: 'Visar trumman under vägen – bara små djur får plats. {o} kryper ner. Syns den redan: se nästa timme.' },
  vingar: { name: 'Spana från ovan', cost: 0, target: 'none', tag: 'insight', text: '{o} lyfter och kan inte träffas denna timme. Visar mörka bilar och nästa timmes trafik.' },
  smaSteg: { name: 'Små steg', cost: 0, target: 'zone', tag: 'move', text: '{o} går 1 steg. Kostar inget.' },
  gaForst: { name: 'Gå först', cost: 1, target: 'zone', tag: 'move', text: '{o} går 1 steg. De som står kvar i zonen får +1 tro.' },
  hallaSigNara: { name: 'Hålla sig nära', cost: 0, target: 'animal', tag: 'move', text: '{o} går till ett djur i en grannzon. Bandet stärks.' },
  trosta: { name: 'Trösta', cost: 1, target: 'animal', tag: 'comfort', text: 'Ett djur inom 1 steg från {o} får +2 tro och följer oss igen.' },
  rusa: { name: 'Rusa', cost: 0, target: 'zone', tag: 'move', text: '{o} rusar upp till 2 steg, men tappar 1 tro.' },
  lasaNatten: { name: 'Läsa natten', cost: 0, target: 'none', tag: 'insight', text: 'Se nästa timmes trafik. Dra 1 kort.' },
  bitaIhop: { name: 'Bita ihop', cost: 1, target: 'none', tag: 'guard', text: 'Nästa sår på {o} denna timme uteblir.' },
  skratt: { name: 'Ett skratt i mörkret', cost: 1, target: 'none', tag: 'comfort', text: 'Alla i samma zon som {o} får +1 tro. +1 hopp.' },
  taEmot: { name: 'Ta emot', cost: 1, target: 'animal', tag: 'guard', text: '{o} tar träffen åt ett djur i samma zon denna timme.' },
  minne: { name: 'Minnet', cost: 0, target: 'none', tag: 'memory', text: 'Vi minns {o}. Alla får +2 tro, men −1 hopp. Försvinner efteråt.' },
};
