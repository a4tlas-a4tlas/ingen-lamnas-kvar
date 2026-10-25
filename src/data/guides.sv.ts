import { LAMPS } from '../engine/encounters/lamps';
import { CATS } from '../engine/encounters/cats';
import { STREET } from '../engine/encounters/street';
import { SEWER } from '../engine/encounters/sewer';
import { BOG } from '../engine/encounters/bog';
import { WISPS } from '../engine/encounters/wisps';
import { FIREWORKS } from '../engine/encounters/fireworks';
import { HARVEST, STRIPS_PER_HOUR } from '../engine/encounters/harvest';
import { FENCE, GATE_PUSH, SWEEPS_MEDIUM, SWEEPS_SMALL } from '../engine/encounters/fence';
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
  /** What the place is like when the guide's memory is too kind. */
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
  sprayer: {
    day: 'Traktorn kör en rad i timmen och sprutar. Vi ser dimman, och åt vilket håll vinden drar.',
    night: 'Ingen traktor – men dagens dimma ligger kvar i raderna och stiger på nytt. Vi känner bara vinden, och ser bara en del av dimman.',
  },
  fence: {
    day: 'Vi ser när strömmen i stängslet är på – den här timmen och nästa.',
    night: 'Vi hör bara om stängslet surrar just nu, inte vad som kommer. Och vattnet i diket är iskallt: den som står där tappar 1 tro.',
  },
  harvest: {
    day: 'Skördetröskan arbetar i dagsljus. Det går inte att vänta på mörkret.',
    night: 'Skördetröskan arbetar i dagsljus. Det går inte att vänta på mörkret.',
  },
  lamps: {
    day: 'Lyktorna tänds i skymningen. Det går inte att vänta på dagen.',
    night: 'Lyktorna tänds i skymningen. Det går inte att vänta på dagen.',
  },
  cats: {
    day: 'Vi ser var katterna ligger på lur.',
    night: 'Vi ser bara ögon: två par för varje katt, och bara det ena är på riktigt.',
  },
  street: {
    day: 'Folkmassan syns komma, och spårvagnen går efter tidtabell.',
    night: 'Nästan ingen är ute – men de som är det vinglar dit ingen kan veta. Spårvagnen hörs bara på klockan, timmen innan.',
  },
  sewer: {
    day: 'Därnere är det lika mörkt. Men ovanför ösregnar det: vattnet stiger ofta.',
    night: 'Därnere är det lika mörkt. Det regnar sakta, och vattnet stiger sällan – men i natt är råttorna ute, i två korsningar.',
  },
  fireworks: {
    day: 'Det är nyårsafton. Det går inte att vänta på en annan natt.',
    night: 'Det är nyårsafton. Det går inte att vänta på en annan natt.',
  },
  wisps: {
    day: 'Irrblossen syns bara om natten. Det går inte att vänta på dagen.',
    night: 'Irrblossen syns bara om natten. Det går inte att vänta på dagen.',
  },
  bog: {
    day: 'Vi ser var tuvorna står. Mossan är lika mjuk som alltid.',
    night: 'Mossan är lika mjuk om natten. Tuvorna ser vi ändå – de är svartare än vattnet.',
  },
};

export const TIME_NAMES: Record<TimeOfDay, string> = { day: 'dagsljus', night: 'natt' };

/** How an hour goes, the same everywhere. */
export const HOUR_STEPS: string[] = [
  'Tryck på ett djur med guldring och sedan på en upplyst zon för att leda det ett steg (◆1).',
  'Eller spela ett kort. Korten är djurens förmågor: färgen och namnet visar vems det är, och bara det djuret kan använda det. På kartan och vid elden väljer du vilka tre förmågor var och en bär.',
  'Läs ”När timmen går”: där står vad som händer oss om timmen går nu.',
  'Tryck ”Låt timmen gå”. Faran slår till, och Kraften fylls på till 3.',
  'Symbolerna över djuren visar deras egen vilja – fryser, vill tillbaka, rusar, jagar. Håll muspekaren över en symbol för att se vad den betyder. Trösta för att bryta den.',
];

