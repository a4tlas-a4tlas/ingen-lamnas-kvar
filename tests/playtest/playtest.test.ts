// The playtest report: the careful player through many whole runs, for every group.
// Run with PLAYTEST=1 (and optionally PLAYTEST_SEEDS=n); writes playtest-report.md.
import { it } from 'vitest';
// @ts-ignore – node:fs in a test only
import { writeFileSync } from 'node:fs';
import { CAST_IDS, CASTS, type CastId } from '../../src/data/animals';
import { REGIONS } from '../../src/data/regions';
import { LEAVE_CAUSE } from '../../src/data/text.sv';
import { playRun, type RunRecord } from './player';

/** Node's environment, without pulling in Node's types. */
declare const process: { env: Record<string, string | undefined> };

const run = process.env.PLAYTEST ? it : it.skip;
const SEEDS = Number(process.env.PLAYTEST_SEEDS ?? 50);

const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)} %` : '–');
const avg = (xs: number[]) => (xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2) : '–');

function report(runs: RunRecord[]): string {
  const out: string[] = ['# Playtest report', '', `The careful player (\`tests/playtest/player.ts\`), ${SEEDS} seeds per group, oath *Ingen lämnas kvar*.`, ''];

  out.push('## Per group', '', '| Group | Reached the forest | Survivors at the forest (of the start) | Ingen lämnades kvar | Eden föll | Hope at the end | Errors |', '|---|---|---|---|---|---|---|');
  for (const cast of CAST_IDS as CastId[]) {
    const rs = runs.filter((r) => r.cast === cast);
    const forest = rs.filter((r) => r.state.outcome?.forest);
    out.push(`| ${CASTS.find((c) => c.id === cast)?.name ?? cast} | ${pct(forest.length, rs.length)} | ${avg(forest.map((r) => r.state.outcome!.safe.length))} | ${pct(forest.filter((r) => !r.state.outcome!.dead.length && !r.state.outcome!.left.length).length, rs.length)} | ${pct(rs.filter((r) => r.state.outcome?.fallen).length, rs.length)} | ${avg(rs.map((r) => r.state.hope))} | ${rs.filter((r) => r.error).length} |`);
  }

  out.push('', '## Per danger', '', 'How many of us went in, on average, and how many came out. Bosses are in bold.', '', '| Region | Danger | Times | In | Out | Kept |', '|---|---|---|---|---|---|');
  const byDanger = new Map<string, { region: string; name: string; boss: boolean; ins: number[]; outs: number[] }>();
  for (const r of runs) for (const d of r.dangers) {
    const k = `${d.region}|${d.encounter}|${d.boss}`;
    const e = byDanger.get(k) ?? { region: d.region, name: d.boss ? d.name : d.encounter, boss: d.boss, ins: [], outs: [] };
    e.ins.push(d.in);
    e.outs.push(d.out);
    byDanger.set(k, e);
  }
  const order = ['dalen', 'akrarna', 'staden', 'mossen', 'skogsbrynet'];
  for (const e of [...byDanger.values()].sort((a, b) => order.indexOf(a.region) - order.indexOf(b.region) || Number(a.boss) - Number(b.boss))) {
    const kept = e.outs.reduce((a, b) => a + b, 0) / e.ins.reduce((a, b) => a + b, 0);
    const name = e.boss ? `**${e.name}**` : e.name;
    out.push(`| ${REGIONS[e.region as keyof typeof REGIONS]?.name ?? e.region} | ${name} | ${e.ins.length} | ${avg(e.ins)} | ${avg(e.outs)} | ${Math.round(kept * 100)} % |`);
  }

  out.push('', '## How we were lost', '', '| Cause | Count | Per run |', '|---|---|---|');
  const causes = new Map<string, number>();
  for (const r of runs) for (const a of r.state.animals) {
    if (a.status === 'dead') causes.set(`död: ${a.diedOf ?? '?'}`, (causes.get(`död: ${a.diedOf ?? '?'}`) ?? 0) + 1);
    if (a.status === 'left') {
      // The memorial stone says how: gone in doubt, stayed behind by our leave, or left behind when time ran out.
      const stone = r.state.verses.find((v) => v.id === `minne-${a.id}`)?.text ?? '';
      const how = stone.includes(LEAVE_CAUSE.doubt) ? 'lämnade oss: tvivel' : stone.includes(LEAVE_CAUSE.stayed) ? 'lämnade oss: stannade' : 'lämnade oss: blev kvar när tiden tog slut';
      causes.set(how, (causes.get(how) ?? 0) + 1);
    }
  }
  for (const [k, v] of [...causes.entries()].sort((a, b) => b[1] - a[1])) out.push(`| ${k} | ${v} | ${(v / runs.length).toFixed(2)} |`);

  out.push('', '## Where runs fell', '', '| Where | Runs |', '|---|---|');
  const fell = new Map<string, number>();
  for (const r of runs) if (r.fellAt) fell.set(r.fellAt, (fell.get(r.fellAt) ?? 0) + 1);
  for (const [k, v] of [...fell.entries()].sort((a, b) => b[1] - a[1])) out.push(`| ${k} | ${v} |`);
  const errs = runs.filter((r) => r.error);
  if (errs.length) out.push('', '## Errors', '', ...errs.map((r) => `- ${r.cast} seed ${r.seed}: ${r.error}`));
  return out.join('\n') + '\n';
}

run('playtest report', () => {
  const runs: RunRecord[] = [];
  for (const cast of CAST_IDS as CastId[]) for (let seed = 1; seed <= SEEDS; seed++) runs.push(playRun(cast, seed));
  const md = report(runs);
  writeFileSync('playtest-report.md', md);
  console.log(md);
}, 3_600_000);
