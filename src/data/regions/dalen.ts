// Dalen: the glen we flee, and the first region of the way. Its places, as templates
// the map is drawn from; the order and the paths between them differ every run.
import type { MapNode } from '../../engine/types';

/** A place before it is put on the map: no position, no paths yet. `key` names it. */
export type Template = Omit<MapNode, 'id' | 'row' | 'x' | 'y' | 'next'> & { key: string };

export interface RegionDef {
  id: string;
  name: string;
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
    { key: 'koltrasten', kind: 'meeting', meeting: 'koltrasten', name: 'Björkdungen', fogName: 'Fågelsång?', arrive: 'I björkdungen sjunger någon.', note: 'Någon är där. Kvarn hör sång.' },
  ],
  finds: [
    { key: 'tradet', kind: 'find', meeting: 'ihaligtTrad', name: 'Det ihåliga trädet', fogName: 'Ett skydd?', arrive: 'Ett gammalt, ihåligt träd.', note: 'Något att vila i, kanske.' },
  ],
  fire: { key: 'glantan', kind: 'campfire', name: 'Gläntan', fogName: 'En glänta?', arrive: 'En liten glänta, skyddad av hasselbuskar. Här kan vi göra upp eld.', note: 'Vila, och eld.' },
  lastFire: { key: 'granbacken', kind: 'campfire', name: 'Granbacken', fogName: 'Ett skydd under granarna?', arrive: 'Under de täta granarna når vinden inte in. Här kan vi vila.', note: 'Sista vilan i dalen.' },
  end: { key: 'asen', kind: 'end', name: 'Åsen', fogName: 'Åsen – där maskinerna väntar', arrive: 'Vi når åsen ovanför dalen. Bakom oss hörs maskinerna. Framför oss: allt det andra.' },
};
