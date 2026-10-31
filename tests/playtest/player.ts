// A careful player, for playtesting whole runs through the real engine. Each hour of a
// danger it tries every lead and every card it could play, on a copy of the state, lets
// the hour go in the copy, and keeps whichever action leaves us best off – until nothing
// beats letting the hour go now. The engine is pure, so the lookahead is the real thing.
import { meetingOptions } from '../../src/data/meetings';
import { CARDS } from '../../src/data/cards';
import { defaultPlan } from '../../src/engine/campfire';
import { encounterOf } from '../../src/engine/encounters';
import { cardTarget, isActive, lastMomentShields, leadTargets, leadZones, zoneDistance } from '../../src/engine/rules';
import { createGame } from '../../src/engine/setup';
import { step } from '../../src/engine/step';
import type { Action, CastId, GameState, VerseId } from '../../src/engine/types';

/** What happened in one danger: how many went in, and how many came out. */
export interface DangerRecord {
  region: string;
  encounter: string;
  name: string;
  boss: boolean;
  in: number;
  out: number;
  /** Of those who went in: how many died, and how many were left or left us. */
  dead: number;
  left: number;
}

export interface RunRecord {
  cast: CastId;
  seed: number;
  state: GameState;
  dangers: DangerRecord[];
  /** Where the run fell, if it did. */
  fellAt?: string;
  steps: number;
  error?: string;
}

/** Replies that send one of us away, or break the oath: the careful player avoids them when it can. */
const UNKIND = new Set(['miceStay', 'hareStays', 'foxTempts', 'stayHermit', 'leaveFurrow', 'leaveLost', 'chaseFox']);

const count = (s: GameState, st: 'dead' | 'left') => s.animals.filter((a) => a.status === st).length;
const alive = (s: GameState) => s.animals.filter((a) => a.status === 'active' || a.status === 'safe');

/** Try an action; undefined if the engine refuses it. The log is left out of copies: it only slows them. */
function attempt(s: GameState, a: Action): GameState | undefined {
  const r = step(s, a);
  return r.events.some((e) => e.kind === 'error') ? undefined : r.state;
}

/** Let the last moment play out, as the careful player would: a shield if it costs less than the loss. */
function resolveMoments(s: GameState): GameState {
  for (let i = 0; i < 20 && s.phase === 'lastMoment'; i++) {
    const options: Action[] = [{ type: 'lastMoment', choice: 'letGo' }, ...lastMomentShields(s).map((by): Action => ({ type: 'lastMoment', choice: 'shield', by }))];
    let best: GameState | undefined;
    let bestScore = -Infinity;
    for (const o of options) {
      const t = attempt(s, o);
      if (!t) continue;
      const sc = score(t);
      if (sc > bestScore) { bestScore = sc; best = t; }
    }
    if (!best) break;
    s = best;
  }
  return s;
}

/** How well off we are: alive above all, then whole, then near the goal, then believing. */
export function score(s: GameState): number {
  let v = 0;
  const goal = s.phase === 'play' ? encounterOf(s).zones.find((z) => z.goal)?.id : undefined;
  const hoursLeft = s.maxTurn - s.turn + 1;
  let steps = 0;
  for (const a of s.animals) {
    if (a.status === 'dead' || a.status === 'left') continue;
    v += 100 + (a.count ?? 0) * 8;
    v -= a.injuries.length * 12;
    v += a.belief * 1.5;
    if (a.status === 'safe') v += 30;
    else if (goal && a.status === 'active') {
      const dist = zoneDistance(s, a.zone, goal);
      steps += dist;
      // The clock: one still further from the goal than hours are left will be left behind.
      v -= dist * 9 + (a.sink ?? 0) * 6 + Math.max(0, dist - hoursLeft) * 70;
    }
  }
  // And the Kraft: every step is a lead, and an hour gives about three. More steps than that is someone left behind.
  if (goal) v -= Math.max(0, steps - (s.kraft + 3 * (hoursLeft - 1))) * 25;
  return v + s.hope * 3;
}

/** After an action, let the hour go in the copy and see where we stand. */
/** How many futures the blind lookahead imagines for each choice. */
const FUTURES = 3;
let futureSeed = 1;

/**
 * Let the hour go in the copy and see where we stand. The dice live in the state, so a
 * plain copy would see the hour's real rolls; instead each future gets dice of its own,
 * and the choice is judged by the average – as a player who can't see the dice would.
 */
function lookahead(s: GameState): number {
  let sum = 0;
  for (let i = 0; i < FUTURES; i++) {
    futureSeed = (Math.imul(futureSeed, 1103515245) + 12345) | 0;
    const t = attempt({ ...s, rng: futureSeed }, { type: 'endTurn' });
    if (!t) return -Infinity;
    sum += score(resolveMoments(t));
  }
  return sum / FUTURES;
}

/** Everything the player could do now in a danger. */
function candidates(s: GameState): Action[] {
  const out: Action[] = [];
  for (const id of leadTargets(s)) {
    const a = s.animals.find((x) => x.id === id)!;
    for (const z of leadZones(s, a)) out.push({ type: 'lead', target: id, zone: z });
  }
  const active = s.animals.filter(isActive);
  const zones = encounterOf(s).zones.map((z) => z.id);
  for (const card of s.hand) {
    if (CARDS[card.kind].cost > s.kraft) continue;
    const spec = cardTarget(card);
    if (spec === 'none') out.push({ type: 'play', uid: card.uid });
    else if (spec === 'animal') for (const a of active) out.push({ type: 'play', uid: card.uid, target: a.id });
    else if (spec === 'zone') for (const z of zones) out.push({ type: 'play', uid: card.uid, zone: z });
    else for (const a of active) for (const z of zones) if (zoneDistance(s, a.zone, z) <= 2) out.push({ type: 'play', uid: card.uid, target: a.id, zone: z });
  }
  if (s.encounterId === 'cats') out.push({ type: 'throwFood' });
  if (s.encounterId === 'sewer') for (const card of s.hand) out.push({ type: 'payToll', uid: card.uid });
  if (s.rescue) for (const a of active) out.push({ type: 'rescue', by: a.id });
  return out;
}

