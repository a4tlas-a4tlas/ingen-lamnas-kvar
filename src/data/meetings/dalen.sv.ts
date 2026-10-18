// Story parts along the way through the glen: meetings and finds, in frames.
import { canFly, huntsAt, isPresent } from '../../engine/rules';
import type { GameState } from '../../engine/types';
import { place } from '../journey';
import { trickChance, type MeetingFrame, type MeetingOption } from './crow.sv';

const here = (s: GameState, id: string) => s.animals.some((a) => a.id === id && isPresent(a));
/** A predator close to hunting: the truce is thin. */
const hungry = (s: GameState) => s.animals.find((a) => a.predator && isPresent(a) && a.belief <= huntsAt(s, a) + 2)?.id;
const nameOf = (s: GameState, id: string) => s.animals.find((a) => a.id === id)?.name ?? id;
const close = (label = 'Gå vidare'): MeetingOption[] => [{ id: 'close', label }];

/** Koltrasten: a blackbird sings at dawn. Listening costs nothing – unless the owl is hungry. */
export const KOLTRASTEN: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: () => 'I gryningen sjunger en koltrast högt uppe i en björk. Det är det första vackra vi hört sedan dalen.',
    options: [
      { id: 'listen', label: '”Vi stannar och lyssnar en stund.”', effect: 'listen', next: 'listened' },
      { id: 'owl', by: 'skymning', label: 'Skymning lyfter, tyst.', when: (s) => s.animals.some((a) => a.id === 'skymning' && isPresent(a) && canFly(a)), effect: 'owlHunt', next: 'silent' },
      { id: 'hurry', by: 'frona', label: '”Vi har inte tid. Maskinerna…”', next: 'hurried' },
    ],
  },
  listened: {
    id: 'listened',
    speaker: 'story',
    text: () => 'Vi står stilla tills sången tar slut. Någon skrattar till, för första gången på länge.',
    options: [{ id: 'close', label: 'Gå vidare' }],
  },
  silent: {
    id: 'silent',
    speaker: 'story',
    text: () => 'Sången tystnar mitt i en ton. Skymning kommer tillbaka, mätt och tyst. Ingen säger något.',
    options: [{ id: 'close', label: 'Gå vidare' }],
  },
  hurried: {
    id: 'hurried',
    speaker: 'story',
    text: () => 'Fröna har rätt. Vi går vidare, och sången följer oss en bit innan den försvinner.',
    options: [{ id: 'close', label: 'Gå vidare' }],
  },
};

/** Det ihåliga trädet: rest for the hurt – but someone must keep watch outside. */
export const IHALIGT_TRAD: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: () => 'Ett gammalt ihåligt träd, torrt inuti. Det rymmer inte alla, men de som är skadade kan vila här en stund.',
    options: [
      { id: 'rest', label: '”De skadade vilar. Någon håller vakt.”', effect: 'restHollow', next: 'rested' },
      { id: 'ljung', by: 'ljung', label: '”Jag håller vakt utanför.”', when: (s) => here(s, 'ljung'), effect: 'restHollow', next: 'rested' },
      { id: 'on', label: '”Vi går vidare.”' },
    ],
  },
  rested: {
    id: 'rested',
    speaker: 'story',
    text: () => 'Inne i trädet är det varmt och stilla. När vi går vidare blöder ingen längre, och darrningarna har släppt.',
    options: [{ id: 'close', label: 'Gå vidare' }],
  },
};

