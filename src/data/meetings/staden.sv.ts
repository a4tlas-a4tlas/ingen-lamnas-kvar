// Story parts in the city: meetings and finds, in frames.
import { nameOf } from '../../engine/roles';
import { bond, isPresent } from '../../engine/rules';
import type { GameState } from '../../engine/types';
import type { MeetingFrame, MeetingOption } from './crow.sv';

const close = (label = 'Gå vidare'): MeetingOption[] => [{ id: 'close', label }];
/** Whoever the last frame spoke of. */
const who = (s: GameState) => nameOf(s, s.meeting?.by);

/** The first of our predators, whom the pigeons won't come near. */
const predatorId = (s: GameState) => s.animals.find((a) => isPresent(a) && a.predator)?.id;

/** Duvorna: pigeons on a gutter, who know every roof in the city – for a price. */
export const DUVORNA: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: (s) => predatorId(s)
      ? `På en takränna sitter duvor i en lång rad. De kuttrar och ser ner på oss – på ${nameOf(s, predatorId(s))} mest. Ingen av dem flyger ner.`
      : 'På en takränna sitter duvor i en lång rad. En av dem flaxar ner framför oss. ”Ni är inte härifrån. Man går inte på gatorna här. Man går över taken.”',
    options: [
      { id: 'back', by: predatorId, label: '”Jag håller mig undan.”', effect: 'pigeonsStepBack', next: 'price' },
      { id: 'pay', when: (s) => !predatorId(s), pickCard: true, label: '”Ta ett kort, och visa oss.”', effect: 'pigeonsPay', next: 'roofs' },
      { id: 'no', label: '”Vi går vidare.”' },
    ],
  },
  price: {
    id: 'price',
    speaker: 'story',
    text: (s) => `${who(s)} drar sig bakåt in i skuggan. Då flaxar en duva ner. ”Ni är inte härifrån. Man går inte på gatorna här. Man går över taken – om ni har något åt oss.”`,
    options: [
      { id: 'pay', pickCard: true, label: '”Ta ett kort, och visa oss.”', effect: 'pigeonsPay', next: 'roofs' },
      { id: 'no', label: '”Nej tack.”' },
    ],
  },
  roofs: {
    id: 'roofs',
    speaker: 'story',
    text: () => 'Duvorna flyger före, från tak till tak: en brandstege, ett plank, ett garagetak. Härifrån når vi vart vi vill.',
    options: close('Över taken'),
  },
};

/** The fawn if one is with us, otherwise the most trusting of the prey: the one who wanted to be seen. */
export const childsFriendId = (s: GameState) =>
  s.animals.find((a) => isPresent(a) && a.species === 'fawn')?.id
  ?? [...s.animals].filter((a) => isPresent(a) && !a.predator).sort((a, b) => b.belief - a.belief)[0]?.id;

/** Barnet vid fönstret: a child with its nose to the glass, who sees us – and remembers. */
export const BARNET: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: () => 'I ett fönster alldeles vid marken lyser det. Ett barn i pyjamas står med näsan mot rutan och ser rakt på oss. Det rör sig inte. Inte vi heller.',
    options: [
      { id: 'still', label: '”Vi står still. Låt det se oss.”', effect: 'seenByChild', next: 'seen' },
      { id: 'hide', label: '”Göm er!”', effect: 'hideFromChild', next: 'hidden' },
    ],
  },
  seen: {
    id: 'seen',
    speaker: 'story',
    text: () => 'Barnet försvinner från fönstret. Snart glider dörren upp på glänt: en skål vatten, och en gammal tröja att ligga på. Sedan stängs den, tyst. I fönstret vinkar någon.',
    options: close(),
  },
  hidden: {
    id: 'hidden',
    speaker: 'story',
    text: (s) => `Vi trycker oss mot muren tills fönstret släcks. ${who(s)} ser länge upp mot rutan. ”Det ville bara titta.”`,
    options: close(),
  },
};

/** The one the city fox tempts, and whether that one is too sure of us to listen. */
const tempted = (s: GameState) => s.animals.find((a) => a.id === s.meeting?.tempted && isPresent(a));
const steadfast = (s: GameState) => (tempted(s)?.belief ?? 0) >= 5;
/** One of us close enough to the tempted one to hold it back. */
const holderId = (s: GameState) => {
  const t = tempted(s);
  return t ? s.animals.find((a) => a !== t && isPresent(a) && bond(s, a.id, t.id) >= 2)?.id : undefined;
};

