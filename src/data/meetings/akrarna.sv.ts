// Story parts out on the fields: meetings and finds, in frames.
import { SPECIES } from '../animals';
import { elderId, flierId, kin, kinId, nameOf } from '../../engine/roles';
import { isPresent } from '../../engine/rules';
import type { GameState } from '../../engine/types';
import type { MeetingFrame, MeetingOption } from './crow.sv';

const close = (label = 'Gå vidare'): MeetingOption[] => [{ id: 'close', label }];
/** Whoever the last frame spoke of. */
const who = (s: GameState) => nameOf(s, s.meeting?.by);
const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** How we treated the crow at the fire, as the crows remember it. */
export type CrowMemory = 'kind' | 'cruel' | 'none';
export function crowMemory(s: GameState): CrowMemory {
  if (s.knowledge.includes('krakanLurad') || s.knowledge.includes('krakanSkramd')) return 'cruel';
  if (s.knowledge.includes('krakanBetald')) return 'kind';
  return 'none';
}

/** The one in the furrow: a hedgehog, or someone else when a hedgehog is already one of us. */
const trapped = (s: GameState) => s.meeting?.kind;
const en = (s: GameState) => { const k = trapped(s); return k ? `${SPECIES[k].en} ${SPECIES[k].kindName}` : 'någon'; };
const Den = (s: GameState) => { const k = trapped(s); return capital(k ? SPECIES[k].den : 'den'); };
/** The first large one of us, who can lift. */
const largeId = (s: GameState) => s.animals.find((a) => isPresent(a) && a.size === 'large')?.id;

/** Igelkotten i fåran: someone rolled up in a furrow too deep to climb out of. */
export const FARAN: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: (s) => trapped(s)
      ? `I en djup fåra ligger ${en(s)} och kommer inte upp. ${Den(s)} har grävt och grävt, och jorden rasar tillbaka. ${Den(s)} ser på oss.`
      : 'En djup fåra. Någon har legat här och grävt – men nu är den tom.',
    options: [
      { id: 'help', when: (s) => !!trapped(s), label: '”Vi hjälper dig upp.”', effect: 'helpFurrow', next: 'helped' },
      { id: 'lift', by: largeId, when: (s) => !!trapped(s), label: '”Jag lyfter.”', effect: 'helpFurrow', next: 'helped' },
      { id: 'leave', when: (s) => !!trapped(s), label: '”Vi kan inte stanna.”', effect: 'leaveFurrow', next: 'left' },
      { id: 'close', when: (s) => !trapped(s), label: 'Gå vidare' },
    ],
  },
  helped: {
    id: 'helped',
    speaker: 'story',
    text: (s) => `${s.meeting?.name ?? 'Den'} skakar av sig jorden och ser länge på oss. ”Ni stannade. Ingen stannar.” Sedan, tyst: ”Får jag gå med er?”`,
    options: [
      { id: 'join', label: '”Följ med oss.”', effect: 'joinFurrow', next: 'joined' },
      { id: 'peace', label: '”Gå i frid.”', effect: 'peaceFurrow', next: 'parted' },
    ],
  },
  joined: {
    id: 'joined',
    speaker: 'story',
    text: (s) => `${s.meeting?.name ?? 'Den'} går med oss nu. Ingen av oss vet vart, men vi vet att vi går tillsammans.`,
    options: close(),
  },
  parted: {
    id: 'parted',
    speaker: 'story',
    text: (s) => `${s.meeting?.name ?? 'Den'} försvinner mellan raderna. Det kommer att minnas oss.`,
    options: close(),
  },
  left: {
    id: 'left',
    speaker: 'story',
    text: () => 'Vi går vidare. Bakom oss hörs jorden rasa i fåran, och sedan ingenting.',
    options: close(),
  },
};

/** Fågelskrämman: shade and quiet – and the crows, who remember the one at our fire. */
export const SKRAMMAN: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: () => 'Mitt på fältet står en fågelskrämma i rock och hatt. I dess skugga är det svalt och stilla. På armarna sitter kråkor.',
    options: [
      { id: 'rest', label: '”Vi vilar här en stund.”', effect: 'scarecrow', next: 'quiet' },
      { id: 'on', label: '”Vi går vidare.”' },
    ],
  },
  quiet: {
    id: 'quiet',
    speaker: 'story',
    text: () => 'Kråkorna cirklar högt över fältet. De vet inte vilka vi är. Vi vilar, och de skadade får en stund.',
    options: close(),
  },
  calm: {
    id: 'calm',
    speaker: 'story',
    text: () => 'Kråkorna landar på skrämmans armar och ser på oss. En av dem nickar. De minns kråkan vid vår eld – och låter oss vila.',
    options: close(),
  },
  pecked: {
    id: 'pecked',
    speaker: 'story',
    text: () => 'Kråkorna kommer i ett svart moln och skriker. De minns vad vi gjorde mot en av dem vid elden.',
    options: close(),
  },
};