/** When someone is trapped in the area. */
export const RESCUE_ROWS: GuideRow[] = [
  { icon: '?', name: 'Någon sitter fast', text: 'En främling är fången här och rädd för oss. Ett eget kort ligger bredvid handen så länge den väntar.' },
  { icon: '♡', name: 'Nå fram (◆1)', text: 'Ett djur inom ett steg kryper närmare: +1 tillit. Rovdjur skrämmer bara. Vid 2 litar den på oss – ett fångat rovdjur först vid 3.' },
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
      { icon: '◌', name: 'Trumman', text: 'En gömd väg under asfalten. Paddans kort ”Gamla vägar” visar den. Bara små djur får plats, det tar en timme att krypa igenom, och bilar når inte dit.' },
      { icon: '⇡', name: 'Ugglan flyger', text: 'Ugglan flyger upp till två steg och kan inte träffas i luften.' },
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
      { icon: '≈', name: 'Hala stenar', text: 'Vågorna gör en eller två av de tre stenarna hala varje timme – det syns i förväg. Den som står där när timmen går glider ner i strömmen – om den inte håller i sig (se nedan).' },
      { icon: '↯', name: 'Strömmen', effect: 'dödar', text: 'Lugn eller strid, timme för timme. När den är strid dras små och mellanstora djur i strömmen mot forsen – sista stunden: någon intill kan gripa tag.' },
      { icon: '⌇', name: `Bäverdammen (${DAM_MAX})`, text: `Snabbast över, men den knakar: +1 för varje djur som går ut på den, +2 för de stora. Vid ${DAM_MAX} brister den – den som står där faller i strömmen, och flodvågen gör strömmen strid två timmar.` },
      { icon: '⌐', name: 'Hägern', effect: 'skadar', text: 'Bara i dagsljus. Vaktar en sten varje timme och hugger de små som står där – ett sår som blöder.' },
      { icon: '❄', name: 'Kylan', text: 'Bara om natten. Den som står i ån när timmen går – på en sten eller i strömmen – tappar 1 tro.' },
    ],
    shelter: [
      { icon: '◉', name: 'De stora står emot', text: 'De stora står stadigt i strömmen, och den som står i strömmen bredvid ett stort djur håller sig fast och dras inte med.' },
      { icon: '∽', name: 'Paddan simmar', text: 'Strömmen tar inte paddan. Vattnet är dess hem.' },
      { icon: '⇡', name: 'Ugglan flyger', text: 'Ugglan flyger över allt: halka, ström och damm rör den inte – så länge vingen är hel.' },
      { icon: '◈', name: 'Hålla i sig', text: 'Den som har grävt ner sig, gömt sig, frusit stilla eller hackat – eller står i zonen när någon stampar varning eller står som en sten – glider inte av en hal sten den här timmen.' },
    ],
    tips: [
      'Läs strömmen: gå ut i den bara när den är lugn – eller med ett stort djur bredvid.',
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
      { icon: '⇡', name: 'Ugglan flyger', text: 'Ugglan är i luften: träden når inte dit, och bruset inte heller.' },
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
      { icon: '◌', name: 'Berguven', effect: 'dödar', text: 'Bara om natten. Den syns inte – vingslagen hörs över en av två platser, och den slår ner i en av dem. Den jagar i luften: flyger ugglan hör den vingarna först.' },
      { icon: '⇡', name: 'Luften', text: 'Här är luften fåglarnas. Den som flyger är inte skyddad – tvärtom.' },
    ],
    shelter: [
      { icon: '♣', name: 'Åkerrenen', text: 'Gräset vid kanten gömmer alla.' },
      { icon: '≡', name: 'Fårorna', text: 'Djupa nog för de små. En räv eller uggla syns.' },
      { icon: '◍', name: 'Stenröset', text: 'Gömmer små och mellanstora mellan stenarna.' },
      { icon: '◉', name: 'De stora', text: 'De stora kan inte lyftas. ”Ta emot” från ett stort djur på en liten: fågeln släpper taget.' },
    ],
    tips: [
      'Läs skuggan och gå dit den inte kan nå – eller dit vi är gömda.',
      'Det öppna fältet är snabbt men naket. Stenröset är tryggare för de flesta.',
      'Låt ugglan gå på marken här.',
    ],
  },
  sprayer: {
    title: 'Så tar vi oss över det besprutade fältet',
    hard: 'Ibland är sprutan dubbel: traktorn lämnar dimma i sin rad och i raden bredvid.',
    goal: 'Få alla från Dikesrenen till Dungen – 8 timmar. Rakt upp genom raderna är fyra steg. Längs bäcken är det tre, men vattnet håller kvar den som inte simmar en hel timme i varje del.',
    dangers: [
      { icon: '▤', name: 'Traktorn', effect: 'dödar', text: 'Bara i dagsljus. Den kör en rad i timmen, fram och tillbaka – det syns i förväg vilken. Den som står i raden när timmen går blir överkörd (sista stunden). Den kör aldrig i bäcken eller ogräset.' },
      { icon: '≈', name: 'Dimman', effect: 'skadar', text: 'Där traktorn kört ligger en söt dimma. Varje timme driver den en zon med vinden – vindens håll syns i förväg. Den som står i dimman när timmen går blir förgiftad. Den når upp i träden och i luften.' },
      { icon: '☠', name: 'Förgiftad', text: 'Den förgiftades egna kort går inte att spela. Den kan fortfarande ledas och bäras. Läker vid lägerelden.' },
    ],
    shelter: [
      { icon: '∽', name: 'Bäcken', text: 'Dimman når aldrig vattnet. Den som simmar tvättar av sig giftet där, och vattnet håller inte kvar den.' },
      { icon: '♣', name: 'Ogräset', text: 'Det höga ogräset tar dimman, och traktorn kör runt det.' },
      { icon: '◒', name: 'Under jord', text: 'Den som gräver ner sig – mullvaden, grävlingen – når varken dimman eller traktorn.' },
    ],
    tips: [
      'Läs vinden: dimman driver dit den blåser, och traktorn lägger ny där den kör.',
      'Paddan och bävern hör hemma i bäcken – där tvättas giftet bort.',
      'Om natten: insikt (Lyssna i marken, Vittring, Läsa natten …) visar hela dimman.',
    ],
  },
  fence: {
    title: 'Så tar vi oss genom stängslet',
    hard: 'Ibland är diket redan fullt: vattnet börjar på 1.',
    goal: `Få alla från Åkerkanten till Betet – ${FENCE.maxTurn} timmar. Genom diket eller över spången, och sedan genom stängslet – om vi kan. Tre steg.`,
    dangers: [
      { icon: '≋', name: 'Diket', effect: 'dödar', text: `Vattnet stiger nästan varje timme – det syns i förväg. Vid ${SWEEPS_SMALL} drar det med sig de små som står i diket (sista stunden), vid ${SWEEPS_MEDIUM} de mellanstora också. De stora och de som simmar står kvar – och den som står bredvid ett stort djur håller sig fast i det.` },
      { icon: '⚡', name: 'Stängslet', effect: 'dödar', text: 'Strömmen slår på och av. Den som står vid stängslet eller grinden när den är på: de små dör (sista stunden), de andra får chock.' },
      { icon: '▥', name: 'Stängt', text: 'Stängslet går inte att gå igenom. Bara de som flyger kommer över.' },
    ],
    shelter: [
      { icon: '⊓', name: 'Grinden', text: `Ett stort djur kan trycka upp grinden (◆${GATE_PUSH} extra) – eller två av oss tillsammans. Sedan står den öppen för alla.` },
      { icon: '◌', name: 'Kaninhålet', text: 'Ett hål under stängslet – bara för de små, och långsamt. Strömmen når inte dit.' },
      { icon: '⇡', name: 'Över', text: 'Ugglan flyger över – och kan bära en liten med sig (Bära liten).' },
      { icon: '◒', name: 'Under', text: 'Mullvaden gräver en gång under stängslet (Gräva gång), och de små följer med.' },
      { icon: '≈', name: 'Bävern', text: 'Laga dammen eller Fälla träd sänker vattnet i diket en nivå.' },
    ],
    tips: [
      'Spången är torr, men smal: gå över medan vattnet står lågt.',
      'Få ett stort djur till grinden tidigt. En öppen grind är vägen för alla som inte flyger.',
      'Låt ingen liten vänta vid stängslet när strömmen är på.',
    ],
  },
  harvest: {
    title: 'Så tar vi oss genom vetet',
    goal: `Få alla från Fältkanten till Häcken – ${HARVEST.maxTurn} timmar. Genom vetet: tre steg.`,
    dangers: [
      { icon: '▤', name: 'Skördetröskan', effect: 'dödar', text: `Från andra timmen skär den ${STRIPS_PER_HOUR} delar av vetet i timmen, runt kanten – det syns i förväg var. Den som står där när timmen går blir överkörd (sista stunden). Bara de som flyger kommer undan.` },
      { icon: '◒', name: 'Vråken', effect: 'dödar', text: 'Den följer skördetröskan och jagar i stubben. Skuggan visar var den slår ner: den tar den minsta där – en liten bärs bort (sista stunden), en mellanstor får klorna i sig. De stora tar den inte.' },
    ],
    shelter: [
      { icon: '♣', name: 'Vetet', text: 'Vete som står kvar gömmer alla för vråken – men inte för skördetröskan.' },
      { icon: '◉', name: 'De stora', text: 'Vråken kan inte lyfta de stora. ”Ta emot” från ett stort djur skyddar en liten.' },
    ],
    tips: [
      'Gå i vetet dit skördetröskan inte ska nästa timme – och sedan ut, innan vetet är borta.',
      'Stubben är farligast för de små. Korsa den snabbt, eller tillsammans med en stor.',
    ],
  },
  lamps: {
    title: 'Så tar vi oss förbi gatlyktorna',
    hard: 'Ibland är de två: två män med hund, som går åt var sitt håll runt kvarteret.',
    goal: `Få alla från Dikeskanten till Trädgårdarna – ${LAMPS.maxTurn} timmar. Över gatan, genom framgårdarna: tre steg.`,
    dangers: [
      { icon: '☀', name: 'Gatlyktorna', text: 'Över gatan och framgårdarna sitter lyktor. De tänds en i taget, och det syns hur länge det är kvar. En lykta som tänts släcks inte igen.' },
      { icon: '◣', name: 'Mannen med hunden', effect: 'skadar', text: 'Han går runt kvarteret, en zon i timmen – det syns var. Står vi i ljuset där han går när timmen går, får hunden syn på oss: den biter den minsta (ett sår som blöder) och jagar de andra tillbaka. I mörkret ser han ingen.' },
    ],
    shelter: [
      { icon: '♣', name: 'Busskuren och soptunnorna', text: 'Här finns ingen lykta. Här är det alltid mörkt.' },
      { icon: '◌', name: 'Gömd', text: 'Den som har gömt sig – smugit, krupit in, frusit stilla – hittar hunden inte, inte ens i ljuset.' },
      { icon: '⇡', name: 'Luften', text: 'Den som flyger når hunden inte.' },
    ],
    tips: [
      'Läs lyktorna: gå där det är mörkt, och där det blir mörkt längst.',
      'Mannen följer alltid samma runda. Var inte där han ska vara när ljuset är tänt.',
    ],
  },
  cats: {
    title: 'Så tar vi oss över bakgården',
    hard: 'Ibland är katterna tre.',
    goal: `Få alla från Källartrappan ut genom Porten – ${CATS.maxTurn} timmar. Över gården: tre steg.`,
    dangers: [
      { icon: '◆', name: 'Katterna', effect: 'dödar', text: 'Var och en ligger på lur någonstans på gården, och smyger till ett nytt gömställe varje timme – alltid granne med det förra. När timmen går slår den till mot den minsta där den ligger: en liten tas, en mellanstor rivs (ett sår som blöder). De stora rör den aldrig.' },
      { icon: '◉', name: 'Ögon i mörkret', text: 'På natten ser vi bara ögon, på två ställen för varje katt. Bara det ena är katten.' },
      { icon: '↟', name: 'Lönnen', text: 'Katter klättrar också. Den som klättrat upp i lönnen är inte säker.' },
    ],
    shelter: [
      { icon: '!', name: 'Våra rovdjur', text: 'Står ett av våra rovdjur där katten ligger, fräser den och backar – och gömmer sig nästa timme två steg bort.' },
      { icon: '■', name: 'De stora vaktar', text: 'Där en stor av oss står vågar ingen katt slå till.' },
      { icon: '◇', name: 'Kasta mat (◆1)', text: 'Ett kort bredvid handen, en gång på gården: den här timmen slåss katterna om maten och ser inte åt vårt håll.' },
      { icon: '⇡', name: 'Luften, och den gömda', text: 'Den som flyger når katten inte. Den som gömt sig hittar den inte, och den som rullat ihop sig sticker den sig på.' },
    ],
    tips: [
      'Låt en stor eller ett rovdjur gå före de små, och stå där katten ligger.',
      'Spara maten till timmen då du inte hinner flytta alla.',
    ],
  },
  street: {
    title: 'Så tar vi oss över affärsgatan',
    hard: 'Ibland är det lördag: folkmassan fyller båda trottoarerna, och spårvagnen går varannan timme.',
    goal: `Få alla från Gränden till Parken – ${STREET.maxTurn} timmar. Trottoaren, spåret, trottoaren: fyra steg.`,
    dangers: [
      { icon: '⁂', name: 'Folkmassan', effect: 'skadar', text: 'Varje timme väller folk fram över en trottoar – det syns var, och var nästa timme. De små trampas på (haltar eller bryter något). De mellanstora sparkas åt sidan. En stor syns, och folk skriker: alla av oss nära tappar 1 tro.' },
      { icon: '⇉', name: 'Cyklarna', effect: 'skadar', text: 'En av de två cykelbanorna är full av cyklar varje timme – det syns vilken. Den som står där blir påkörd.' },
      { icon: '▭', name: 'Spårvagnen', effect: 'dödar', text: 'Den går efter tidtabell, och klockan plingar timmen innan. Den som står på spåret när den kommer dör – om ingen hinner emellan.' },
      { icon: '?', name: 'På natten', text: 'Folkmassan är borta, men några vinglar hem. Vi hör bara på vilken sida spåret de går. Spårvagnen går mer sällan, och hörs bara på klockan.' },
    ],
    shelter: [
      { icon: '▯', name: 'Butiksdörren', text: 'I dörröppningen går ingen folkmassa och inga cyklar.' },
      { icon: '▬', name: 'Under bänken', text: 'Bara de små får plats, och det tar en timme att krypa ut. Där når varken fötter eller cyklar.' },
      { icon: '⇡', name: 'Luften', text: 'Den som flyger når varken fötter, cyklar eller spårvagn.' },
    ],
    tips: [
      'Läs tidtabellen: gå över spåret mellan två spårvagnar, och stå aldrig kvar där när klockan plingat.',
      'Ställ de små i dörren eller under bänken när folkmassan kommer.',
    ],
  },
  sewer: {
    title: 'Så tar vi oss genom avloppet',
    hard: 'Ibland har det varit skyfall: vattnet står redan högt när vi klättrar ner.',
    goal: `Få alla från Brunnen ut genom Utloppet – ${SEWER.maxTurn} timmar. Genom två rader tunnlar: tre steg.`,
    dangers: [
      { icon: '?', name: 'Mörkret', text: 'Vi ser inte vad en tunnel är förrän någon av oss står i den eller bredvid. Varje timme hör vi två tunnlar vi inte hittat: ”det porlar” är ett lågt rör, ”steg som ekar” en gång, ”torrt eko” en kant – och ”det piper” betyder råttor.' },
      { icon: '≈', name: 'Regnet', effect: 'dödar', text: `Vattnet stiger när det regnar ovanför. I ett lågt rör står det ett steg djupare, på en kant ett grundare. Vid djup ${SWEEPS_SMALL} drar det med sig de små, vid ${SWEEPS_MEDIUM} de mellanstora.` },
      { icon: '⌇', name: 'Råttorna', effect: 'skadar', text: 'De håller en korsning – två på natten. Den minsta av oss där blir biten när timmen går (ett sår som blöder), om ingen har betalat tull.' },
    ],
    shelter: [
      { icon: '◇', name: 'Betala tull (◆0)', text: 'Ett kort bredvid handen: välj det och sedan ett kort ur handen att lämna åt råttorna. Den timmen biter de ingen.' },
      { icon: '■', name: 'Håll i en stor', text: 'Den som står i samma tunnel som en av de stora håller sig fast och dras inte med. Simmare och stora står emot vattnet.' },
      { icon: '◌', name: 'Gömd, och taggar', text: 'Den som gömt sig hittar råttorna inte. Den som rullat ihop sig sticker de sig på.' },
      { icon: '◎', name: 'Lyssna', text: 'Kort som ser i mörkret – Känna skakningar, Lyssna i marken, Vittring – visar alla tunnlarna.' },
    ],
    tips: [
      'Gå på kanterna när vattnet stiger, och aldrig in i ett lågt rör med de små.',
      'Betala tull bara de timmar någon av oss står där råttorna är.',
    ],
  },
  fireworks: {
    title: 'Så tar vi oss genom fyrverkerinatten',
    hard: 'Ibland skjuter hela stan: från fjärde timmen en raket till varje timme.',
    goal: `Få alla från Parkgrinden till Banvallen – ${FIREWORKS.maxTurn} timmar, och den sista är midnatt. Genom parken: tre steg.`,
    dangers: [
      { icon: '✸', name: 'Smällarna', text: 'Varje timme syns var raketerna ska smälla. En liten smäll når bara sin egen zon, en stor även zonerna bredvid. Den som nås när timmen går far iväg en zon bort från smällen – aldrig upp på banvallen – och tappar 1 tro. Ingen dör av smällarna, men tiden går.' },
      { icon: '⁂', name: 'Folkmassan', text: 'Folk med tomtebloss fyller en zon varje timme – det syns var, och var nästa timme. Dit kan ingen gå, men den som redan är där kan gå därifrån.' },
      { icon: '☾', name: 'Midnatt', text: 'Den sista timmen smäller tre stora raketer på en gång. Var över, eller i skydd, innan dess.' },
    ],
    shelter: [
      { icon: '♥', name: 'Håll i varandra', text: 'Två av oss med band 2 eller mer i samma zon trycker sig mot varandra. Ingen av dem far iväg.' },
      { icon: '♡', name: 'Tröst når alla', text: 'Här når Trösta och Tålamod alla i samma zon som den man tröstar, inte bara en.' },
      { icon: '♣', name: 'Skydd dämpar', text: 'I buskarna, i musikpaviljongen och vid grinden når bara en smäll rakt ovanför.' },
    ],
    tips: [
      'Gå två och två – de som står varandra nära står kvar när det smäller.',
      'Spara tröst till timmen efter en stor smäll, när rädslan sitter i.',
    ],
  },
  bog: {
    title: 'Så tar vi oss över gungflyet',
    hard: 'Ibland har det regnat: då bär inte ens tuvorna i öster, och alla sjunker fortare.',
    goal: `Få alla från Myrkanten till Tallholmen – ${BOG.maxTurn} timmar. Över mossen: tre steg.`,
    dangers: [
      { icon: '≋', name: 'Den mjuka mossan', text: 'Den som står still en hel timme på mjuk mossa sjunker. De små, haren och kidet sjunker ett halvt steg i timmen, de mellanstora ett, de stora två – och efter regn alla lite fortare.' },
      { icon: '⊗', name: 'Fast', text: 'Vid två steg sitter man fast: man kan inte gå själv och inte ledas – utom av en stor i samma zon, som drar loss en (◆1 mer).' },
      { icon: '✝', name: 'Dras ner', effect: 'dödar', text: 'Vid tre steg drar mossen ner en. Sista stunden: någon kan kasta sig fram och dra. Simmare – paddan och bävern – flyter i stället, fast men vid liv.' },
    ],
    shelter: [
      { icon: '▲', name: 'Tuvorna och spången', text: 'Tuvan, tuvorna i öster och den gamla spången bär. Där sjunker ingen.' },
      { icon: '→', name: 'Gå vidare', text: 'Den som flyttar sig under timmen sjunker inte, och mossan släpper.' },
      { icon: '⌃', name: 'Flyga, bäras', text: 'Den som flyger sjunker inte. Bära lyfter en som sitter fast.' },
    ],
    tips: [
      'Flytta de stora först – de sjunker fortast.',
      'Låt de små vänta en timme på mossan om det behövs; de har tid.',
    ],
  },
  wisps: {
    title: 'Så tar vi oss förbi irrblossen',
    hard: 'Ibland är mossen full av irrbloss: två eller tre varje timme i stället för ett.',
    goal: `Få alla från Ljungkanten till Granskogen – ${WISPS.maxTurn} timmar, och bara om natten. Över mossen: tre steg.`,
    dangers: [
      { icon: '✧', name: 'Irrblossen', text: 'Varje timme syns var ljusen svävar – över gölarna och den mjuka mossan. Den som har egen vilja och står i eller bredvid ett ljus går mot det när timmen går, i stället för sin egen vilja. Trösta bryter det.' },
      { icon: '◍', name: 'Gölarna', effect: 'dödar', text: 'Den som står i en göl när timmen går fryser (−1 tro). De små som inte simmar drunknar – sista stunden. Simmare klarar sig.' },
      { icon: '≋', name: 'Den mjuka mossan', text: 'Som på gungflyet: den som står still en hel timme sjunker, och vid två steg sitter man fast. Stenen, kavelbron och tuvbacken bär.' },
    ],
    shelter: [
      { icon: '✦', name: 'Det sanna ljuset', text: 'En gång i natten svävar ett ljus över fast mark. Den som står där när timmen går får +1 tro. Paddan känner igen det, och kort som ser i mörkret – Känna skakningar, Lyssna i marken, Vittring – visar vilket det är.' },
      { icon: '♡', name: 'Håll dem nära', text: 'Bara den med egen vilja lockas. Tröst, och hopp, håller dem hos oss.' },
    ],
    tips: [
      'Trösta den som står bredvid ett ljus innan timmen går.',
      'Led de tvivlande längs stenen och kavelbron, bort från gölarna.',
    ],
  },
};
