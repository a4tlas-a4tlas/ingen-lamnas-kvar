// Åkrarna: the open fields beyond the ridge. Wide sky, no trees, and nowhere to hide
// but the furrows. The birds of prey are its own; more dangers and its boss come in
// the next steps, and old dangers stand in new places meanwhile.
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
    key: 'grusvagen', kind: 'encounter', encounter: 'road', name: 'Grusvägen', fogName: 'En väg mellan fälten?',
    arrive: 'En grusväg skär genom fälten. Långt borta hörs en traktor.',
    arriveDay: 'En grusväg skär genom fälten. Dammet ligger kvar efter bilarna.',
    note: 'En väg. Färre bilar än hemma – men inget att gömma sig bakom.',
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
  meetings: ['koltrasten', 'maten', 'framlingen', 'tvekan'].map(story),
  finds: ['barsnar', 'stigen', 'tradet'].map(story),
  fire: { key: 'halmstacken', kind: 'campfire', name: 'Halmstacken', fogName: 'Ett skydd på fältet?', arrive: 'En gammal halmstack, varm inuti. Här kan vi vila.', note: 'Vila, och värme.' },
  lastFire: { key: 'vindskyddet', kind: 'campfire', name: 'Vindskyddet', fogName: 'Ett skydd vid fältkanten?', arrive: 'Ett vindskydd av sten vid fältkanten. Vinden når inte in.', note: 'Sista vilan på åkrarna.' },
  end: { key: 'bortomAkrarna', kind: 'end', name: 'Bortom åkrarna', fogName: 'Där åkrarna tar slut', arrive: 'Fälten tar slut vid en häck. Bortom den börjar något annat.' },
};
