import { DEATH_CAUSE, INJURY_LINES, LEAVE_CAUSE, intentLine } from '../data/text.sv';
import { place, pathsFrom } from '../data/journey';
import { TRAITS } from '../data/traits';
import { VERSES } from '../data/verses';
import { closestTo, crowCards, crowOffers, hungryWatcher, inheritedTrait, living, planProblem, sitsAlone, unseenAhead } from './campfire';
import { trickChance } from '../data/meetings/crow.sv';
import { labelOf, meetingOptions, speakerOf } from '../data/meetings';
import { brokenByTravel, keptPromises, promiseFloor, promiseText, proposalAtFire, promises } from './promises';
import { CARDS } from '../data/cards';
import { LOADOUT, allSkills } from '../data/skills';
import { planRoad } from './encounters/road';
import { forkVoices, voiceStake } from './voices';
import { CURRENT, DAM, DAM_MAX, FLOOD_DAM_CREAK, FLOOD_HOURS, FLOOD_HOURS_TOTAL, STONES, aboveTheWater, carriedAway, holdsOnTo, planRiver, swims } from './encounters/river';
import { planMachines, roarZones } from './encounters/machines';
import { exposedIn, prey, shadowOptions } from './encounters/raptor';
import { CROP, drift, nightMist, planSprayer, rowZones, sprayed } from './encounters/sprayer';
import { AWAKE_ALARM, HEN_HOUSE, SCENT_MAX, alarmMax, dogDestination, dogTargets, newDogs } from './encounters/farm';
import { random, shuffle } from './rng';
import { OATH_VERSES, buildCast, idFor, makeAnimal, oathVerse, regionJourney } from './setup';
import { MIDDLE_REGIONS, OFFERED, REGIONS } from '../data/regions';
import { CAST_IDS, SPECIES, nameFor } from '../data/animals';
import { guideHere, guideName, kin } from './roles';
import { beliefFelt, ownWillBelow, willOf } from './will';
import { ENCOUNTERS, byTime, encounterOf, otherTime, zoneDef } from './encounters';
import {
  animal,
  backZone,
  beliefFloor,
  boltZone,
  bond,
  bondKey,
  canFly,
  canLure,
  canPlay,
  cardAnimals,
  cardCost,
  cardTarget,
  cardZones,
  handSize,
  hasInjury,
  huntsAt,
  canPrey,
  isActive,
  isFrozen,
  isLethal,
  isPresent,
  lastMomentShields,
  leadCost,
  leadTargets,
  leadZones,
  lureZones,
  isFast,
  RESCUE_TRUST,
  HEALS_AT_FIRE,
  rescueBlockReason,
  moonHidden,
  moonVisible,
  neighbors,
  swarmLoss,
  verseStatus,
  zoneDistance,
} from './rules';
import type {
  Action,
  Animal,
  Card,
  CastId,
  GameEvent,
  GameState,
  Hit,
  HopeReason,
  InjuryKind,
  Intent,
  LogEntry,
  VerseId,
  ZoneId,
  CardKind,
  TraitId,
  Meeting,
  Proposal,
  RegionId,
  Species,
} from './types';

interface Ctx {
  s: GameState;
  ev: GameEvent[];
}

class RuleError extends Error {}
function fail(message: string): never {
  throw new RuleError(message);
}

/**
 * The whole game advances through this one pure function: same state +
 * same action always gives the same result.
 */
export function step(prev: GameState, action: Action): { state: GameState; events: GameEvent[] } {
  const s = structuredClone(prev);
  const c: Ctx = { s, ev: [] };
  try {
    // A meeting waits for its answer before anything else happens.
    if (s.meeting && action.type !== 'respond' && action.type !== 'lastMoment') fail('Svara först.');
    switch (action.type) {
      case 'chooseCast': chooseCast(c, action.cast); break;
      case 'swear': swear(c, action.verses); break;
      case 'play': playCard(c, action.uid, action.target, action.zone); endIfAllAcross(c); break;
      case 'lead': lead(c, action.target, action.zone); endIfAllAcross(c); break;
      case 'lure': lure(c, action.target, action.zone); endIfAllAcross(c); break;
      case 'rescue': rescue(c, action.by); break;
      case 'respond': respond(c, action.option, action.uid); break;
      case 'equip': equip(c, action.animal, action.skills); break;
      case 'learn': learn(c, action.animal, action.skill); break;
      case 'endTurn': endTurn(c); break;
      case 'lastMoment': resolveLastMoment(c, action); break;
      case 'travel': travel(c, action.to, action.wait); break;
      case 'restAtFire': restAtFire(c, action); break;
    }
  } catch (e) {
    if (e instanceof RuleError) return { state: prev, events: [{ kind: 'error', text: e.message }] };
    throw e;
  }
  return { state: s, events: c.ev };
}

// ---------------------------------------------------------------- log

function log(c: Ctx, entry: LogEntry) {
  c.s.log.push(entry);
  if (c.s.log.length > 120) c.s.log.splice(0, c.s.log.length - 120);
  c.ev.push({ kind: 'log', entry });
}
const narrate = (c: Ctx, text: string) => log(c, { kind: 'narrate', text });
const line = (c: Ctx, who: string, text: string) => log(c, { kind: 'line', who, text });

