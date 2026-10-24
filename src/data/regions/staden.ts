// Stadens utkant: where the fields end and the town begins. Street lights, dogs on
// leads, roads that never sleep. Its own dangers are the lamps, the cats in the courtyard,
// the shopping street and the sewer, and its boss is Fyrverkerinatten. Its story parts
// come in the next step; old dangers stand in new places, and borrowed stories, meanwhile.
import type { Template } from './dalen';
import { AKRARNA } from './akrarna';
import { DALEN, type RegionDef } from './dalen';

const [, , river] = DALEN.dangers;
/** A story part borrowed from the glen or the fields, until the town has its own. */
const story = (key: string): Template =>
  [...DALEN.meetings, ...DALEN.finds, ...AKRARNA.meetings, ...AKRARNA.finds].find((t) => t.key === key)!;

const lamps: Template = {
  key: 'gatlyktorna', kind: 'encounter', encounter: 'lamps', name: 'Gatlyktorna', fogName: 'Ljus i fjärran?',
  memory: { normal: 'en hundägare', hard: 'två hundägare' },
  arrive: 'Den första gatan. Lyktorna är släckta än, men en efter en börjar de tändas. Någonstans skäller en hund.',
  note: 'Gatlyktor, och en man med hund.',
};

const cats: Template = {
  key: 'bakgarden', kind: 'encounter', encounter: 'cats', name: 'Bakgården', fogName: 'Något som väntar mellan husen?',
  memory: { normal: 'en katt', hard: 'katterna är tre' },
  arrive: 'En bakgård mellan höga hus. Cyklar, en sandlåda, en lönn. Det är tyst – för tyst. Något rör sig under cyklarna.',
  arriveNight: 'En bakgård mellan höga hus. Fönstren lyser gult. Under cyklarna glimmar något grönt.',
  note: 'En bakgård. Katter.',
};

const street: Template = {
  key: 'affarsgatan', kind: 'encounter', encounter: 'street', name: 'Affärsgatan', fogName: 'Ett sorl av röster?',
  memory: { normal: 'en vanlig vardag', hard: 'lördag, rusning' },
  arrive: 'Affärsgatan. Skyltfönster, cyklar, och mitt i gatan rälsen. Det är fullt av människor, och ingen ser ner.',
  arriveNight: 'Affärsgatan om natten. Skyltfönstren lyser för ingen. Någonstans sjunger någon, falskt.',
  note: 'En gata med folk, cyklar och spårvagn.',
};

const sewer: Template = {
  key: 'avloppet', kind: 'encounter', encounter: 'sewer', name: 'Avloppet', fogName: 'Ett brus under gatan?',
  memory: { normal: 'det har regnat lite', hard: 'skyfall' },
  arrive: 'Ett galler i gatan står på glänt. Under det: en stege, mörker, och ljudet av vatten.',
  arriveNight: 'Ett galler i gatan står på glänt. Därnere är det svart, och något piper.',
  note: 'Under staden. Vatten, och råttor.',
};

export const STADEN: RegionDef = {
  id: 'staden',
  name: 'Stadens utkant',
  fogName: 'Staden – ljus, och hundar',
  epilogue: 'Bakom oss lyser staden, och ljuset når långt ut över fälten. Vi går ut i mörkret igen, och för första gången är vi glada för det.',
  beyond: 'Bortom staden',
  after: ['akrarna'],
  start: { key: 'stadsgransen', kind: 'start', name: 'Stadsgränsen', fogName: 'Stadsgränsen', arrive: 'Åkrarna tar slut vid en skylt. Bortom den börjar staden: asfalt, ljus, och ett ljud som aldrig tystnar.' },
  first: lamps,
  dangers: [
    cats,
    street,
    sewer,
    { ...lamps, key: 'gatlyktorna2', name: 'Villagatan', fogName: 'Fler lyktor?', arrive: 'En gata till, med hus på båda sidor. Lyktorna står tätare här.' },
    {
      key: 'infarten', kind: 'encounter', encounter: 'road', name: 'Infartsvägen', fogName: 'Ett brus som aldrig slutar?',
      arrive: 'Infartsvägen in mot staden. Bilarna slutar aldrig komma.',
      arriveDay: 'Infartsvägen in mot staden, i dagsljus. Bilarna står nästan stilla – och ändå kommer de.',
      note: 'En väg in mot staden. Bilar, och ljus.',
    },
    { ...river, key: 'anGenomStan', name: 'Ån genom stan', fogName: 'Vatten mellan husen?', arrive: 'Ån rinner rakt genom staden, mellan murar. Någon har lagt stenar i den.', arriveNight: 'Ån glittrar svart mellan husen.', note: 'Vatten, och murar.' },
  ],
  meetings: ['maten', 'framlingen', 'krakflocken', 'koltrasten'].map(story),
  finds: ['barsnar', 'tradet', 'spillsad'].map(story),
  fire: { key: 'underBron', kind: 'campfire', name: 'Under bron', fogName: 'En bro?', arrive: 'Under en bro är det torrt och mörkt. Ovanför oss dånar bilarna.', note: 'Vila, under bron.' },
  lastFire: { key: 'skjulet', kind: 'campfire', name: 'Skjulet', fogName: 'Ett skjul?', arrive: 'Ett gammalt skjul längst bak i en trädgård. Dörren står på glänt.', note: 'Sista vilan i staden.' },
  /** The boss of the city: New Year's Eve in the city park. */
  end: {
    key: 'fyrverkerinatten', kind: 'encounter', encounter: 'fireworks', name: 'Stadsparken', fogName: 'Stadsparken – där fyrverkerierna börjar',
    memory: { normal: 'några raketer', hard: 'hela stan skjuter' },
    arrive: 'Den sista parken i staden. Bortom den går banvallen, och bortom den mörkret. Det är nyårsafton, och himlen börjar smälla.',
    note: 'Sista natten i staden. Nyår.',
  },
};
