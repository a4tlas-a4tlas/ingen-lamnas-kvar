// Skogsbrynet: the last stretch, where the forest begins. Not a whole region – one road,
// one choice of way, one last fire – and then the forest. Its end is where the hunter
// waits: Jägaren, the final boss.
import { DALEN, type RegionDef } from './dalen';

const [, farm, river] = DALEN.dangers;

export const SKOGSBRYNET: RegionDef = {
  id: 'skogsbrynet',
  name: 'Skogsbrynet',
  fogName: 'Skogsbrynet – där skogen börjar',
  epilogue: 'Bakom oss ligger allt vi har gått igenom. Framför oss står skogen, mörk och tät och stilla.',
  beyond: 'Skogen',
  middleRows: 1,
  arriveFrom: {
    akrarna: 'Fälten tar slut. Bortom det sista diket står en mörk rand av granar: skogen.',
    staden: 'Staden ligger bakom oss. Framför oss, äntligen: en mörk rand av granar. Skogen.',
    mossen: 'Mossen tar slut i en skogsbacke. Det luktar kåda och mylla. Skogen.',
    hoglandet: 'Vi går ner från höglandet. Björkarna kommer tillbaka, och sedan granarna. Skogen.',
  },
  start: { key: 'hygget', kind: 'start', name: 'Hygget', fogName: 'Hygget', arrive: 'Ett kalhygge, och bortom det en mörk rand av granar. Skogen. Vi är nästan framme.' },
  first: {
    ...DALEN.first, key: 'skogsvagen', name: 'Skogsvägen', fogName: 'En väg vid skogskanten?',
    arrive: 'En sista väg, utmed skogskanten. Vi började med en väg. Vi slutar med en.',
    arriveDay: 'En sista väg, utmed skogskanten. Bilarna kör fort här, där ingen bor.',
    note: 'Den sista vägen.',
  },
  dangers: [
    { ...farm, key: 'sistaGarden', name: 'Den sista gården', fogName: 'Ett hus vid skogen?', arrive: 'En gård alldeles vid skogsbrynet. Det sista huset.', arriveNight: 'En gård alldeles vid skogsbrynet. Ett ljus lyser i det sista huset.' },
    { ...river, key: 'skogsbacken', name: 'Skogsbäcken', fogName: 'Vatten mellan träden?', arrive: 'En bäck rinner ut ur skogen, kall och klar.', arriveNight: 'En bäck rinner ut ur skogen. Vi hör den i mörkret.', note: 'Kallt vatten, ur skogen.' },
  ],
  meetings: [
    { key: 'doften', kind: 'meeting', meeting: 'doften', name: 'Skogens doft', fogName: 'En doft i vinden?', arrive: 'Vinden vänder, och vi känner den: skogen.', note: 'Skogen, nästan.' },
  ],
  finds: [
    { key: 'barbusken', kind: 'find', meeting: 'barbusken', name: 'Den sista bärbusken', fogName: 'Bär vid skogskanten?', arrive: 'Vid skogskanten växer blåbär, mörka och mogna.', note: 'Mat.' },
  ],
  fire: { key: 'underGranarna', kind: 'campfire', name: 'Under granarna', fogName: 'Granar?', arrive: 'De första granarna. Under dem är det torrt och mjukt av barr.', note: 'Vila, under granarna.' },
  lastFire: { key: 'sistaElden', kind: 'campfire', name: 'Den sista elden', fogName: 'En sista vila?', arrive: 'En glänta strax innanför skogskanten. Vi tänder den sista elden.', note: 'Den sista elden.' },
  /** The final boss, at the edge of the forest: the hunter and his dog. */
  end: {
    key: 'jagaren', kind: 'encounter', encounter: 'hunt', name: 'Jägaren', fogName: 'Skogskanten – där jägaren väntar',
    memory: { normal: 'en jägare', hard: 'ett jaktlag' },
    arrive: 'Ett sista hygge, och bortom det skogen. Vid skogskanten står någon och väntar, med något långt över armen.',
    note: 'Den sista faran. Jägaren.',
  },
};