const NUMBERS = ['ingen', 'en', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio'];
const num = (n: number) => NUMBERS[n] ?? String(n);

// ---------------------------------------------------------------- stats

function changeBelief(c: Ctx, a: Animal, d: number) {
  if (!isPresent(a)) return;
  // While its own promise holds, an animal never doubts below 3.
  const floor = promiseFloor(c.s, a.id) && a.belief >= 3 ? 3 : beliefFloor(c.s);
  a.belief = Math.max(Math.min(floor, a.belief), Math.min(10, a.belief + d));
}

function changeHope(c: Ctx, d: number, reason: HopeReason, who?: string) {
  const before = c.s.hope;
  c.s.hope = Math.max(0, Math.min(10, c.s.hope + d));
  if (c.s.hope !== before) c.ev.push({ kind: 'hope', delta: c.s.hope - before, reason, who });
}

function addBond(c: Ctx, a: Animal, b: Animal, d: number) {
  const k = bondKey(a.id, b.id);
  const cap = d > 0 && (has(a, 'ensamvarg') || has(b, 'ensamvarg')) ? Math.max(0, c.s.bonds[k] ?? 0) : 3;
  c.s.bonds[k] = Math.max(-3, Math.min(cap, (c.s.bonds[k] ?? 0) + d));
}

const has = (a: Animal, t: TraitId) => a.traits.includes(t);

/** A trait earned by what happened: said once, kept. */
function earn(c: Ctx, a: Animal, t: TraitId) {
  if (has(a, t) || !isPresent(a)) return;
  a.traits.push(t);
  line(c, a.id, `${a.name} är ${TRAITS[t].name.toLowerCase()} nu. ${TRAITS[t].note}`);
}

// ---------------------------------------------------------------- oath

/** Before the oath: which group leaves the glen. Each is the same as when it was offered. */
function chooseCast(c: Ctx, cast: CastId) {
  const s = c.s;
  if (s.phase !== 'oath') fail('Vi har redan gått.');
  if (!CAST_IDS.includes(cast)) fail('Ingen sådan grupp.');
  const g = buildCast(s.seed, cast);
  s.cast = g.cast;
  s.animals = g.animals;
  s.draw = g.draw;
  s.bonds = g.bonds;
  s.nextUid = g.nextUid;
  s.rng = g.rng;
}

function swear(c: Ctx, verses: VerseId[]) {
  const s = c.s;
  if (s.phase !== 'oath') fail('Eden är redan svuren.');
  const unique = [...new Set(verses)];
  if (unique.length !== OATH_VERSES || unique.some((v) => !VERSES[v])) fail('Välj ett löfte.');
  s.verses = unique.map(oathVerse);
  narrate(c, 'I dalens sista natt svor vi eden:');
  for (const v of s.verses) narrate(c, `”${v.text}”`);
  narrate(c, `Bakom oss tystnade maskinerna för natten. ${guideName(s)} mindes vägen, nästan.`);
  const swarms = s.animals.filter((a) => a.count !== undefined).map((a) => `${a.name} var ${num(a.count!)}`);
  narrate(c, `Vi var ${num(s.animals.length)}${swarms.length ? `, och ${swarms.join(' och ')}` : ''}.`);
  s.phase = 'map';
}

// ---------------------------------------------------------------- the journey

function travel(c: Ctx, to: string, wait = false) {
  const s = c.s;
  if (s.phase !== 'map') fail('Vi kan inte gå vidare nu.');
  if (!pathsFrom(s, s.journey.at).some((p) => p.to === to)) fail('Dit leder ingen väg härifrån.');
  const p = place(s, to);
  if (wait && p.kind !== 'encounter') fail('Här finns inget att vänta på.');
  const voices = forkVoices(s);
  s.journey.at = to;
  if (!s.journey.visited.includes(to)) s.journey.visited.push(to);
  log(c, { kind: 'turn', text: p.name });
  for (const v of voices) {
    const a = animal(s, v.who);
    const d = voiceStake(s, a);
    if (v.to === to) {
      changeBelief(c, a, d);
      line(c, a.id, `${a.name} nickar. Vi gick den väg ${a.name} bad om.`);
    } else {
      changeBelief(c, a, -d);
      line(c, a.id, `${a.name} ser ner i marken och följer efter.`);
    }
  }
  if (p.kind === 'encounter') {
    const fixed = ENCOUNTERS[p.encounter!].fixedTime;
    if (wait && fixed) fail('Maskinerna väntar inte på oss.');
    s.time = fixed ?? (wait ? otherTime(s.clock) : s.clock);
    for (const v of brokenByTravel(s, to, s.time)) breakPromise(c, v);
    if (wait) {
      narrate(c, s.time === 'night' ? 'Vi gömde oss och väntade tills mörkret kom.' : 'Vi gömde oss och väntade på ljuset.');
      changeHope(c, -1, 'wait');
    }
  }
  narrate(c, (s.time === 'night' ? p.arriveNight : p.arriveDay) ?? p.arrive);
  if (p.memory) {
    // Now we see it for ourselves: was Kvarn right?
    const truth = s.journey.truth[to] ?? 'normal';
    const seen = p.memory[truth];
    if (s.journey.scouted.includes(to)) narrate(c, `Det var som vi hade sett från ovan: ${seen}.`);
    else if (s.journey.guess[to] === truth) narrate(c, `Det var som ${guideName(s)} mindes: ${seen}.`);
    else narrate(c, `${guideName(s)} mindes fel: ${seen}.`);
  }
  if (p.kind === 'encounter') startEncounter(c, p.encounter!);
  else if (p.kind === 'campfire') {
    s.phase = 'campfire';
    // An animal may have a promise to ask of us tonight – after the crow, if it comes.
    s.proposal = proposalAtFire(s);
    // While something ahead is still only Kvarn's memory, a crow waits by the fire.
    if (crowOffers(s)) s.meeting = { id: 'crow', frame: 'start', used: [], told: [] };
    else if (s.proposal) s.meeting = { id: 'proposal', frame: 'ask', used: [], told: [] };
  }
  else if (p.kind === 'meeting' || p.kind === 'find') s.meeting = { id: p.meeting!, frame: 'start', used: [], told: [] };
  else if (p.kind === 'end') endRegion(c);
}

/**
 * The region lies behind us. If more of the way remains, we stop between two landscapes:
 * we look back, someone may ask a promise of us, and Kvarn shows the ways on.
 */
function endRegion(c: Ctx) {
  const s = c.s;
  narrate(c, REGIONS[s.journey.region].epilogue);
  const left = MIDDLE_REGIONS.filter((r) => !s.run.regions.includes(r));
  s.run.offered = shuffle(s, left).slice(0, OFFERED);
  if (!s.run.offered.length) {
    narrate(c, 'Fortsättning följer.');
    return endRun(c);
  }
  s.phase = 'map';
  s.run.between = true;
  s.meeting = { id: 'interlude', frame: 'start', used: [], told: [] };
}

/** The promise the region leaves in someone: asked by the one who grieves it, or else the eldest. */
function regionVerse(s: GameState): Proposal | null {
  const rule = REGIONS[s.journey.region].verse;
  if (!rule || keptPromises(s).some((v) => v.promise.rule === rule)) return null;
  const here = s.animals.filter(isPresent);
  const by = here.find((a) => a.grief.includes(s.journey.region)) ?? here.find((a) => a.elder) ?? here[0];
  return by ? { by: by.id, rule } : null;
}

/** On into the next region: Kvarn draws its map, and we stand at its edge. */
function chooseRegion(c: Ctx, id: RegionId) {
  const s = c.s;
  if (!s.run.offered.includes(id)) fail('Dit leder ingen väg.');
  const def = REGIONS[id];
  s.run.regions.push(id);
  s.run.offered = [];
  s.run.between = false;
  s.journey = regionJourney(def, s.seed + 7919 * s.run.regions.length);
  log(c, { kind: 'turn', text: def.name });
  narrate(c, def.start.arrive);
}

/** Everyone still with us starts the next danger at its start, with the whole deck shuffled. */
function startEncounter(c: Ctx, id: keyof typeof ENCOUNTERS) {
  const s = c.s;
  const def = ENCOUNTERS[id];
  s.encounterId = id;
  s.turn = 1;
  s.maxTurn = def.maxTurn;
  s.revealed = [];
  s.peekNext = false;
  s.darkRevealed = false;
  s.hitQueue = [];
  s.pending = undefined;
  const plan = id === 'road' ? planRoad(s, def.maxTurn, s.time) : { trafficPlan: [], moonPlan: [] };
  s.trafficPlan = plan.trafficPlan;
  s.moonPlan = plan.moonPlan;
  const farm = id === 'farm';
  s.dogs = farm ? newDogs() : [];
  s.dogsAwake = false;
  s.scent = farm ? { snaret: 1 } : {};
  s.alarm = 0;
  s.farmerOut = false;
  s.farmerSweep = null;
  s.variant = s.journey.truth[s.journey.at] ?? 'normal';
  const hard = s.variant === 'hard';
  if (farm && hard) {
    s.alarm = AWAKE_ALARM;
    s.dogsAwake = true;
    narrate(c, 'Gården är redan vaken. Hundarna står vid kojan och vädrar mot snåret.');
  }
  if (id === 'river' && hard) s.maxTurn = FLOOD_HOURS_TOTAL;
  const river = id === 'river' ? planRiver(s, s.maxTurn, hard) : { currentPlan: [], slipPlan: [] };
  s.currentPlan = river.currentPlan;
  s.slipPlan = river.slipPlan;
  s.damCreak = id === 'river' && hard ? FLOOD_DAM_CREAK : 0;
  s.closed = [];
  s.heron = null;
  const machines = id === 'machines' ? planMachines(s, s.maxTurn) : { fellPlan: [], dozePlan: [] };
  s.fellPlan = machines.fellPlan;
  s.dozePlan = machines.dozePlan;
  // Over the fields one bird circles – or, where Kvarn's memory was too kind, a pair.
  s.raptors = id === 'raptor' ? Array.from({ length: hard ? 2 : 1 }, () => ({ zone: null, maybe: [] })) : [];
  // The sprayed field: by day the tractor's plan, by night the mist the day left behind.
  if (id === 'sprayer') {
    const plan = planSprayer(s, s.maxTurn);
    s.spray = { ...plan, mist: s.time === 'night' ? nightMist(s) : [], shown: [] };
  } else s.spray = { rowPlan: [], windPlan: [], mist: [], shown: [] };
  // Someone is trapped here, the first time we come.
  s.rescue = null;
  const sp = def.rescue && !s.rescues.includes(s.journey.region) ? trappedKind(s, def.rescue.not ?? []) : undefined;
  if (def.rescue && sp) {
    const kind = SPECIES[sp];
    const name = nameFor(sp, s.seed + 7919 * (s.met.length + 1), s.animals.map((a) => a.name));
    s.rescues.push(s.journey.region);
    s.rescue = { who: idFor(sp, s.animals.map((a) => a.id)), species: sp, name, zone: def.rescue.zone, trust: 0, need: RESCUE_TRUST + (kind.predator ? 1 : 0) };
    narrate(c, def.rescue.found
      .replace(/\{name\}/g, name)
      .replace(/\{en\}/g, `${kind.en} ${kind.kindName}`)
      .replace(/\{Den\}/g, capitalize(kind.den)));
  }
  const start = def.zones.find((z) => z.start)!.id;
  for (const a of s.animals.filter(isPresent)) {
    a.status = 'active';
    a.sated = false;
    a.steps = 0;
    a.toughUsed = false;
    a.zone = start;
    a.slowTime = 0;
    a.intent = { kind: 'follow' };
  }
  s.draw = shuffle(s, [...s.draw, ...s.hand, ...s.discard]);
  s.hand = [];
  s.discard = [];
  s.phase = 'play';
  startTurn(c);
}

function endRun(c: Ctx) {
  const s = c.s;
  const ids = (st: Animal['status'][]) => s.animals.filter((a) => st.includes(a.status)).map((a) => a.id);
  const alive = ids(['active', 'safe']);
  s.phase = 'over';
  s.outcome = { safe: alive, dead: ids(['dead']), left: ids(['left']), fallen: alive.length === 0 };
  narrate(c, `Vi var ${num(s.animals.length)} när vi lämnade dalen. ${capitalize(num(alive.length))} av oss gick vidare.`);
}

// ---------------------------------------------------------------- the campfire

const FIRE_TALK = {
  wary: ['{a} och {b} satt nära elden. Ingen sov riktigt, men ingen gick heller.', '{a} höll avstånd, men stannade kvar hos {b} hela natten.'],
  close: ['{a} och {b} pratade om dalen tills glöden falnade.', '{a} somnade med huvudet mot {b}.'],
  other: ['{a} och {b} delade värmen. Det blev lättare att tiga tillsammans.', '{a} berättade något som fick {b} att nästan le.'],
};

function restAtFire(c: Ctx, plan: Extract<Action, { type: 'restAtFire' }>) {
  const s = c.s;
  if (s.phase !== 'campfire') fail('Här finns ingen eld.');
  const problem = planProblem(s, plan);
  if (problem) fail(problem);
  const talk = (lines: string[], a: Animal, b: Animal) =>
    lines[Math.floor(random(s) * lines.length)].replace('{a}', a.name).replace('{b}', b.name);

  // 1. We mourn: the closest tells a memory and carries on something of the dead.
  for (const deadId of s.unmourned) {
    const dead = animal(s, deadId);
    const teller = closestTo(s, deadId);
    if (teller) {
      const t = inheritedTrait(s, deadId, teller);
      if (t) {
        teller.traits.push(t);
        line(c, teller.id, `${teller.name} berättade om ${dead.name} länge. Sedan dess bär ${teller.name} ${dead.name}s ${TRAITS[t].noun}.`);
      } else line(c, teller.id, `${teller.name} berättade om ${dead.name} länge.`);
    }
    if (plan.mourning[deadId] === 'bury') {
      for (const card of [...s.draw, ...s.hand, ...s.discard]) if (card.memoryOf === deadId) card.buried = true;
      narrate(c, `Vi begravde ${dead.name} under granarna. Det gör mindre ont nu.`);
    } else {
      const mourners = living(s).filter((a) => bond(s, a.id, deadId) >= 2 || a === teller);
      for (const m of mourners) if (!m.grief.includes(deadId)) m.grief.push(deadId);
      narrate(c, `Vi bär ${dead.name} med oss.${mourners.length ? ` ${mourners.map((m) => m.name).join(' och ')} sörjer.` : ''}`);
    }
  }
  s.unmourned = [];

  // 2. The watch. A hungry predator awake over sleeping prey is a test of trust.
  const w = plan.watch ? animal(s, plan.watch) : undefined;
  if (w) {
    if (hungryWatcher(s, w)) {
      const prey = living(s).filter((p) => p !== w && canPrey(w, p)).sort((x, y) => bond(s, w.id, x.id) - bond(s, w.id, y.id))[0];
      if (random(s) < 0.5) hunt(c, w, prey);
      else {
        changeBelief(c, w, 2);
        living(s).filter((p) => canPrey(w, p)).forEach((p) => addBond(c, w, p, 1));
        narrate(c, `${w.name} vakade över oss hela natten. Ingen rörde de små.`);
      }
    } else narrate(c, `${w.name} vakade medan vi sov. Natten var lång, men ingen kom.`);
  }

  // 2½. The scout flies ahead in the dark, and comes back knowing what lies there.
  const scout = plan.scout ? animal(s, plan.scout) : undefined;
  if (scout) revealAhead(c, `${scout.name} flög före i mörkret.`, `${scout.name} flög före i mörkret, men såg inget vi inte redan visste.`);

  // Those the meeting placed tonight.
  for (const id of s.fireDebt.apart) line(c, id, `${animal(s, id).name} satt hos kråkan och berättade om dalen, långt in på natten.`);

  // 3. By the embers. One pair may spend the night teaching instead of resting.
  const teaching = plan.teach;
  if (teaching) {
    const t = animal(s, teaching.teacher);
    const l = animal(s, teaching.learner);
    addSkill(s, l, teaching.skill);
    line(c, t.id, `${t.name} visade ${l.name} hur man ${CARDS[teaching.skill].name.toLowerCase()} – hela natten, tills det satt.`);
  }
  const teachers = teaching ? [teaching.teacher, teaching.learner] : [];
  const byEmbers = new Set(plan.pairs.flat());
  for (const a of living(s)) {
    a.emberNights = byEmbers.has(a.id) ? (a.emberNights ?? 0) + 1 : 0;
    const fading = a.traits.find((t) => TRAITS[t].fades && !TRAITS[t].good);
    if (fading && a.emberNights >= 2) {
      a.traits = a.traits.filter((t) => t !== fading);
      a.emberNights = 0;
      line(c, a.id, `Två nätter vid glöden. Det ${TRAITS[fading].name.toLowerCase()} i ${a.name} har släppt.`);
    }
  }
  for (const [ai, bi] of plan.pairs) {
    const a = animal(s, ai);
    const b = animal(s, bi);
    if (!isPresent(a) || !isPresent(b)) continue;
    const kind = a.predator !== b.predator ? 'wary' : bond(s, a.id, b.id) >= 2 ? 'close' : 'other';
    addBond(c, a, b, 1);
    changeBelief(c, a, 1);
    changeBelief(c, b, 1);
    line(c, a.id, talk(FIRE_TALK[kind], a, b));
  }
  const alone = sitsAlone(s, plan);
  for (const a of alone) {
    changeBelief(c, a, -1);
    line(c, a.id, `${a.name} satt ensam i mörkret, utanför glöden.`);
  }
  if (alone.length) breakPromises(c, 'noneAlone');

  // 4. Rest heals what can heal, for all but the one who kept watch.
  for (const a of living(s)) {
    const heal: InjuryKind[] = a.injuries.filter((k) => HEALS_AT_FIRE.includes(k));
    if (!heal.length) continue;
    if (a === w || a === scout || s.fireDebt.apart.includes(a.id) || teachers.includes(a.id)) {
      line(c, a.id, `${a.name} ${a === w ? 'vakade' : a === scout ? 'flög före' : teachers.includes(a.id) ? 'lärde och lärde ut' : 'berättade hela natten'} och fick ingen vila. Såren får vänta.`);
      continue;
    }
    a.injuries = a.injuries.filter((k) => !heal.includes(k));
    if (heal.includes('bleeding')) line(c, a.id, `${a.name}s sår slutade blöda.`);
    if (heal.includes('shock')) line(c, a.id, `Darrningen i ${a.name} släppte till slut.`);
  }
  changeHope(c, 1, 'fire');
  // Promises kept warm us more than the fire.
  if (promises(s).length && promises(s).every((v) => !v.flipped)) {
    changeHope(c, 1, 'fire');
    narrate(c, 'Vi har hållit varje löfte vi gett. Det värmer mer än elden.');
  }
  narrate(c, 'Vid gryningen släckte vi elden och gick vidare.');
  s.fireDebt = { embers: 0, apart: [], dark: [] };
  s.clock = 'day';
  s.phase = 'map';
}

/** Whoever went ahead – the owl or the crow – tells us the truth of the places within two paths. */
function revealAhead(c: Ctx, opening: string, nothing: string): string[] {
  const s = c.s;
  const ahead = unseenAhead(s);
  for (const id of ahead) {
    s.journey.scouted.push(id);
    const p = place(s, id);
    const truth = s.journey.truth[id] ?? 'normal';
    const wrong = s.journey.guess[id] !== truth;
    narrate(c, `${opening} ${p.name}: ${p.memory![truth]}${wrong ? ` – ${guideName(s)} mindes fel.` : `, som ${guideName(s)} mindes.`}`);
  }
  if (!ahead.length) narrate(c, nothing);
  return ahead;
}

// ---------------------------------------------------------------- meetings

/** Answer the crow: move to the next frame, and carry out what the reply means, at once. */
function respond(c: Ctx, optionId: string, uid?: number) {
  const s = c.s;
  const m = s.meeting;
  if (!m) fail('Ingen väntar på svar.');
  const option = meetingOptions(s).find((o) => o.id === optionId);
  if (!option) fail('Det svaret finns inte.');
  let next = option.next;
  // A gamble the story rolls: it works, or the story goes another way.
  let won = true;
  if (option.chance && option.failNext) {
    won = random(s) < option.chance(s);
    if (!won) next = option.failNext;
  }
  const who = speakerOf(s, option);
  const speaker = who ? animal(s, who) : undefined;
  if (speaker) line(c, speaker.id, `${speaker.name}: ${labelOf(s, option)}`);
  const asked = s.proposal;
  const present = s.animals.filter(isPresent);
  const mice = kin(s, 'mice');
  const badger = kin(s, 'badger');
  const fox = kin(s, 'fox');
  const told = () => { m.told = revealAhead(c, 'Kråkan berättade:', 'Kråkan hade inget att berätta.'); };
  switch (option.effect) {
    case 'listen':
      changeHope(c, 1, 'laugh');
      for (const a of s.animals.filter(isPresent)) changeBelief(c, a, 1);
      break;
    case 'owlHunt':
      changeBelief(c, speaker!, 2);
      changeHope(c, -1, 'song');
      break;
    case 'restHollow': {
      // Whoever keeps watch outside gets no rest: the one who offered, or the most hale of the prey.
      const watcher = speaker ?? s.animals.filter((a) => isPresent(a) && !a.predator).sort((a, b) => a.injuries.length - b.injuries.length || b.belief - a.belief)[0];
      for (const a of present.filter((x) => x !== watcher)) heal(c, a, `${a.name} vilade i trädet.`);
      if (watcher) {
        changeBelief(c, watcher, -1);
        line(c, watcher.id, `${watcher.name} höll vakt utanför, i kylan.`);
      }
      break;
    }
    case 'accept': {
      const p = asked!;
      s.verses.push({ id: `lofte-${s.verses.length}`, kind: 'promise', text: promiseText(s, p), flippedText: promiseText(s, p, true), flipped: false, promise: { ...p } });
      changeBelief(c, animal(s, p.by), 2);
      for (const id of m.backers ?? []) changeBelief(c, animal(s, id), 1);
      for (const id of m.objectors ?? []) changeBelief(c, animal(s, id), -1);
      break;
    }
    case 'reject': {
      changeBelief(c, animal(s, asked!.by), -2);
      for (const id of m.objectors ?? []) changeBelief(c, animal(s, id), 1);
      break;
    }
    case 'back':
      m.backers = [...(m.backers ?? []), who!];
      break;
    case 'object':
      m.objectors = [...(m.objectors ?? []), who!];
      break;
    case 'mock':
      m.objectors = [...(m.objectors ?? []), who!];
      changeBelief(c, animal(s, asked!.by), -1);
      break;
    case 'payCard': {
      const card = crowCards(s).find((x) => x.uid === uid);
      if (!card) fail('Välj vilket kort kråkan får.');
      forgetCard(s, card.uid);
      narrate(c, `Kråkan tog ${CARDS[card.kind].name} från ${animal(s, card.owner).name} i näbben.`);
      told();
      break;
    }
    case 'payEmber':
      s.fireDebt.embers++;
      narrate(c, 'Kråkan satte sig vid glöden, där någon av oss skulle ha suttit.');
      told();
      break;
    case 'kvarnHint': {
      const wrong = unseenAhead(s).some((id) => s.journey.guess[id] !== s.journey.truth[id]);
      changeBelief(c, speaker!, wrong ? -1 : 1);
      break;
    }
    case 'trick': {
      const trickster = speaker!;
      if (random(s) < trickChance(s)) {
        changeBelief(c, trickster, 1);
        narrate(c, `Kråkan lyssnade på ${trickster.name}s hemlighet – och berättade, utan att få något.`);
        told();
      } else {
        const own = crowCards(s).filter((x) => x.owner === trickster.id);
        if (own.length) {
          const card = own[Math.floor(random(s) * own.length)];
          forgetCard(s, card.uid);
          narrate(c, `Kråkan genomskådade ${trickster.name} och tog ${CARDS[card.kind].name}.`);
        }
        next = 'snatched';
      }
      break;
    }
    case 'sotfotDark':
      s.fireDebt.embers++;
      s.fireDebt.dark.push(speaker!.id);
      told();
      break;
    case 'owlScare':
      changeBelief(c, speaker!, 1);
      break;
    case 'story':
      s.fireDebt.apart.push(speaker!.id);
      told();
      break;
    // ------------------------------------------------ Dalen's finds and meetings
    case 'berries':
    case 'berriesCareful':
      changeHope(c, 1, 'food');
      for (const a of present) changeBelief(c, a, 1);
      if (option.effect === 'berries') { if (mice) injure(c, mice, 'shock', '{name} har ätit sig sjuka. Magarna värker.'); }
      else if (mice && speaker && mice !== speaker) addBond(c, speaker, mice, 1);
      break;
    case 'learnPath':
    case 'ljungDigs':
      m.card = learnCard(c, speaker!);
      break;
    case 'restDen':
      for (const a of present) heal(c, a, `${a.name} sov djupt i grytet.`);
      if (badger && !badger.grief.includes('dalen')) {
        badger.grief.push('dalen');
        line(c, badger.id, `${badger.name} sörjer dalen. Grytet luktade som hemma.`);
      }
      break;
    case 'stayDeer':
      for (const [i, a] of present.entries()) for (const b of present.slice(i + 1)) addBond(c, a, b, 1);
      changeHope(c, -1, 'cold');
      break;
    case 'ljungDeer':
      changeBelief(c, speaker!, 2);
      break;
    case 'truceTest':
      if (won) changeBelief(c, speaker!, 2);
      else {
        changeHope(c, -1, 'hunt', speaker!.id);
        for (const a of present.filter((x) => !x.predator)) {
          changeBelief(c, a, -1);
          addBond(c, a, speaker!, -1);
        }
      }
      break;
    case 'sneak':
      changeHope(c, won ? 2 : 1, 'food');
      if (!won) {
        const prey = present.filter((a) => !a.predator);
        if (prey.length) injure(c, prey[Math.floor(random(s) * prey.length)], 'bleeding', 'Hunden hann bita {name}. Det blöder.');
      }
      break;
    case 'sotfotSteals':
      if (won) {
        changeHope(c, 2, 'food');
        changeBelief(c, speaker!, 1);
      } else injure(c, speaker!, 'bleeding', 'Hunden hann bita {name} i örat. Det blöder.');
      break;
    case 'fronaBasket':
      changeHope(c, 1, 'food');
      if (speaker) injure(c, speaker, 'shock', 'Människorna skrek. {name} darrar fortfarande.');
      break;
    case 'shareCard': {
      const card = crowCards(s).find((x) => x.uid === uid);
      if (!card) fail('Välj vilket kort räven får.');
      forgetCard(s, card.uid);
      narrate(c, `Vi gav räven ${CARDS[card.kind].name} från ${animal(s, card.owner).name}.`);
      if (speaker?.species === 'fox') changeBelief(c, speaker, 1);
      m.told = revealAhead(c, 'Räven berättade:', 'Räven hade inget nytt att berätta.');
      break;
    }
    case 'chaseFox':
      if (fox) changeBelief(c, fox, -1);
      break;
    case 'readTracks':
    case 'followTracks':
      if (!s.knowledge.includes('machines')) s.knowledge.push('machines');
      narrate(c, 'Nu vet vi hur maskinerna rör sig.');
      if (option.effect === 'readTracks') changeBelief(c, speaker!, 1);
      else if (mice) injure(c, mice, 'shock', 'Dieseldoften. {name} känner igen den från dalen.');
      break;
    case 'comfortKvarn':
      changeBelief(c, guideHere(s)!, 1);
      break;
    case 'doubtKvarn':
      changeBelief(c, guideHere(s)!, -2);
      m.told = revealAhead(c, `${speaker!.name} såg:`, `${speaker!.name} såg inget nytt.`);
      break;
    case 'guessWay':
      changeHope(c, -1, 'lost');
      break;
    case 'lookBack':
      changeBelief(c, speaker!, 1);
      if (speaker!.grief.includes(s.journey.region)) {
        speaker!.grief = speaker!.grief.filter((g) => g !== s.journey.region);
        line(c, speaker!.id, `${speaker!.name} har sagt det högt nu. Sorgen över ${REGIONS[s.journey.region].name.toLowerCase()} släpper lite.`);
      }
      break;
    case 'chooseRegion':
      chooseRegion(c, option.id.slice('go-'.length) as RegionId);
      break;
  }
  if (next) {
    m.used.push(option.id);
    m.frame = next;
    m.by = who;
    return;
  }
  // The meeting is over. A promise may be waiting to be asked.
  s.meeting = null;
  const way: Meeting = { id: 'interlude', frame: 'way', used: [], told: [] };
  if (m.id === 'interlude' && m.frame === 'start') {
    // Done looking back: the region may leave a promise in someone, before we choose the way on.
    s.proposal = regionVerse(s);
    s.meeting = s.proposal ? { id: 'proposal', frame: 'ask', used: [], told: [] } : way;
  } else if (m.id === 'proposal') {
    s.proposal = null;
    if (s.run.between) s.meeting = way;
  } else if (s.proposal) s.meeting = { id: 'proposal', frame: 'ask', used: [], told: [] };
}

// ---------------------------------------------------------------- promises

/** A promise broken: the words turn, hope sinks, and the one who asked it of us loses faith. */
function breakPromise(c: Ctx, v: ReturnType<typeof keptPromises>[number]) {
  const s = c.s;
  v.flipped = true;
  c.ev.push({ kind: 'flip', verse: v.id });
  narrate(c, `Vi lovade: ”${v.text}” Nu är det sant: ”${v.flippedText}”`);
  changeHope(c, -1, 'flip');
  const by = s.animals.find((a) => a.id === v.promise.by);
  if (by && isPresent(by)) changeBelief(c, by, -2);
}

function breakPromises(c: Ctx, rule: string, test: (p: { by: string; with?: string }) => boolean = () => true) {
  for (const v of keptPromises(c.s).filter((x) => x.promise.rule === rule && test(x.promise))) breakPromise(c, v);
}

/** One of us is gone: promises that were about them, while the other lives, are broken. */
function breakForLoss(c: Ctx, gone: Animal) {
  const lives = (id?: string) => !!c.s.animals.find((a) => a.id === id && isPresent(a));
  breakPromises(c, 'together', (p) => (p.by === gone.id && lives(p.with)) || (p.with === gone.id && lives(p.by)));
  breakPromises(c, 'stay', (p) => p.with === gone.id && lives(p.by));
}

/** Learn a card of a trait the animal doesn't already carry: it goes to the discard pile. Its name, or undefined. */
function learnCard(c: Ctx, a: Animal): string | undefined {
  const s = c.s;
  const options = allSkills(a.species).filter((k) => !a.skills.includes(k));
  if (!options.length) return undefined;
  const k = options[Math.floor(random(s) * options.length)];
  addSkill(s, a, k);
  const name = CARDS[k].name;
  line(c, a.id, `${a.name} lärde sig något nytt: ${name}.`);
  return name;
}

/** A card taken from us for good: its owner forgets that skill. */
function forgetCard(s: GameState, uid: number) {
  const card = [...s.draw, ...s.hand, ...s.discard].find((x) => x.uid === uid);
  takeCard(s, uid);
  const o = card && s.animals.find((a) => a.id === card.owner);
  if (!o || card!.kind === 'minne') return;
  o.skills = o.skills.filter((k) => k !== card!.kind);
  o.loadout = o.loadout.filter((k) => k !== card!.kind);
}

/** Dangers lived through before one of us may learn something new. */
export const XP_TO_LEARN = 3;

/** One more danger lived through. At three, two skills of its kind it doesn't know are offered. */
function gainXp(c: Ctx, a: Animal) {
  const s = c.s;
  const left = allSkills(a.species).filter((k) => !a.skills.includes(k));
  if (!left.length || a.offer) return;
  a.xp++;
  if (a.xp < XP_TO_LEARN) return;
  a.xp = 0;
  a.offer = shuffle(s, left).slice(0, 2);
  line(c, a.id, `${a.name} har lärt sig något av det vi gått igenom. Välj vad, under Förmågor.`);
}

/** A skill learned: carried at once if there is room, otherwise it waits among those it knows. */
function addSkill(s: GameState, a: Animal, k: CardKind) {
  if (a.skills.includes(k)) return;
  a.skills.push(k);
  if (a.loadout.length < LOADOUT) {
    a.loadout.push(k);
    s.draw.push({ uid: s.nextUid++, kind: k, owner: a.id });
  }
}

function learn(c: Ctx, id: string, k: CardKind) {
  const s = c.s;
  if (s.phase !== 'map' && s.phase !== 'campfire') fail('Det går bara att lära sig något på kartan eller vid elden.');
  const a = animal(s, id);
  if (!a.offer?.includes(k)) fail(`${a.name} kan inte lära sig det nu.`);
  a.offer = undefined;
  addSkill(s, a, k);
  line(c, a.id, `${a.name} kan nu ${CARDS[k].name}.`);
}

/** Which skills an animal carries: chosen on the map or by the fire, never in danger. */
function equip(c: Ctx, id: string, skills: CardKind[]) {
  const s = c.s;
  if (s.phase !== 'map' && s.phase !== 'campfire') fail('Förmågor väljs på kartan eller vid elden.');
  const a = animal(s, id);
  if (!isPresent(a)) fail(`${a.name} är inte med oss.`);
  const chosen = [...new Set(skills)];
  if (chosen.length < 1 || chosen.length > LOADOUT) fail(`Välj en till ${LOADOUT} förmågor.`);
  if (chosen.some((k) => !a.skills.includes(k))) fail(`${a.name} kan inte det än.`);
  for (const pile of [s.draw, s.hand, s.discard]) {
    for (let i = pile.length - 1; i >= 0; i--) if (pile[i].owner === a.id && pile[i].kind !== 'minne') pile.splice(i, 1);
  }
  a.loadout = chosen;
  for (const k of chosen) s.draw.push({ uid: s.nextUid++, kind: k, owner: a.id });
}

/** Bleeding, shock and poison heal. */
function heal(c: Ctx, a: Animal, text: string) {
  const healed: InjuryKind[] = a.injuries.filter((k) => HEALS_AT_FIRE.includes(k));
  if (!healed.length) return;
  a.injuries = a.injuries.filter((k) => !healed.includes(k));
  line(c, a.id, text);
}

/** A card is gone for good: from wherever it lies. */
function takeCard(s: GameState, uid: number) {
  for (const pile of [s.draw, s.hand, s.discard]) {
    const i = pile.findIndex((x) => x.uid === uid);
    if (i >= 0) pile.splice(i, 1);
  }
}

function flipVerse(c: Ctx, id: VerseId) {
  const s = c.s;
  const v = s.verses.find((x) => x.base === id && !x.flipped);
  if (!v) return;
  v.flipped = true;
  c.ev.push({ kind: 'flip', verse: v.id });
  narrate(c, `Vi sa: ”${v.text}” Nu är det sant: ”${v.flippedText}”`);
  const present = s.animals.filter(isPresent);
  switch (id) {
    case 'ingenLamnas':
      changeHope(c, -2, 'flip');
      present.forEach((a) => changeBelief(c, a, -1));
      break;
    case 'viJagarInte':
      changeHope(c, -1, 'flip');
      present.filter((a) => !a.predator).forEach((a) => changeBelief(c, a, -1));
      break;
    case 'denAldste':
      changeHope(c, -1, 'flip');
      present.forEach((a) => changeBelief(c, a, -1));
      break;
    case 'ingenEnsam':
      changeHope(c, -1, 'flip');
      for (const k of Object.keys(s.bonds)) s.bonds[k] = Math.max(-3, s.bonds[k] - 1);
      break;
    case 'denStarke':
    case 'manen':
      changeHope(c, -1, 'flip');
      break;
  }
}

// ---------------------------------------------------------------- turns

function startTurn(c: Ctx) {
  const s = c.s;
  for (const a of s.animals) {
    a.braced = false;
    a.flying = false;
    a.protectedBy = undefined;
    a.hidden = false;
    a.rooted = false;
    a.scattered = false;
    a.curled = false;
    a.climbing = false;
    a.underground = false;
  }
  s.peekNext = false;
  s.darkRevealed = false;
  s.warded = [];

  const hidden = moonHidden(s);
  const moon = verseStatus(s, 'manen');
  s.kraft = 3 + (hidden && moon === 'intact' ? 1 : 0) - (moonVisible(s) && moon === 'flipped' ? 1 : 0);

  log(c, { kind: 'turn', text: `Timme ${s.turn} av ${s.maxTurn}` });
  if (s.time === 'night' && s.encounterId === 'road') narrate(c, hidden ? 'Månen gömmer sig bakom molnen.' : 'Månen lyser över asfalten.');
  if (s.encounterId === 'road') {
    const strikes = s.trafficPlan[s.turn - 1] ?? [];
    if (strikes.length === 0) narrate(c, 'Vägen är tyst. För tyst, kanske.');
    for (const st of strikes.filter((x) => !x.dark)) {
      narrate(c, `Ljus i fjärran – en ${st.vehicle} i ${zoneDef(s, st.lane).name}. ${st.severity === 'kill' ? 'Den dödar.' : 'Den skadar.'}`);
    }
    if (strikes.some((x) => x.dark)) narrate(c, 'Något mullrar i mörkret. Inga ljus.');
  }
  if (s.encounterId === 'farm') telegraphFarm(c);
  if (s.encounterId === 'river') telegraphRiver(c);
  if (s.encounterId === 'machines') telegraphMachines(c);
  if (s.encounterId === 'raptor') telegraphRaptors(c);
  if (s.encounterId === 'sprayer') telegraphSprayer(c);
  if (s.turn === s.maxTurn) narrate(c, byTime(s, encounterOf(s).lastHour));
  // Bleeding wounds drain belief, hour after hour, until someone tends them by a fire.
  if (s.turn > 1) {
    for (const a of s.animals.filter((x) => isActive(x) && hasInjury(x, 'bleeding'))) {
      changeBelief(c, a, -1);
      line(c, a.id, `${a.name} blöder fortfarande. Det gör ont att tro.`);
    }
  }

  rollIntents(c);
  drawCards(c, handSize(s) + s.stash);
  s.stash = 0;
}

function drawCards(c: Ctx, n: number) {
  const s = c.s;
  for (let i = 0; i < n; i++) {
    if (s.draw.length === 0) {
      if (s.discard.length === 0) return;
      s.draw = shuffle(s, s.discard);
      s.discard = [];
    }
    s.hand.push(s.draw.pop()!);
  }
}


function chooseIntent(c: Ctx, a: Animal): Intent {
  const s = c.s;
  const elderVerse = verseStatus(s, 'denAldste') === 'intact';
  if (a.elder && elderVerse) return { kind: 'follow' };
  if (a.belief <= 0) return { kind: 'leave' };

  // By the farm, a hungry predator goes for the hens: the lesser evil.
  if (a.predator && !a.sated && s.encounterId === 'farm' && a.belief <= huntsAt(s, a) + 2 && zoneDistance(s, a.zone, HEN_HOUSE) <= 1) {
    return { kind: 'raid' };
  }
  if (a.predator && !a.sated && a.belief <= huntsAt(s, a)) {
    const prey = s.animals
      .filter((p) => isActive(p) && canPrey(a, p) && zoneDistance(s, a.zone, p.zone) <= 1)
      .sort((x, y) => bond(s, a.id, x.id) - bond(s, a.id, y.id));
    if (prey.length) return { kind: 'hunt', target: prey[0].id };
  }

  // At five and above we follow. Below, our own will: hesitating, mostly. Below three, worse.
  const will = willOf(s, a);
  if (will === 'follow') return { kind: 'follow' };
  const dark = will === 'dark';
  if (random(s) >= (dark ? 0.85 : beliefFelt(a) >= ownWillBelow(s, a) - 1 ? 0.35 : 0.55)) return { kind: 'follow' };

  const elderNear = elderVerse && s.animals.some((e) => e.elder && isActive(e) && e.zone === a.zone);
  const weights: [Intent, number][] = [
    [{ kind: 'freeze' }, elderNear || has(a, 'hetsig') ? 0 : (dark ? 1 : 3) + (has(a, 'skygg') || has(a, 'arrad') ? 2 : 0) + (hasInjury(a, 'shock') ? 2 : 0)],
    [{ kind: 'flee' }, backZone(s, a) && !has(a, 'trogen') ? (dark ? 2 : 1) : 0],
    [{ kind: 'bolt' }, has(a, 'lugn') ? 0 : (dark ? 2 : 0) + (has(a, 'hetsig') ? 3 : 0) + (isFast(a) ? 2 : 0)],
  ];
  const total = weights.reduce((t, [, w]) => t + w, 0);
  let r = random(s) * total;
  for (const [intent, w] of weights) {
    if ((r -= w) < 0) return intent;
  }
  return { kind: 'follow' };
}

function rollIntents(c: Ctx) {
  for (const a of c.s.animals) {
    if (!isActive(a)) {
      a.intent = { kind: 'follow' };
      continue;
    }
    a.intent = chooseIntent(c, a);
    const target = a.intent.kind === 'hunt' ? animal(c.s, a.intent.target).name : undefined;
    const text = intentLine(a.name, a.intent, target);
    if (text) line(c, a.id, text);
  }
  // A frightened fawn frightens those beside it.
  for (const f of c.s.animals.filter((a) => isActive(a) && a.species === 'fawn' && (a.intent.kind === 'freeze' || a.intent.kind === 'bolt'))) {
    const near = c.s.animals.filter((a) => isActive(a) && a !== f && a.zone === f.zone);
    if (!near.length) continue;
    near.forEach((a) => changeBelief(c, a, -1));
    line(c, f.id, `${f.name}s rädsla smittar. Ingen omkring står riktigt still.`);
  }
}

// ---------------------------------------------------------------- movement

function moveAnimal(c: Ctx, a: Animal, to: ZoneId, byPlayer: boolean) {
  const s = c.s;
  if (a.zone === to) return;
  a.zone = to;
  if (a.climbing) {
    a.climbing = false;
    a.flying = false;
  }
  const zone = zoneDef(s, to);
  // Water slows us all – but not those who swim.
  if (zone.slow) a.slowTime = a.swimmer && zone.water ? 1 : 0;
  // Fliers never walk: they take off, and stay airborne for the rest of the hour.
  if (canFly(a)) a.flying = true;
  if (s.encounterId === 'river' && to === DAM && !a.flying) creakDam(c, a);

  if (byPlayer && !canFly(a) && zone.road && moonVisible(s) && verseStatus(s, 'manen') === 'intact') {
    line(c, a.id, `${a.name} går ut på asfalten i månens ljus.`);
    flipVerse(c, 'manen');
  }
  if (byPlayer && verseStatus(s, 'ingenEnsam') === 'intact') {
    const friend = s.animals.find((o) => o.id !== a.id && isPresent(o) && o.zone === to && bond(s, a.id, o.id) >= 2);
    if (friend) {
      changeBelief(c, a, 1);
      changeBelief(c, friend, 1);
      line(c, a.id, `${a.name} söker sig till ${friend.name}. Ingen går ensam.`);
    }
  }
  if (zone.goal) {
    a.status = 'safe';
    a.intent = { kind: 'follow' };
    changeBelief(c, a, 1);
    line(c, a.id, `${a.name} når ${zone.name}. Gräset luktar annorlunda här.`);
    c.ev.push({ kind: 'safe', who: a.id });
  }
}

function lead(c: Ctx, target: string, zone: ZoneId) {
  const s = c.s;
  if (s.phase !== 'play') fail('Inte nu.');
  if (!leadTargets(s).includes(target)) fail('Det djuret kan inte ledas nu.');
  const a = animal(s, target);
  if (!leadZones(s, a).includes(zone)) fail('Dit kan vi inte leda.');
  s.kraft -= leadCost(a);
  a.steps = (a.steps ?? 0) + 1;
  moveAnimal(c, a, zone, true);
}

// ---------------------------------------------------------------- the farm

function raiseAlarm(c: Ctx, n: number) {
  const s = c.s;
  const max = alarmMax(s);
  s.alarm = Math.min(max, s.alarm + n);
  if (s.alarm >= max && !s.farmerOut) {
    s.farmerOut = true;
    narrate(c, 'Ett ljus tänds i huset. Dörren slår upp. Bonden kommer ut med en ficklampa.');
  }
}

/** At the start of each hour the dogs pick up a trail, and the flashlight picks a zone. */
function telegraphFarm(c: Ctx) {
  const s = c.s;
  if (s.turn === 1 && !s.dogsAwake) narrate(c, 'Gården sover. Två hundar ligger vid hundkojan, med nosen mellan tassarna.');
  if (!s.dogsAwake && s.turn >= 2) {
    s.dogsAwake = true;
    narrate(c, 'Hundarna vaknar och lyfter nosen. De har känt doften av oss.');
  }
  if (s.dogsAwake) {
    const targets = dogTargets(s);
    s.dogs.forEach((d, i) => (d.target = targets[i]));
    for (const d of s.dogs) {
      narrate(c, d.target ? `${d.name} följer vår doft mot ${zoneDef(s, d.target).name}.` : `${d.name} nosar runt ${zoneDef(s, d.zone).name}.`);
    }
  }
  s.farmerSweep = null;
  if (s.farmerOut) {
    // The flashlight goes where it sees the most of us out in the open.
    const open = encounterOf(s).zones.filter((z) => !z.cover && !z.goal);
    const count = (z: string) => s.animals.filter((a) => isActive(a) && a.zone === z).length;
    const best = Math.max(...open.map((z) => count(z.id)));
    const choices = open.filter((z) => count(z.id) === best);
    s.farmerSweep = choices[Math.floor(random(s) * choices.length)].id;
    narrate(c, `Ficklampan söker mot ${zoneDef(s, s.farmerSweep).name}.`);
  }
}

/** End of the hour: the dogs reach their trail and bite, the flashlight finds whoever is in the open. */
function farmHazards(c: Ctx) {
  const s = c.s;
  const bitten = new Set<string>();
  for (const d of s.dogs) {
    if (!d.target) continue;
    d.zone = dogDestination(d);
    const here = s.animals.filter((a) => isActive(a) && a.zone === d.zone && !a.flying);
    if (!here.length) {
      narrate(c, `${d.name} nosar i ${zoneDef(s, d.zone).name}, men vi är redan borta.`);
      continue;
    }
    for (const a of here) {
      if (bitten.has(a.id)) continue;
      bitten.add(a.id);
      s.hitQueue.push({ victim: a.id, severity: 'injure', sudden: false, zone: d.zone, source: 'hund' });
    }
  }
  if (bitten.size) {
    narrate(c, 'Hundarna skäller och biter. Över gården tänds ett fönster.');
    raiseAlarm(c, 1);
  }
  if (s.farmerOut && s.farmerSweep && !zoneDef(s, s.farmerSweep).cover) {
    for (const a of s.animals.filter((x) => isActive(x) && x.zone === s.farmerSweep && !x.flying)) {
      s.hitQueue.push({ victim: a.id, severity: 'kill', sudden: false, zone: a.zone, source: 'bonde' });
    }
  }
}

/**
 * Scent fades by one each hour (at night, in the cold still air, every other hour);
 * where we end the hour it grows, unless water, grass or dung hide it.
 */
function leaveScent(s: GameState) {
  const fades = s.time === 'day' || s.turn % 2 === 0;
  if (fades) for (const z of Object.keys(s.scent)) s.scent[z] = Math.max(0, s.scent[z] - 1);
  const occupied = new Set(s.animals.filter((a) => isActive(a) && !a.flying && !a.hidden).map((a) => a.zone));
  for (const id of occupied) {
    const z = zoneDef(s, id);
    if (z.breaksScent || z.goal) continue;
    s.scent[id] = Math.min(SCENT_MAX, (s.scent[id] ?? 0) + 2);
  }
}

/** The fox or the owl shows itself, and the dogs turn toward it. */
function lure(c: Ctx, target: string, zone: ZoneId) {
  const s = c.s;
  if (s.phase !== 'play') fail('Inte nu.');
  const a = animal(s, target);
  if (!canLure(s, a)) fail('Det djuret kan inte locka hundarna.');
  if (!lureZones(s, a).includes(zone)) fail('Dit når inte lockbetet.');
  if (s.kraft < 1) fail('Vi har inte kraft nog.');
  s.kraft -= 1;
  moveAnimal(c, a, zone, true);
  for (const d of s.dogs) d.target = zone;
  narrate(c, `${a.name} visar sig i ${zoneDef(s, zone).name}. Hundarna vänder sig mot ${a.name} och skäller.`);
  raiseAlarm(c, 1);
}

/** Someone shows itself on purpose: the dogs turn to it, the birds' shadow glides over it. */
function showAsBait(c: Ctx, a: Animal) {
  const s = c.s;
  if (!isActive(a)) return;
  if (s.encounterId === 'farm' && s.dogsAwake && s.time === 'day') {
    for (const d of s.dogs) d.target = a.zone;
    narrate(c, `${a.name} visar sig i ${zoneDef(s, a.zone).name}. Hundarna vänder sig mot ${a.name} och skäller.`);
    raiseAlarm(c, 1);
  } else if (s.encounterId === 'raptor' && s.turn > 1) {
    for (const b of s.raptors) if (b.zone) b.zone = a.zone; else if (b.maybe.length) b.maybe = [a.zone, a.zone];
    narrate(c, `${a.name} springer ut i det öppna. Skuggan vänder och glider efter.`);
  } else line(c, a.id, `${a.name} visar sig – men här finns inget som bryr sig.`);
}

// ---------------------------------------------------------------- the river

/** At the start of each hour we see the current and the spray; by day the heron picks a stone. */
function telegraphRiver(c: Ctx) {
  const s = c.s;
  if (s.turn === 1) narrate(c, 'Ån brusar. Tre stenar sticker upp ur vattnet, och uppströms ligger bävrarnas damm.');
  narrate(c, s.currentPlan[s.turn - 1] === 'strid' ? 'Strömmen är strid den här timmen. Den drar mot forsen.' : 'Strömmen är lugn den här timmen.');
  for (const z of s.slipPlan[s.turn - 1] ?? []) narrate(c, `Vågorna slår upp över ${zoneDef(s, z).name}. Den är hal.`);
  s.heron = null;
  if (s.time === 'day' && s.turn >= 2) {
    // The heron watches the stone where the most small ones stand.
    const small = (z: ZoneId) => s.animals.filter((a) => isActive(a) && a.zone === z && a.size === 'small').length;
    const best = Math.max(...STONES.map(small));
    const choices = STONES.filter((z) => small(z) === best);
    s.heron = choices[Math.floor(random(s) * choices.length)];
    narrate(c, `En häger står stilla vid ${zoneDef(s, s.heron).name} och väntar.`);
  }
}

/** Every step on the dam makes it creak; the large count twice. At the limit it breaks. */
function creakDam(c: Ctx, a: Animal) {
  const s = c.s;
  s.damCreak = Math.min(DAM_MAX, s.damCreak + (a.size === 'large' ? 2 : 1));
  if (s.damCreak < DAM_MAX) {
    narrate(c, `Dammen knakar under ${a.name}.`);
    return;
  }
  narrate(c, 'Dammen brister. Pinnar och lera ger vika, och vattnet forsar fram.');
  s.closed.push(DAM);
  for (const o of s.animals.filter((x) => isActive(x) && x.zone === DAM)) {
    o.zone = CURRENT;
    line(c, o.id, `${o.name} faller ner i strömmen.`);
  }
  // The flood wave: the current is strong now and for the next hour.
  for (let t = s.turn - 1; t < Math.min(s.turn - 1 + FLOOD_HOURS, s.currentPlan.length); t++) s.currentPlan[t] = 'strid';
}

/** End of the hour: the wet stones throw us into the current, the current carries, the heron strikes, the night's cold bites. */
function riverHazards(c: Ctx) {
  const s = c.s;
  for (const z of s.slipPlan[s.turn - 1] ?? []) {
    for (const a of s.animals.filter((x) => isActive(x) && x.zone === z && !aboveTheWater(x))) {
      if (a.braced) {
        a.braced = false;
        line(c, a.id, `${a.name} biter ihop och håller sig kvar på den hala stenen.`);
        continue;
      }
      a.zone = CURRENT;
      line(c, a.id, `${a.name} halkar på ${zoneDef(s, z).name} och glider ner i strömmen.`);
    }
  }
  for (const a of s.animals.filter((x) => isActive(x) && x.zone === CURRENT && !aboveTheWater(x))) {
    if (carriedAway(s, a)) {
      s.hitQueue.push({ victim: a.id, severity: 'kill', sudden: false, zone: CURRENT, source: 'forsen' });
    } else if (s.currentPlan[s.turn - 1] === 'strid') {
      const anchor = holdsOnTo(s, a);
      line(c, a.id, swims(a) ? `${a.name} simmar lugnt i det strida vattnet.` : a.size === 'large' ? `${a.name} står stadigt i strömmen.` : `${a.name} håller sig fast i ${anchor!.name}.`);
    }
  }
  if (s.heron) {
    for (const a of s.animals.filter((x) => isActive(x) && x.zone === s.heron && x.size === 'small' && !x.flying)) {
      s.hitQueue.push({ victim: a.id, severity: 'injure', sudden: false, zone: a.zone, source: 'häger' });
    }
  }
  if (s.time === 'night') {
    const cold = s.animals.filter((x) => isActive(x) && !aboveTheWater(x) && zoneDef(s, x.zone).water);
    for (const a of cold) changeBelief(c, a, -1);
    if (cold.length) narrate(c, `Det kalla vattnet tar i ${cold.map((a) => a.name).join(' och ')}.`);
  }
}

// ---------------------------------------------------------------- the machines

/** At the start of each hour: where the trees will fall, and what ground the bulldozer takes. */
function telegraphMachines(c: Ctx) {
  const s = c.s;
  if (s.turn === 1) {
    narrate(c, 'Maskinerna startar i gryningen. En fällare går in bland träden, och bakom den kommer schaktaren och tar marken.');
    if (s.knowledge.includes('machines')) narrate(c, 'Vi har sett deras spår. Vi vet i vilken ordning de tar dalen.');
  }
  // Whoever is still on ground the bulldozer took is pushed ahead of it.
  for (const a of s.animals.filter((x) => isActive(x) && s.closed.includes(x.zone))) {
    const ahead = encounterOf(s).edges.find(([from, to]) => from === a.zone && !s.closed.includes(to));
    if (!ahead) continue;
    a.zone = ahead[1];
    line(c, a.id, `${a.name} tar sig upp ur leran, till ${zoneDef(s, a.zone).name}.`);
  }
  const fell = s.fellPlan[s.turn - 1];
  if (fell) narrate(c, `Fällaren vänder sig mot ${zoneDef(s, fell).name}. När timmen går faller träden där.`);
  const doze = s.dozePlan[s.turn - 1];
  if (doze) narrate(c, `Schaktaren rullar mot ${zoneDef(s, doze).name}. När timmen går är den marken borta.`);
}

/** End of the hour: the trees fall, the roar frightens, the bulldozer takes the ground. */
function machinesHazards(c: Ctx) {
  const s = c.s;
  const fell = s.fellPlan[s.turn - 1];
  const doze = s.dozePlan[s.turn - 1];
  if (fell) {
    const under = s.animals.filter((a) => isActive(a) && a.zone === fell && (!a.flying || a.climbing));
    if (!under.length) narrate(c, `Träden i ${zoneDef(s, fell).name} faller med ett brak. Ingen av oss var där.`);
    for (const a of under) s.hitQueue.push({ victim: a.id, severity: 'kill', sudden: false, zone: fell, source: 'fällaren' });
    for (const a of s.animals.filter((x) => isActive(x) && roarZones(s).includes(x.zone) && (!x.flying || x.climbing))) {
      if (hasInjury(a, 'shock')) continue;
      injure(c, a, 'shock', 'Bruset från fällaren går rakt in i {name}. Något stannar kvar där.');
    }
  }
  if (doze) {
    s.closed.push(doze);
    narrate(c, `Schaktaren tar ${zoneDef(s, doze).name}. Där finns bara lera nu.`);
    for (const a of s.animals.filter((x) => isActive(x) && x.zone === doze && (!x.flying || x.climbing))) {
      s.hitQueue.push({ victim: a.id, severity: 'kill', sudden: false, zone: doze, source: 'schaktaren' });
    }
  }
}

// ---------------------------------------------------------------- the fields

/**
 * At the start of each hour the birds choose where to strike: toward whoever stands
 * most exposed, at most one zone from where they were. By day we see the shadow;
 * at night we only hear the wings, over one of two places.
 */
function telegraphRaptors(c: Ctx) {
  const s = c.s;
  const night = s.time === 'night';
  if (s.turn === 1) {
    narrate(c, night
      ? 'Det är tyst över fälten. Men någonting sitter i den döda eken vid diket, och vänder på huvudet.'
      : `${s.raptors.length > 1 ? 'Två vråkar' : 'En vråk'} kretsar högt över fälten. ${s.raptors.length > 1 ? 'De har' : 'Den har'} sett oss, men väntar.`);
    return;
  }
  const taken: ZoneId[] = [];
  for (const b of s.raptors) {
    const from = b.zone ?? b.maybe[0] ?? null;
    const options = shadowOptions(from).filter((z) => !taken.includes(z));
    const best = Math.max(...options.map((z) => exposedIn(s, z)));
    const top = options.filter((z) => exposedIn(s, z) === best);
    const target = top[Math.floor(random(s) * top.length)];
    taken.push(target);
    if (night) {
      const other = options.filter((z) => z !== target);
      const decoy = other.length ? other[Math.floor(random(s) * other.length)] : target;
      b.zone = null;
      b.maybe = random(s) < 0.5 ? [target, decoy] : [decoy, target];
      narrate(c, `Vingslag i mörkret – över ${zoneDef(s, b.maybe[0]).name} eller ${zoneDef(s, b.maybe[1]).name}.`);
    } else {
      b.zone = target;
      b.maybe = [];
      narrate(c, `Skuggan glider över ${zoneDef(s, target).name}.`);
    }
  }
}

/** End of the hour: the birds strike. A small one is carried off, a medium one clawed; at night, wings in the air are heard first. */
function raptorHazards(c: Ctx) {
  const s = c.s;
  if (s.turn === 1) return;
  const source = s.time === 'night' ? 'berguv' : 'vråk';
  const bird = HIT_BY[source];
  for (const b of s.raptors) {
    const flier = s.time === 'night' ? s.animals.find((a) => isActive(a) && a.flying && !s.hitQueue.some((h) => h.victim === a.id)) : undefined;
    if (flier) {
      narrate(c, `Berguven hör ${flier.name}s vingar.`);
      s.hitQueue.push({ victim: flier.id, severity: 'injure', sudden: false, zone: flier.zone, source });
      continue;
    }
    const z = b.zone ?? b.maybe[Math.floor(random(s) * b.maybe.length)];
    if (!z) continue;
    const v = prey(s, z);
    if (!v || s.hitQueue.some((h) => h.victim === v.id)) {
      const hid = s.animals.some((a) => isActive(a) && a.zone === z);
      narrate(c, hid ? `${bird} slår ner i ${zoneDef(s, z).name} – men vi låg för väl gömda.` : `${bird} slår ner i ${zoneDef(s, z).name}. Ingen av oss var där.`);
      continue;
    }
    s.hitQueue.push({ victim: v.id, severity: v.size === 'small' ? 'kill' : 'injure', sudden: false, zone: z, source });
  }
}

// ---------------------------------------------------------------- the sprayed field

/** Start of the hour: which way the wind blows, and by day where the tractor turns. By night the mist rises unseen. */
function telegraphSprayer(c: Ctx) {
  const s = c.s;
  const wind = s.spray.windPlan[s.turn - 1];
  if (s.time === 'night') {
    if (s.turn > 1) {
      const z = CROP[Math.floor(random(s) * CROP.length)];
      if (!s.spray.mist.includes(z)) s.spray.mist.push(z);
    }
    s.spray.shown = s.spray.mist.filter(() => random(s) < 0.5);
    narrate(c, s.spray.shown.length
      ? `Vinden drar mot ${wind}. Det luktar sött från ${s.spray.shown.map((z) => zoneDef(s, z).name).join(' och ')}.`
      : `Vinden drar mot ${wind}. Vi ser ingen dimma – men den finns där.`);
    return;
  }
  s.spray.shown = [...s.spray.mist];
  const row = rowZones(s.spray.rowPlan[s.turn - 1]);
  narrate(c, `Vinden drar mot ${wind}. Traktorn vänder och kör längs ${zoneDef(s, row[0]).name} när timmen går.`);
}

/** End of the hour: the wind moves the mist, the tractor drives its row and sprays, and whoever stands in the mist breathes it. */
function sprayerHazards(c: Ctx) {
  const s = c.s;
  const wind = s.spray.windPlan[s.turn - 1];
  s.spray.mist = drift(s.spray.mist, wind);
  if (s.time === 'day') {
    const row = s.spray.rowPlan[s.turn - 1];
    const zones = rowZones(row);
    const under = s.animals.filter((a) => isActive(a) && zones.includes(a.zone) && !a.flying && !a.underground);
    narrate(c, under.length ? `Traktorn kommer längs ${zoneDef(s, zones[0]).name}.` : `Traktorn kör längs ${zoneDef(s, zones[0]).name}. Ingen av oss var där.`);
    for (const a of under) s.hitQueue.push({ victim: a.id, severity: 'kill', sudden: false, zone: a.zone, source: 'traktor' });
    s.spray.mist = [...new Set([...s.spray.mist, ...sprayed(row, s.variant === 'hard')])];
  }
  // Those who swim wash the poison off in the stream.
  for (const a of s.animals.filter((x) => isActive(x) && x.swimmer && zoneDef(s, x.zone).water && hasInjury(x, 'poisoned'))) {
    a.injuries = a.injuries.filter((k) => k !== 'poisoned');
    line(c, a.id, `${a.name} tvättar av sig giftet i bäcken.`);
  }
  for (const a of s.animals.filter((x) => isActive(x) && s.spray.mist.includes(x.zone) && !x.underground && !s.hitQueue.some((h) => h.victim === x.id))) {
    s.hitQueue.push({ victim: a.id, severity: 'injure', sudden: false, zone: a.zone, source: 'gift' });
  }
  for (const a of s.animals.filter((x) => isActive(x) && s.spray.mist.includes(x.zone) && x.underground)) line(c, a.id, `Dimman drar över ${a.name}, men når inte ner i jorden.`);
}

// ---------------------------------------------------------------- the rescue

/** A rescued one starts here at most: it has only just met the oath. */
export const RESCUED_BELIEF = 4;

/** Who waits to be rescued: someone of a kind not with us and not met before, that the place makes sense for. */
function trappedKind(s: GameState, not: ('swimmer' | 'flier')[]): Species | undefined {
  const here = new Set(s.animals.filter(isPresent).map((a) => a.species));
  const kinds = (Object.keys(SPECIES) as Species[]).filter((sp) => {
    const d = SPECIES[sp];
    return !here.has(sp) && !s.met.includes(sp) && !(not.includes('swimmer') && d.swimmer) && !(not.includes('flier') && d.flier);
  });
  return kinds.length ? kinds[Math.floor(random(s) * kinds.length)] : undefined;
}

/** Reach out to the trapped one, or – once it trusts us – free it. Freed, it is one of us. */
function rescue(c: Ctx, by: string) {
  const s = c.s;
  if (s.phase !== 'play' || !s.rescue) fail('Ingen att rädda här.');
  const a = animal(s, by);
  const blocked = rescueBlockReason(s, a);
  if (blocked) fail(blocked);
  const r = s.rescue;
  const def = { name: r.name };
  s.kraft -= 1;
  if (r.trust < r.need) {
    r.trust++;
    line(c, a.id, r.trust < r.need
      ? `${a.name} kryper närmare och talar lågt. ${def.name} slutar sparka.`
      : `${def.name} låter ${a.name} komma ända fram.`);
    return;
  }
  const made = makeAnimal({ species: r.species }, r.who, r.name, s, () => s.nextUid++, r.zone);
  const freed = made.animal;
  // Fresh from the snare, no one trusts the oath much yet.
  freed.belief = Math.min(freed.belief, RESCUED_BELIEF);
  s.animals.push(freed);
  s.discard.push(...made.cards);
  addBond(c, freed, a, 1);
  s.met.push(r.species);
  s.rescue = null;
  narrate(c, `${a.name} ${encounterOf(s).rescue!.freed}. ${def.name} är fri – och stannar hos oss.`);
}

// ---------------------------------------------------------------- cards

function playCard(c: Ctx, uid: number, target?: string, zone?: ZoneId) {
  const s = c.s;
  if (s.phase !== 'play') fail('Inte nu.');
  const idx = s.hand.findIndex((x) => x.uid === uid);
  if (idx < 0) fail('Kortet finns inte i handen.');
  const card = s.hand[idx];
  if (!canPlay(s, card)) fail('Kortet kan inte spelas nu.');
  const spec = cardTarget(card);
  let tgt: Animal | undefined;
  if (spec === 'animal' || spec === 'animalZone') {
    if (!target || !cardAnimals(s, card).includes(target)) fail('Ogiltigt mål.');
    tgt = animal(s, target);
  }
  if ((spec === 'zone' || spec === 'animalZone') && (!zone || !cardZones(s, card).includes(zone))) {
    fail('Ogiltig plats.');
  }
  s.kraft -= cardCost(s, card);
  s.hand.splice(idx, 1);
  if (card.kind !== 'minne') s.discard.push(card);
  const o = animal(s, card.owner);
  applyCard(c, card, o, tgt, zone);
  if (CARDS[card.kind].tag === 'insight' && has(o, 'klok')) drawCards(c, 1);
}

/** The ways here that no one has found yet. */
const hiddenWays = (s: GameState) => encounterOf(s).zones.filter((z) => z.hidden && !s.revealed.includes(z.id));

/** Someone finds the hidden ways. True if there were any. */
function revealHidden(c: Ctx, o: Animal, verb: string): boolean {
  const hidden = hiddenWays(c.s);
  if (!hidden.length) return false;
  c.s.revealed.push(...hidden.map((z) => z.id));
  narrate(c, `${o.name} ${verb} en dold väg: ${hidden.map((z) => z.label.toLowerCase()).join(' och ')}.${hidden.every((z) => z.smallOnly) ? ' Bara små djur får plats.' : ''}`);
  return true;
}

function applyCard(c: Ctx, card: Card, o: Animal, tgt: Animal | undefined, zone: ZoneId | undefined) {
  const s = c.s;
  switch (card.kind) {
    case 'snabbaTassar':
    case 'smaSteg':
    case 'sprang':
      moveAnimal(c, o, zone!, true);
      break;
    case 'vingar': {
      o.flying = true;
      s.darkRevealed = true;
      s.peekNext = true;
      const dark = (s.trafficPlan[s.turn - 1] ?? []).find((x) => x.dark);
      line(c, o.id, dark ? `${o.name} ser från ovan: en mörk bil närmar sig i ${zoneDef(s, dark.lane).name}.` : `${o.name} kretsar över vägen och spanar.`);
      break;
    }
    case 'gaForst': {
      const left = o.zone;
      moveAnimal(c, o, zone!, true);
      s.animals.filter((x) => isActive(x) && x.zone === left).forEach((x) => changeBelief(c, x, 1));
      line(c, o.id, `${o.name} går först. De andra ser det.`);
      break;
    }
    case 'bara':
      line(c, o.id, `${o.name} bär ${tgt!.name}.`);
      moveAnimal(c, o, zone!, true);
      moveAnimal(c, tgt!, zone!, true);
      if (isActive(tgt!)) tgt!.protectedBy = o.id;
      addBond(c, o, tgt!, 1);
      break;
    case 'gamlaVagar':
      {
        const hidden = hiddenWays(s);
        if (hidden.length) {
          s.revealed.push(...hidden.map((z) => z.id));
          narrate(c, `${o.name} minns: under vägen går en gammal trumma. Smal, mörk, långsam – men säker. Bara små djur får plats.`);
          const way = hidden.find((z) => isActive(o) && !isFrozen(o) && neighbors(s, o).includes(z.id));
          if (way) moveAnimal(c, o, way.id, true);
          break;
        }
        s.peekNext = true;
        line(c, o.id, `${o.name} lyssnar mot asfalten.`);
      }
      break;
    case 'trosta':
      changeBelief(c, tgt!, has(o, 'omtanksam') ? 3 : 2);
      tgt!.intent = { kind: 'follow' };
      line(c, o.id, `${o.name} tröstar ${tgt!.name}.`);
      break;
    case 'lasaNatten':
      s.peekNext = true;
      drawCards(c, 1);
      line(c, o.id, `${o.name} lyssnar till natten.`);
      break;
    case 'skratt':
      s.animals.filter((x) => isPresent(x) && x.zone === o.zone).forEach((x) => changeBelief(c, x, 1));
      changeHope(c, 1, 'laugh', o.id);
      line(c, o.id, `${o.name} skrattar till i mörkret. Det låter nästan som hemma.`);
      break;
    case 'taEmot':
      tgt!.protectedBy = o.id;
      line(c, o.id, `${o.name} ställer sig framför ${tgt!.name}.`);
      break;
    case 'giftIReserv':
      changeBelief(c, o, 2);
      s.animals.filter((x) => isPresent(x) && !x.predator && x.zone === o.zone).forEach((x) => changeBelief(c, x, -1));
      line(c, o.id, `${o.name} lovar att inte bita. De små i närheten tror inte riktigt på det.`);
      break;
    // ------------------------------------------------ the species' own skills
    case 'simma':
    case 'ringla':
    case 'flyga':
      moveAnimal(c, o, zone!, true);
      break;
    case 'smyga':
    case 'krypaIn':
      moveAnimal(c, o, zone!, true);
      if (isActive(o)) o.hidden = true;
      line(c, o.id, `${o.name} ${card.kind === 'smyga' ? 'smyger' : 'kryper'} undan, osedd.`);
      break;
    case 'lockbete':
    case 'lockaBort':
      moveAnimal(c, o, zone!, true);
      showAsBait(c, o);
      break;
    case 'baraLiten':
    case 'baraIhop':
      line(c, o.id, `${o.name} ${card.kind === 'baraLiten' ? 'lyfter' : 'bär'} ${tgt!.name}.`);
      moveAnimal(c, o, zone!, true);
      moveAnimal(c, tgt!, zone!, true);
      if (isActive(tgt!)) tgt!.protectedBy = o.id;
      addBond(c, o, tgt!, 1);
      break;
    case 'talamod':
      changeBelief(c, tgt!, has(o, 'omtanksam') ? 3 : 2);
      tgt!.intent = { kind: 'follow' };
      line(c, o.id, `${o.name} sitter stilla hos ${tgt!.name} tills rädslan går över.`);
      break;
    case 'gravaNer':
    case 'gommaSig':
    case 'frysaStilla':
      o.hidden = true;
      o.braced = true;
      o.rooted = true;
      if (card.kind === 'gravaNer') o.underground = true;
      line(c, o.id, card.kind === 'gravaNer' ? `${o.name} gräver ner sig.` : card.kind === 'gommaSig' ? `${o.name} ringlar in under en sten.` : `${o.name} blir alldeles stilla.`);
      break;
    case 'tystVinge':
      tgt!.hidden = true;
      line(c, o.id, `${o.name} breder ut vingen över ${tgt!.name}.`);
      break;
    case 'hacka':
      o.braced = true;
      line(c, o.id, `${o.name} är beredd att kasta sig åt sidan.`);
      break;
    case 'spridaSig':
      o.scattered = true;
      line(c, o.id, `${o.name} sprider ut sig.`);
      break;
    case 'staSomSten':
    case 'stampa':
      for (const x of s.animals.filter((a) => isActive(a) && a.zone === o.zone)) x.braced = true;
      line(c, o.id, card.kind === 'stampa' ? `${o.name} stampar en varning. Alla omkring håller i sig.` : `${o.name} står som en sten. Ingen omkring rubbas.`);
      break;
    case 'gamlesRost':
      for (const x of s.animals.filter((a) => isPresent(a) && zoneDistance(s, o.zone, a.zone) <= 1)) {
        changeBelief(c, x, 1);
        if (isActive(x)) x.intent = { kind: 'follow' };
      }
      line(c, o.id, `${o.name} talar lågt, och de närmaste lyssnar.`);
      break;
    case 'ropINatten':
      for (const x of s.animals.filter((a) => isActive(a) && zoneDistance(s, o.zone, a.zone) <= 2 && ['freeze', 'flee', 'bolt'].includes(a.intent.kind))) {
        x.intent = { kind: 'follow' };
        line(c, x.id, `${x.name} hör ropet och följer igen.`);
      }
      break;
    case 'lyssnaIMarken':
      s.peekNext = true;
      s.darkRevealed = true;
      drawCards(c, 2);
      line(c, o.id, `${o.name} lägger örat mot marken.`);
      break;
    case 'vaka':
      s.peekNext = true;
      changeBelief(c, o, 1);
      line(c, o.id, `${o.name} vakar.`);
      break;
    case 'mangaOgon':
    case 'vidoga':
      s.peekNext = true;
      drawCards(c, 1);
      line(c, o.id, `${o.name} spanar åt alla håll.`);
      break;
    case 'list':
      drawCards(c, 2);
      line(c, o.id, `${o.name} har en plan.`);
      break;
    case 'giftIHuden':
      changeBelief(c, o, 1);
      for (const p of s.animals.filter((a) => isActive(a) && a.intent.kind === 'hunt')) {
        const i = p.intent as Extract<Intent, { kind: 'hunt' }>;
        const t = animal(s, i.target);
        if (t.zone !== o.zone) continue;
        p.intent = { kind: 'follow' };
        changeBelief(c, p, -2);
        line(c, p.id, `${p.name} känner lukten av giftet och ger upp.`);
      }
      break;
    case 'hota':
      if (!s.warded.includes(o.zone)) s.warded.push(o.zone);
      line(c, o.id, `${o.name} reser sig och väser. Inget som jagar vill komma nära.`);
      break;
    case 'mattForStunden':
      changeBelief(c, o, 2);
      o.sated = true;
      if (o.intent.kind === 'hunt') o.intent = { kind: 'follow' };
      line(c, o.id, `${o.name} är mätt, för stunden.`);
      break;
    case 'varmaSig':
      changeBelief(c, o, 2);
      o.hunger = Math.max(0, o.hunger - 1);
      line(c, o.id, `${o.name} värmer sig i en solfläck. Hungern lägger sig.`);
      break;
    case 'omsaSkinn':
      heal(c, o, `${o.name} ömsar skinn. Det som gjorde ont blir kvar i det gamla.`);
      break;
    // ------------------------------------------------ the hedgehog
    case 'rullaIhop':
      o.curled = true;
      o.rooted = true;
      line(c, o.id, `${o.name} rullar ihop sig till en boll av taggar.`);
      break;
    case 'taggar':
      for (const x of s.animals.filter((a) => isActive(a) && a.zone === o.zone && a.size === 'small')) x.curled = true;
      line(c, o.id, `${o.name} reser taggarna. De små kryper intill.`);
      break;
    case 'tryggRygg':
      tgt!.curled = true;
      line(c, o.id, `${tgt!.name} kryper in under ${o.name}s taggar.`);
      break;
    case 'tystGang':
      moveAnimal(c, o, zone!, true);
      if (isActive(o)) o.hidden = true;
      line(c, o.id, `${o.name} tassar undan, osedd.`);
      break;
    case 'snoka':
      if (!revealHidden(c, o, 'nosar upp')) {
        s.peekNext = true;
        line(c, o.id, `${o.name} nosar i luften.`);
      }
      break;
    case 'vintersomn':
      changeBelief(c, o, 3);
      o.injuries = o.injuries.filter((i) => i !== 'shock');
      o.rooted = true;
      line(c, o.id, `${o.name} somnar en liten stund. När ${o.name} vaknar är rädslan mindre.`);
      break;
    // ------------------------------------------------ the squirrel
    case 'klattra':
      o.climbing = true;
      o.flying = true;
      o.rooted = true;
      line(c, o.id, `${o.name} klättrar upp i ett träd.`);
      break;
    case 'hoppa':
      moveAnimal(c, o, zone!, true);
      line(c, o.id, `${o.name} hoppar från gren till gren.`);
      break;
    case 'gommaForrad':
      drawCards(c, 1);
      s.stash += 1;
      line(c, o.id, `${o.name} gömmer något till sedan.`);
      break;
    case 'varna':
      s.peekNext = true;
      for (const x of s.animals.filter((a) => isActive(a) && a.zone === o.zone)) x.braced = true;
      line(c, o.id, `${o.name} smattrar en varning. Alla omkring håller i sig.`);
      break;
    case 'kastaKottar':
      if (!s.warded.includes(o.zone)) s.warded.push(o.zone);
      line(c, o.id, `${o.name} kastar kottar på allt som närmar sig.`);
      break;
    case 'pigg':
      s.kraft += 1;
      changeBelief(c, o, 1);
      line(c, o.id, `${o.name} är pigg och ivrig.`);
      break;
    // ------------------------------------------------ the mole
    case 'gravaGang': {
      const with_ = s.animals.filter((a) => a !== o && isActive(a) && a.zone === o.zone && a.size === 'small' && !isFrozen(a) && !a.rooted);
      moveAnimal(c, o, zone!, true);
      for (const x of with_) moveAnimal(c, x, zone!, true);
      for (const x of [o, ...with_]) if (isActive(x)) {
        x.hidden = true;
        x.underground = true;
      }
      line(c, o.id, with_.length ? `${o.name} gräver en gång, och ${with_.map((x) => x.name).join(' och ')} kryper efter.` : `${o.name} gräver sig fram under marken.`);
      break;
    }
    case 'underJord':
      o.hidden = true;
      o.braced = true;
      o.rooted = true;
      o.underground = true;
      line(c, o.id, `${o.name} försvinner ner i jorden.`);
      break;
    case 'kannaSkakningar':
      s.darkRevealed = true;
      revealHidden(c, o, 'känner');
      drawCards(c, 1);
      line(c, o.id, `${o.name} lägger nosen mot marken och känner hur den skakar.`);
      break;
    case 'mjukJord':
      changeBelief(c, tgt!, has(o, 'omtanksam') ? 3 : 2);
      tgt!.intent = { kind: 'follow' };
      line(c, o.id, `${tgt!.name} vilar en stund i ${o.name}s mjuka jord.`);
      break;
    case 'gamlaGangar':
      if (!revealHidden(c, o, 'hittar')) line(c, o.id, `${o.name} letar efter gamla gångar, men här finns inga.`);
      drawCards(c, 1);
      break;
    case 'fastMark':
      for (const x of s.animals.filter((a) => isActive(a) && a.zone === o.zone)) x.braced = true;
      line(c, o.id, `${o.name} packar jorden. Marken håller.`);
      break;
    // ------------------------------------------------ the beaver
    case 'lagaDammen':
      if (s.encounterId === 'river' && !s.closed.includes(DAM)) {
        s.damCreak = Math.max(0, s.damCreak - 2);
        line(c, o.id, `${o.name} lagar dammen. Den knakar mindre nu (${s.damCreak}/${DAM_MAX}).`);
      } else {
        for (const x of s.animals.filter((a) => isActive(a) && a.zone === o.zone)) x.braced = true;
        line(c, o.id, `${o.name} lägger grenar omkring oss. Alla håller i sig.`);
      }
      break;
    case 'svansslag':
      for (const x of s.animals.filter((a) => isActive(a) && a.zone === o.zone && ['freeze', 'flee', 'bolt'].includes(a.intent.kind))) {
        x.intent = { kind: 'follow' };
        line(c, x.id, `${x.name} hör svansslaget och samlar sig.`);
      }
      break;
    case 'fallaTrad': {
      const with_ = s.animals.filter((a) => a !== o && isActive(a) && a.zone === o.zone && !isFrozen(a) && !a.rooted);
      line(c, o.id, `${o.name} fäller ett träd. ${with_.length ? 'Vi går över det tillsammans.' : `${o.name} går över det.`}`);
      moveAnimal(c, o, zone!, true);
      for (const x of with_) {
        moveAnimal(c, x, zone!, true);
        if (isActive(x)) x.protectedBy = o.id;
      }
      break;
    }
    // ------------------------------------------------ the fawn
    case 'pipa':
      for (const x of s.animals.filter((a) => isPresent(a) && a !== o && zoneDistance(s, o.zone, a.zone) <= 1)) changeBelief(c, x, 1);
      line(c, o.id, `${o.name} piper efter sin mor. De andra kommer närmare.`);
      break;
    case 'vittring':
      s.peekNext = true;
      s.darkRevealed = true;
      drawCards(c, 1);
      line(c, o.id, `${o.name} vädrar mot vinden.`);
      break;
    case 'ledaFlocken': {
      const left = o.zone;
      moveAnimal(c, o, zone!, true);
      for (const x of s.animals.filter((a) => isActive(a) && a !== o && a.zone === left)) {
        changeBelief(c, x, 1);
        x.intent = { kind: 'follow' };
      }
      line(c, o.id, `${o.name} springer före, och de andra ser vägen.`);
      break;
    }
    case 'minne':
      // A buried memory is gentler; one we carry hurts more, and holds more.
      if (card.buried) {
        s.animals.filter(isPresent).forEach((x) => changeBelief(c, x, 1));
        narrate(c, `Vi minns ${o.name}, som vilar under granarna.`);
      } else {
        s.animals.filter(isPresent).forEach((x) => changeBelief(c, x, 2));
        changeHope(c, -1, 'memory', o.id);
        narrate(c, `Vi minns ${o.name}. Det gör ont, och det håller oss uppe.`);
      }
      break;
  }
}

// ---------------------------------------------------------------- end of turn

function endTurn(c: Ctx) {
  const s = c.s;
  if (s.phase !== 'play') fail('Inte nu.');
  s.discard.push(...s.hand);
  s.hand = [];

  resolveIntents(c);

  if (verseStatus(s, 'ingenEnsam') === 'intact') {
    const alone = s.animals.find(
      (a) => isActive(a) && zoneDef(s, a.zone).exposed && !s.animals.some((o) => o.id !== a.id && isActive(o) && o.zone === a.zone),
    );
    if (alone) {
      line(c, alone.id, `${alone.name} står ensam på vägen.`);
      flipVerse(c, 'ingenEnsam');
    }
  }

  s.hitQueue = [];
  if (s.encounterId === 'road') {
    for (const st of s.trafficPlan[s.turn - 1] ?? []) {
      c.ev.push({ kind: 'car', lane: st.lane, vehicle: st.vehicle });
      const lane = zoneDef(s, st.lane).name;
      const inLane = s.animals.filter((a) => isActive(a) && a.zone === st.lane);
      if (inLane.length === 0) {
        narrate(c, st.dark ? `Något svart for förbi i ${lane}, utan ljus.` : `En ${st.vehicle} sveper förbi i ${lane}. Ingen av oss var där.`);
      }
      for (const a of inLane) s.hitQueue.push({ victim: a.id, severity: st.severity, sudden: st.dark, zone: st.lane, source: st.vehicle });
    }
  }
  if (s.encounterId === 'farm') farmHazards(c);
  if (s.encounterId === 'river') riverHazards(c);
  if (s.encounterId === 'machines') machinesHazards(c);
  if (s.encounterId === 'raptor') raptorHazards(c);
  if (s.encounterId === 'sprayer') sprayerHazards(c);
  processHits(c);
}

function resolveIntents(c: Ctx) {
  const s = c.s;
  for (const a of s.animals) {
    if (!isActive(a)) continue;
    const i = a.intent;
    switch (i.kind) {
      case 'flee': {
        const z = backZone(s, a);
        if (z) {
          line(c, a.id, `${a.name} vände tillbaka mot ${zoneDef(s, z).name}.`);
          moveAnimal(c, a, z, false);
        }
        break;
      }
      case 'bolt': {
        const z = boltZone(s, a);
        if (z) {
          line(c, a.id, `${a.name} rusade ut i ${zoneDef(s, z).name}.`);
          moveAnimal(c, a, z, false);
        }
        break;
      }
      case 'leave':
        leaveGroup(c, a, 'doubt');
        break;
      case 'raid':
        moveAnimal(c, a, HEN_HOUSE, false);
        changeBelief(c, a, 2);
        raiseAlarm(c, 3);
        narrate(c, `${a.name} tog en höna. Det luktar blod och fjädrar, och hela gården vaknar.`);
        break;
      case 'hunt': {
        const p = s.animals.find((x) => x.id === i.target);
        if (p && isActive(p) && zoneDistance(s, a.zone, p.zone) <= 1) hunt(c, a, p);
        else line(c, a.id, `${a.name} tittar bort.`);
        break;
      }
      default:
        break;
    }
  }
}

function processHits(c: Ctx) {
  const s = c.s;
  while (s.hitQueue.length) {
    const h = s.hitQueue.shift()!;
    let v = animal(s, h.victim);
    if (!isActive(v)) continue;
    // What hunts by sight or scent doesn't find the hidden – and backs off where someone threatens.
    if (HUNTERS.includes(h.source) && (v.hidden || s.warded.includes(v.zone))) {
      line(c, v.id, v.hidden ? `${HIT_BY[h.source] ?? capitalize(h.source)} hittar inte ${v.name}.` : `${HIT_BY[h.source] ?? capitalize(h.source)} backar undan.`);
      continue;
    }
    if (v.scattered && v.count !== undefined) {
      v.scattered = false;
      h.severity = 'injure';
    }
    // Spines: what bites or grabs lets go. What rolls over us does not care.
    if (v.curled && CLAWS.includes(h.source)) {
      line(c, v.id, `${HIT_BY[h.source] ?? capitalize(h.source)} sticker sig på ${v.name} och släpper.`);
      continue;
    }
    // Over the fields the air is the bird's: lifting off is no escape. A tree that falls takes the climber with it.
    if (v.flying && !BIRDS.includes(h.source) && h.source !== 'gift' && !(v.climbing && TREE_FALL.includes(h.source))) {
      line(c, v.id, v.climbing ? `${v.name} sitter kvar uppe i trädet, utom räckhåll.` : `${v.name} lyfter i sista stund.`);
      continue;
    }
    const p = v.protectedBy ? s.animals.find((x) => x.id === v.protectedBy) : undefined;
    if (p && isActive(p) && !p.flying && p.zone === v.zone) {
      line(c, p.id, `${p.name} tar smällen i stället för ${v.name}.`);
      v = p;
      h.victim = p.id;
      // The bird cannot lift the large: it lets go.
      if (BIRDS.includes(h.source) && v.size === 'large') {
        line(c, v.id, `${HIT_BY[h.source]} släpper taget om ${v.name} och stiger igen.`);
        continue;
      }
    }
    if (v.braced) {
      v.braced = false;
      line(c, v.id, `${v.name} biter ihop. Det går, den här gången.`);
      continue;
    }
    // It reached one of us: some promises cannot survive that.
    if (LIGHT.includes(h.source)) breakPromises(c, 'light');
    if (h.source === 'forsen') breakPromises(c, 'current');
    // The mist makes us sick, never dead.
    if (h.source !== 'gift' && isLethal(v, h)) {
      if (h.sudden) {
        narrate(c, `Det fanns ingen varning. ${v.name} hann aldrig förstå.`);
        die(c, v, 'dark', h.source);
        continue;
      }
      s.pending = h;
      s.phase = 'lastMoment';
      narrate(c, (LAST_MOMENT[h.source] ?? 'Ljuset fyller allt. {name} har ett ögonblick kvar.').replace(/\{name\}/g, v.name));
      return;
    }
    applyHit(c, v, h);
  }
  finishTurn(c);
}

/** How the last moment begins, by what is coming. */
const LAST_MOMENT: Record<string, string> = {
  forsen: 'Strömmen drar {name} mot forsen. Ett ögonblick kvar.',
  fällaren: 'Det knakar ovanför {name}. En gran lutar, och faller. Ett ögonblick kvar.',
  schaktaren: 'Schaktaren rullar in, och jorden rör sig under {name}. Ett ögonblick kvar.',
  vråk: 'Vråken slår ner. Klorna har redan {name}. Ett ögonblick kvar.',
  berguv: 'Något stort och tyst faller ur mörkret över {name}. Ett ögonblick kvar.',
};

/** The birds of prey over the fields: in the air there is no escaping them. */
const BIRDS = ['vråk', 'berguv'];
/** What hunts by sight or scent: the hidden are not found, and a threat makes it back off. */
const HUNTERS = ['hund', 'bonde', 'häger', ...BIRDS];
/** What bites, pecks or grabs – the spines stop it. */
const CLAWS = ['hund', 'häger', ...BIRDS];
/** What brings the trees down. */
const TREE_FALL = ['fällaren', 'schaktaren'];

/** Hits from the light: a car's, a truck's, the dark car's, the farmer's flashlight. */
const LIGHT = ['bil', 'lastbil', 'mörk bil', 'bonde'];

const HIT_BY: Record<string, string> = { traktor: 'Traktorn', gift: 'Dimman', vråk: 'Vråken', berguv: 'Berguven', fällaren: 'Trädet', schaktaren: 'Schaktaren', bil: 'Bilen', lastbil: 'Lastbilen', 'mörk bil': 'Den mörka bilen', hund: 'Hunden', forsen: 'Forsen', häger: 'Hägern' };

/** Vehicles crush legs and wings; bites tear. Never the same injury twice. */
function injuryFor(c: Ctx, v: Animal, h: Hit): InjuryKind | null {
  const pool: InjuryKind[] = ['hund', 'bett', 'häger', ...BIRDS].includes(h.source) ? ['bleeding'] : ['halt', 'broken'];
  const fresh = pool.filter((k) => !hasInjury(v, k));
  if (fresh.length) return fresh[Math.floor(random(c.s) * fresh.length)];
  return hasInjury(v, 'bleeding') ? null : 'bleeding';
}

function injure(c: Ctx, v: Animal, k: InjuryKind, text = INJURY_LINES[k]) {
  if (hasInjury(v, k)) return;
  if (has(v, 'seglivad') && !v.toughUsed && c.s.phase !== 'map' && c.s.phase !== 'campfire') {
    v.toughUsed = true;
    line(c, v.id, `${v.name} är seg. Det gör ont, men det biter inte.`);
    return;
  }
  v.injuries.push(k);
  line(c, v.id, text.replace(/\{name\}/g, v.name));
  if (k === 'halt' || k === 'broken') earn(c, v, 'arrad');
}

/** A hit that doesn't kill: a swarm loses members, anyone else takes an injury. */
function applyHit(c: Ctx, v: Animal, h: Hit) {
  c.ev.push({ kind: 'hit', who: v.id });
  if (h.source === 'gift') {
    injure(c, v, 'poisoned');
  } else if (v.count !== undefined) {
    const loss = Math.min(swarmLoss(h), v.count - 1);
    v.count -= loss;
    line(c, v.id, `${HIT_BY[h.source] ?? capitalize(h.source)} tog ${num(loss)} av ${v.name}. ${v.count} är kvar.`);
    if (verseStatus(c.s, 'denStarke') === 'intact') flipVerse(c, 'denStarke');
  } else {
    const k = injuryFor(c, v, h);
    if (k) injure(c, v, k);
    else line(c, v.id, `${v.name} träffas igen och släpar sig vidare.`);
  }
  changeBelief(c, v, -1);
}

function resolveLastMoment(c: Ctx, action: Extract<Action, { type: 'lastMoment' }>) {
  const s = c.s;
  if (s.phase !== 'lastMoment' || !s.pending) fail('Inget ögonblick att välja.');
  const h = s.pending;
  const v = animal(s, h.victim);

  if (action.choice === 'shield') {
    if (!lastMomentShields(s).includes(action.by)) fail('Det djuret hinner inte fram.');
    const by = animal(s, action.by);
    s.pending = undefined;
    s.phase = 'play';
    narrate(c, h.source === 'forsen'
      ? `${by.name} grep tag i ${v.name} och höll emot, mot stenarna, mot strömmen.`
      : `${by.name} kastade sig emellan och knuffade undan ${v.name}.`);
    addBond(c, by, v, 2);
    changeBelief(c, v, 2);
    earn(c, v, 'hardad');
    earn(c, by, 'trogen');
    // The one who throws themselves in the way is hurt, not killed.
    const pushed: Hit = { ...h, victim: by.id, severity: 'injure' };
    if (isLethal(by, pushed)) die(c, by, 'sacrifice', h.source);
    else applyHit(c, by, pushed);
    // Sometimes the one who was saved asks a promise of us, there and then.
    const both = isPresent(v) && isPresent(by) && !promises(s).some((x) => x.promise.rule === 'stay' && x.promise.by === v.id && x.promise.with === by.id);
    if (both && !s.meeting && random(s) < 0.5) {
      s.proposal = { by: v.id, rule: 'stay', with: by.id };
      s.meeting = { id: 'proposal', frame: 'ask', used: [], told: [] };
    }
  } else if (action.choice === 'letGo') {
    s.pending = undefined;
    s.phase = 'play';
    narrate(c, `Vi lät ${v.name} gå.`);
    die(c, v, 'letGo', h.source);
    if (verseStatus(s, 'ingenLamnas') === 'intact') flipVerse(c, 'ingenLamnas');
  } else {
    // Verses are lasting modifiers and story, never a price to pay for a life.
    fail('Det valet finns inte.');
  }
  processHits(c);
}

function hunt(c: Ctx, pred: Animal, prey: Animal) {
  const s = c.s;
  if (prey.curled) {
    changeBelief(c, pred, -1);
    line(c, pred.id, `${pred.name} glömde eden – och stack sig på ${prey.name}. Det blev inget mer.`);
    return;
  }
  narrate(c, `I mörkret glömde ${pred.name} eden.`);
  c.ev.push({ kind: 'hit', who: prey.id });
  // A first bite tears; an attack on one already hurt kills.
  const kills = prey.count === undefined && prey.injuries.length > 0;
  if (prey.count !== undefined) {
    prey.count -= 1;
    line(c, prey.id, `${pred.name} tog en av ${prey.name}. ${prey.count} är kvar.`);
  } else if (!kills) {
    line(c, prey.id, `${pred.name} högg efter ${prey.name}.`);
    injure(c, prey, 'bleeding');
  }
  changeBelief(c, prey, -2);
  addBond(c, pred, prey, -3);
  s.animals.filter((x) => isPresent(x) && x !== pred && x !== prey).forEach((x) => changeBelief(c, x, -1));
  changeBelief(c, pred, 1);
  changeHope(c, -1, 'hunt', pred.id);
  if (verseStatus(s, 'viJagarInte') === 'intact') flipVerse(c, 'viJagarInte');
  if ((prey.count !== undefined && prey.count <= 0) || kills) die(c, prey, 'hunt');
}

// ---------------------------------------------------------------- loss

function removeCards(s: GameState, owner: string) {
  const keep = (x: Card) => x.owner !== owner;
  s.draw = s.draw.filter(keep);
  s.hand = s.hand.filter(keep);
  s.discard = s.discard.filter(keep);
}

function grieve(c: Ctx, lost: Animal) {
  for (const o of c.s.animals.filter(isPresent)) {
    if (has(o, 'modig') || has(o, 'hardad')) {
      changeBelief(c, o, 1);
      log(c, { kind: 'grief', who: o.id, text: `${o.name} hårdnar. Något i blicken blir till sten.` });
      continue;
    }
    const close = bond(c.s, o.id, lost.id) >= 2;
    changeBelief(c, o, close ? -2 : -1);
    if (close) {
      log(c, { kind: 'grief', who: o.id, text: `${o.name} slutar inte titta bakåt.` });
      earn(c, o, 'sorjande');
    }
  }
}

function die(c: Ctx, a: Animal, cause: keyof typeof DEATH_CAUSE, source?: string) {
  const s = c.s;
  a.status = 'dead';
  a.diedOf = source ?? cause;
  breakForLoss(c, a);
  if (a.count !== undefined) a.count = 0;
  c.ev.push({ kind: 'death', who: a.id });
  removeCards(s, a.id);
  s.discard.push({ uid: s.nextUid++, kind: 'minne', owner: a.id, memoryOf: a.id });
  s.unmourned.push(a.id);
  s.verses.push({ id: `minne-${a.id}`, kind: 'memorial', text: `För ${a.name}, ${DEATH_CAUSE[cause]}.`, flipped: false });
  changeHope(c, -1, 'death', a.id);
  grieve(c, a);
  // Those who saw it happen up close carry it in the body.
  for (const w of s.animals.filter((x) => isActive(x) && x.zone === a.zone && !hasInjury(x, 'shock'))) injure(c, w, 'shock');
  if (a.elder && verseStatus(s, 'denAldste') === 'intact') flipVerse(c, 'denAldste');
  if (a.count !== undefined && cause !== 'hunt' && verseStatus(s, 'denStarke') === 'intact') flipVerse(c, 'denStarke');
}

function leaveGroup(c: Ctx, a: Animal, cause: 'dawn' | 'doubt') {
  const s = c.s;
  a.status = 'left';
  breakForLoss(c, a);
  removeCards(s, a.id);
  const why = cause === 'dawn' ? byTime(s, encounterOf(s).leftBehind) : LEAVE_CAUSE[cause];
  s.verses.push({ id: `minne-${a.id}`, kind: 'memorial', text: `För ${a.name}, ${why}.`, flipped: false });
  narrate(c, cause === 'dawn' ? `${a.name} hann inte över. Vi kunde inte vänta.` : `${a.name} vände om, ut i mörkret. Vi såg ${a.name} aldrig igen.`);
  changeHope(c, -1, cause === 'dawn' ? 'dawn' : 'leave', a.id);
  grieve(c, a);
  if (a.elder && verseStatus(s, 'denAldste') === 'intact') flipVerse(c, 'denAldste');
  if (cause === 'dawn' && verseStatus(s, 'ingenLamnas') === 'intact') flipVerse(c, 'ingenLamnas');
}

function finishTurn(c: Ctx) {
  const s = c.s;
  for (const a of s.animals) if (isActive(a) && zoneDef(s, a.zone).slow) a.slowTime++;
  if (s.encounterId === 'farm') leaveScent(s);
  if (!s.animals.some(isActive)) return endEncounter(c);
  if (s.turn >= s.maxTurn) {
    narrate(c, byTime(s, encounterOf(s).timeUp));
    for (const a of s.animals.filter(isActive)) leaveGroup(c, a, 'dawn');
    return endEncounter(c);
  }
  s.turn++;
  startTurn(c);
}

/** The night ends the moment the last of us reaches the far side. */
function endIfAllAcross(c: Ctx) {
  if (c.s.phase === 'play' && !c.s.animals.some(isActive)) endEncounter(c);
}

/** Survivors go on to the map; if no one made it, the oath falls and the run ends. */
function endEncounter(c: Ctx) {
  const s = c.s;
  if (s.rescue) {
    // Not one of us yet – no verse breaks for it. But we heard it, and we went on.
    const r = encounterOf(s).rescue!;
    narrate(c, `Vi lämnade ${s.rescue.name} ${r.trapped}.`);
    s.met.push(s.rescue.species);
    s.rescue = null;
    changeHope(c, -1, 'trapped');
  }
  const safe = s.animals.filter((a) => a.status === 'safe');
  for (const a of safe) gainXp(c, a);
  const crossed = encounterOf(s).crossed;
  if (safe.length === 0) {
    narrate(c, 'Ingen av oss nådde andra sidan. Eden föll.');
    return endRun(c);
  }
  const before = s.animals.filter((a) => a.status === 'safe' || a.status === 'dead' || a.status === 'left').length;
  if (safe.length === before) narrate(c, `Alla ${num(safe.length)} ${crossed}.`);
  else narrate(c, `${capitalize(num(safe.length))} av oss ${crossed}.`);
  s.clock = otherTime(s.time);
  s.phase = 'map';
  // The last danger of the region: beyond it, the region ends.
  if (!pathsFrom(s, s.journey.at).length) endRegion(c);
}

const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
