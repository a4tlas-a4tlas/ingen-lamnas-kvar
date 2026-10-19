// The guide for each area: what we are trying to do, what kills and what
// shelters. Numbers come from the rules so the guide cannot drift from them.
import { ALARM_MAX, ALARM_MAX_NIGHT, FARM, SCENT_MAX } from '../engine/encounters/farm';
import { DOZE_HOURS, MACHINES } from '../engine/encounters/machines';
import { DAM_MAX, RIVER } from '../engine/encounters/river';
import { ROAD } from '../engine/encounters/road';
import type { EncounterId, TimeOfDay } from '../engine/types';

export interface GuideRow {
  icon: string;
  name: string;
  effect?: 'skadar' | 'dödar';
  text: string;
}

export interface Guide {
  title: string;
  goal: string;
  /** What the place is like when Kvarn's memory is too kind. */
  hard?: string;
  dangers: GuideRow[];
  shelter: GuideRow[];
  tips: string[];
}

/** What the time of day changes in each area: shown on the map and in the guide. */
export const TIME_NOTES: Record<EncounterId, Record<TimeOfDay, string>> = {
  road: {
    night: 'Färre bilar – men mörka bilar utan ljus, och månen.',
    day: 'Fler bilar, ofta i båda körfälten – men vi ser dem alla. Ingen måne.',
  },
  farm: {
    day: `Bonden vaknar vid ${ALARM_MAX} larm. Hundarna ser oss och kan lockas.`,
    night: `Bonden sover djupt: han vaknar först vid ${ALARM_MAX_NIGHT} larm. Hundarna ser ingenting och kan inte lockas – men doften ligger kvar längre i den kalla luften.`,
  },
  river: {
    day: 'Hägern vaktar en sten varje timme och hugger efter de små.',
    night: 'Ingen häger – men vattnet är kallt: den som står i ån när timmen går tappar 1 tro.',
  },
  raptor: {
    day: 'Vråken jagar med ögonen: skuggan visar var den slår ner.',
    night: 'Berguven syns inte – den hörs, över en av två platser. Och den jagar i luften.',
  },
  machines: {
    day: 'Maskinerna arbetar i gryningen. Det går inte att vänta på mörkret.',
    night: 'Maskinerna arbetar i gryningen. Det går inte att vänta på mörkret.',
  },
};

export const TIME_NAMES: Record<TimeOfDay, string> = { day: 'dagsljus', night: 'natt' };

/** How an hour goes, the same everywhere. */
export const HOUR_STEPS: string[] = [
  'Tryck på ett djur med guldring och sedan på en upplyst zon för att leda det ett steg (◆1).',
  'Eller spela ett kort. Färgen och namnet på kortet visar vems det är – kortet kan bara användas av det djuret.',
  'Läs ”När timmen går”: där står vad som händer oss om timmen går nu.',
  'Tryck ”Låt timmen gå”. Faran slår till, och Kraften fylls på till 3.',
  'Symbolerna över djuren visar deras egen vilja – fryser, vill tillbaka, rusar, jagar. Håll muspekaren över en symbol för att se vad den betyder. Trösta för att bryta den.',
];

/** When someone is trapped in the area. */
export const RESCUE_ROWS: GuideRow[] = [
  { icon: '?', name: 'Någon sitter fast', text: 'En främling är fången här och rädd för oss. Ett eget kort ligger bredvid handen så länge den väntar.' },
  { icon: '♡', name: 'Nå fram (◆1)', text: 'Ett djur inom ett steg kryper närmare: +1 tillit. Rovdjur skrämmer bara. Vid 2 litar den på oss.' },
  { icon: '✓', name: 'Befria (◆1)', text: 'Ett djur bredvid befriar den. Då är den en av oss – med egna kort, och lika sårbar som vi.' },
  { icon: '…', name: 'Om vi går', text: 'Lämnar vi platsen utan den blir den kvar. Inget löfte bryts – den var inte en av oss än – men vi hör den länge.' },
];