/** One hour of a danger: the best actions, one by one, until letting the hour go is best. */
export function playHour(s: GameState): GameState {
  for (let n = 0; n < 8 && s.phase === 'play'; n++) {
    const lean = { ...s, log: [] };
    let best: GameState | undefined;
    let bestScore = lookahead(lean) + 0.5;
    for (const a of candidates(lean)) {
      const t = attempt(lean, a);
      if (!t || t.phase !== 'play') {
        // An action that ends the danger by itself (the last one across): take it if it is good.
        if (t && score(t) > bestScore) { bestScore = score(t); best = t; }
        continue;
      }
      const sc = lookahead(t);
      if (sc > bestScore) { bestScore = sc; best = t; }
    }
    if (!best) break;
    s = { ...best, log: s.log };
  }
  if (s.phase === 'play') s = attempt(s, { type: 'endTurn' }) ?? s;
  return resolveMoments(s);
}

/** A meeting: the first reply that keeps us together, or any that the engine takes. */
function answer(s: GameState): GameState {
  let opts = meetingOptions(s);
  // At a crossroads, any way: the replies always list the regions in the same order, so taking the first would skew the runs.
  if (s.meeting?.id === 'interlude' && s.meeting.frame === 'way' && opts.length > 1) {
    const k = Math.abs(s.seed * 31 + s.run.regions.length) % opts.length;
    opts = [opts[k], ...opts.filter((_, i) => i !== k)];
  }
  const ordered = [...opts.filter((o) => !o.effect || !UNKIND.has(o.effect)), ...opts.filter((o) => o.effect && UNKIND.has(o.effect))];
  const uids = [undefined, ...[...s.draw, ...s.hand, ...s.discard].map((c) => c.uid)];
  for (const o of ordered) for (const uid of o.pickCard ? uids.slice(1) : [undefined]) {
    const t = attempt(s, { type: 'respond', option: o.id, uid });
    if (t) return t;
  }
  throw new Error(`fastnade i mötet ${s.meeting?.id}/${s.meeting?.frame}`);
}

/** One whole danger, from its first hour to its end: hours, last moments, and any meeting that comes up on the way. */
export function playDanger(s: GameState): GameState {
  for (let n = 0; n < 200 && (s.phase === 'play' || s.phase === 'lastMoment'); n++) {
    if (s.meeting) s = answer(s);
    else if (s.phase === 'play') s = playHour(s);
    else s = resolveMoments(s);
  }
  return s;
}

/** On the map: toward a fire if we can, then a story part, else the first way. */
function travel(s: GameState): GameState {
  const here = s.journey.nodes.find((x) => x.id === s.journey.at)!;
  const next = here.next.map((id) => s.journey.nodes.find((x) => x.id === id)!);
  const rank = (k: string) => (k === 'campfire' ? 0 : k === 'meeting' || k === 'find' ? 1 : 2);
  const to = [...next].sort((a, b) => rank(a.kind) - rank(b.kind))[0];
  const t = attempt(s, { type: 'travel', to: to.id });
  if (!t) throw new Error(`kom inte vidare från ${here.id}`);
  return t;
}

/** Play one whole run with a group and an oath. */
export function playRun(cast: CastId, seed: number, verse: VerseId = 'ingenLamnas'): RunRecord {
  let s = createGame(seed);
  s = attempt(s, { type: 'chooseCast', cast }) ?? s;
  s = attempt(s, { type: 'swear', verses: [verse] })!;
  const rec: RunRecord = { cast, seed, state: s, dangers: [], steps: 0 };
  let open: DangerRecord | undefined;
  try {
    for (let n = 0; n < 3000 && s.phase !== 'over'; n++) {
      rec.steps = n;
      if (s.phase === 'play' && !open) {
        const p = s.journey.nodes.find((x) => x.id === s.journey.at)!;
        open = { region: s.journey.region, encounter: s.encounterId, name: p.name, boss: p.next.length === 0, in: alive(s).length, out: 0, dead: count(s, 'dead'), left: count(s, 'left') };
      }
      if (s.meeting) s = answer(s);
      else if (s.phase === 'play') s = playHour(s);
      else if (s.phase === 'lastMoment') s = resolveMoments(s);
      else if (s.phase === 'campfire') s = attempt(s, { type: 'restAtFire', ...defaultPlan(s) }) ?? s;
      else if (s.phase === 'map') s = travel(s);
      if (open && s.phase !== 'play' && s.phase !== 'lastMoment') {
        open.out = alive(s).length;
        open.dead = count(s, 'dead') - open.dead;
        open.left = count(s, 'left') - open.left;
        rec.dangers.push(open);
        if (open.out === 0) rec.fellAt = `${open.region} · ${open.name}`;
        open = undefined;
      }
    }
  } catch (e) {
    rec.error = String((e as Error).message ?? e);
  }
  rec.state = s;
  return rec;
}
