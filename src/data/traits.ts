import type { CardKind, TraitId } from '../engine/types';

export interface TraitDef {
  name: string;
  card: CardKind;
  /** How this trait colours an animal's own will when it doubts. */
  note: string;
}

export const TRAITS: Record<TraitId, TraitDef> = {
  modig: { name: 'Modig', card: 'gaForst', note: 'Tvivlar mer sällan. Hårdnar av sorg.' },
  skygg: { name: 'Skygg', card: 'hallaSigNara', note: 'Fryser lätt i ljuset.' },
  omtanksam: { name: 'Omtänksam', card: 'trosta', note: 'Ser de andra.' },
  otalig: { name: 'Otålig', card: 'rusa', note: 'Rusar hellre än väntar.' },
  klok: { name: 'Klok', card: 'lasaNatten', note: 'Lyssnar till vägen.' },
  envis: { name: 'Envis', card: 'bitaIhop', note: 'Hårdnar av sorg.' },
  lekfull: { name: 'Lekfull', card: 'skratt', note: 'Bär ljus i mörkret.' },
  trogen: { name: 'Trogen', card: 'taEmot', note: 'Går aldrig ifrån den som behöver.' },
};

export const TRAIT_IDS = Object.keys(TRAITS) as TraitId[];