/** What hits mean everywhere. */
export const HIT_ROWS: GuideRow[] = [
  { icon: '≀', name: 'Skadar', effect: 'skadar', text: 'Djuret överlever men bär en skada vidare: haltar, bruten tass eller vinge, blöder eller chock. Blödning och chock läker vid lägerelden.' },
  { icon: '✝', name: 'Dödar', effect: 'dödar', text: 'Sista stunden: ett djur inom ett steg kan kasta sig emellan och skadas i stället – annars låter vi gå.' },
];

export const GUIDES: Record<EncounterId, Guide> = {
  road: {
    title: 'Så går vi över vägen',
    goal: `Få alla från Diket till Andra diket – ${ROAD.maxTurn} timmar, sedan är det för sent.`,
    dangers: [
      { icon: '◐', name: 'Bil', effect: 'skadar', text: 'Strålkastare i fjärran visar vilket körfält som träffas när timmen går.' },
      { icon: '◼', name: 'Lastbil', effect: 'dödar', text: 'Syns på samma sätt, men träffen dödar.' },
      { icon: '●', name: 'Mörk bil', effect: 'dödar', text: 'Bara om natten. Kör utan ljus. Det mullrar i båda körfälten – vi vet inte var. Dödar utan sista stund. Ugglan kan se den från ovan.' },
      { icon: '☾', name: 'Månen', text: 'Bara om natten. Har vi svurit att gå när månen gömmer sig bryts löftet om någon går ut på asfalten medan den lyser. Vänta på molnen.' },
    ],
    shelter: [
      { icon: '═', name: 'Mittremsan', text: 'Bilarna når inte hit. En plats att vänta på mellan körfälten.' },
      { icon: '◌', name: 'Trumman', text: 'En gömd väg under asfalten. Kvarns kort ”Gamla vägar” visar den. Bara små djur får plats, det tar en timme att krypa igenom, och bilar når inte dit.' },
      { icon: '⇡', name: 'Ugglan flyger', text: 'Skymning flyger upp till två steg och kan inte träffas i luften.' },
      { icon: '⛨', name: 'Bära och skydda', text: '”Bära” flyttar ett djur och skyddar det; ”Ta emot” tar träffen åt någon i samma zon.' },
    ],
    tips: [
      'Stå aldrig i ett upplyst körfält när timmen går.',
      'Två körfält och en mittremsa: gå ett steg i taget och vila på mitten.',
      'Spara Kraft till den som fryser – en tröst nu kan rädda ett liv sen.',
    ],
  },
  farm: {
    title: 'Så tar vi oss förbi gården',
    hard: 'Ibland är gården redan vaken: någon har sett oss, larmet börjar på 3 och hundarna är vakna från första timmen.',
    goal: `Få alla från Snåret över Stenmuren – ${FARM.maxTurn} timmar. Ladan står i vägen: varje väg över är tre steg.`,
    dangers: [
      { icon: '∴', name: `Doft (0–${SCENT_MAX})`, text: 'Där vi står när timmen går blir doften starkare. Den bleknar med 1 varje timme. Tassavtrycken i zonerna visar hur stark den är.' },
      { icon: '◣', name: 'Hundarna', effect: 'skadar', text: 'Sover första timmen. Sedan följer de den starkaste doften, upp till två steg i timmen, och biter alla där de stannar – en skada som blöder. Zonen märks ”Rapp · skadar”. Hundarna kan aldrig besegras.' },
      { icon: '!', name: `Larmet (0–${ALARM_MAX})`, text: '+1 när hundarna biter, +1 när någon lockar dem, +3 om ett rovdjur tar en höna.' },
      { icon: '☼', name: 'Bonden', effect: 'dödar', text: `När larmet når ${ALARM_MAX} kommer bonden ut. Varje timme lyser ficklampan mot den öppna zon där flest av oss står – den som står där dör.` },
    ],
    shelter: [
      { icon: '♣', name: 'Snåret och det höga gräset', text: 'Skydd: ficklampan ser oss inte här.' },
      { icon: '≈', name: 'Bäcken, gödseln, gräset', text: 'Bryter doften. Den som väntar här lämnar inget spår åt hundarna.' },
      { icon: '➶', name: 'Locka hundarna', text: 'Välj räven eller ugglan och tryck ”Locka hundarna” (◆1). Lockbetet visar sig upp till två steg bort och hundarna vänder sig dit. Hinner det undan biter de ingen. Bara i dagsljus – i mörkret ser hundarna inte betet.' },
      { icon: '⚑', name: 'Hönshuset', text: 'Ett hungrigt rovdjur bredvid hönshuset tar en höna i stället för en av oss: +2 tro för rovdjuret, men +3 larm. Det mindre onda.' },
    ],
    tips: [
      'Gå genom gräset och bäcken – där tappar hundarna spåret.',
      'Se var hundarna stannar innan du låter timmen gå, och led bort den som står där.',
      'Larmet är den verkliga klockan. Låt inte hundarna bita i onödan.',
    ],
  },
  river: {
    title: 'Så tar vi oss över ån',
    hard: 'Ibland svämmar ån över: strömmen är strid de flesta timmar, redan från första, stenarna är nästan alltid hala, och dammen är redan halvt borta (2/4).',
    goal: `Få alla från Strandbrinken till Andra stranden – ${RIVER.maxTurn} timmar. Över stenarna eller genom strömmen är fyra steg – ingen hinner över på en timme. Över dammen är två.`,
    dangers: [
      { icon: '≈', name: 'Hala stenar', text: 'Vågorna gör en eller två av de tre stenarna hala varje timme – det syns i förväg. Den som står där när timmen går glider ner i strömmen. ”Bita ihop” håller kvar.' },
      { icon: '↯', name: 'Strömmen', effect: 'dödar', text: 'Lugn eller strid, timme för timme. När den är strid dras små och mellanstora djur i strömmen mot forsen – sista stunden: någon intill kan gripa tag.' },
      { icon: '⌇', name: `Bäverdammen (${DAM_MAX})`, text: `Snabbast över, men den knakar: +1 för varje djur som går ut på den, +2 för de stora. Vid ${DAM_MAX} brister den – den som står där faller i strömmen, och flodvågen gör strömmen strid två timmar.` },
      { icon: '⌐', name: 'Hägern', effect: 'skadar', text: 'Bara i dagsljus. Vaktar en sten varje timme och hugger de små som står där – ett sår som blöder.' },
      { icon: '❄', name: 'Kylan', text: 'Bara om natten. Den som står i ån när timmen går – på en sten eller i strömmen – tappar 1 tro.' },
    ],
    shelter: [
      { icon: '◉', name: 'De stora står emot', text: 'Gamla Ljung står stadigt i strömmen, och den som står i strömmen bredvid Gamla Ljung håller sig fast och dras inte med.' },
      { icon: '∽', name: 'Kvarn simmar', text: 'Strömmen tar inte Kvarn. Vattnet är Kvarns hem.' },
      { icon: '⇡', name: 'Ugglan flyger', text: 'Skymning flyger över allt: halka, ström och damm rör inte Skymning – så länge vingen är hel.' },
      { icon: '◈', name: 'Bita ihop', text: 'Håller kvar den som står på en hal sten den här timmen.' },
    ],
    tips: [
      'Läs strömmen: gå ut i den bara när den är lugn – eller med Gamla Ljung bredvid.',
      'Dammen bär några få. Låt de svagaste gå där, och spara den till sist.',
      'Stå aldrig på en sten som är hal när timmen går.',
    ],
  },
  machines: {
    title: 'Så tar vi oss upp på åsen',
    goal: `Få alla från Gläntan upp på Åsen – ${MACHINES.maxTurn} timmar. Varje väg upp är tre steg, och marken bakom oss försvinner.`,
    dangers: [
      { icon: '⚒', name: 'Fällaren', effect: 'dödar', text: 'Varje timme vänder den sig mot en zon med träd – Björkdungen eller en av granridåerna – och fäller allt där när timmen går. Zonen märks ”Fällaren · dödar”. Sista stunden: någon intill kan kasta sig emellan.' },
      { icon: '▰', name: 'Schaktaren', effect: 'dödar', text: `Tar marken bakom oss: Gläntan efter timme ${DOZE_HOURS[0]}, sedan Björkdungen och Stenröset – en efter timme ${DOZE_HOURS[1]}, den andra efter timme ${DOZE_HOURS[2]}. Den som står där då hinner knappt undan. Marken är borta sedan dess.` },
      { icon: '≋', name: 'Bruset', text: 'Den som står i det öppna bredvid där träden faller får chock. Bland träden hörs det mindre – men det är träden fällaren vill ha.' },
    ],
    shelter: [
      { icon: '♣', name: 'Träden', text: 'Björkdungen och granridåerna stänger ute bruset. Men de är just det fällaren tar: läs vart den vänder sig.' },
      { icon: '⌂', name: 'Hygget och Stenröset', text: 'Inga träd att fälla – men öppet för bruset, och schaktaren kommer.' },
      { icon: '⌇', name: 'Grävskopans spår', text: 'Har vi läst spåren vet vi i vilken ordning maskinerna tar dalen: vi ser fällarens nästa timme, och hela schaktarens väg.' },
      { icon: '⇡', name: 'Ugglan flyger', text: 'Skymning är i luften: träden når inte dit, och bruset inte heller.' },
    ],
    tips: [
      'Lämna Gläntan i tid – den går först.',
      'Stå aldrig där fällaren vänder sig när timmen går.',
      'Hygget leder till båda granridåerna. Det är sista platsen schaktaren tar.',
    ],
  },
  raptor: {
    title: 'Så tar vi oss över fälten',
    hard: 'Ibland är de två: ett vråkpar som jagar tillsammans, med två skuggor och två hugg varje timme.',
    goal: 'Få alla från Åkerrenen till Häcken – 8 timmar. Upp genom en fåra, sedan över det öppna fältet eller stenröset: tre steg.',
    dangers: [
      { icon: '◒', name: 'Vråken', effect: 'dödar', text: 'Bara i dagsljus. Skuggan visar var den slår ner när timmen går, och den glider högst en zon i timmen – mot dem av oss som syns. Den tar den minsta som inte har skydd: en liten bärs bort (sista stunden), en mellanstor får klorna i sig och blöder. Första timmen kretsar den bara.' },
      { icon: '◌', name: 'Berguven', effect: 'dödar', text: 'Bara om natten. Den syns inte – vingslagen hörs över en av två platser, och den slår ner i en av dem. Den jagar i luften: flyger Skymning hör den vingarna först.' },
      { icon: '⇡', name: 'Luften', text: 'Här är luften fåglarnas. Den som flyger är inte skyddad – tvärtom.' },
    ],
    shelter: [
      { icon: '♣', name: 'Åkerrenen', text: 'Gräset vid kanten gömmer alla.' },
      { icon: '≡', name: 'Fårorna', text: 'Djupa nog för de små. En räv eller uggla syns.' },
      { icon: '◍', name: 'Stenröset', text: 'Gömmer små och mellanstora mellan stenarna.' },
      { icon: '◉', name: 'De stora', text: 'Gamla Ljung kan inte lyftas. ”Ta emot” på en liten: fågeln släpper taget.' },
    ],
    tips: [
      'Läs skuggan och gå dit den inte kan nå – eller dit vi är gömda.',
      'Det öppna fältet är snabbt men naket. Stenröset är tryggare för de flesta.',
      'Låt Skymning gå på marken här.',
    ],
  },
};