/** Kråkflocken: the crow's family on the power line. They know us already – or they don't. */
export const KRAKFLOCKEN: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'crow',
    text: (s) => {
      const m = crowMemory(s);
      if (m === 'kind') return 'På elledningen sitter tjugo kråkor. ”Ni är de som var vänliga mot vår syster”, säger den största. ”Hon sa att ni delar med er.”';
      if (m === 'cruel') return 'På elledningen sitter tjugo kråkor. De skriker när de ser oss. ”Där är de! De som lurade vår syster!”';
      return 'På elledningen sitter tjugo kråkor och tittar ner på oss. ”Vi har sett vägen ni ska gå. Vill ni veta? Allt har ett pris.”';
    },
    options: [
      { id: 'listen', when: (s) => crowMemory(s) === 'kind', label: '”Vi lyssnar gärna.”', effect: 'crowFlock', next: 'told' },
      { id: 'scare', by: (s) => flierId(s) ?? kinId('fox')(s), when: (s) => crowMemory(s) === 'cruel', label: '”Flyg härifrån!”', effect: 'crowFlockScare', next: 'scared' },
      { id: 'endure', when: (s) => crowMemory(s) === 'cruel', label: '”Vi går vidare, med huvudet lågt.”', effect: 'crowFlockMob', next: 'mobbed' },
      { id: 'pay', when: (s) => crowMemory(s) === 'none', pickCard: true, label: '”Ta ett kort, och berätta.”', effect: 'crowFlockPay', next: 'told' },
      { id: 'no', when: (s) => crowMemory(s) !== 'cruel', label: '”Nej tack.”' },
    ],
  },
  told: {
    id: 'told',
    speaker: 'crow',
    text: () => 'Kråkorna berättar, alla på en gång, om vad som väntar framför oss.',
    options: close('Tack'),
  },
  scared: {
    id: 'scared',
    speaker: 'story',
    text: (s) => `Flocken lyfter, skrikande, när ${who(s)} kommer emot dem. De följer oss på avstånd hela vägen till fältets ände.`,
    options: close(),
  },
  mobbed: {
    id: 'mobbed',
    speaker: 'story',
    text: () => 'De hackar och skriker efter oss hela vägen till fältets ände. Ingen av oss säger något.',
    options: close(),
  },
};

/** Spillsäd: grain spilled along the field's edge – enough for a winter, and the mice know it. */
export const SPILLSAD: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: () => 'Någon har tappat säd längs fältkanten. Korn, i högar. Mat för en vecka – för en vinter, kanske.',
    options: [
      { id: 'eat', label: '”Ät!”', effect: 'grain', next: 'ate' },
      { id: 'on', label: '”Vi har inte tid.”' },
    ],
  },
  mice: {
    id: 'mice',
    speaker: 'story',
    text: (s) => `${kin(s, 'mice')?.name ?? 'Mössen'} vill inte gå härifrån. ”Här finns mat för en hel vinter. Varför ska vi gå vidare?”`,
    options: [
      { id: 'stay', label: '”Stanna då.”', effect: 'miceStay', next: 'stayed' },
      { id: 'need', by: elderId, label: '”Vi behöver er.”', effect: 'miceNeeded', next: 'ate' },
      { id: 'carry', label: '”Ta med er så mycket ni bär.”', effect: 'miceCarry', next: 'carried' },
    ],
  },
  ate: {
    id: 'ate',
    speaker: 'story',
    text: () => 'Vi äter tills vi inte orkar mer. Det är länge sedan någon av oss var mätt.',
    options: close(),
  },
  carried: {
    id: 'carried',
    speaker: 'story',
    text: (s) => `${kin(s, 'mice')?.name ?? 'Mössen'} fyller kinderna och går med oss, tunga och glada. Vi andra får gå långsammare.`,
    options: close(),
  },
  stayed: {
    id: 'stayed',
    speaker: 'story',
    text: (s) => `${who(s)} stannar vid säden. Vi ser dem länge när vi går – små prickar i det gula.`,
    options: close(),
  },
};

/** Den övergivna traktorn: a dry, still cab to sleep in – that smells of the machines. */
export const TRAKTORN: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: () => 'En gammal traktor står övergiven vid fältkanten, rostig och tyst. Hytten är torr. Det har inte regnat in på länge.',
    options: [
      { id: 'rest', label: '”Vi vilar i hytten.”', effect: 'restTractor', next: 'rested' },
      { id: 'on', label: '”Vi går vidare.”' },
    ],
  },
  rested: {
    id: 'rested',
    speaker: 'story',
    text: (s) => `Vi sover tätt ihop i hytten, och det som gör ont får vila. Men det luktar diesel, och ${who(s)} drömmer om maskinerna.`,
    options: close(),
  },
};

/** Haren på åkern: a hare's own, out in the furrows – if a hare is with us. */
export const HAREN: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: (s) => {
      const h = kin(s, 'hare');
      return h
        ? `I fårorna rör sig något: harar, ${h.name}s egna. De reser sig på bakbenen och ser på ${h.name}. Ingen av dem säger något på länge.`
        : 'Harspår korsar fältet, åt alla håll. Någon lever här ännu.';
    },
    options: [
      { id: 'join', when: (s) => !!kin(s, 'hare'), label: '”Följ med oss, en av er.”', effect: 'hareKinJoins', next: 'joined' },
      { id: 'stay', by: kinId('hare'), label: '”Jag stannar med dem.”', effect: 'hareStays', next: 'stayed' },
      { id: 'goodbye', by: kinId('hare'), label: '”Jag har ett annat hem nu.”', effect: 'hareGoodbye', next: 'bye' },
      { id: 'tracks', when: (s) => !kin(s, 'hare'), label: 'Gå vidare', effect: 'hareTracks' },
    ],
  },
  joined: {
    id: 'joined',
    speaker: 'story',
    text: (s) => `${s.meeting?.name ?? 'En av dem'} hoppar fram och ställer sig bredvid ${kin(s, 'hare')?.name ?? 'oss'}.`,
    options: close(),
  },
  stayed: {
    id: 'stayed',
    speaker: 'story',
    text: (s) => `${who(s)} stannar med sina egna. Vi ser efter dem tills fårorna tar dem.`,
    options: close(),
  },
  bye: {
    id: 'bye',
    speaker: 'story',
    text: (s) => `${who(s)} vänder sig mot oss igen. Bakom oss står hararna kvar, tysta.`,
    options: close(),
  },
};
