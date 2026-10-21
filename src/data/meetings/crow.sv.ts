// Kråkan vid elden: a meeting in frames. The crow speaks; we answer – Eden, or
// one of the animals in its own way. Effects are carried out by the engine.
import { place } from '../journey';
import { unseenAhead } from '../../engine/campfire';
import { isPresent } from '../../engine/rules';
import { elderId, flierId, guideHere, guideKind, guideName, kin, kinId, hungryId, nameOf } from '../../engine/roles';
import type { GameState } from '../../engine/types';

export type MeetingEffect =
  | 'listen'
  | 'owlHunt'
  | 'restHollow'
  | 'accept'
  | 'reject'
  | 'back'
  | 'object'
  | 'mock'
  | 'payCard'
  | 'payEmber'
  | 'kvarnHint'
  | 'trick'
  | 'sotfotDark'
  | 'owlScare'
  | 'story'
  // Dalen's finds and meetings.
  | 'berries'
  | 'berriesCareful'
  | 'learnPath'
  | 'restDen'
  | 'ljungDigs'
  | 'stayDeer'
  | 'ljungDeer'
  | 'truceTest'
  | 'sneak'
  | 'sotfotSteals'
  | 'fronaBasket'
  | 'shareCard'
  | 'chaseFox'
  | 'readTracks'
  | 'followTracks'
  | 'comfortKvarn'
  | 'doubtKvarn'
  | 'guessWay'
  // Åkrarna's finds and meetings.
  | 'crowFled'
  | 'helpFurrow'
  | 'joinFurrow'
  | 'peaceFurrow'
  | 'leaveFurrow'
  | 'scarecrow'
  | 'crowFlock'
  | 'crowFlockScare'
  | 'crowFlockMob'
  | 'crowFlockPay'
  | 'grain'
  | 'miceStay'
  | 'miceNeeded'
  | 'miceCarry'
  | 'restTractor'
  | 'hareKinJoins'
  | 'hareStays'
  | 'hareGoodbye'
  | 'hareTracks'
  // Between two regions.
  | 'lookBack'
  | 'chooseRegion';

export interface MeetingOption {
  id: string;
  /** The animal who speaks the reply; none means Eden – all of us. It may depend on who is with us. */
  by?: string | ((s: GameState) => string | undefined);
  label: string | ((s: GameState) => string);
  /** Only offered when this holds (beyond the speaker being with us). */
  when?: (s: GameState) => boolean;
  /** For gambles: the chance it works, shown with the reply. */
  chance?: (s: GameState) => number;
  /** Ask for a card from the deck before answering. */
  pickCard?: boolean;
  effect?: MeetingEffect;
  /** The next frame; none ends the meeting. A gamble may change it. */
  next?: string;
  /** For gambles the engine rolls: the frame when it fails. */
  failNext?: string;
}

export interface MeetingFrame {
  id: string;
  /** Who speaks: the crow, the one asking a promise of us, or the story itself. */
  speaker: 'crow' | 'proposer' | 'story';
  text: (s: GameState) => string;
  /** A paper card shown with the words: a promise and what it binds us to. */
  card?: (s: GameState) => { title: string; lines: string[] };
  options: MeetingOption[];
}

const fox = (s: GameState) => kin(s, 'fox');
/** The fox's trick works as often as the fox believes in us. */
export const trickChance = (s: GameState) => Math.min(0.9, (fox(s)?.belief ?? 0) / 10);
const wrongAhead = (s: GameState) => unseenAhead(s).filter((id) => s.journey.guess[id] !== s.journey.truth[id]).length;