/** Ett bärsnår: sweet, and too much of it. */
export const BARSNAR: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: () => 'Ett snår fullt av blåbär och lingon, mörka och mogna. Ingen av oss har ätit ordentligt sedan dalen.',
    options: [
      { id: 'eat', label: '”Ät, allihop.”', effect: 'berries', next: 'ate' },
      { id: 'careful', by: 'ljung', label: '”Ät – men inte för mycket, små.”', effect: 'berriesCareful', next: 'careful' },
      { id: 'on', label: '”Vi har inte tid.”' },
    ],
  },
  ate: {
    id: 'ate',
    speaker: 'story',
    text: (s) => here(s, 'frona')
      ? 'Vi äter tills munnarna är blå. Fröna äter mest – och sedan ligger de och darrar i mossan, med magarna fulla av sura bär.'
      : 'Vi äter tills munnarna är blå. För en stund är det nästan som hemma.',
    options: close(),
  },
  careful: {
    id: 'careful',
    speaker: 'story',
    text: () => 'Gamla Ljung vakar över snåret. Fröna gnäller, men lyder. Vi går vidare mätta, inte sjuka.',
    options: close(),
  },
};

/** En gammal stig: someone must go first, and learns the way of it. */
export const GAMMAL_STIG: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: () => 'En gammal djurstig, nästan igenvuxen. Någon har gått här förr, många gånger. Den som går först lär sig något av den.',
    options: [
      ...['ljung', 'kvarn', 'sotfot', 'skymning', 'sicksack', 'frona', 'tistel'].map((id): MeetingOption => ({
        id: `first-${id}`, by: id, label: '”Jag går först.”', effect: 'learnPath', next: 'learned',
      })),
      { id: 'on', label: '”Vi håller oss till vår egen väg.”' },
    ],
  },
  learned: {
    id: 'learned',
    speaker: 'story',
    text: (s) => `${nameOf(s, s.meeting?.by ?? '')} går först, nos mot marken, och läser stigen som ett gammalt brev.${s.meeting?.card ? ` Nu kan ${nameOf(s, s.meeting.by ?? '')} något nytt: ${s.meeting.card}.` : ' Men stigen hade inget nytt att lära.'}`,
    options: close(),
  },
};

/** Ett övergivet gryt: safe and warm – and so much like the home we lost. */
export const GRYT: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: () => 'Ett övergivet grävlingsgryt under en stubbe. Gångarna är torra och djupa. Här kan alla vila i trygghet.',
    options: [
      { id: 'rest', label: '”Vi vilar här, allihop.”', effect: 'restDen', next: 'rested' },
      { id: 'dig', by: 'ljung', label: '”Låt mig se vart gångarna leder.”', effect: 'ljungDigs', next: 'dug' },
      { id: 'on', label: '”Vi går vidare.”' },
    ],
  },
  rested: {
    id: 'rested',
    speaker: 'story',
    text: (s) => here(s, 'ljung')
      ? 'Vi sover djupt i mörkret. Alla utom Gamla Ljung, som ligger vaken och luktar på väggarna. ”Det luktar som hemma”, säger Ljung till slut, och säger sedan ingenting mer.'
      : 'Vi sover djupt i mörkret, tätt intill varandra. När vi vaknar är såren läkta.',
    options: close(),
  },
  dug: {
    id: 'dug',
    speaker: 'story',
    text: (s) => `Gamla Ljung försvinner ner i gångarna och kommer tillbaka med jord på nosen.${s.meeting?.card ? ` ”De som bodde här kunde mer än jag.” Nu kan Ljung ${s.meeting.card}.` : ' ”Ingenting jag inte redan visste.”'}`,
    options: close(),
  },
};

