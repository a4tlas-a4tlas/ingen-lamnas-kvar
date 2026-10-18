import { DEATH_CAUSE, INJURY_LINES, LEAVE_CAUSE, intentLine } from '../data/text.sv';
import { place, pathsFrom } from '../data/journey';
import { TRAITS } from '../data/traits';
import { VERSES } from '../data/verses';
import { closestTo, crowCards, crowOffers, hungryWatcher, inheritedTrait, living, planProblem, sitsAlone, unseenAhead } from './campfire';
import { trickChance } from '../data/meetings/crow.sv';
import { labelOf, meetingOptions, speakerOf } from '../data/meetings';
import { brokenByTravel, keptPromises, promiseFloor, promiseText, proposalAtFire, promises } from './promises';
import { CARDS } from '../data/cards';
import { planRoad } from './encounters/road';
import { forkVoices, voiceStake } from './voices';
import { CURRENT, DAM, DAM_MAX, FLOOD_DAM_CREAK, FLOOD_HOURS, FLOOD_HOURS_TOTAL, STONES, aboveTheWater, carriedAway, holdsOnTo, planRiver, swims } from './encounters/river';
import { planMachines, roarZones } from './encounters/machines';
import { AWAKE_ALARM, HEN_HOUSE, SCENT_MAX, alarmMax, dogDestination, dogTargets, newDogs } from './encounters/farm';
import { random, shuffle } from './rng';
import { OATH_VERSES, makeAnimal, oathVerse } from './setup';
import { newcomer } from '../data/animals';
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
  GameEvent,
  GameState,
  Hit,
  HopeReason,
  InjuryKind,
  Intent,
  LogEntry,
  VerseId,
  ZoneId,
  TraitId,
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
      case 'swear': swear(c, action.verses); break;
      case 'play': playCard(c, action.uid, action.target, action.zone); endIfAllAcross(c); break;
      case 'lead': lead(c, action.target, action.zone); endIfAllAcross(c); break;
      case 'lure': lure(c, action.target, action.zone); endIfAllAcross(c); break;
      case 'rescue': rescue(c, action.by); break;
      case 'respond': respond(c, action.option, action.uid); break;
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
  c.s.bonds[k] = Math.max(-3, Math.min(3, (c.s.bonds[k] ?? 0) + d));
}

// ---------------------------------------------------------------- oath