export const CROW: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'crow',
    text: (s) => 'En kråka landar på en gren strax utanför glöden och lägger huvudet på sned. ”Ni går mot åkrarna. Jag har sett vägen från ovan – allt det er ' + guideKind(s) + ' bara minns. Men inget är gratis.”',
    options: [
      { id: 'ask', label: '”Vad vill du ha?”', next: 'price' },
      { id: 'guide', by: (s) => guideHere(s)?.id, label: '”Jag minns vägen själv, tack.”', effect: 'kvarnHint', next: 'guide' },
      { id: 'fox', by: kinId('fox'), label: '”Vi kanske kan hjälpa varandra…”', next: 'fox' },
      { id: 'owl', by: flierId, label: (s) => `${nameOf(s, flierId(s))} lyfter vingarna.`, next: 'owl' },
      { id: 'lonely', by: elderId, label: '”Varför sitter du här ensam, kråka?”', next: 'lonely' },
      { id: 'snake', by: hungryId, label: '”Kom lite närmare, fågel.”', effect: 'crowFled', next: 'fled' },
      { id: 'no', label: '”Nej tack. Flyg vidare.”', next: 'refused' },
    ],
  },
  price: {
    id: 'price',
    speaker: 'crow',
    text: () => '”Ett kort ur er lek – vilket ni vill. Eller en plats vid er glöd i natt. Jag fryser också.”',
    options: [
      { id: 'card', label: 'Ge ett kort', pickCard: true, effect: 'payCard', next: 'told' },
      { id: 'ember', label: 'Ge en plats vid glöden', effect: 'payEmber', next: 'told' },
      { id: 'tooMuch', label: '”Det är för dyrt.”', next: 'refused' },
    ],
  },
  guide: {
    id: 'guide',
    speaker: 'crow',
    text: (s) => {
      const n = wrongAhead(s);
      return n === 0
        ? `”Minns du? Hm. Den här gången minns du faktiskt rätt, ${guideKind(s)}. Synd för mig.” ${guideName(s)} sträcker på sig.`
        : `”Minns du? Du minns fel om ${n === 1 ? 'något' : 'mer än en sak'} där framme, ${guideKind(s)}. Men vad?” ${guideName(s)} tittar ner i marken.`;
    },
    options: [{ id: 'back', label: 'Fortsätt', next: 'start' }],
  },
  fox: {
    id: 'fox',
    speaker: 'crow',
    text: () => '”En räv som vill byta. Det brukar sluta illa för kråkor.”',
    options: [
      { id: 'trick', by: kinId('fox'), label: '”Jag ger dig något bättre än ett kort – en hemlighet.”', chance: trickChance, effect: 'trick', next: 'told' },
      { id: 'dark', by: kinId('fox'), label: '”Ta min plats vid glöden. Jag sitter i mörkret.”', effect: 'sotfotDark', next: 'told' },
      { id: 'eden', label: '”Låt oss tala om priset.”', next: 'price' },
    ],
  },
  owl: {
    id: 'owl',
    speaker: 'crow',
    text: () => 'Kråkan studsar bakåt på grenen. ”En uggla! Håll den där borta från mig!”',
    options: [
      { id: 'scare', by: flierId, label: (s) => `${nameOf(s, flierId(s))} slår ut med vingarna.`, effect: 'owlScare', next: 'fled' },
      { id: 'self', by: flierId, label: '”Jag kan flyga dit själv i natt.”', next: 'offended' },
      { id: 'calm', by: flierId, label: (s) => `${nameOf(s, flierId(s))} drar sig tillbaka i mörkret.`, next: 'start' },
    ],
  },
  lonely: {
    id: 'lonely',
    speaker: 'crow',
    text: () => 'Kråkan blir tyst en stund. ”Min flock fanns i dalen. Maskinerna tog träden först.”',
    options: [
      { id: 'story', by: elderId, label: '”Sitt med oss en stund. Jag berättar om dalen.”', effect: 'story', next: 'told' },
      { id: 'nod', by: elderId, label: (s) => `${nameOf(s, elderId(s))} nickar och säger inget mer.`, next: 'start' },
    ],
  },
  told: {
    id: 'told',
    speaker: 'crow',
    text: (s) => {
      const lines = (s.meeting?.told ?? []).map((id) => {
        const p = place(s, id);
        const truth = s.journey.truth[id] ?? 'normal';
        return `${p.name}: ${p.memory![truth]}${s.journey.guess[id] !== truth ? ` – er ${guideKind(s)} minns fel` : ''}.`;
      });
      return `Kråkan lutar sig fram. ”Lyssna noga, då.” ${lines.join(' ') || '”Men jag har inget att berätta som ni inte redan vet.”'}`;
    },
    options: [{ id: 'thanks', label: '”Tack.”' }],
  },
  snatched: {
    id: 'snatched',
    speaker: 'story',
    text: (s) => `Kråkan skrattar sitt hesa skratt, hugger ett av ${nameOf(s, kinId('fox')(s), 'rävens')}s kort i näbben och är borta i mörkret innan någon hinner röra sig.`,
    options: [{ id: 'close', label: 'Fortsätt' }],
  },
  fled: {
    id: 'fled',
    speaker: 'story',
    text: () => 'Kråkan skriker till och flyger upp i granen. Den kommer inte tillbaka i natt.',
    options: [{ id: 'close', label: 'Fortsätt' }],
  },
  offended: {
    id: 'offended',
    speaker: 'story',
    text: (s) => `”Gör det, då.” Kråkan vänder ryggen till och flyger. ${nameOf(s, s.meeting?.by, 'Ugglan')} kan spana själv i natt – på platsen ”Spanar” vid elden.`,
    options: [{ id: 'close', label: 'Fortsätt' }],
  },
  refused: {
    id: 'refused',
    speaker: 'story',
    text: () => 'Kråkan rycker på vingarna. ”Som ni vill. Ni får se själva.” Den flyger ut i mörkret.',
    options: [{ id: 'close', label: 'Fortsätt' }],
  },
};

/** Whether one of us is still with us, by id. */
export const isHere = (s: GameState, id: string) => s.animals.some((a) => a.id === id && isPresent(a));
