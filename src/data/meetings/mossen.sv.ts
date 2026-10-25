// Story parts on the bog: meetings and finds, in frames. Mossen is where we get lost,
// and where we find – or don't find – one another.
import { SPECIES } from '../animals';
import { elderId, nameOf } from '../../engine/roles';
import { isPresent } from '../../engine/rules';
import type { GameState } from '../../engine/types';
import type { MeetingFrame, MeetingOption } from './crow.sv';

const close = (label = 'Gå vidare'): MeetingOption[] => [{ id: 'close', label }];
/** Whoever the last frame spoke of. */
const who = (s: GameState) => nameOf(s, s.meeting?.by);
const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
/** The stranger of the story: "en hare", "Den". */
const en = (s: GameState) => { const k = s.meeting?.kind; return k ? `${SPECIES[k].en} ${SPECIES[k].kindName}` : 'någon'; };
const Den = (s: GameState) => { const k = s.meeting?.kind; return capital(k ? SPECIES[k].den : 'den'); };

/** Den vilsna: someone calling in the mist, lost like we are. */
export const VILSNA: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: (s) => s.meeting?.kind
      ? `Ur dimman hörs ett rop, och sedan ett till. Någon är vilse där ute – ${en(s)}, låter det som. ${Den(s)} ropar på någon som inte svarar.`
      : 'Ur dimman hörs ett rop. Sedan blir det tyst, och vi hör det aldrig igen.',
    options: [
      { id: 'search', when: (s) => !!s.meeting?.kind, label: '”Vi letar.”', effect: 'searchLost', next: 'found' },
      { id: 'on', when: (s) => !!s.meeting?.kind, label: '”Vi kan inte stanna.”', effect: 'leaveLost', next: 'left' },
      { id: 'close', when: (s) => !s.meeting?.kind, label: 'Gå vidare' },
    ],
  },
  found: {
    id: 'found',
    speaker: 'story',
    text: (s) => `Vi går in i dimman, och nästan tappar vi bort ${who(s)} också. Men till slut hittar vi ${s.meeting?.name ?? 'den'}, darrande på en tuva. ”Jag har ingen kvar”, säger ${SPECIES[s.meeting!.kind!].den}.`,
    options: [
      { id: 'join', label: '”Följ med oss.”', effect: 'joinLost', next: 'joined' },
      { id: 'home', label: '”Vi följer dig hem.”', effect: 'homeLost', next: 'home' },
    ],
  },
  joined: {
    id: 'joined',
    speaker: 'story',
    text: (s) => `${s.meeting?.name ?? 'Den'} går tätt intill oss. Ingen av oss släpper den med blicken.`,
    options: close(),
  },
  home: {
    id: 'home',
    speaker: 'story',
    text: (s) => `Vi följer ${s.meeting?.name ?? 'den'} till kanten av mossen, där någon står och väntar. De springer mot varandra. Vi står kvar en stund och ser på.`,
    options: close(),
  },
  left: {
    id: 'left',
    speaker: 'story',
    text: () => 'Vi går vidare. Ropet följer oss länge genom dimman, och sedan inte.',
    options: close(),
  },
};

/** Who of us would stay with the hermit: the one least sure of us. */
export const loneliestId = (s: GameState) => [...s.animals].filter((a) => isPresent(a) && !a.elder).sort((a, b) => a.belief - b.belief)[0]?.id;

/** Eremiten: an old one alone on an islet, by choice – who asks for company. */
export const EREMITEN: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: (s) => `På en holme mitt i mossen bor ${en(s)}, gammal och grå. ${Den(s)} har bott här ensam i många år. ”Jag valde det”, säger ${SPECIES[s.meeting?.kind ?? 'hare'].den}. ”Men ibland … Skulle någon av er vilja stanna?”`,
    options: [
      { id: 'talk', by: elderId, label: '”Sitt med oss en stund.”', effect: 'talkHermit', next: 'talked' },
      { id: 'stay', by: loneliestId, label: '”Jag stannar hos dig.”', effect: 'stayHermit', next: 'stayed' },
      { id: 'no', label: '”Vi måste gå.”', next: 'refused' },
    ],
  },
  talked: {
    id: 'talked',
    speaker: 'story',
    text: (s) => `De gamla sitter tillsammans länge och säger inte mycket. När vi går vet ${who(s)} något nytt${s.meeting?.card ? `: ${s.meeting.card}` : ''}.`,
    options: close(),
  },
  stayed: {
    id: 'stayed',
    speaker: 'story',
    text: (s) => `${who(s)} stannar på holmen. Den gamla lägger huvudet på sned och ser på oss andra. ”Gå nu. Ni har långt kvar.” Det låter som en välsignelse.`,
    options: close(),
  },
  refused: {
    id: 'refused',
    speaker: 'story',
    text: () => 'Den gamla nickar, som om den visste. Den står kvar på holmen och ser efter oss tills dimman tar den.',
    options: close(),
  },
};

