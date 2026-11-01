// Höglandet: the bare highlands above the tree line. Heath and rock, wind and cold, and
// nowhere to hide. Its first danger is Stormen, the wind over the heath; old dangers
// stand in new places, and borrowed stories meanwhile, until its own come. Its boss
// will be Snöstormen, the first snow – until then, the region ends at the pass.
import { AKRARNA } from './akrarna';
import type { Template } from './dalen';
import { DALEN, type RegionDef } from './dalen';

const [, , river] = DALEN.dangers;
const gravel = AKRARNA.first;
const fields = AKRARNA.dangers.find((t) => t.encounter === 'raptor')!;
const story = (key: string): Template => [...DALEN.meetings, ...DALEN.finds].find((t) => t.key === key)!;

const storm: Template = {
  key: 'stormen', kind: 'encounter', encounter: 'storm', name: 'Stormen', fogName: 'Vind över heden?',
  memory: { normal: 'vinden drar i stråk', hard: 'vinden kommer i byar' },
  arrive: 'Björkarna tar slut. Framför oss ligger heden, och över den drar vinden fram så att ljungen lägger sig.',
  arriveNight: 'Björkarna tar slut. I mörkret hör vi vinden dra fram över heden, och känner kylan i den.',
  note: 'Öppen hed, och vind. Bara några stenar att stå i lä bakom.',
};

export const HOGLANDET: RegionDef = {
  id: 'hoglandet',
  name: 'Höglandet',
  fogName: 'Höglandet – vind, och sten',
  epilogue: 'Bakom oss ligger höglandet, kalt och blåsigt. Där fanns ingenstans att gömma sig – bara varandra.',
  beyond: 'Bortom höglandet',
  arriveFrom: {
    akrarna: 'Fälten stiger, och blir till backar, och backarna till berg. Träden blir färre för varje steg. Sedan tar de slut.',
    staden: 'Staden ligger långt nedanför oss nu, en grå fläck i dalen. Här uppe är luften kall och klar, och tyst.',
    mossen: 'Mossen tar slut mot en brant. Vi klättrar, och när vi ser oss om ligger mossen grå under oss. Framför oss: berg.',
  },
  start: { key: 'tradgransen', kind: 'start', name: 'Trädgränsen', fogName: 'Trädgränsen', arrive: 'De sista björkarna står krokiga och låga. Ovanför dem finns bara ljung, och sten, och himmel.' },
  first: storm,
  dangers: [
    { ...storm, key: 'stormen2', name: 'Det höga fjället', fogName: 'Mer vind?', arrive: 'Högre upp nu. Heden är kalare, och vinden kallare.', arriveNight: 'Högre upp nu. Stjärnorna är skarpa, och vinden skär.' },
    { ...river, key: 'fjallbacken', name: 'Fjällbäcken', fogName: 'Forsande vatten?', arrive: 'En bäck störtar ner mellan stenarna, vit av skum och iskall.', arriveNight: 'En bäck störtar ner mellan stenarna. Vi hör den långt innan vi ser den.', note: 'Kallt, fort vatten, och hala stenar.' },
    { ...fields, key: 'kalfjallet', name: 'Kalfjället', fogName: 'Något kretsar över fjället?', arrive: 'Kalfjället ligger öppet, och högt över det kretsar en stor fågel.', arriveNight: 'Kalfjället ligger öppet och svart. Ingenting rör sig.', note: 'Öppet. Bara stenarna att gömma sig bakom.' },
    { ...gravel, key: 'fjallvagen', name: 'Vägen över fjället', fogName: 'En väg över fjället?', arrive: 'En smal grusväg slingrar sig över fjället. Långt borta hörs en motor.', arriveDay: 'En smal grusväg slingrar sig över fjället. Dammet syns långt.', note: 'Grus, och långsamma bilar.' },
  ],
  meetings: ['koltrasten', 'hjorten', 'framlingen'].map(story),
  finds: ['barsnar', 'tradet', 'stigen'].map(story),
  fire: { key: 'fjallstugan', kind: 'campfire', name: 'Den gamla fjällstugan', fogName: 'Ett tak?', arrive: 'En gammal stuga, tom sedan länge. Taket håller, och väggarna tar vinden.', note: 'Vila, i lä.' },
  lastFire: { key: 'grottan', kind: 'campfire', name: 'Under klippan', fogName: 'En klippa?', arrive: 'Under en överhängande klippa är det torrt och stilla. Vinden går över oss.', note: 'Sista vilan på höglandet.' },
  /** The pass over the highlands, until Snöstormen: a hard storm. */
  end: {
    ...storm, key: 'passet', name: 'Passet', fogName: 'Passet – den enda vägen över',
    memory: { normal: 'vinden drar i stråk', hard: 'vinden kommer i byar' },
    arrive: 'Den sista biten upp. Passet mellan topparna, och genom det tjuter vinden.',
    arriveNight: 'Den sista biten upp. Passet mellan topparna ligger svart, och vinden tjuter genom det.',
    note: 'Passet. Den enda vägen över.',
  },
};