/** Den döende hjorten: hit by a car, by the road. Nothing we do will save it. */
export const HJORTEN: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: () => 'Vid diket ligger en hjort som en bil har träffat. Den andas fortfarande, tungt, och tittar på oss.',
    options: [
      { id: 'stay', label: '”Vi stannar hos den. Ingen ska dö ensam.”', effect: 'stayDeer', next: 'stayed' },
      { id: 'ljung', by: 'ljung', label: 'Gamla Ljung lägger sig bredvid hjorten, nos mot nos.', effect: 'ljungDeer', next: 'comforted' },
      { id: 'tempted', by: hungry, label: (s) => `${nameOf(s, hungry(s) ?? '')} smyger närmare hjorten, med blicken mörk.`, when: (s) => !!hungry(s), chance: (s) => Math.min(0.9, (s.animals.find((a) => a.id === hungry(s))?.belief ?? 0) / 10), effect: 'truceTest', next: 'resisted', failNext: 'ate' },
      { id: 'on', label: '”Vi kan inte hjälpa den.”' },
    ],
  },
  stayed: {
    id: 'stayed',
    speaker: 'story',
    text: () => 'Vi sitter tätt intill varandra hela natten, tills hjorten slutar andas. Det är kallt. Men vi var där.',
    options: close(),
  },
  comforted: {
    id: 'comforted',
    speaker: 'story',
    text: () => 'Ljung pratar lågt med hjorten om dalen, om ekarna och om bäcken. Hjorten somnar lugnt. Ljung reser sig långsamt, men med rak rygg.',
    options: close(),
  },
  resisted: {
    id: 'resisted',
    speaker: 'story',
    text: (s) => `${nameOf(s, s.meeting?.by ?? '')} står länge och tittar på hjorten. Sedan vänder ${nameOf(s, s.meeting?.by ?? '')} sig bort. ”Vi jagar inte varandra.”`,
    options: close(),
  },
  ate: {
    id: 'ate',
    speaker: 'story',
    text: (s) => `När vi ser oss om har ${nameOf(s, s.meeting?.by ?? '')} redan börjat äta. De små vänder bort blicken. Ingen säger något på länge.`,
    options: close(),
  },
};

/** Människorna med maten: a picnic left behind – and a dog that was left too. */
export const MATEN: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: () => 'På en filt i gräset står en korg med bröd och ost. Människorna har gått ner mot sjön. Men deras hund ligger kvar i skuggan.',
    options: [
      { id: 'sneak', label: '”Vi smyger dit, tyst.”', chance: () => 0.6, effect: 'sneak', next: 'fed', failNext: 'bitten' },
      { id: 'steal', by: 'sotfot', label: '”Låt mig. Jag är bra på sånt här.”', chance: trickChance, effect: 'sotfotSteals', next: 'stolen', failNext: 'caught' },
      { id: 'basket', by: 'frona', label: 'Fröna kryper redan ner i korgen.', effect: 'fronaBasket', next: 'basket' },
      { id: 'on', label: '”Det är inte värt det.”' },
    ],
  },
  fed: {
    id: 'fed',
    speaker: 'story',
    text: () => 'Hunden sover vidare. Vi bär med oss bröd så det räcker hela dagen, och skrattar tyst åt hur lätt det var.',
    options: close(),
  },
  bitten: {
    id: 'bitten',
    speaker: 'story',
    text: () => 'Hunden vaknar och rusar mot oss. Vi kommer undan med en bit bröd – och ett bett som blöder.',
    options: close(),
  },
  stolen: {
    id: 'stolen',
    speaker: 'story',
    text: () => 'Sotfot glider fram i gräset, tar hela osten och är tillbaka innan hunden ens har lyft på huvudet.',
    options: close(),
  },
  caught: {
    id: 'caught',
    speaker: 'story',
    text: () => 'Hunden vaknar. Sotfot kommer undan – men inte helt. Det blöder från ett öra.',
    options: close(),
  },
  basket: {
    id: 'basket',
    speaker: 'story',
    text: () => 'Fröna äter sig mätta inne i korgen – tills människorna kommer tillbaka och skriker. Fröna kommer ut darrande, men mätta.',
    options: close(),
  },
};