/** The one of us carrying the most grief, who hears the dead in the echo. */
export const mournerId = (s: GameState) => [...s.animals].filter((a) => isPresent(a) && a.grief.length).sort((a, b) => b.grief.length - a.grief.length)[0]?.id;

/** Ekot: our calls come back over the bog in the voices of those we have lost. */
export const EKOT: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: (s) => mournerId(s)
      ? `Vi ropar efter varandra i dimman, och ekot svarar. Men det är inte våra röster. ${nameOf(s, mournerId(s))} stannar. ”Det där … det är ju ${s.animals.find((a) => a.id === s.animals.find((x) => x.id === mournerId(s))?.grief[0])?.name ?? 'någon vi har förlorat'}.”`
      : 'Vi ropar efter varandra i dimman, och ekot svarar med våra egna röster, lite för sent. Det är bara mossen som härmar oss.',
    options: [
      { id: 'answer', by: mournerId, label: '”Jag hör dig. Gå nu.”', effect: 'answerEcho', next: 'answered' },
      { id: 'follow', by: mournerId, label: '”Vänta på mig!”', effect: 'followEcho', next: 'followed' },
      { id: 'close', when: (s) => !mournerId(s), label: 'Gå vidare' },
    ],
  },
  answered: {
    id: 'answered',
    speaker: 'story',
    text: (s) => `${who(s)} svarar rösten, och den tystnar. Efteråt går ${who(s)} lättare.`,
    options: close(),
  },
  followed: {
    id: 'followed',
    speaker: 'story',
    text: (s) => `${who(s)} springer in i dimman efter rösten. Vi ropar och ropar. När ${who(s)} kommer tillbaka är ögonen tomma – men sorgen är borta, all på en gång.`,
    options: close(),
  },
};

/** Hjortronmyren: cloudberries everywhere – and we scatter to pick them. */
export const HJORTRON: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: () => 'Mossen lyser orange. Hjortron, överallt, så långt vi ser. Det luktar sommar.',
    options: [
      { id: 'pick', label: '”Plocka!”', effect: 'cloudberries', next: 'picked' },
      { id: 'on', label: '”Vi går vidare.”' },
    ],
  },
  picked: {
    id: 'picked',
    speaker: 'story',
    text: () => 'Vi sprider ut oss och äter tills vi är mätta. När vi ropar på varandra igen tar det lång tid innan alla svarat.',
    options: close(),
  },
};

/** Det tomma boet: a crane's empty nest, dry and warm – for those who have someone close. */
export const BOET: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: () => 'En tranas bo, stort som en grop, fodrat med starr och fjädrar. Tomt. Ungarna har flugit.',
    options: [
      { id: 'rest', label: '”Vi vilar här.”', effect: 'restNest', next: 'rested' },
      { id: 'on', label: '”Vi går vidare.”' },
    ],
  },
  rested: {
    id: 'rested',
    speaker: 'story',
    text: () => 'Vi sover tätt ihop i boet. De som står varandra nära kryper ännu närmare. Den som inte har någon ligger vid kanten och ser på stjärnorna.',
    options: close(),
  },
};

/** Ryggsäcken: a lost hiker's pack, with a map – and the smell of people. */
export const RYGGSACKEN: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: () => 'En ryggsäck ligger i starren, blöt och bortglömd. Det luktar människa om den.',
    options: [
      { id: 'search', label: '”Vi letar i den.”', effect: 'backpack', next: 'searched' },
      { id: 'on', label: '”Vi låter den vara.”' },
    ],
  },
  searched: {
    id: 'searched',
    speaker: 'story',
    text: () => 'I ryggsäcken: en smörgås, en vante – och en karta, där mossen är ritad med blyerts. Någon har gått här förut.',
    options: close(),
  },
};

/** Myrstjärnan: a still pool that mirrors the sky – where each of us sees where we came from. */
export const TJARNEN: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: () => 'En liten rund tjärn, alldeles stilla. Himlen ligger i den, och när vi lutar oss fram ser vi något annat också.',
    options: [
      { id: 'look', label: '”Vi ser ner i vattnet.”', effect: 'tarn', next: 'looked' },
      { id: 'on', label: '”Vi går vidare.”' },
    ],
  },
  looked: {
    id: 'looked',
    speaker: 'story',
    text: (s) => `Var och en ser platsen där vi kom ifrån. Vi står länge vid tjärnen. När vi går vidare ${s.clock === 'day' ? 'har solen hunnit gå upp' : 'har det hunnit bli mörkt'}.`,
    options: close(),
  },
};
