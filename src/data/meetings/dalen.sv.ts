// Story parts along the way through the glen: meetings and finds, in frames.
import { isPresent } from '../../engine/rules';
import { elderId, flier, flierId, guideHere, guideName, hungryId, kin, kinId, nameOf } from '../../engine/roles';
import type { GameState } from '../../engine/types';
import { place } from '../journey';
import { trickChance, type MeetingFrame, type MeetingOption } from './crow.sv';

/** Whoever answered last: the one the next frame speaks of. */
const who = (s: GameState) => nameOf(s, s.meeting?.by);
/** A predator close to hunting: the truce is thin. */
const hungry = hungryId;
/** Up to this many of us can each be the one to answer, in turn. */
const EACH = 10;
const close = (label = 'Gå vidare'): MeetingOption[] => [{ id: 'close', label }];

/** Koltrasten: a blackbird sings at dawn. Listening costs nothing – unless the owl is hungry. */
export const KOLTRASTEN: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: () => 'I gryningen sjunger en koltrast högt uppe i en björk. Det är det första vackra vi hört sedan dalen.',
    options: [
      { id: 'listen', label: '”Vi stannar och lyssnar en stund.”', effect: 'listen', next: 'listened' },
      { id: 'owl', by: flierId, label: (s) => `${flier(s)?.name} lyfter, tyst.`, effect: 'owlHunt', next: 'silent' },
      { id: 'hurry', by: kinId('mice'), label: '”Vi har inte tid. Maskinerna…”', next: 'hurried' },
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
    text: (s) => `Sången tystnar mitt i en ton. ${who(s)} kommer tillbaka, mätt och tyst. Ingen säger något.`,
    options: [{ id: 'close', label: 'Gå vidare' }],
  },
  hurried: {
    id: 'hurried',
    speaker: 'story',
    text: (s) => `${who(s)} har rätt. Vi går vidare, och sången följer oss en bit innan den försvinner.`,
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
      { id: 'watch', by: elderId, label: '”Jag håller vakt utanför.”', effect: 'restHollow', next: 'rested' },
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
      { id: 'careful', by: elderId, label: '”Ät – men inte för mycket, små.”', effect: 'berriesCareful', next: 'careful' },
      { id: 'on', label: '”Vi har inte tid.”' },
    ],
  },
  ate: {
    id: 'ate',
    speaker: 'story',
    text: (s) => kin(s, 'mice')
      ? `Vi äter tills munnarna är blå. ${kin(s, 'mice')!.name} äter mest – och sedan ligger de och darrar i mossan, med magarna fulla av sura bär.`
      : 'Vi äter tills munnarna är blå. För en stund är det nästan som hemma.',
    options: close(),
  },
  careful: {
    id: 'careful',
    speaker: 'story',
    text: (s) => `${who(s)} vakar över snåret. De minsta gnäller, men lyder. Vi går vidare mätta, inte sjuka.`,
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
      ...Array.from({ length: EACH }, (_, i): MeetingOption => ({
        id: `first-${i}`, by: (s) => s.animals.filter(isPresent)[i]?.id, label: '”Jag går först.”', effect: 'learnPath', next: 'learned',
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
      { id: 'dig', by: kinId('badger'), label: '”Låt mig se vart gångarna leder.”', effect: 'ljungDigs', next: 'dug' },
      { id: 'on', label: '”Vi går vidare.”' },
    ],
  },
  rested: {
    id: 'rested',
    speaker: 'story',
    text: (s) => kin(s, 'badger')
      ? `Vi sover djupt i mörkret. Alla utom ${kin(s, 'badger')!.name}, som ligger vaken och luktar på väggarna. ”Det luktar som hemma”, säger ${kin(s, 'badger')!.name} till slut, och säger sedan ingenting mer.`
      : 'Vi sover djupt i mörkret, tätt intill varandra. När vi vaknar är såren läkta.',
    options: close(),
  },
  dug: {
    id: 'dug',
    speaker: 'story',
    text: (s) => `${who(s)} försvinner ner i gångarna och kommer tillbaka med jord på nosen.${s.meeting?.card ? ` ”De som bodde här kunde mer än jag.” Nu kan ${who(s)} ${s.meeting.card}.` : ' ”Ingenting jag inte redan visste.”'}`,
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
      { id: 'comfort', by: elderId, label: (s) => `${nameOf(s, elderId(s))} lägger sig bredvid hjorten, nos mot nos.`, effect: 'ljungDeer', next: 'comforted' },
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
    text: (s) => `${who(s)} pratar lågt med hjorten om dalen, om ekarna och om bäcken. Hjorten somnar lugnt. ${who(s)} reser sig långsamt, men med rak rygg.`,
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
      { id: 'steal', by: kinId('fox'), label: '”Låt mig. Jag är bra på sånt här.”', chance: trickChance, effect: 'sotfotSteals', next: 'stolen', failNext: 'caught' },
      { id: 'basket', by: kinId('mice'), label: (s) => `${kin(s, 'mice')?.name} kryper redan ner i korgen.`, effect: 'fronaBasket', next: 'basket' },
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
    text: (s) => `${who(s)} glider fram i gräset, tar hela osten och är tillbaka innan hunden ens har lyft på huvudet.`,
    options: close(),
  },
  caught: {
    id: 'caught',
    speaker: 'story',
    text: (s) => `Hunden vaknar. ${who(s)} kommer undan – men inte helt. Det blöder från ett öra.`,
    options: close(),
  },
  basket: {
    id: 'basket',
    speaker: 'story',
    text: (s) => `${who(s)} äter sig mätta inne i korgen – tills människorna kommer tillbaka och skriker. ${who(s)} kommer ut darrande, men mätta.`,
    options: close(),
  },
};

/** Den hungriga främlingen: a starved fox, all bones. It knows the way – and if a fox is with us, it is one of theirs. */
export const FRAMLINGEN: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: () => 'En utsvulten räv står i vägen, bara skinn och ben. ”Jag vet var vägen går”, säger den. ”Men jag är så hungrig.”',
    options: [
      { id: 'share', label: '”Vi delar med oss.”', pickCard: true, effect: 'shareCard', next: 'told' },
      { id: 'kin', by: kinId('fox'), label: '”Du är en av mina. Gå med oss en bit.”', effect: 'shareCard', pickCard: true, next: 'told' },
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
    text: (s) => kin(s, 'fox')
      ? `Räven försvinner in bland granarna. ${kin(s, 'fox')!.name} tittar efter den länge. ”Det var en av mina”, säger ${kin(s, 'fox')!.name} tyst.`
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
      { id: 'read', by: (s) => guideHere(s)?.id, label: '”Vänta. Spåren berättar hur de rör sig.”', effect: 'readTracks', next: 'read' },
      { id: 'follow', label: '”Vi följer spåren en bit.”', effect: 'followTracks', next: 'followed' },
      { id: 'around', label: '”Vi går runt. Långt runt.”' },
    ],
  },
  read: {
    id: 'read',
    speaker: 'story',
    text: (s) => `${who(s)} går längs spåren och räknar. ”De fäller först, och sedan kommer den stora och tar marken. Alltid i den ordningen.” Det kommer vi att minnas på åsen.`,
    options: close(),
  },
  followed: {
    id: 'followed',
    speaker: 'story',
    text: (s) => `Vi ser var maskinerna har vänt, och var de har stått stilla. Det kommer vi att minnas på åsen.${kin(s, 'mice') ? ` Men dieseldoften gör ${kin(s, 'mice')!.name} yra och rädda.` : ''}`,
    options: close(),
  },
};

