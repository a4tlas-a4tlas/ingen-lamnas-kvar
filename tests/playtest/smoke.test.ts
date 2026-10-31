import { describe, expect, it } from 'vitest';
import { CAST_IDS, type CastId } from '../../src/data/animals';
import { playRun } from './player';

describe('the careful player', () => {
  for (const cast of CAST_IDS as CastId[]) {
    it(`plays a whole run with ${cast} without getting stuck`, () => {
      const r = playRun(cast, 7);
      expect(r.error).toBeUndefined();
      expect(r.state.phase).toBe('over');
    }, 120000);
  }
});
