// Mellan två landskap: when a region's boss lies behind us. We look back, someone
// may ask a promise of us, and then Kvarn shows the ways on.
import { REGIONS } from '../regions';
import type { GameState, RegionId } from '../../engine/types';
import type { MeetingFrame, MeetingOption } from './crow.sv';

const region = (s: GameState) => REGIONS[s.journey.region];

/** What each of us says, looking back on what we leave. {region} is its name. */
const LOOK_BACK: Partial<Record<RegionId, Record<string, string>>> = {
  dalen: {
    ljung: '”Jag föddes under ekarna där nere. Nu finns de bara i mig.”',
    kvarn: '”Bäcken där jag lade mina ägg. Jag hör den fortfarande.”',
    sotfot: '”Jag trodde aldrig att jag skulle sakna något. Jag hade fel.”',
    skymning: '”Från ovan ser det ut som ett sår. Jag tittar inte mer.”',
    sicksack: '”Stenen där jag solade mig. Den är borta nu.”',
    frona: '”Vi var fler när vi gick därifrån.” Fröna kryper tätare ihop.',
    tistel: '”Jag kände den inte. Men jag ser att ni gör det.”',
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
      ...['ljung', 'kvarn', 'sotfot', 'skymning', 'sicksack', 'frona', 'tistel'].map((id): MeetingOption => ({
        id: `look-${id}`, by: id, effect: 'lookBack', next: 'start',
        label: (s) => (LOOK_BACK[s.journey.region]?.[id] ?? GENERIC).replace('{region}', region(s).name.toLowerCase()),
      })),
      { id: 'onward', label: '”Vi vänder oss om, och går.”' },
    ],
  },
  way: {
    id: 'way',
    speaker: 'story',
    text: (s) => s.run.offered.length > 1
      ? 'Kvarn ser länge ut över landet. ”Jag minns två vägar härifrån. Men inte vart de leder, inte riktigt.”'
      : 'Kvarn ser länge ut över landet. ”Jag minns bara en väg härifrån.”',
    options: (Object.keys(REGIONS) as RegionId[]).map((id): MeetingOption => ({
      id: `go-${id}`, label: () => `Mot ${REGIONS[id].fogName}`, effect: 'chooseRegion',
      when: (s) => s.run.offered.includes(id),
    })),
  },
};
