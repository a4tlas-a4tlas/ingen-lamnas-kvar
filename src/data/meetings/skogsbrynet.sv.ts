// Story parts at the forest edge: the last of the way, in frames.
import type { GameState } from '../../engine/types';
import type { MeetingFrame, MeetingOption } from './crow.sv';

const close = (label = 'Gå vidare'): MeetingOption[] => [{ id: 'close', label }];

/** Skogens doft: the wind turns, and for the first time we smell the forest. */
export const DOFTEN: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: () => 'Vinden vänder, och vi känner den allihop på en gång: kåda, mylla, mossa. Skogen. Vi stannar och bara andas.',
    options: [
      { id: 'speak', label: '”Vad hoppas ni hitta där?”', effect: 'forestScent', next: 'spoken' },
      { id: 'on', label: '”Vi går vidare.”' },
    ],
  },
  spoken: {
    id: 'spoken',
    speaker: 'story',
    text: (s: GameState) => {
      const elder = s.animals.find((a) => a.elder && (a.status === 'active' || a.status === 'safe'));
      return `En efter en säger vi det högt: ett hål att sova i, ett träd, ett vatten, någon att vara med.${elder ? ` Sist säger ${elder.name}: ”Vi var ${s.animals.length} när vi gick. Kom ihåg vilka vi var.”` : ''}`;
    },
    options: close(),
  },
};

/** Den sista bärbusken: blueberries at the forest edge – food, rest, and a night that falls. */
export const BARBUSKEN: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: () => 'Vid skogskanten växer blåbären tätt, mörka och mogna. Ingen jagar oss här, inte än.',
    options: [
      { id: 'eat', label: '”Vi äter, och vilar.”', effect: 'lastBerries', next: 'ate' },
      { id: 'on', label: '”Vi går vidare.”' },
    ],
  },
  ate: {
    id: 'ate',
    speaker: 'story',
    text: (s: GameState) => `Vi äter oss mätta och somnar i lyngen. När vi vaknar ${s.clock === 'day' ? 'har solen gått upp' : 'har det blivit mörkt'}.`,
    options: close(),
  },
};
