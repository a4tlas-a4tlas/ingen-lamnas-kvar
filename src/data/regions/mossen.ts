// Mossen: the great bog beyond the edge of things. No people come here – only water,
// moss and silence, and it is easy to lose your way, and each other. Its dangers are
// the quaking bog, the lights, the cranes and the peat cutting; old dangers stand in new
// places; its story parts are about being lost and found. Its boss is Dimman, the fog.
import type { Template } from './dalen';
import { DALEN, type RegionDef } from './dalen';

const [, , river] = DALEN.dangers;

const bog: Template = {
  key: 'gungflyet', kind: 'encounter', encounter: 'bog', name: 'Gungflyet', fogName: 'Mark som gungar?',
  memory: { normal: 'mossan bär', hard: 'det har regnat' },
  arrive: 'Mossan börjar. Den gungar under tassarna, och mellan tuvorna blänker svart vatten.',
  arriveNight: 'Mossan börjar. I mörkret ser vi bara tuvorna, svartare än vattnet omkring.',
  note: 'Mjuk mossa, och tuvor som bär.',
};

export const MOSSEN: RegionDef = {
  id: 'mossen',
  name: 'Mossen',
  fogName: 'Mossen – vatten, och tystnad',
  epilogue: 'Bakom oss ligger mossen, stilla och grå. Vi gick vilse där, och vi hittade tillbaka till varandra. Inte alla av oss.',
  beyond: 'Bortom mossen',
  arriveFrom: {
    akrarna: 'Fälten tar slut i ett dike, och bortom diket börjar mossen. Ingen väg, inget ljud. Bara vatten, och himmel.',
    hoglandet: 'Vi går ner från höglandet, och nedanför bergen breder mossen ut sig, grå och stilla. Ingen väg, inget ljud.',
    staden: 'Stadens ljus försvinner bakom oss. Framför oss ligger mossen, och så tyst har det inte varit sedan dalen.',
  },
  start: { key: 'myrkanten', kind: 'start', name: 'Myrkanten', fogName: 'Myrkanten', arrive: 'Dalen ligger långt bakom oss. Framför oss börjar mossen: vida, tyst och grå. Här finns inga människor. Här finns ingen alls.' },
  first: bog,
  dangers: [
    {
      key: 'torvtakten', kind: 'encounter', encounter: 'peat', name: 'Torvtäkten', fogName: 'Ett motorljud över mossen?',
      memory: { normal: 'maskinen vilar ibland', hard: 'de arbetar i skift' },
      arrive: 'Här har någon skurit mossen i block. Torvstackar står i rader, och längst bort mullrar en maskin.',
      note: 'En maskin, och diken som fylls.',
    },
    {
      key: 'tranmyren', kind: 'encounter', encounter: 'cranes', name: 'Tranmyren', fogName: 'Rop över mossen?',
      memory: { normal: 'några tranor', hard: 'en hel dans' },
      arrive: 'Dimman ligger låg över en öppen myr. Ur den hörs ett rop som en trumpet – och sedan dansar något grått.',
      note: 'Fast mark, och dansande tranor.',
    },
    {
      key: 'irrblossen', kind: 'encounter', encounter: 'wisps', name: 'Irrblosskärret', fogName: 'Ljus över mossen?',
      memory: { normal: 'ett irrbloss', hard: 'många irrbloss' },
      arrive: 'Kärret ligger svart framför oss. Långt ute över mossen tänds ett litet blått ljus.',
      note: 'Ljus i mörkret, och djupa gölar.',
    },
    { ...bog, key: 'gungflyet2', name: 'Den stora mossen', fogName: 'Mer mjuk mark?', arrive: 'Mossen igen, större nu. Tuvorna står glesare.', arriveNight: 'Mossen igen. Någonstans ropar en fågel vi inte känner.' },
    { ...river, key: 'myrbacken', name: 'Myrbäcken', fogName: 'Brunt vatten?', arrive: 'En bäck slingrar sig genom mossen, brun som te.', arriveNight: 'En bäck slingrar sig genom mossen. Vi hör den innan vi ser den.', note: 'Brunt vatten, och stenar.' },
    {
      key: 'karret', kind: 'encounter', encounter: 'raptor', name: 'Det öppna kärret', fogName: 'Något över kärret?',
      memory: { normal: 'en kärrhök jagar', hard: 'ett par kärrhökar' },
      arrive: 'Kärret ligger öppet. Lågt över starren glider en hök, fram och tillbaka.',
      arriveNight: 'Kärret ligger öppet och svart. Ingenting rör sig – det är det som är det farliga.',
      note: 'Öppet, och himmel. Bara starren att gömma sig i.',
    },
  ],
  meetings: [
    { key: 'vilsna', kind: 'meeting', meeting: 'vilsna', name: 'Dimman över kärret', fogName: 'Ett rop i dimman?', arrive: 'Dimman ligger tät över kärret. Någonstans i den ropar någon.', note: 'Någon är vilse.' },
    { key: 'eremiten', kind: 'meeting', meeting: 'eremiten', name: 'Den ensamma holmen', fogName: 'En holme med ett träd?', arrive: 'En liten holme, med en enda krokig tall. Någon bor här.', note: 'Någon som valt att vara ensam.' },
    { key: 'ekot', kind: 'meeting', meeting: 'ekot', name: 'Ekot', fogName: 'Röster över mossen?', arrive: 'Mossen är så stilla att varje ljud kommer tillbaka.', note: 'Röster.' },
  ],
  finds: [
    { key: 'hjortron', kind: 'find', meeting: 'hjortron', name: 'Hjortronmyren', fogName: 'Något orange på myren?', arrive: 'Myren lyser orange.', note: 'Mat, kanske.' },
    { key: 'boet', kind: 'find', meeting: 'boet', name: 'Det tomma boet', fogName: 'En grop i starren?', arrive: 'Starren är nedtrampad i en stor ring.', note: 'Ett bo, kanske.' },
    { key: 'ryggsacken', kind: 'find', meeting: 'ryggsacken', name: 'Ryggsäcken', fogName: 'Något blått i starren?', arrive: 'Något blått ligger i starren. Det hör inte hit.', note: 'Något bortglömt.' },
    { key: 'tjarnen', kind: 'find', meeting: 'tjarnen', name: 'Myrstjärnan', fogName: 'Blankt vatten?', arrive: 'En tjärn, rund och stilla som ett öga.', note: 'Stilla vatten.' },
  ],
  fire: { key: 'torraHolmen', kind: 'campfire', name: 'Den torra holmen', fogName: 'En holme?', arrive: 'En holme av fast mark mitt i mossen, med ljung och en enda tall. Här kan vi vila.', note: 'Vila, på fast mark.' },
  lastFire: { key: 'underGranen', kind: 'campfire', name: 'Under granen', fogName: 'En gran vid mossens kant?', arrive: 'Under en gammal gran är det torrt. Grenarna hänger ända ner till marken.', note: 'Sista vilan på mossen.' },
    /** The boss of the bog: the fog, where we lose each other. */
  end: {
    key: 'dimman', kind: 'encounter', encounter: 'fog', name: 'Dimman', fogName: 'Dimman – där vi tappar varandra',
    memory: { normal: 'dimman lättar ibland', hard: 'tjock som mjölk' },
    arrive: 'Den sista biten av mossen. Dimman kommer krypande över starren, tills vi knappt ser varandra.',
    note: 'Sista mossen. Dimman.',
  },
};
