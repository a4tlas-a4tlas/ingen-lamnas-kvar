import type { CardKind } from '../engine/types';

/**
 * none       – played directly
 * zone       – the card's owner moves to a chosen zone
 * animal     – targets another animal
 * animalZone – targets an animal, then a zone they move to together
 */
export type TargetSpec = 'none' | 'zone' | 'animal' | 'animalZone';

export interface CardDef {
  name: string;
  cost: number;
  target: TargetSpec;
  /** {o} is replaced by the owner's name. */
  text: string;
}

export const CARDS: Record<CardKind, CardDef> = {
  snabbaTassar: { name: 'Snabba tassar', cost: 1, target: 'zone', text: '{o} springer upp till två steg framåt.' },
  bara: { name: 'Bära', cost: 1, target: 'animalZone', text: '{o} bär ett djur i samma zon ett steg framåt och skyddar det denna timme.' },
  gamlaVagar: { name: 'Gamla vägar', cost: 1, target: 'none', text: '{o} minns trumman under vägen och kryper ner i den. Redan känd: läs nästa timme.' },
  vingar: { name: 'Vingar', cost: 1, target: 'zone', text: '{o} flyger ett steg framåt, kan inte träffas denna timme och ser mörka bilar.' },
  smaSteg: { name: 'Små steg', cost: 0, target: 'zone', text: '{o} trippar ett steg framåt.' },
  gaForst: { name: 'Gå först', cost: 1, target: 'zone', text: '{o} går ett steg framåt. De som blev kvar i zonen får +1 tro.' },
  hallaSigNara: { name: 'Hålla sig nära', cost: 0, target: 'animal', text: '{o} söker sig till ett djur i en närliggande zon. Bandet stärks.' },
  trosta: { name: 'Trösta', cost: 1, target: 'animal', text: '{o} tröstar ett djur inom ett steg: +2 tro, och det följer oss igen.' },
  rusa: { name: 'Rusa', cost: 0, target: 'zone', text: '{o} rusar upp till två steg framåt, men tappar 1 tro.' },
  lasaNatten: { name: 'Läsa natten', cost: 0, target: 'none', text: '{o} lyssnar: se nästa timmes trafik och dra ett kort.' },
  bitaIhop: { name: 'Bita ihop', cost: 1, target: 'none', text: '{o} biter ihop: nästa sår denna timme uteblir.' },
  skratt: { name: 'Ett skratt i mörkret', cost: 1, target: 'none', text: 'Alla i zonen med {o} får +1 tro. +1 hopp.' },
  taEmot: { name: 'Ta emot', cost: 1, target: 'animal', text: '{o} ställer sig framför ett djur i samma zon och tar dess smärta denna timme.' },
  minne: { name: 'Minnet', cost: 0, target: 'none', text: 'Vi minns {o}. Alla som är kvar får +2 tro. Såret öppnas: −1 hopp. Försvinner.' },
};
