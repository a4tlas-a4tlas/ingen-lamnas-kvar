import type { VerseId } from '../engine/types';

export interface VerseDef {
  text: string;
  flippedText: string;
  /** What the verse gives while it holds. */
  promise: string;
  /** What breaks it. */
  breaks: string;
  /** What the rewritten story costs. */
  flipCost: string;
}

export const VERSES: Record<VerseId, VerseDef> = {
  ingenLamnas: {
    text: 'Ingen lämnas kvar.',
    flippedText: 'Någon lämnades kvar.',
    promise: 'Ingen tappar hela sin tro. Ingen lämnar oss.',
    breaks: 'Om vi låter någon gå, eller om någon blir kvar när gryningen kommer.',
    flipCost: '−2 hopp, alla −1 tro, och tron kan nu ta slut.',
  },
  viJagarInte: {
    text: 'Vi jagar inte varandra.',
    flippedText: 'Vi jagade varandra.',
    promise: 'Rovdjuren håller freden tills tron nästan är borta.',
    breaks: 'Om ett rovdjur jagar en av oss.',
    flipCost: '−1 hopp, bytesdjuren −1 tro, och freden brister mycket lättare.',
  },
  denStarke: {
    text: 'Den starke bär den svage.',
    flippedText: 'Den svage bars inte.',
    promise: 'Att bära kostar ingen kraft.',
    breaks: 'Om musfamiljen förlorar någon på vägen.',
    flipCost: '−1 hopp, och att bära kostar 2 kraft.',
  },
  denAldste: {
    text: 'Vi lyssnar på den äldste.',
    flippedText: 'Den äldste tystnade.',
    promise: 'Gamla Ljung tvivlar aldrig, och ingen fryser i hens närhet.',
    breaks: 'Om Gamla Ljung dör eller lämnas.',
    flipCost: '−1 hopp och alla −1 tro.',
  },
  manen: {
    text: 'Vi går när månen gömmer sig.',
    flippedText: 'Vi gick i månens ljus.',
    promise: '+1 kraft de timmar då månen gömmer sig.',
    breaks: 'Om vi för ut någon på asfalten medan månen lyser.',
    flipCost: '−1 hopp, och −1 kraft när månen lyser.',
  },
  ingenEnsam: {
    text: 'Ingen går ensam.',
    flippedText: 'Någon gick ensam.',
    promise: 'När vi för ett djur till någon det står nära får båda +1 tro.',
    breaks: 'Om någon står ensam på vägen när timmen tar slut.',
    flipCost: '−1 hopp och alla band försvagas.',
  },
};

export const VERSE_IDS = Object.keys(VERSES) as VerseId[];