/** Kvarns tvekan: the guide does not know the way. */
export const KVARNS_TVEKAN: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: (s) => guideHere(s)
      ? `${guideName(s)} stannar vid en sten och ser sig omkring. ”Jag… jag är inte säker. Det var länge sedan jag gick här.”`
      : `Vägen delar sig, och ingen av oss vet vart. ${guideName(s)} skulle ha vetat.`,
    options: [
      { id: 'trust', label: (s) => `”Vi litar på dig, ${guideName(s)}.”`, when: (s) => !!guideHere(s), effect: 'comfortKvarn', next: 'trusted' },
      { id: 'scout', by: (s) => (guideHere(s) && flier(s) !== guideHere(s) ? flierId(s) : undefined), label: '”Jag flyger och ser efter.”', effect: 'doubtKvarn', next: 'scouted' },
      { id: 'guess', label: '”Vi går på känn.”', when: (s) => !guideHere(s), effect: 'guessWay' },
    ],
  },
  trusted: {
    id: 'trusted',
    speaker: 'story',
    text: (s) => `${guideName(s)} blundar en stund. Sedan pekar ${guideName(s)}, alldeles säkert. ”Ditåt.”`,
    options: close(),
  },
  scouted: {
    id: 'scouted',
    speaker: 'story',
    text: (s) => `${who(s)} kommer tillbaka och berättar vad som väntar. ${guideName(s)} lyssnar och säger ingenting. Ingen har frågat ${guideName(s)} något efter det.`,
    options: close(),
  },
};
