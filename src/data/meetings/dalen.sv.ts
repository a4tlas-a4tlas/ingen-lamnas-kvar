// Story parts along the way through the glen: meetings and finds, in frames.
import { canFly, isPresent } from '../../engine/rules';
import type { GameState } from '../../engine/types';
import type { MeetingFrame } from './crow.sv';

const here = (s: GameState, id: string) => s.animals.some((a) => a.id === id && isPresent(a));

/** Koltrasten: a blackbird sings at dawn. Listening costs nothing – unless the owl is hungry. */
export const KOLTRASTEN: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: () => 'I gryningen sjunger en koltrast högt uppe i en björk. Det är det första vackra vi hört sedan dalen.',
    options: [
      { id: 'listen', label: '”Vi stannar och lyssnar en stund.”', effect: 'listen', next: 'listened' },
      { id: 'owl', by: 'skymning', label: 'Skymning lyfter, tyst.', when: (s) => s.animals.some((a) => a.id === 'skymning' && isPresent(a) && canFly(a)), effect: 'owlHunt', next: 'silent' },
      { id: 'hurry', by: 'frona', label: '”Vi har inte tid. Maskinerna…”', next: 'hurried' },
    ],
  },
  listened: {
    id: 'listened',
    speaker: 'story',
    text: () => 'Vi står stilla tills sången tar slut. Någon skrattar till, för första gången på länge.',
    options: [{ id: 'close', label: 'Gå vidare' }],
  },
  silent: {
    id: 'silent',
    speaker: 'story',
    text: () => 'Sången tystnar mitt i en ton. Skymning kommer tillbaka, mätt och tyst. Ingen säger något.',
    options: [{ id: 'close', label: 'Gå vidare' }],
  },
  hurried: {
    id: 'hurried',
    speaker: 'story',
    text: () => 'Fröna har rätt. Vi går vidare, och sången följer oss en bit innan den försvinner.',
    options: [{ id: 'close', label: 'Gå vidare' }],
  },
};

/** Det ihåliga trädet: rest for the hurt – but someone must keep watch outside. */
export const IHALIGT_TRAD: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: () => 'Ett gammalt ihåligt träd, torrt inuti. Det rymmer inte alla, men de som är skadade kan vila här en stund.',
    options: [
      { id: 'rest', label: '”De skadade vilar. Någon håller vakt.”', effect: 'restHollow', next: 'rested' },
      { id: 'ljung', by: 'ljung', label: '”Jag håller vakt utanför.”', when: (s) => here(s, 'ljung'), effect: 'restHollow', next: 'rested' },
      { id: 'on', label: '”Vi går vidare.”' },
    ],
  },
  rested: {
    id: 'rested',
    speaker: 'story',
    text: () => 'Inne i trädet är det varmt och stilla. När vi går vidare blöder ingen längre, och darrningarna har släppt.',
    options: [{ id: 'close', label: 'Gå vidare' }],
  },
};
