// The guide for each area: what we are trying to do, what kills and what
// shelters. Numbers come from the rules so the guide cannot drift from them.
import { ALARM_MAX, FARM, SCENT_MAX } from '../engine/encounters/farm';
import { ROAD } from '../engine/encounters/road';
import type { EncounterId } from '../engine/types';

export interface GuideRow {
  icon: string;
  name: string;
  effect?: 'skadar' | 'dödar';
  text: string;
}

export interface Guide {
  title: string;
  goal: string;
  dangers: GuideRow[];
  shelter: GuideRow[];
  tips: string[];
}

/** How an hour goes, the same everywhere. */
export const HOUR_STEPS: string[] = [
  'Tryck på ett djur med guldring och sedan på en upplyst zon för att leda det ett steg (◆1).',
  'Eller spela ett kort. Färgen och namnet på kortet visar vems det är – kortet kan bara användas av det djuret.',
  'Läs ”När timmen går”: där står vad som händer oss om timmen går nu.',
  'Tryck ”Låt timmen gå”. Faran slår till, och Kraften fylls på till 3.',
  'Symbolerna över djuren visar deras egen vilja – fryser, vill tillbaka, rusar, jagar. Håll muspekaren över en symbol för att se vad den betyder. Trösta för att bryta den.',
];

/** What hits mean everywhere. */
export const HIT_ROWS: GuideRow[] = [
  { icon: '≀', name: 'Skadar', effect: 'skadar', text: 'Djuret överlever men bär en skada vidare: haltar, bruten tass eller vinge, blöder eller chock. Blödning och chock läker vid lägerelden.' },
  { icon: '✝', name: 'Dödar', effect: 'dödar', text: 'Sista stunden: ett djur inom ett steg kan kasta sig emellan och skadas i stället – annars låter vi gå.' },
];

export const GUIDES: Record<EncounterId, Guide> = {
  road: {
    title: 'Så går vi över vägen',
    goal: `Få alla från Diket till Andra diket innan gryningen – ${ROAD.maxTurn} timmar.`,
    dangers: [
      { icon: '◐', name: 'Bil', effect: 'skadar', text: 'Strålkastare i fjärran visar vilket körfält som träffas när timmen går.' },
      { icon: '◼', name: 'Lastbil', effect: 'dödar', text: 'Syns på samma sätt, men träffen dödar.' },
      { icon: '●', name: 'Mörk bil', effect: 'dödar', text: 'Kör utan ljus. Det mullrar i båda körfälten – vi vet inte var. Dödar utan sista stund. Ugglan kan se den från ovan.' },
      { icon: '☾', name: 'Månen', text: 'Har vi svurit att gå när månen gömmer sig bryts löftet om någon går ut på asfalten medan den lyser. Vänta på molnen.' },
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
    goal: `Få alla från Snåret över Stenmuren innan solen står högt – ${FARM.maxTurn} timmar. Ladan står i vägen: varje väg över är tre steg.`,
    dangers: [
      { icon: '∴', name: `Doft (0–${SCENT_MAX})`, text: 'Där vi står när timmen går blir doften starkare. Den bleknar med 1 varje timme. Tassavtrycken i zonerna visar hur stark den är.' },
      { icon: '◣', name: 'Hundarna', effect: 'skadar', text: 'Sover första timmen. Sedan följer de den starkaste doften, upp till två steg i timmen, och biter alla där de stannar – en skada som blöder. Zonen märks ”Rapp · skadar”. Hundarna kan aldrig besegras.' },
      { icon: '!', name: `Larmet (0–${ALARM_MAX})`, text: '+1 när hundarna biter, +1 när någon lockar dem, +3 om ett rovdjur tar en höna.' },
      { icon: '☼', name: 'Bonden', effect: 'dödar', text: `När larmet når ${ALARM_MAX} kommer bonden ut. Varje timme lyser ficklampan mot den öppna zon där flest av oss står – den som står där dör.` },
    ],
    shelter: [
      { icon: '♣', name: 'Snåret och det höga gräset', text: 'Skydd: ficklampan ser oss inte här.' },
      { icon: '≈', name: 'Bäcken, gödseln, gräset', text: 'Bryter doften. Den som väntar här lämnar inget spår åt hundarna.' },
      { icon: '➶', name: 'Locka hundarna', text: 'Välj räven eller ugglan och tryck ”Locka hundarna” (◆1). Lockbetet visar sig upp till två steg bort och hundarna vänder sig dit. Hinner det undan biter de ingen.' },
      { icon: '⚑', name: 'Hönshuset', text: 'Ett hungrigt rovdjur bredvid hönshuset tar en höna i stället för en av oss: +2 tro för rovdjuret, men +3 larm. Det mindre onda.' },
    ],
    tips: [
      'Gå genom gräset och bäcken – där tappar hundarna spåret.',
      'Se var hundarna stannar innan du låter timmen gå, och led bort den som står där.',
      'Larmet är den verkliga klockan. Låt inte hundarna bita i onödan.',
    ],
  },
};