/** Den hungriga främlingen: a starved fox, all bones. It knows the way – and it is one of Sotfot's kind. */
export const FRAMLINGEN: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: () => 'En utsvulten räv står i vägen, bara skinn och ben. ”Jag vet var vägen går”, säger den. ”Men jag är så hungrig.”',
    options: [
      { id: 'share', label: '”Vi delar med oss.”', pickCard: true, effect: 'shareCard', next: 'told' },
      { id: 'kin', by: 'sotfot', label: '”Du är en av mina. Gå med oss en bit.”', effect: 'shareCard', pickCard: true, next: 'told' },
      { id: 'chase', label: '”Gå din väg.”', effect: 'chaseFox', next: 'chased' },
    ],
  },
  told: {
    id: 'told',
    speaker: 'story',
    text: (s) => {
      const lines = (s.meeting?.told ?? []).map((id) => {
        const p = place(s, id);
        const truth = s.journey.truth[id] ?? 'normal';
        return `${p.name}: ${p.memory![truth]}${s.journey.guess[id] !== truth ? ' – er padda minns fel' : ''}.`;
      });
      return `Räven äter snabbt, nästan utan att tugga. Sedan berättar den. ${lines.length ? `”${lines.join(' ')}”` : '”Men ni verkar redan veta det mesta.”'}`;
    },
    options: close('”Tack.”'),
  },
  chased: {
    id: 'chased',
    speaker: 'story',
    text: (s) => here(s, 'sotfot')
      ? 'Räven försvinner in bland granarna. Sotfot tittar efter den länge. ”Det var en av mina”, säger Sotfot tyst.'
      : 'Räven försvinner in bland granarna, lika hungrig som förut.',
    options: close(),
  },
};

/** Grävskopans spår: the machines have been here before us. */
export const GRAVSKOPAN: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: () => 'Djupa spår i leran, breda som en väg, och en lukt av diesel. Maskinerna har varit här. De har gått mot åsen.',
    options: [
      { id: 'read', by: 'kvarn', label: '”Vänta. Spåren berättar hur de rör sig.”', effect: 'readTracks', next: 'read' },
      { id: 'follow', label: '”Vi följer spåren en bit.”', effect: 'followTracks', next: 'followed' },
      { id: 'around', label: '”Vi går runt. Långt runt.”' },
    ],
  },
  read: {
    id: 'read',
    speaker: 'story',
    text: () => 'Kvarn hoppar längs spåren och räknar. ”De fäller först, och sedan kommer den stora och tar marken. Alltid i den ordningen.” Det kommer vi att minnas på åsen.',
    options: close(),
  },
  followed: {
    id: 'followed',
    speaker: 'story',
    text: (s) => `Vi ser var maskinerna har vänt, och var de har stått stilla. Det kommer vi att minnas på åsen.${here(s, 'frona') ? ' Men dieseldoften gör Fröna yra och rädda.' : ''}`,
    options: close(),
  },
};

/** Kvarns tvekan: the guide does not know the way. */
export const KVARNS_TVEKAN: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: (s) => here(s, 'kvarn')
      ? 'Kvarn stannar vid en sten och ser sig omkring. ”Jag… jag är inte säker. Det var länge sedan jag gick här.”'
      : 'Vägen delar sig, och ingen av oss vet vart. Kvarn skulle ha vetat.',
    options: [
      { id: 'trust', label: '”Vi litar på dig, Kvarn.”', when: (s) => here(s, 'kvarn'), effect: 'comfortKvarn', next: 'trusted' },
      { id: 'scout', by: 'skymning', label: '”Jag flyger och ser efter.”', when: (s) => here(s, 'kvarn') && s.animals.some((a) => a.id === 'skymning' && isPresent(a) && canFly(a)), effect: 'doubtKvarn', next: 'scouted' },
      { id: 'guess', label: '”Vi går på känn.”', when: (s) => !here(s, 'kvarn'), effect: 'guessWay' },
    ],
  },
  trusted: {
    id: 'trusted',
    speaker: 'story',
    text: () => 'Kvarn blundar en stund. Sedan pekar Kvarn, alldeles säkert. ”Ditåt.”',
    options: close(),
  },
  scouted: {
    id: 'scouted',
    speaker: 'story',
    text: () => 'Skymning kommer tillbaka och berättar vad som väntar. Kvarn lyssnar och säger ingenting. Ingen har frågat Kvarn något efter det.',
    options: close(),
  },
};
