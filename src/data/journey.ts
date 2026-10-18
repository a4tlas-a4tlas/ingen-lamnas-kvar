// The guide's memory of the way, as a graph. Alternate routes are just more
// paths: a place with several onward paths lets the player choose.
import type { EncounterId } from '../engine/types';

export type PlaceKind = 'start' | 'encounter' | 'campfire' | 'end';

export interface Place {
  id: string;
  kind: PlaceKind;
  encounter?: EncounterId;
  name: string;
  /** What the guide half remembers before we get there. */
  fogName: string;
  /** Said when we arrive; an encounter can say something else by day or by night. */
  arrive: string;
  arriveDay?: string;
  arriveNight?: string;
  /** Position on the map, in percent (x right, y down). */
  x: number;
  y: number;
}

export interface Path {
  from: string;
  to: string;
  /** Shown when choosing between several paths. */
  note?: string;
}

export const PLACES: Place[] = [
  { id: 'dalen', kind: 'start', name: 'Dalen', fogName: 'Dalen', x: 50, y: 90,
    arrive: 'Dalen, där vi föddes. Maskinerna står still i natt.' },
  { id: 'vagen', kind: 'encounter', encounter: 'road', name: 'Vägen', fogName: 'Ett ljud av motorer…', x: 40, y: 70,
    arrive: 'Asfalten ligger svart framför oss. Ljusen kommer och går.',
    arriveDay: 'Asfalten glänser i dagsljuset. Bilarna kommer tätare nu – men vi ser dem alla.' },
  { id: 'granbacken', kind: 'campfire', name: 'Granbacken', fogName: 'Ett skydd under granarna?', x: 60, y: 52,
    arrive: 'Under de täta granarna når vinden inte in. Här kan vi vila.' },
  { id: 'garden', kind: 'encounter', encounter: 'farm', name: 'Gården', fogName: 'Ett hus? Kvarn minns inte.', x: 40, y: 37,
    arrive: 'En gård i gryningen. Röda väggar, en stenmur, och två hundar som sover vid kojan.',
    arriveNight: 'En gård i mörkret. Fönstren är släckta, och vid kojan sover två hundar med nosen mot vinden.' },
  { id: 'akrarna', kind: 'end', name: 'Åkrarna', fogName: 'Åkrarna – fortsättning följer', x: 58, y: 23,
    arrive: 'Bortom muren låg åkrarna, gråa och vida. Där börjar nästa del av vägen.' },
];

export const PATHS: Path[] = [
  { from: 'dalen', to: 'vagen' },
  { from: 'vagen', to: 'granbacken' },
  { from: 'granbacken', to: 'garden' },
  { from: 'garden', to: 'akrarna' },
];

/** The forest we're walking toward: always on the map, always in fog. */
export const FOREST = { name: 'Skogen', x: 50, y: 7 };

export const START_PLACE = 'dalen';

export function place(id: string): Place {
  const p = PLACES.find((x) => x.id === id);
  if (!p) throw new Error(`Okänd plats: ${id}`);
  return p;
}

export function pathsFrom(id: string): Path[] {
  return PATHS.filter((p) => p.from === id);
}
