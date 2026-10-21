// Åkrarna: the open fields beyond the ridge. Wide sky, no trees, and nowhere to hide
// but the furrows. Its own dangers – the birds, the sprayer, the ditch and the gate –
// and its own story parts; old dangers stand in new places, and the boss comes next.
import { DALEN, type RegionDef } from './dalen';

const [, farm, river] = DALEN.dangers;
const story = (key: string) => DALEN.meetings.find((t) => t.key === key) ?? DALEN.finds.find((t) => t.key === key)!;

export const AKRARNA: RegionDef = {
  id: 'akrarna',
  name: 'Åkrarna',
  fogName: 'Åkrarna – vida fält, och himmel',
  epilogue: 'Bakom oss ligger åkrarna, gula och tomma. Ingen av oss kommer att glömma hur stor himlen var där.',
  start: { key: 'akerkanten', kind: 'start', name: 'Åkerkanten', fogName: 'Åkerkanten', arrive: 'Nedanför åsen börjar åkrarna. Så långt vi ser: fält, och himmel.' },
  first: {
    key: 'grusvagen', kind: 'encounter', encounter: 'road', road: 'gravel', name: 'Grusvägen', fogName: 'En väg mellan fälten?',
    arrive: 'En grusväg skär genom fälten. Långt borta hörs en traktor.',
    arriveDay: 'En grusväg skär genom fälten. Dammet ligger kvar efter traktorerna.',
    note: 'Grus, och traktorer – långsamma och breda. De hörs långt innan de kommer.',
  },
  dangers: [
    {
      key: 'falten', kind: 'encounter', encounter: 'raptor', name: 'Fälten', fogName: 'Något kretsar över fälten?',
      memory: { normal: 'en vråk kretsar', hard: 'ett vråkpar jagar' },
      arrive: 'Fälten ligger öppna under en stor himmel. Högt där uppe kretsar något.',
      arriveNight: 'Fälten ligger svarta och tysta. Ingenting rör sig – det är det som är det farliga.',
      note: 'Öppet, och himmel. Inget skydd utom fårorna.',
    },
    {
      key: 'sprutan', kind: 'encounter', encounter: 'sprayer', name: 'Sprutan', fogName: 'Det luktar sött från fälten?',
      memory: { normal: 'en spruta på fältet', hard: 'två sprutor' },
      arrive: 'En traktor kör fram och tillbaka över raderna. Bakom den hänger en söt, vit dimma.',
      arriveNight: 'Traktorn står stilla vid kanten. Men det luktar sött över raderna, och dimman ligger lågt.',
      note: 'Raderna, traktorn och dimman. Bäcken längs kanten.',
    },
    {
      key: 'stangslet', kind: 'encounter', encounter: 'fence', name: 'Diket och grinden', fogName: 'Ett stängsel tvärs över?',
      memory: { normal: 'diket är torrt', hard: 'diket är fullt' },
      arrive: 'Ett dike, och bakom det ett stängsel som surrar. Bortom ligger ett grönt bete.',
      arriveNight: 'Vi hör stängslet innan vi ser det: ett lågt surr i mörkret. Vattnet i diket glittrar.',
      note: 'Ett dike som stiger, och ett stängsel med ström. En grind.',
    },
    {
      ...farm, key: 'akergarden', name: 'Gården vid åkern', fogName: 'En röd lada?',
      arrive: 'En gård mitt bland fälten. Ladan är större än den hemma, och hundarna också.',
      arriveNight: 'En gård mitt bland fälten. Ett ensamt ljus brinner i köket.',
    },
    {
      ...river, key: 'kanalen', name: 'Kanalen', fogName: 'Rinnande vatten?',
      arrive: 'En rak kanal delar fälten. Någon har lagt stenar i den, och bävrar har byggt en damm.',
      arriveNight: 'Kanalen glittrar svart mellan fälten.',
      note: 'Rakt vatten, och djupt.',
    },
  ],
  meetings: [
    { key: 'faran', kind: 'meeting', meeting: 'faran', name: 'Den djupa fåran', fogName: 'Något i fåran?', arrive: 'En fåra, djupare än de andra.', note: 'Någon är där nere.' },
    { key: 'krakflocken', kind: 'meeting', meeting: 'krakflocken', name: 'Elledningen', fogName: 'Svarta prickar på en tråd?', arrive: 'En elledning över fältet, och på den sitter kråkor.', note: 'Kråkor. Många.' },
    { key: 'haren', kind: 'meeting', meeting: 'haren', name: 'Harfältet', fogName: 'Spår i fårorna?', arrive: 'Fårorna är fulla av spår.', note: 'Någon lever här.' },
    story('maten'),
  ],
  finds: [
    { key: 'skramman', kind: 'find', meeting: 'skramman', name: 'Fågelskrämman', fogName: 'Någon som står still?', arrive: 'Mitt på fältet står någon och står still.', note: 'Skugga, kanske.' },
    { key: 'spillsad', kind: 'find', meeting: 'spillsad', name: 'Spillsäden', fogName: 'Något gult vid kanten?', arrive: 'Det luktar säd.', note: 'Mat, kanske.' },
    { key: 'traktorn', kind: 'find', meeting: 'traktorn', name: 'Den rostiga traktorn', fogName: 'Något stort och tyst?', arrive: 'En traktor står vid fältkanten. Den rör sig inte.', note: 'Ett tak, kanske.' },
    story('stigen'),
  ],
  fire: { key: 'halmstacken', kind: 'campfire', name: 'Halmstacken', fogName: 'Ett skydd på fältet?', arrive: 'En gammal halmstack, varm inuti. Här kan vi vila.', note: 'Vila, och värme.' },
  lastFire: { key: 'vindskyddet', kind: 'campfire', name: 'Vindskyddet', fogName: 'Ett skydd vid fältkanten?', arrive: 'Ett vindskydd av sten vid fältkanten. Vinden når inte in.', note: 'Sista vilan på åkrarna.' },
  end: { key: 'bortomAkrarna', kind: 'end', name: 'Bortom åkrarna', fogName: 'Där åkrarna tar slut', arrive: 'Fälten tar slut vid en häck. Bortom den börjar något annat.' },
};
