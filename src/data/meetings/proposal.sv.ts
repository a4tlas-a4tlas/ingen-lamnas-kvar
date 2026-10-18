// Ett löfte: an animal asks a promise of us – at the fire, or in the moment
// after someone threw themselves in the way. Others may speak for or against it.
import { PROMISES, PROMISE_GIFT } from '../promises.sv';
import { fill, promiseText } from '../../engine/promises';
import { bond, huntsAt, isPresent } from '../../engine/rules';
import type { GameState } from '../../engine/types';
import type { MeetingFrame } from './crow.sv';

const asked = (s: GameState) => s.proposal!;
const name = (s: GameState, id?: string) => s.animals.find((a) => a.id === id)?.name ?? '';
const spoken = (s: GameState) => [...(s.meeting?.backers ?? []), ...(s.meeting?.objectors ?? [])];

/** A close friend of the one asking, who would promise it too. */
export function backer(s: GameState): string | undefined {
  const p = asked(s);
  return s.animals.find((a) => isPresent(a) && a.id !== p.by && a.id !== p.with && bond(s, a.id, p.by) >= 2 && !spoken(s).includes(a.id))?.id;
}

/** The one this promise would cost something, if they are with us. */
export function objector(s: GameState): string | undefined {
  const p = asked(s);
  const o = PROMISES[p.rule].objector;
  return o && o.id !== p.by && o.id !== p.with && s.animals.some((a) => a.id === o.id && isPresent(a)) && !spoken(s).includes(o.id) ? o.id : undefined;
}

/** A hungry predator, who has little use for promises. */
export function mocker(s: GameState): string | undefined {
  const p = asked(s);
  return s.animals.find((a) => isPresent(a) && a.predator && a.id !== p.by && a.id !== objector(s) && a.belief <= huntsAt(s, a) + 2 && !spoken(s).includes(a.id))?.id;
}

export const PROPOSAL: Record<string, MeetingFrame> = {
  ask: {
    id: 'ask',
    speaker: 'proposer',
    text: (s) => {
      const p = asked(s);
      return p.rule === 'stay'
        ? `${name(s, p.by)} andas fortfarande. ”${name(s, p.with)}… Lova mig en sak.” ${fill(s, p, PROMISES[p.rule].why)}`
        : s.run.between
          ? `${name(s, p.by)} ser ut över det vi lämnar. ”Lova mig en sak.” ${fill(s, p, PROMISES[p.rule].why)}`
          : `${name(s, p.by)} ser upp från glöden. ”Lova mig en sak.” ${fill(s, p, PROMISES[p.rule].why)}`;
    },
    card: (s) => {
      const p = asked(s);
      return { title: `”${promiseText(s, p)}”`, lines: [fill(s, p, PROMISES[p.rule].binds), fill(s, p, PROMISE_GIFT)] };
    },
    options: [
      { id: 'accept', label: '”Vi lovar.”', effect: 'accept', next: 'sworn' },
      { id: 'reject', label: '”Det kan vi inte lova.”', effect: 'reject', next: 'refused' },
      { id: 'back', by: backer, label: '”Jag lovar också.”', effect: 'back', next: 'ask' },
      { id: 'object', by: objector, label: (s) => PROMISES[asked(s).rule].objector?.line ?? '', effect: 'object', next: 'ask' },
      { id: 'mock', by: mocker, label: '”Löften. Som om de mättar någon.”', effect: 'mock', next: 'ask' },
    ],
  },
  sworn: {
    id: 'sworn',
    speaker: 'story',
    text: (s) => `Vi lovade: ”${promiseText(s, asked(s))}” ${name(s, asked(s).by)} sluter ögonen, och andas ut.`,
    options: [{ id: 'close', label: 'Fortsätt' }],
  },
  refused: {
    id: 'refused',
    speaker: 'story',
    text: (s) => `${name(s, asked(s).by)} ser bort, ut i mörkret, och säger inget mer.`,
    options: [{ id: 'close', label: 'Fortsätt' }],
  },
};
