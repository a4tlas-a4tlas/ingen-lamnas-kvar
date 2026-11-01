// The bosses alone: the careful player through each region's last danger, from the last
// fire before it, with the whole group. Run with PLAYTEST=1 (PLAYTEST_SEEDS=n, PLAYTEST_GROUP=n, PLAYTEST_HARD=1,
// PLAYTEST_ONLY=dalen,staden).
import { it } from 'vitest';
import { REGIONS, type RegionDef } from '../../src/data/regions';
import { createGame, regionJourney } from '../../src/engine/setup';
import { step } from '../../src/engine/step';
import type { GameState, RegionId } from '../../src/engine/types';
import { playDanger } from './player';

declare const process: { env: Record<string, string | undefined> };
const run = process.env.PLAYTEST ? it : it.skip;
const SEEDS = Number(process.env.PLAYTEST_SEEDS ?? 100);
/** How many of us come to the boss: about four, in a whole run. */
const GROUP = Number(process.env.PLAYTEST_GROUP ?? 4);

/** Standing at the last fire of a region, the whole group with us, and into its boss. */
function atBoss(def: RegionDef, seed: number, hard: boolean): GameState {
  let s = step(createGame(seed), { type: 'swear', verses: ['ingenLamnas'] }).state;
  s.journey = regionJourney(def, seed);
  s.run.regions = ['dalen', def.id];
  const end = s.journey.nodes[s.journey.nodes.length - 1];
  s.journey.at = s.journey.nodes.find((n) => n.next.includes(end.id))!.id;
  s.journey.truth[end.id] = hard ? 'hard' : 'normal';
  s.journey.guess[end.id] = s.journey.truth[end.id];
  for (const a of s.animals) a.status = 'safe';
  // Most runs come to a boss with fewer than they set out with: leave the last ones at home.
  for (const a of s.animals.slice(GROUP)) a.status = 'left';
  s.phase = 'map';
  return step(s, { type: 'travel', to: end.id }).state;
}

run('the bosses', () => {
  const hard = !!process.env.PLAYTEST_HARD;
  const lines = [`| Boss | ${hard ? 'hard' : 'normal'} | Took someone | Dead | Left | Kept |`, '|---|---|---|---|---|---|'];
  const only = process.env.PLAYTEST_ONLY?.split(',');
  for (const id of (['dalen', 'akrarna', 'staden', 'mossen', 'hoglandet', 'skogsbrynet'] as RegionId[]).filter((r) => !only || only.includes(r))) {
    let took = 0, dead = 0, left = 0, kept = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      let s = atBoss(REGIONS[id], seed, hard);
      const n = s.animals.filter((a) => a.status === 'active').length;
      const l0 = s.animals.filter((a) => a.status === 'left').length;
      s = playDanger(s);
      const d = s.animals.filter((a) => a.status === 'dead').length;
      const l = s.animals.filter((a) => a.status === 'left').length - l0;
      if (d + l > 0) took++;
      dead += d; left += l; kept += n - d - l;
    }
    lines.push(`| ${REGIONS[id].end.name} | | ${Math.round((100 * took) / SEEDS)} % | ${(dead / SEEDS).toFixed(2)} | ${(left / SEEDS).toFixed(2)} | ${(kept / SEEDS).toFixed(2)} |`);
  }
  console.log(lines.join('\n'));
}, 3_600_000);