/** Stadsräven: a fat city fox behind the butcher's, who shows our hunters there is meat every night. */
export const STADSRAVEN: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: (s) => {
      const t = tempted(s);
      if (!t) return 'Bakom slaktaren sitter en räv, tjock och blank i pälsen. Den ser länge på våra små, slickar sig om munnen, och lunkar sedan in i mörkret igen.';
      return `Bakom slaktaren sitter en räv, tjock och blank i pälsen. ”Här slänger de ut kött varje kväll”, säger den till ${t.name}. ”Varför springa? Stanna. Ingen jagar oss här.”`;
    },
    options: [
      { id: 'refuse', by: (s) => tempted(s)?.id, when: steadfast, label: '”Nej. Jag hör till dem.”', effect: 'foxRefuses', next: 'refused' },
      { id: 'hold', by: holderId, when: (s) => !!tempted(s) && !steadfast(s), label: '”Vi behöver dig.”', effect: 'foxHold', next: 'held' },
      { id: 'feast', when: (s) => !!tempted(s) && !steadfast(s), label: '”Ät, och följ sedan med oss.”', effect: 'foxFeast', next: 'fed' },
      { id: 'stay', when: (s) => !!tempted(s) && !steadfast(s), label: '”Stanna då.”', effect: 'foxTempts', next: 'stayed' },
      { id: 'close', when: (s) => !tempted(s), label: 'Gå vidare', effect: 'foxEyes' },
    ],
  },
  refused: {
    id: 'refused',
    speaker: 'story',
    text: (s) => `Stadsräven fnyser, men knuffar fram ett ben ändå. ${who(s)} och våra andra jägare äter sig mätta. Sedan går vi.`,
    options: close(),
  },
  held: {
    id: 'held',
    speaker: 'story',
    text: (s) => `${nameOf(s, s.meeting?.tempted)} ser länge på köttet, och sedan på ${who(s)}. Till slut vänder ${nameOf(s, s.meeting?.tempted)} sig om och följer med oss. Men ser sig om, gång på gång.`,
    options: close(),
  },
  fed: {
    id: 'fed',
    speaker: 'story',
    text: (s) => `Våra jägare äter tills de inte orkar mer. Sedan följer ${who(s)} med oss, tung och tyst, och tänker på dörren bakom slaktaren.`,
    options: close(),
  },
  stayed: {
    id: 'stayed',
    speaker: 'story',
    text: (s) => `${who(s)} stannar hos stadsräven. När vi ser oss om sitter de bredvid varandra under lampan och äter.`,
    options: close(),
  },
};

/** Who of us has a nose for what's still good to eat. */
export const noseId = (s: GameState) => (['badger', 'mice', 'fox'] as const).map((k) => s.animals.find((a) => a.species === k && isPresent(a))?.id).find(Boolean);

/** Soptunnan: the bins behind a restaurant. Food – and something rotten. */
export const SOPTUNNAN: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: () => 'Bakom en restaurang står soptunnorna i en rad. Det luktar – av allt på en gång. Locket på den närmaste står på glänt.',
    options: [
      { id: 'eat', label: '”Välta den!”', effect: 'binEat', next: 'ate' },
      { id: 'sniff', by: noseId, label: '”Låt mig välja.”', effect: 'binSniff', next: 'sniffed' },
      { id: 'on', label: '”Vi går vidare.”' },
    ],
  },
  ate: {
    id: 'ate',
    speaker: 'story',
    text: () => 'Tunnan välter med ett brak. Bröd, fett, ben – mer mat än vi har sett på länge. Vi äter tills vi inte orkar.',
    options: close(),
  },
  sick: {
    id: 'sick',
    speaker: 'story',
    text: (s) => `Tunnan välter med ett brak, och vi äter tills vi inte orkar. Men något var ruttet, och ${who(s)}, som åt mest, mår illa hela vägen därifrån.`,
    options: close(),
  },
  sniffed: {
    id: 'sniffed',
    speaker: 'story',
    text: (s) => `${who(s)} nosar länge och drar fram det som är gott: brödkanter, en korvbit, äppelskruttar. Resten får ligga.`,
    options: close(),
  },
};

/** Kolonilotten: little gardens, and a compost heap warm as a bed. We sleep too long. */
export const KOLONILOTTEN: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: () => 'Bakom ett staket ligger små trädgårdar, var och en med sin stuga. Ingen är här. Längst in står en kompost, varm och mjuk som en gammal säng.',
    options: [
      { id: 'sleep', label: '”Vi sover här.”', effect: 'restAllotment', next: 'slept' },
      { id: 'on', label: '”Vi går vidare.”' },
    ],
  },
  slept: {
    id: 'slept',
    speaker: 'story',
    text: (s) => `Vi somnar tätt ihop i värmen och sover länge – längre än vi tänkt. När vi vaknar ${s.clock === 'day' ? 'står solen redan högt' : 'har det hunnit bli mörkt'}.`,
    options: close(),
  },
};

/** Parkdammen: a pond in a park, to drink and wash in – and a swan on its nest. */
export const PARKDAMMEN: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: () => 'Mitt i en park ligger en damm. Änder, en bänk, brödsmulor på gruset. I vassen sitter en svan på sitt bo.',
    options: [
      { id: 'drink', label: '”Vi dricker och tvättar oss.”', effect: 'pond', next: 'calm' },
      { id: 'on', label: '”Vi går vidare.”' },
    ],
  },
  calm: {
    id: 'calm',
    speaker: 'story',
    text: () => 'Vi dricker och tvättar av oss stadens damm. Svanen ser på oss, men stannar på sitt bo.',
    options: close(),
  },
  swan: {
    id: 'swan',
    speaker: 'story',
    text: (s) => `Vi dricker och tvättar oss. Då kommer svanen väsande över vattnet. ${who(s)} ställer sig emellan, stor och stilla, tills svanen vänder.`,
    options: close(),
  },
  bitten: {
    id: 'bitten',
    speaker: 'story',
    text: (s) => `Vi dricker och tvättar oss. Då kommer svanen väsande över vattnet, och hugger ${who(s)} innan vi hinner undan.`,
    options: close(),
  },
};
