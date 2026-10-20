// Traits are not cards: they change how one of us is. Each starts with one good
// and one bad; others are earned on the way, and some bad ones fade by the embers.
import type { TraitId } from '../engine/types';

export interface TraitDef {
  name: string;
  /** "Fröna bär Kvarns {noun}" when the trait is carried on by the fire. */
  noun: string;
  good: boolean;
  /** What it does, in a few words. */
  note: string;
  /** Only earned by what happens on the way, never rolled at the start. */
  earned?: boolean;
  /** Two nights in a row by the embers, and it fades. */
  fades?: boolean;
}

export const TRAITS: Record<TraitId, TraitDef> = {
  // Good.
  modig: { name: 'Modig', noun: 'mod', good: true, note: 'Får egen vilja först under 4 tro. Hårdnar av sorg.' },
  lugn: { name: 'Lugn', noun: 'lugn', good: true, note: 'Rusar aldrig iväg.' },
  omtanksam: { name: 'Omtänksam', noun: 'omtanke', good: true, note: 'När den tröstar ger det +1 tro till.' },
  seglivad: { name: 'Seglivad', noun: 'seghet', good: true, note: 'Första skadan i varje fara uteblir.' },
  snabbfotad: { name: 'Snabbfotad', noun: 'snabbhet', good: true, note: 'Första steget i varje fara kostar ingen kraft.' },
  klok: { name: 'Klok', noun: 'klokskap', good: true, note: 'Dess insiktskort drar ett kort till.' },
  // Bad.
  skygg: { name: 'Skygg', noun: 'försiktighet', good: false, note: 'I dagsljus får den egen vilja redan under 6 tro.' },
  hetsig: { name: 'Hetsig', noun: 'hetta', good: false, note: 'Rusar hellre än fryser.', fades: true },
  hungrig: { name: 'Hungrig', noun: 'hunger', good: false, note: 'Jagar vid en tro högre än andra rovdjur – från andra timmen i en fara.' },
  tvivlande: { name: 'Tvivlande', noun: 'tvivel', good: false, note: 'Börjar med en tro mindre.', fades: true },
  ensamvarg: { name: 'Ensamvarg', noun: 'ensamhet', good: false, note: 'Banden växer aldrig över 0.' },
  klumpig: { name: 'Klumpig', noun: 'klumpighet', good: false, note: 'Första steget i varje fara kostar en kraft till.' },
  // Earned on the way.
  hardad: { name: 'Härdad', noun: 'hårdhet', good: true, earned: true, note: 'Räddad i sista stund. Får egen vilja först under 4 tro.' },
  trogen: { name: 'Trogen', noun: 'trohet', good: true, earned: true, note: 'Har tagit en träff för någon. Backar aldrig.' },
  sorjande: { name: 'Sörjande', noun: 'sorg', good: false, earned: true, fades: true, note: 'Har förlorat en nära vän. Får egen vilja redan under 6 tro.' },
  arrad: { name: 'Ärrad', noun: 'ärr', good: false, earned: true, note: 'Bär en skada som inte läker. Fryser lättare.' },
};

export const TRAIT_IDS = Object.keys(TRAITS) as TraitId[];
/** Rolled at the start: one of each. */
export const GOOD_TRAITS = TRAIT_IDS.filter((t) => TRAITS[t].good && !TRAITS[t].earned);
export const BAD_TRAITS = TRAIT_IDS.filter((t) => !TRAITS[t].good && !TRAITS[t].earned);
