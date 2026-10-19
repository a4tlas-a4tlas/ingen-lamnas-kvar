// Dalen: the glen we flee, and the first region of the way. Its places, as templates
// the map is drawn from; the order and the paths between them differ every run.
import type { MapNode, PromiseRule, RegionId } from '../../engine/types';

/** A place before it is put on the map: no position, no paths yet. `key` names it. */
export type Template = Omit<MapNode, 'id' | 'row' | 'x' | 'y' | 'next'> & { key: string };

export interface RegionDef {
  id: RegionId;
  name: string;
  /** How the region is named before we have seen it: in the interlude, when choosing the way. */
  fogName: string;
  /** Said when we leave the region behind, over its boss. */
  epilogue: string;
  /** The promise someone asks of us when we look back on the region. */
  verse?: PromiseRule;
  start: Template;
  /** The first danger, always the same. */
  first: Template;
  dangers: Template[];
  meetings: Template[];
  finds: Template[];
  /** A campfire may also lie along the way, in the middle rows. */
  fire: Template;
  /** The fire before the end, and the end itself. */
  lastFire: Template;
  end: Template;
}

const road = (key: string, name: string): Template => ({
  key, kind: 'encounter', encounter: 'road', name, fogName: 'Motorljud…',
  arrive: 'Asfalten ligger svart framför oss. Ljusen kommer och går.',
  arriveDay: 'Asfalten glänser i dagsljuset. Bilarna kommer tätare nu – men vi ser dem alla.',
  note: 'En väg. Bilar, och ljus.',
});

export const DALEN: RegionDef = {
  id: 'dalen',
  name: 'Dalen',
  fogName: 'Dalen',
  epilogue: 'Vi står på åsen och ser ner. Där dalen låg finns bara lera och stubbar. Bakom oss tystnar maskinerna. Framför oss ligger allt det andra.',
  verse: 'noCity',
  start: { key: 'dalen', kind: 'start', name: 'Dalen', fogName: 'Dalen', arrive: 'Dalen, där vi föddes. Maskinerna står still i natt.' },
  first: road('vagen', 'Vägen'),
  dangers: [
    {
      key: 'garden', kind: 'encounter', encounter: 'farm', name: 'Gården', fogName: 'Ett hus?',
      memory: { normal: 'hundarna sover', hard: 'gården är vaken' },
      arrive: 'En gård i gryningen. Röda väggar, en stenmur, och två hundar som sover vid kojan.',
      arriveNight: 'En gård i mörkret. Fönstren är släckta, och vid kojan sover två hundar med nosen mot vinden.',
      note: 'Fast mark och en mur att klättra över – men hundar.',
    },
    {
      key: 'an', kind: 'encounter', encounter: 'river', name: 'Ån', fogName: 'Vatten?',
      memory: { normal: 'ån är lugn', hard: 'ån svämmar över' },
      arrive: 'Ån brusar mellan stenarna. På andra sidan väntar åkrarna.',
      arriveNight: 'Ån brusar i mörkret. Vattnet är svart och kallt, och stenarna glänser.',
      note: 'Inga hundar – men vattnet väntar inte på någon.',
    },
    road('landsvagen', 'Landsvägen'),
  ],
  meetings: [
    { key: 'koltrasten', kind: 'meeting', meeting: 'koltrasten', name: 'Björkdungen', fogName: 'Fågelsång?', arrive: 'I björkdungen sjunger någon.', note: 'Någon är där. Det hörs sång.' },
    { key: 'hjorten', kind: 'meeting', meeting: 'hjorten', name: 'Diket vid vägen', fogName: 'Något i diket?', arrive: 'Något stort ligger i diket.', note: 'Någon andas tungt där.' },
    { key: 'maten', kind: 'meeting', meeting: 'maten', name: 'Ängen vid sjön', fogName: 'Människoröster?', arrive: 'Det luktar bröd.', note: 'Människor – och mat.' },
    { key: 'framlingen', kind: 'meeting', meeting: 'framlingen', name: 'Granskogen', fogName: 'Ögon i mörkret?', arrive: 'Någon väntar mellan granarna.', note: 'Någon står i vägen.' },
    { key: 'gravskopan', kind: 'meeting', meeting: 'gravskopan', name: 'Leran', fogName: 'Dieseldoft?', arrive: 'Marken är uppriven.', note: 'Maskinerna har varit här.' },
    { key: 'tvekan', kind: 'meeting', meeting: 'kvarnsTvekan', name: 'Stenen där vägen delar sig', fogName: 'Ett vägskäl?', arrive: 'Vägen delar sig.', note: 'Här är minnet av vägen tunt.' },
  ],
  finds: [
    { key: 'tradet', kind: 'find', meeting: 'ihaligtTrad', name: 'Det ihåliga trädet', fogName: 'Ett skydd?', arrive: 'Ett gammalt, ihåligt träd.', note: 'Något att vila i, kanske.' },
    { key: 'barsnar', kind: 'find', meeting: 'barsnar', name: 'Bärsnåret', fogName: 'Något sött?', arrive: 'Det doftar bär.', note: 'Mat, kanske.' },
    { key: 'stigen', kind: 'find', meeting: 'gammalStig', name: 'Den gamla stigen', fogName: 'En stig?', arrive: 'En stig, nästan igenvuxen.', note: 'Någon har gått här förr.' },
    { key: 'grytet', kind: 'find', meeting: 'gryt', name: 'Grytet', fogName: 'Ett hål i marken?', arrive: 'Ett gryt under en stubbe.', note: 'Ett gömställe, kanske.' },
  ],
  fire: { key: 'glantan', kind: 'campfire', name: 'Gläntan', fogName: 'En glänta?', arrive: 'En liten glänta, skyddad av hasselbuskar. Här kan vi göra upp eld.', note: 'Vila, och eld.' },
  lastFire: { key: 'granbacken', kind: 'campfire', name: 'Granbacken', fogName: 'Ett skydd under granarna?', arrive: 'Under de täta granarna når vinden inte in. Här kan vi vila.', note: 'Sista vilan i dalen.' },
  /** The boss of the glen: the machines, at dawn, below the ridge. */
  end: {
    key: 'asen', kind: 'encounter', encounter: 'machines', name: 'Åsen', fogName: 'Åsen – där maskinerna väntar',
    arrive: 'Det ljusnar. Nedanför åsen står maskinerna och väntar, och nu startar de.',
    note: 'Sista vägen ut ur dalen. Maskinerna väntar.',
  },
};
