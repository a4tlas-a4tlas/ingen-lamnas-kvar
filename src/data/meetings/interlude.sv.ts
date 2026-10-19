// Mellan två landskap: when a region's boss lies behind us. We look back, someone
// may ask a promise of us, and then the guide shows the ways on.
import { REGIONS } from '../regions';
import { isPresent } from '../../engine/rules';
import { guideName } from '../../engine/roles';
import type { GameState, RegionId, Species } from '../../engine/types';
import type { MeetingFrame, MeetingOption } from './crow.sv';

const region = (s: GameState) => REGIONS[s.journey.region];

/** What each kind says, looking back on what we leave. {region} is its name, {name} the one speaking. */
const LOOK_BACK: Partial<Record<RegionId, Partial<Record<Species, string>>>> = {
  dalen: {
    badger: '”Jag föddes under ekarna där nere. Nu finns de bara i mig.”',
    toad: '”Bäcken där jag lade mina ägg. Jag hör den fortfarande.”',
    fox: '”Jag trodde aldrig att jag skulle sakna något. Jag hade fel.”',
    owl: '”Från ovan ser det ut som ett sår. Jag tittar inte mer.”',
    adder: '”Stenen där jag solade mig. Den är borta nu.”',
    mice: '”Vi var fler när vi gick därifrån.” {name} kryper tätare ihop.',
    hare: '”Jag kände den inte. Men jag ser att ni gör det.”',
  },
};
const GENERIC = '”Jag kommer att minnas {region}.”';

export const INTERLUDE: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: (s) => {
      const alive = s.animals.filter((a) => a.status === 'active' || a.status === 'safe').length;
      return `Vi stannar och ser tillbaka. ${region(s).name} ligger bakom oss nu. Vi är ${alive === 1 ? 'en' : alive} som står här.`;
    },
    options: [
      ...Array.from({ length: 10 }, (_, i): MeetingOption => {
        const one = (s: GameState) => s.animals.filter(isPresent)[i];
        return {
          id: `look-${i}`, by: (s) => one(s)?.id, effect: 'lookBack', next: 'start',
          label: (s) => (LOOK_BACK[s.journey.region]?.[one(s)!.species] ?? GENERIC).replace('{region}', region(s).name.toLowerCase()).replace('{name}', one(s)!.name),
        };
      }),
      { id: 'onward', label: '”Vi vänder oss om, och går.”' },
    ],
  },
  way: {
    id: 'way',
    speaker: 'story',
    text: (s) => s.run.offered.length > 1
      ? `${guideName(s)} ser länge ut över landet. ”Jag minns två vägar härifrån. Men inte vart de leder, inte riktigt.”`
      : `${guideName(s)} ser länge ut över landet. ”Jag minns bara en väg härifrån.”`,
    options: (Object.keys(REGIONS) as RegionId[]).map((id): MeetingOption => ({
      id: `go-${id}`, label: () => `Mot ${REGIONS[id].fogName}`, effect: 'chooseRegion',
      when: (s) => s.run.offered.includes(id),
    })),
  },
};
