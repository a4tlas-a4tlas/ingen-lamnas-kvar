import { DEATH_CAUSE, INJURY_LINES, LEAVE_CAUSE, intentLine } from '../data/text.sv';
import { VERSES } from '../data/verses';
import { random, shuffle } from './rng';
import { OATH_VERSES, oathVerse } from './setup';
import { encounterOf, zoneDef } from './encounters';
import {
  animal,
  backZone,
  beliefFloor,
  boltZone,
  bond,
  bondKey,
  canFly,
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
    switch (action.type) {
      case 'swear': swear(c, action.verses); break;
      case 'play': playCard(c, action.uid, action.target, action.zone); endIfAllAcross(c); break;
      case 'lead': lead(c, action.target, action.zone); endIfAllAcross(c); break;
      case 'endTurn': endTurn(c); break;
      case 'lastMoment': resolveLastMoment(c, action); break;
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
  a.belief = Math.max(beliefFloor(c.s), Math.min(10, a.belief + d));
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
  shuffle(s, s.draw);
  narrate(c, 'I dalens sista natt svor vi eden:');
  for (const v of s.verses) narrate(c, `”${v.text}”`);
  narrate(c, 'Bakom oss tystnade maskinerna för natten. Framför oss låg vägen.');
  const swarm = s.animals.find((a) => a.count !== undefined);
  narrate(c, `Vi var ${num(s.animals.length)}${swarm ? `, och ${swarm.name} var ${num(swarm.count!)}` : ''}.`);
  s.phase = 'play';
  s.turn = 1;
  startTurn(c);
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
  s.kraft = 3 + (hidden && moon === 'intact' ? 1 : 0) - (!hidden && moon === 'flipped' ? 1 : 0);

  log(c, { kind: 'turn', text: `Timme ${s.turn} av ${s.maxTurn}` });
  if (encounterOf(s).night) narrate(c, hidden ? 'Månen gömmer sig bakom molnen.' : 'Månen lyser över asfalten.');
  if (s.encounterId === 'road') {
    const strikes = s.trafficPlan[s.turn - 1] ?? [];
    if (strikes.length === 0) narrate(c, 'Vägen är tyst. För tyst, kanske.');
    for (const st of strikes.filter((x) => !x.dark)) {
      narrate(c, `Ljus i fjärran – en ${st.vehicle} i ${zoneDef(s, st.lane).name}. ${st.severity === 'kill' ? 'Den dödar.' : 'Den skadar.'}`);
    }
    if (strikes.some((x) => x.dark)) narrate(c, 'Något mullrar i mörkret. Inga ljus.');
    if (s.turn === s.maxTurn) narrate(c, 'Himlen ljusnar i öster. Det här är nattens sista timme.');
  }
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

  if (a.predator && a.belief <= huntsAt(s, a)) {
    const prey = s.animals
      .filter((p) => isActive(p) && canPrey(a, p) && zoneDistance(s, a.zone, p.zone) <= 1)
      .sort((x, y) => bond(s, a.id, x.id) - bond(s, a.id, y.id));
    if (prey.length) return { kind: 'hunt', target: prey[0].id };
  }

  let chance = DOUBT_BY_BELIEF[a.belief] ?? 0;
  if (a.traits.includes('modig')) chance -= 0.15;
  if (hasInjury(a, 'shock')) chance += 0.3;
  if (random(s) >= chance) return { kind: 'follow' };

  const elderNear = elderVerse && s.animals.some((e) => e.elder && isActive(e) && e.zone === a.zone);
  const weights: [Intent, number][] = [
    [{ kind: 'freeze' }, elderNear ? 0 : 1 + (a.traits.includes('skygg') ? 2 : 0) + (hasInjury(a, 'shock') ? 2 : 0)],
    [{ kind: 'flee' }, backZone(s, a) ? 1 : 0],
    [{ kind: 'bolt' }, 1 + (a.traits.includes('otalig') ? 2 : 0)],
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
      s.animals.filter(isPresent).forEach((x) => changeBelief(c, x, 2));
      changeHope(c, -1, 'memory', o.id);
      narrate(c, `Vi minns ${o.name}. Det gör ont, och det håller oss uppe.`);
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
    if (isLethal(v, h)) {
      if (h.sudden) {
        narrate(c, `Det fanns ingen varning. ${v.name} hann aldrig förstå.`);
        die(c, v, 'dark');
        continue;
      }
      s.pending = h;
      s.phase = 'lastMoment';
      narrate(c, `Ljuset fyller allt. ${v.name} har ett ögonblick kvar.`);
      return;
    }
    applyHit(c, v, h);
  }
  finishTurn(c);
}

const HIT_BY: Record<string, string> = { bil: 'Bilen', lastbil: 'Lastbilen', 'mörk bil': 'Den mörka bilen', hund: 'Hunden' };

/** Vehicles crush legs and wings; bites tear. Never the same injury twice. */
function injuryFor(c: Ctx, v: Animal, h: Hit): InjuryKind | null {
  const pool: InjuryKind[] = h.source === 'hund' || h.source === 'bett' ? ['bleeding'] : ['halt', 'broken'];
  const fresh = pool.filter((k) => !hasInjury(v, k));
  if (fresh.length) return fresh[Math.floor(random(c.s) * fresh.length)];
  return hasInjury(v, 'bleeding') ? null : 'bleeding';
}

function injure(c: Ctx, v: Animal, k: InjuryKind) {
  if (hasInjury(v, k)) return;
  v.injuries.push(k);
  line(c, v.id, INJURY_LINES[k].replace(/\{name\}/g, v.name));
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
    narrate(c, `${by.name} kastade sig emellan och knuffade undan ${v.name}.`);
    addBond(c, by, v, 2);
    changeBelief(c, v, 2);
    // The one who throws themselves in the way is hurt, not killed.
    const pushed: Hit = { ...h, victim: by.id, severity: 'injure' };
    if (isLethal(by, pushed)) die(c, by, 'sacrifice');
    else applyHit(c, by, pushed);
  } else if (action.choice === 'verse') {
    const verse = s.verses.find((x) => x.id === action.verse && x.kind === 'oath' && !x.flipped);
    if (!verse) fail('Den versen finns inte att bryta.');
    s.pending = undefined;
    s.phase = 'play';
    narrate(c, `Vi bröt ett löfte för att ${v.name} skulle få leva.`);
    flipVerse(c, verse.base!);
    // Saved, but not unharmed.
    applyHit(c, v, { ...h, severity: 'injure' });
  } else {
    s.pending = undefined;
    s.phase = 'play';
    narrate(c, `Vi lät ${v.name} gå.`);
    die(c, v, 'letGo');
    if (verseStatus(s, 'ingenLamnas') === 'intact') flipVerse(c, 'ingenLamnas');
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

function die(c: Ctx, a: Animal, cause: keyof typeof DEATH_CAUSE) {
  const s = c.s;
  a.status = 'dead';
  if (a.count !== undefined) a.count = 0;
  c.ev.push({ kind: 'death', who: a.id });
  removeCards(s, a.id);
  s.discard.push({ uid: s.nextUid++, kind: 'minne', owner: a.id, memoryOf: a.id });
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
  removeCards(s, a.id);
  s.verses.push({ id: `minne-${a.id}`, kind: 'memorial', text: `För ${a.name}, ${LEAVE_CAUSE[cause]}.`, flipped: false });
  narrate(c, cause === 'dawn' ? `${a.name} hann inte över. Vi kunde inte vänta.` : `${a.name} vände om, ut i mörkret. Vi såg ${a.name} aldrig igen.`);
  changeHope(c, -1, cause === 'dawn' ? 'dawn' : 'leave', a.id);
  grieve(c, a);
  if (a.elder && verseStatus(s, 'denAldste') === 'intact') flipVerse(c, 'denAldste');
  if (cause === 'dawn' && verseStatus(s, 'ingenLamnas') === 'intact') flipVerse(c, 'ingenLamnas');
}

function finishTurn(c: Ctx) {
  const s = c.s;
  for (const a of s.animals) if (isActive(a) && zoneDef(s, a.zone).slow) a.slowTime++;
  if (!s.animals.some(isActive)) return endEncounter(c);
  if (s.turn >= s.maxTurn) {
    narrate(c, 'Gryningen kom, grå och obeveklig. Vi kunde inte vänta längre.');
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

function endEncounter(c: Ctx) {
  const s = c.s;
  const ids = (st: Animal['status']) => s.animals.filter((a) => a.status === st).map((a) => a.id);
  s.phase = 'over';
  s.outcome = { safe: ids('safe'), dead: ids('dead'), left: ids('left'), fallen: ids('safe').length === 0 };
  if (s.outcome.fallen) narrate(c, 'Ingen av oss nådde andra sidan. Eden föll i diket.');
  else if (s.outcome.safe.length === s.animals.length) narrate(c, `Vi var ${num(s.animals.length)}. Alla ${num(s.animals.length)} kom över vägen.`);
  else narrate(c, `Vi var ${num(s.animals.length)}. ${capitalize(num(s.outcome.safe.length))} av oss kom över vägen.`);
}

const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
