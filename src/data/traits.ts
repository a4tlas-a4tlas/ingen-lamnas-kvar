import type { CardKind, TraitId } from '../engine/types';

export interface TraitDef {
  name: string;
  /** "Fröna bär Kvarns {noun}" when the trait is inherited by the fire. */
  noun: string;
  card: CardKind;
  /** How this trait colours an animal's own will when it doubts. */
  note: string;
}

export const TRAITS: Record<TraitId, TraitDef> = {
  modig: { name: 'Modig', noun: 'mod', card: 'gaForst', note: 'Tvivlar mer sällan. Hårdnar av sorg.' },
  skygg: { name: 'Skygg', noun: 'försiktighet', card: 'hallaSigNara', note: 'Fryser lätt i ljuset.' },
  omtanksam: { name: 'Omtänksam', noun: 'omtanke', card: 'trosta', note: 'Ser de andra.' },
  otalig: { name: 'Otålig', noun: 'otålighet', card: 'rusa', note: 'Rusar hellre än väntar.' },
  klok: { name: 'Klok', noun: 'klokskap', card: 'lasaNatten', note: 'Lyssnar till vägen.' },
  envis: { name: 'Envis', noun: 'envishet', card: 'bitaIhop', note: 'Hårdnar av sorg.' },
  lekfull: { name: 'Lekfull', noun: 'lekfullhet', card: 'skratt', note: 'Bär ljus i mörkret.' },
  trogen: { name: 'Trogen', noun: 'trohet', card: 'taEmot', note: 'Går aldrig ifrån den som behöver.' },
};

export const TRAIT_IDS = Object.keys(TRAITS) as TraitId[];
