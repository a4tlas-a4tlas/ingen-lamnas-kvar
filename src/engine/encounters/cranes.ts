// Tranorna: a firm, open bog at dawn where the cranes dance. The flock moves one zone
// an hour along a path we can read, and wherever it dances it leaps and spreads its
// wings: whoever stands there is driven out, and the small are trampled. Nothing here
// kills – but the dance costs time, and the willows and the birches give shelter.
// Far off, the cranes' call carries over the whole bog.
import { random, type RngHolder } from '../rng';
import type { ZoneId } from '../types';
import type { EncounterDef } from './types';

export const CRANES: EncounterDef = {
  id: 'cranes',
  title: { day: 'Tranmyren i gryningen', night: 'Tranmyren i gryningen' },
  fixedTime: 'day',
  crossed: 'nådde björkbacken',
  timeUp: {
    day: 'Solen står högt. Tranorna lyfter, och efter dem kommer andra fåglar – och människor med kikare. Vi kan inte stanna.',
    night: 'Solen står högt. Tranorna lyfter, och efter dem kommer andra fåglar – och människor med kikare. Vi kan inte stanna.',
  },
  leftBehind: { day: 'som blev kvar bland tranorna', night: 'som blev kvar bland tranorna' },
  lastHour: {
    day: 'Dimman har lättat helt. Det här är sista timmen.',
    night: 'Dimman har lättat helt. Det här är sista timmen.',
  },
  maxTurn: 8,
  zones: [
    { id: 'myrkanten', label: 'Myrkanten', name: 'myrkanten', rect: [0, 80, 100, 20], start: true },
    { id: 'karrkantV', label: 'Kärrkanten, väst', name: 'kärrkanten i väster', rect: [0, 58, 34, 22] },
    { id: 'myrslogen', label: 'Myrslogen', name: 'myrslogen', rect: [34, 58, 32, 22], exposed: true },
    { id: 'karrkantO', label: 'Kärrkanten, öst', name: 'kärrkanten i öster', rect: [66, 58, 34, 22] },
    { id: 'tranbottenV', label: 'Tranbotten, väst', name: 'tranbotten i väster', rect: [0, 36, 34, 22], exposed: true },
    { id: 'dansplatsen', label: 'Dansplatsen', name: 'dansplatsen', rect: [34, 36, 32, 22], exposed: true },
    { id: 'tranbottenO', label: 'Tranbotten, öst', name: 'tranbotten i öster', rect: [66, 36, 34, 22], exposed: true },
    { id: 'videsnaret', label: 'Videsnåret', name: 'videsnåret', rect: [0, 14, 34, 22], cover: true },
    { id: 'starrmyren', label: 'Starrmyren', name: 'starrmyren', rect: [34, 14, 32, 22] },
    { id: 'bjorkdungen', label: 'Björkdungen', name: 'björkdungen', rect: [66, 14, 34, 22], cover: true },
    { id: 'bjorkbacken', label: 'Björkbacken', name: 'björkbacken', rect: [0, 0, 100, 14], goal: true },
  ],
  // Across the dancing ground to the birch slope – and along each row.
  edges: [
    ['myrkanten', 'myrslogen'],
    ['myrkanten', 'karrkantV'],
    ['myrkanten', 'karrkantO'],
    ['karrkantV', 'tranbottenV'],
    ['myrslogen', 'dansplatsen'],
    ['karrkantO', 'tranbottenO'],
    ['karrkantV', 'myrslogen'],
    ['myrslogen', 'karrkantO'],
    ['tranbottenV', 'videsnaret'],
    ['dansplatsen', 'starrmyren'],
    ['tranbottenO', 'bjorkdungen'],
    ['tranbottenV', 'dansplatsen'],
    ['dansplatsen', 'tranbottenO'],
    ['videsnaret', 'starrmyren'],
    ['starrmyren', 'bjorkdungen'],
    ['videsnaret', 'bjorkbacken'],
    ['starrmyren', 'bjorkbacken'],
    ['bjorkdungen', 'bjorkbacken'],
  ],
};

/** Where the cranes dance: the open bog. Never the thickets, the edge or the slope. */
export const DANCE: ZoneId[] = ['karrkantV', 'myrslogen', 'karrkantO', 'tranbottenV', 'dansplatsen', 'tranbottenO', 'starrmyren'];
const next = (z: ZoneId): ZoneId[] =>
  CRANES.edges.flatMap(([a, b]) => (a === z ? [b] : b === z ? [a] : [])).filter((x) => DANCE.includes(x));

/** Each flock's zone, hour by hour: one step along the open bog each hour, never straight back. Two flocks when the whole bog dances, starting at opposite ends. */
export function planFlocks(h: RngHolder, maxTurn: number, hard: boolean): ZoneId[][] {
  const starts: ZoneId[] = hard ? ['tranbottenV', 'tranbottenO'] : [DANCE[Math.floor(random(h) * DANCE.length)]];
  return starts.map((start) => {
    const path = [start];
    for (let i = 1; i < maxTurn; i++) {
      const here = path[i - 1];
      const ways = next(here).filter((z) => z !== path[i - 2]);
      const pool = ways.length ? ways : next(here);
      path.push(pool[Math.floor(random(h) * pool.length)]);
    }
    return path;
  });
}