function swear(c: Ctx, verses: VerseId[]) {
  const s = c.s;
  if (s.phase !== 'oath') fail('Eden är redan svuren.');
  const unique = [...new Set(verses)];
  if (unique.length !== OATH_VERSES || unique.some((v) => !VERSES[v])) fail('Välj ett löfte.');
  s.verses = unique.map(oathVerse);
  narrate(c, 'I dalens sista natt svor vi eden:');
  for (const v of s.verses) narrate(c, `”${v.text}”`);
  narrate(c, 'Bakom oss tystnade maskinerna för natten. Kvarn mindes vägen, nästan.');
  const swarm = s.animals.find((a) => a.count !== undefined);
  narrate(c, `Vi var ${num(s.animals.length)}${swarm ? `, och ${swarm.name} var ${num(swarm.count!)}` : ''}.`);
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
    if (s.journey.scouted.includes(to)) narrate(c, `Det var som Skymning hade sett: ${seen}.`);
    else if (s.journey.guess[to] === truth) narrate(c, `Det var som Kvarn mindes: ${seen}.`);
    else narrate(c, `Kvarn mindes fel: ${seen}.`);
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
  else if (p.kind === 'end') endRun(c);
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
  // Someone is trapped here, the first time we come.
  s.rescue = def.rescue && !s.met.includes(def.rescue.who) ? { who: def.rescue.who, zone: def.rescue.zone, trust: 0 } : null;
  if (s.rescue) narrate(c, def.rescue!.found);
  const start = def.zones.find((z) => z.start)!.id;
  for (const a of s.animals.filter(isPresent)) {
    a.status = 'active';
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
        s.discard.push({ uid: s.nextUid++, kind: TRAITS[t].card, owner: teller.id, inheritedFrom: deadId });
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

  // 3. By the embers.
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
    const heal: InjuryKind[] = a.injuries.filter((k) => k === 'bleeding' || k === 'shock');
    if (!heal.length) continue;
    if (a === w || a === scout || s.fireDebt.apart.includes(a.id)) {
      line(c, a.id, `${a.name} ${a === w ? 'vakade' : a === scout ? 'flög före' : 'berättade hela natten'} och fick ingen vila. Såren får vänta.`);
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
    narrate(c, `${opening} ${p.name}: ${p.memory![truth]}${wrong ? ' – Kvarn mindes fel.' : ', som Kvarn mindes.'}`);
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
  const among = (id: string) => present.find((a) => a.id === id);
  const frona = among('frona');
  const ljung = among('ljung');
  const sotfot = among('sotfot');
  const told = () => { m.told = revealAhead(c, 'Kråkan berättade:', 'Kråkan hade inget att berätta.'); };
  switch (option.effect) {
    case 'listen':
      changeHope(c, 1, 'laugh');
      for (const a of s.animals.filter(isPresent)) changeBelief(c, a, 1);
      break;
    case 'owlHunt':
      changeBelief(c, animal(s, 'skymning'), 2);
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
      takeCard(s, card.uid);
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
      const kvarn = animal(s, 'kvarn');
      const wrong = unseenAhead(s).some((id) => s.journey.guess[id] !== s.journey.truth[id]);
      changeBelief(c, kvarn, wrong ? -1 : 1);
      break;
    }
    case 'trick': {
      const fox = animal(s, 'sotfot');
      if (random(s) < trickChance(s)) {
        changeBelief(c, fox, 1);
        narrate(c, 'Kråkan lyssnade på Sotfots hemlighet – och berättade, utan att få något.');
        told();
      } else {
        const own = crowCards(s).filter((x) => x.owner === fox.id);
        if (own.length) {
          const card = own[Math.floor(random(s) * own.length)];
          takeCard(s, card.uid);
          narrate(c, `Kråkan genomskådade Sotfot och tog ${CARDS[card.kind].name}.`);
        }
        next = 'snatched';
      }
      break;
    }
    case 'sotfotDark':
      s.fireDebt.embers++;
      s.fireDebt.dark.push('sotfot');
      told();
      break;
    case 'owlScare':
      changeBelief(c, animal(s, 'skymning'), 1);
      break;
    case 'story':
      s.fireDebt.apart.push('ljung');
      told();
      break;
    // ------------------------------------------------ Dalen's finds and meetings
    case 'berries':
    case 'berriesCareful':
      changeHope(c, 1, 'food');
      for (const a of present) changeBelief(c, a, 1);
      if (option.effect === 'berries') { if (frona) injure(c, frona, 'shock', '{name} har ätit sig sjuka. Magarna värker.'); }
      else if (frona) addBond(c, animal(s, 'ljung'), frona, 1);
      break;
    case 'learnPath':
    case 'ljungDigs':
      m.card = learnCard(c, speaker!);
      break;
    case 'restDen':
      for (const a of present) heal(c, a, `${a.name} sov djupt i grytet.`);
      if (ljung && !ljung.grief.includes('dalen')) {
        ljung.grief.push('dalen');
        line(c, ljung.id, 'Gamla Ljung sörjer dalen. Grytet luktade som hemma.');
      }
      break;
    case 'stayDeer':
      for (const [i, a] of present.entries()) for (const b of present.slice(i + 1)) addBond(c, a, b, 1);
      changeHope(c, -1, 'cold');
      break;
    case 'ljungDeer':
      changeBelief(c, ljung!, 2);
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
      if (frona) injure(c, frona, 'shock', 'Människorna skrek. {name} darrar fortfarande.');
      break;
    case 'shareCard': {
      const card = crowCards(s).find((x) => x.uid === uid);
      if (!card) fail('Välj vilket kort räven får.');
      takeCard(s, card.uid);
      narrate(c, `Vi gav räven ${CARDS[card.kind].name} från ${animal(s, card.owner).name}.`);
      if (speaker?.id === 'sotfot') changeBelief(c, speaker, 1);
      m.told = revealAhead(c, 'Räven berättade:', 'Räven hade inget nytt att berätta.');
      break;
    }
    case 'chaseFox':
      if (sotfot) changeBelief(c, sotfot, -1);
      break;
    case 'readTracks':
    case 'followTracks':
      if (!s.knowledge.includes('machines')) s.knowledge.push('machines');
      narrate(c, 'Nu vet vi hur maskinerna rör sig.');
      if (option.effect === 'readTracks') changeBelief(c, speaker!, 1);
      else if (frona) injure(c, frona, 'shock', 'Dieseldoften. {name} känner igen den från dalen.');
      break;
    case 'comfortKvarn':
      changeBelief(c, animal(s, 'kvarn'), 1);
      break;
    case 'doubtKvarn':
      changeBelief(c, animal(s, 'kvarn'), -2);
      m.told = revealAhead(c, 'Skymning såg:', 'Skymning såg inget nytt.');
      break;
    case 'guessWay':
      changeHope(c, -1, 'lost');
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
  if (m.id === 'proposal') s.proposal = null;
  else if (s.proposal) s.meeting = { id: 'proposal', frame: 'ask', used: [], told: [] };
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
  const owned = new Set([...s.draw, ...s.hand, ...s.discard].filter((x) => x.owner === a.id).map((x) => x.kind));
  const options = (Object.keys(TRAITS) as TraitId[]).filter((t) => !a.traits.includes(t) && !owned.has(TRAITS[t].card));
  if (!options.length) return undefined;
  const t = options[Math.floor(random(s) * options.length)];
  s.discard.push({ uid: s.nextUid++, kind: TRAITS[t].card, owner: a.id });
  const name = CARDS[TRAITS[t].card].name;
  line(c, a.id, `${a.name} lärde sig något nytt: ${name}.`);
  return name;
}

/** Bleeding and shock heal. */
function heal(c: Ctx, a: Animal, text: string) {
  const healed: InjuryKind[] = a.injuries.filter((k) => k === 'bleeding' || k === 'shock');
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
  }
  s.peekNext = false;
  s.darkRevealed = false;

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
  if (s.turn === s.maxTurn) narrate(c, byTime(s, encounterOf(s).lastHour));
  // Bleeding wounds drain belief, hour after hour, until someone tends them by a fire.
  if (s.turn > 1) {
    for (const a of s.animals.filter((x) => isActive(x) && hasInjury(x, 'bleeding'))) {
      changeBelief(c, a, -1);
      line(c, a.id, `${a.name} blöder fortfarande. Det gör ont att tro.`);
    }
  }

  rollIntents(c);
  drawCards(c, handSize(s));
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

const DOUBT_BY_BELIEF = [1, 0.85, 0.85, 0.6, 0.4, 0.25, 0.1, 0, 0, 0, 0];

function chooseIntent(c: Ctx, a: Animal): Intent {
  const s = c.s;
  const elderVerse = verseStatus(s, 'denAldste') === 'intact';
  if (a.elder && elderVerse) return { kind: 'follow' };
  if (a.belief <= 0) return { kind: 'leave' };

  // By the farm, a hungry predator goes for the hens: the lesser evil.
  if (a.predator && s.encounterId === 'farm' && a.belief <= huntsAt(s, a) + 2 && zoneDistance(s, a.zone, HEN_HOUSE) <= 1) {
    return { kind: 'raid' };
  }
  if (a.predator && a.belief <= huntsAt(s, a)) {
    const prey = s.animals
      .filter((p) => isActive(p) && canPrey(a, p) && zoneDistance(s, a.zone, p.zone) <= 1)
      .sort((x, y) => bond(s, a.id, x.id) - bond(s, a.id, y.id));
    if (prey.length) return { kind: 'hunt', target: prey[0].id };
  }

  let chance = DOUBT_BY_BELIEF[a.belief] ?? 0;
  if (a.traits.includes('modig')) chance -= 0.15;
  if (hasInjury(a, 'shock')) chance += 0.3;
  chance += 0.15 * a.grief.length;
  if (random(s) >= chance) return { kind: 'follow' };

  const elderNear = elderVerse && s.animals.some((e) => e.elder && isActive(e) && e.zone === a.zone);
  const weights: [Intent, number][] = [
    [{ kind: 'freeze' }, elderNear ? 0 : 1 + (a.traits.includes('skygg') ? 2 : 0) + (hasInjury(a, 'shock') ? 2 : 0)],
    [{ kind: 'flee' }, backZone(s, a) ? 1 : 0],
    [{ kind: 'bolt' }, 1 + (a.traits.includes('otalig') ? 2 : 0) + (isFast(a) ? 2 : 0)],
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
}

// ---------------------------------------------------------------- movement

function moveAnimal(c: Ctx, a: Animal, to: ZoneId, byPlayer: boolean) {
  const s = c.s;
  if (a.zone === to) return;
  a.zone = to;
  const zone = zoneDef(s, to);
  if (zone.slow) a.slowTime = 0;
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
  const occupied = new Set(s.animals.filter((a) => isActive(a) && !a.flying).map((a) => a.zone));
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
    const under = s.animals.filter((a) => isActive(a) && a.zone === fell && !a.flying);
    if (!under.length) narrate(c, `Träden i ${zoneDef(s, fell).name} faller med ett brak. Ingen av oss var där.`);
    for (const a of under) s.hitQueue.push({ victim: a.id, severity: 'kill', sudden: false, zone: fell, source: 'fällaren' });
    for (const a of s.animals.filter((x) => isActive(x) && roarZones(s).includes(x.zone) && !x.flying)) {
      if (hasInjury(a, 'shock')) continue;
      injure(c, a, 'shock', 'Bruset från fällaren går rakt in i {name}. Något stannar kvar där.');
    }
  }
  if (doze) {
    s.closed.push(doze);
    narrate(c, `Schaktaren tar ${zoneDef(s, doze).name}. Där finns bara lera nu.`);
    for (const a of s.animals.filter((x) => isActive(x) && x.zone === doze && !x.flying)) {
      s.hitQueue.push({ victim: a.id, severity: 'kill', sudden: false, zone: doze, source: 'schaktaren' });
    }
  }
}

// ---------------------------------------------------------------- the rescue

/** Reach out to the trapped one, or – once it trusts us – free it. Freed, it is one of us. */
function rescue(c: Ctx, by: string) {
  const s = c.s;
  if (s.phase !== 'play' || !s.rescue) fail('Ingen att rädda här.');
  const a = animal(s, by);
  const blocked = rescueBlockReason(s, a);
  if (blocked) fail(blocked);
  const r = s.rescue;
  const def = newcomer(r.who);
  s.kraft -= 1;
  if (r.trust < RESCUE_TRUST) {
    r.trust++;
    line(c, a.id, r.trust < RESCUE_TRUST
      ? `${a.name} kryper närmare och talar lågt. ${def.name} slutar sparka.`
      : `${def.name} låter ${a.name} komma ända fram.`);
    return;
  }
  const made = makeAnimal(def, s, () => s.nextUid++, r.zone);
  const hare = made.animal;
  s.animals.push(hare);
  s.discard.push(...made.cards);
  addBond(c, hare, a, 1);
  s.met.push(r.who);
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
  applyCard(c, card, animal(s, card.owner), tgt, zone);
}

function applyCard(c: Ctx, card: Card, o: Animal, tgt: Animal | undefined, zone: ZoneId | undefined) {
  const s = c.s;
  switch (card.kind) {
    case 'snabbaTassar':
    case 'smaSteg':
    case 'sprang':
      moveAnimal(c, o, zone!, true);
      break;
    case 'rusa':
      moveAnimal(c, o, zone!, true);
      changeBelief(c, o, -1);
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
        const hidden = encounterOf(s).zones.filter((z) => z.hidden && !s.revealed.includes(z.id));
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
    case 'hallaSigNara':
      moveAnimal(c, o, tgt!.zone, true);
      addBond(c, o, tgt!, 1);
      line(c, o.id, `${o.name} håller sig nära ${tgt!.name}.`);
      break;
    case 'trosta':
      changeBelief(c, tgt!, 2);
      tgt!.intent = { kind: 'follow' };
      line(c, o.id, `${o.name} tröstar ${tgt!.name}.`);
      break;
    case 'lasaNatten':
      s.peekNext = true;
      drawCards(c, 1);
      line(c, o.id, `${o.name} lyssnar till natten.`);
      break;
    case 'bitaIhop':
      o.braced = true;
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
    if (v.flying) {
      line(c, v.id, `${v.name} lyfter i sista stund.`);
      continue;
    }
    const p = v.protectedBy ? s.animals.find((x) => x.id === v.protectedBy) : undefined;
    if (p && isActive(p) && !p.flying && p.zone === v.zone) {
      line(c, p.id, `${p.name} tar smällen i stället för ${v.name}.`);
      v = p;
      h.victim = p.id;
    }
    if (v.braced) {
      v.braced = false;
      line(c, v.id, `${v.name} biter ihop. Det går, den här gången.`);
      continue;
    }
    // It reached one of us: some promises cannot survive that.
    if (LIGHT.includes(h.source)) breakPromises(c, 'light');
    if (h.source === 'forsen') breakPromises(c, 'current');
    if (isLethal(v, h)) {
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
};

/** Hits from the light: a car's, a truck's, the dark car's, the farmer's flashlight. */
const LIGHT = ['bil', 'lastbil', 'mörk bil', 'bonde'];

const HIT_BY: Record<string, string> = { fällaren: 'Trädet', schaktaren: 'Schaktaren', bil: 'Bilen', lastbil: 'Lastbilen', 'mörk bil': 'Den mörka bilen', hund: 'Hunden', forsen: 'Forsen', häger: 'Hägern' };

/** Vehicles crush legs and wings; bites tear. Never the same injury twice. */
function injuryFor(c: Ctx, v: Animal, h: Hit): InjuryKind | null {
  const pool: InjuryKind[] = h.source === 'hund' || h.source === 'bett' || h.source === 'häger' ? ['bleeding'] : ['halt', 'broken'];
  const fresh = pool.filter((k) => !hasInjury(v, k));
  if (fresh.length) return fresh[Math.floor(random(c.s) * fresh.length)];
  return hasInjury(v, 'bleeding') ? null : 'bleeding';
}

function injure(c: Ctx, v: Animal, k: InjuryKind, text = INJURY_LINES[k]) {
  if (hasInjury(v, k)) return;
  v.injuries.push(k);
  line(c, v.id, text.replace(/\{name\}/g, v.name));
}

/** A hit that doesn't kill: a swarm loses members, anyone else takes an injury. */
function applyHit(c: Ctx, v: Animal, h: Hit) {
  c.ev.push({ kind: 'hit', who: v.id });
  if (v.count !== undefined) {
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
    if (o.traits.includes('envis') || o.traits.includes('modig')) {
      changeBelief(c, o, 1);
      log(c, { kind: 'grief', who: o.id, text: `${o.name} hårdnar. Något i blicken blir till sten.` });
      continue;
    }
    const close = bond(c.s, o.id, lost.id) >= 2;
    changeBelief(c, o, close ? -2 : -1);
    if (close) log(c, { kind: 'grief', who: o.id, text: `${o.name} slutar inte titta bakåt.` });
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
    narrate(c, `Vi lämnade ${newcomer(s.rescue.who).name} ${r.trapped}.`);
    s.met.push(s.rescue.who);
    s.rescue = null;
    changeHope(c, -1, 'trapped');
  }
  const safe = s.animals.filter((a) => a.status === 'safe');
  const crossed = encounterOf(s).crossed;
  if (safe.length === 0) {
    narrate(c, 'Ingen av oss nådde andra sidan. Eden föll.');
    return endRun(c);
  }
  const before = s.animals.filter((a) => a.status === 'safe' || a.status === 'dead' || a.status === 'left').length;
  if (safe.length === before) narrate(c, `Alla ${num(safe.length)} ${crossed}.`);
  else narrate(c, `${capitalize(num(safe.length))} av oss ${crossed}.`);
  // The last danger of the way: beyond it, the run ends here, for now.
  const epilogue = encounterOf(s).epilogue;
  if (epilogue && !pathsFrom(s, s.journey.at).length) {
    narrate(c, epilogue);
    return endRun(c);
  }
  s.clock = otherTime(s.time);
  s.phase = 'map';
}

const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
