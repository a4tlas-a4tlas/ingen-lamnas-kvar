// Every state an animal can be in, in words for the player, plus a forecast
// of what letting the hour pass will do. Shared by tokens, the info panel and
// the forecast box so they always say the same thing.
import { encounterOf, zoneDef } from '../engine/encounters';
import { newcomer } from '../data/animals';
import { HEN_HOUSE, alarmMax, dogDestination } from '../engine/encounters/farm';
import { CURRENT, DAM_MAX, aboveTheWater, holdsOnTo, swims } from '../engine/encounters/river';
import { RESCUE_TRUST, animal, backZone, boltZone, huntsAt, isActive, isLethal, swarmLoss, zoneDistance } from '../engine/rules';
import type { InjuryKind } from '../engine/types';
import type { Animal, GameState, ZoneId } from '../engine/types';

export type Tone = 'bad' | 'warn' | 'good' | 'info';

export interface Status {
  key: string;
  /** Text-presentation symbols (︎ keeps emoji fonts away). */
  icon: string;
  label: string;
  explain: string;
  tone: Tone;
  /** Own-will intents are the most important and get a full label on the board. */
  intent?: boolean;
}

export function animalStatuses(s: GameState, a: Animal): Status[] {
  const out: Status[] = [];
  if (a.status === 'safe') {
    out.push({ key: 'safe', icon: '✓', label: 'över', explain: `${a.name} är i säkerhet på andra sidan.`, tone: 'good' });
    return [...out, ...lasting(s, a)];
  }
  if (a.status !== 'active') return out;

  const i = a.intent;
  switch (i.kind) {
    case 'freeze':
      out.push({ key: 'freeze', icon: '❄︎', label: 'fryser', intent: true, tone: 'bad',
        explain: `${a.name} fryser: kan inte flyttas eller bära, och kan inte använda sina rörelsekort den här timmen. Trösta för att bryta det.` });
      break;
    case 'flee':
      out.push({ key: 'flee', icon: '↩︎', label: 'vill tillbaka', intent: true, tone: 'warn',
        explain: `${a.name} backar ett steg mot diket när timmen går – om ingen tröstar.` });
      break;
    case 'bolt':
      out.push({ key: 'bolt', icon: '»', label: 'tänker rusa', intent: true, tone: 'warn',
        explain: `${a.name} springer ett steg framåt på egen hand när timmen går – även rakt ut i ljuset. Trösta för att stoppa.` });
      break;
    case 'leave':
      out.push({ key: 'leave', icon: '✕', label: 'lämnar oss', intent: true, tone: 'bad',
        explain: `${a.name} har slutat tro och lämnar gruppen för alltid när timmen går. Trösta nu.` });
      break;
    case 'hunt': {
      const t = animal(s, i.target).name;
      out.push({ key: 'hunt', icon: '⚠︎', label: `jagar ${t}`, intent: true, tone: 'bad',
        explain: `${a.name} har glömt eden och anfaller ${t} när timmen går, om de står nära. Trösta ${a.name}, eller flytta ${t} undan.` });
      break;
    }
    case 'raid':
      out.push({ key: 'raid', icon: '⚑', label: 'går mot hönsen', intent: true, tone: 'warn',
        explain: `${a.name} är hungrig och tar en höna när timmen går, i stället för en av oss. ${a.name} får +2 tro – men larmet ökar med 3. Trösta för att stoppa.` });
      break;
    case 'follow':
      break;
  }

  if (a.flying) out.push({ key: 'flying', icon: '⇡', label: 'flyger', tone: 'good', explain: `${a.name} är i luften och kan inte träffas av bilar den här timmen.` });
  if (a.protectedBy) {
    const p = animal(s, a.protectedBy).name;
    out.push({ key: 'protected', icon: '⛨︎', label: `skyddas av ${p}`, tone: 'good', explain: `${p} tar träffen i stället för ${a.name}, om de står i samma zon.` });
  }
  if (a.braced) out.push({ key: 'braced', icon: '◈', label: 'biter ihop', tone: 'good', explain: `Nästa skada på ${a.name} den här timmen uteblir.` });
  const zone = zoneDef(s, a.zone);
  if (zone.slow) {
    out.push(a.slowTime >= 1
      ? { key: 'culvert', icon: '◌', label: 'kan krypa ut', tone: 'info', explain: `${a.name} har krupit genom ${zone.name} och kan ta sig ut nu.` }
      : { key: 'culvert', icon: '◌', label: 'kryper', tone: 'info', explain: `${a.name} kryper genom ${zone.name}. Bilar når inte hit. Ute om en timme.` });
  }
  if (s.encounterId === 'river') out.push(...riverStatuses(s, a));
  out.push(...lasting(s, a));
  if (a.predator && a.intent.kind !== 'hunt' && a.belief <= huntsAt(s, a) + 1) {
    out.push({ key: 'hungry', icon: '✶', label: 'tvivlar', tone: 'warn',
      explain: `${a.name}s tro är låg. Sjunker den till ${huntsAt(s, a)} kan ${a.name} glömma eden och börja jaga.` });
  } else if (a.belief <= 3 && a.intent.kind === 'follow') {
    out.push({ key: 'doubt', icon: '✶', label: 'tvivlar', tone: 'warn', explain: `${a.name}s tro är låg (${a.belief}). Snart kan ${a.name} frysa, fly eller rusa på egen hand.` });
  }
  return out;
}

/** On the river: a wet stone, the current, the heron. */
function riverStatuses(s: GameState, a: Animal): Status[] {
  const out: Status[] = [];
  if (aboveTheWater(a)) return out;
  const strid = s.currentPlan[s.turn - 1] === 'strid';
  if ((s.slipPlan[s.turn - 1] ?? []).includes(a.zone)) {
    out.push({ key: 'slip', icon: '≈', label: 'hal sten', tone: strid && a.size !== 'large' && !swims(a) ? 'bad' : 'warn',
      explain: `Stenen är hal den här timmen. ${a.name} glider ner i strömmen när timmen går – om inte ${a.name} flyttas eller biter ihop.${strid ? ' Och strömmen är strid.' : ''}` });
  }
  if (a.zone === CURRENT) {
    const anchor = holdsOnTo(s, a);
    if (swims(a)) out.push({ key: 'current', icon: '∽', label: 'simmar', tone: 'good', explain: `${a.name} simmar. Strömmen tar inte ${a.name}.` });
    else if (a.size === 'large') out.push({ key: 'current', icon: '◉', label: 'står emot', tone: 'good', explain: `${a.name} är stor nog att stå i strömmen. Den som står bredvid kan hålla sig fast.` });
    else if (anchor) out.push({ key: 'current', icon: '◉', label: `håller sig i ${anchor.name}`, tone: 'good', explain: `${a.name} håller sig fast i ${anchor.name} och dras inte med av strömmen.` });
    else if (strid) out.push({ key: 'current', icon: '↯', label: 'dras mot forsen', tone: 'bad', explain: `Strömmen är strid. ${a.name} dras mot forsen när timmen går. Led ${a.name} upp på en sten eller i land, eller ställ Gamla Ljung bredvid.` });
    else out.push({ key: 'current', icon: '∽', label: 'i strömmen', tone: 'info', explain: `Strömmen är lugn just nu. Blir den strid dras ${a.name} mot forsen.` });
  }
  if (s.heron === a.zone && a.size === 'small') {
    out.push({ key: 'heron', icon: '⌐', label: 'hägern', tone: 'warn', explain: `Hägern hugger efter ${a.name} när timmen går: ett sår som blöder.` });
  }
  return out;
}

/** What an animal carries between places: injuries and grief. */
function lasting(s: GameState, a: Animal): Status[] {
  const out = a.injuries.map((k) => injuryStatus(a, k));
  if (a.grief.length) {
    const names = a.grief.map((id) => animal(s, id).name).join(' och ');
    out.push({ key: 'grief', icon: '❦', label: `sörjer ${names}`, tone: 'warn',
      explain: `${a.name} bär ${names} med sig. Sorgen gör att ${a.name} tvivlar lättare.` });
  }
  return out;
}

/** Injuries: halt and broken never heal; bleeding and shock heal by the campfire. */
export function injuryStatus(a: Animal, k: InjuryKind): Status {
  switch (k) {
    case 'halt':
      return { key: 'halt', icon: '≀', label: 'haltar', tone: 'bad',
        explain: `${a.name} haltar: går bara ett steg i taget, även med kort som annars ger två. Att leda kostar ◆2. Läker aldrig.` };
    case 'broken':
      return { key: 'broken', icon: '⌁', label: a.flier ? 'bruten vinge' : 'bruten tass', tone: 'bad',
        explain: a.flier
          ? `${a.name}s vinge är bruten: kan inte flyga, och artkortet går inte att spela. Läker aldrig.`
          : `${a.name}s tass är bruten: artkortet går inte att spela. Läker aldrig.` };
    case 'bleeding':
      return { key: 'bleeding', icon: '❢', label: 'blöder', tone: 'bad',
        explain: `${a.name} blöder och tappar 1 tro varje timme. Läker vid lägerelden.` };
    case 'shock':
      return { key: 'shock', icon: '≋', label: 'chock', tone: 'warn',
        explain: `${a.name} är i chock: tvivlar och fryser mycket lättare. Läker vid lägerelden.` };
  }
}

export interface ForecastLine {
  text: string;
  tone: Tone;
}

/** What letting the hour pass will do, as far as we can see it. Hidden dark cars stay hidden. */
export function forecast(s: GameState): ForecastLine[] {
  const out: ForecastLine[] = [];
  const zoneOf = new Map<string, ZoneId>();
  for (const a of s.animals.filter(isActive)) {
    let z = a.zone;
    const i = a.intent;
    if (i.kind === 'flee') {
      const b = backZone(s, a);
      if (b) { z = b; out.push({ text: `${a.name} backar till ${zoneDef(s, b).name}.`, tone: 'warn' }); }
    } else if (i.kind === 'bolt') {
      const b = boltZone(s, a);
      if (b) { z = b; out.push({ text: `${a.name} rusar ut i ${zoneDef(s, b).name}.`, tone: 'warn' }); }
    } else if (i.kind === 'leave') {
      out.push({ text: `${a.name} lämnar oss.`, tone: 'bad' });
      continue;
    } else if (i.kind === 'raid') {
      z = HEN_HOUSE;
      out.push({ text: `${a.name} tar en höna: +2 tro för ${a.name}, men larmet ökar med 3.`, tone: 'warn' });
    } else if (i.kind === 'hunt') {
      const t = animal(s, i.target);
      if (zoneDistance(s, a.zone, t.zone) <= 1) out.push({ text: `${a.name} anfaller ${t.name}.`, tone: 'bad' });
    }
    zoneOf.set(a.id, z);
  }

  const strikes = s.encounterId === 'road' ? s.trafficPlan[s.turn - 1] ?? [] : [];
  for (const st of strikes) {
    if (st.dark && !s.darkRevealed) continue;
    const victims = s.animals.filter((a) => isActive(a) && zoneOf.get(a.id) === st.lane && !a.flying);
    const lane = zoneDef(s, st.lane).name;
    if (victims.length === 0) {
      out.push({ text: `En ${st.vehicle} i ${lane} – ingen av oss där.`, tone: 'good' });
      continue;
    }
    for (const v of victims) {
      const shield = v.protectedBy ? animal(s, v.protectedBy) : undefined;
      const takes = shield && isActive(shield) && !shield.flying && zoneOf.get(shield.id) === st.lane ? shield : v;
      const lethal = isLethal(takes, st);
      const harm = lethal ? 'dödar' : takes.count !== undefined ? `${swarmLoss(st)} av ${takes.name} dör` : 'skadar (en skada som stannar)';
      const who = takes === v ? v.name : `${takes.name} (i stället för ${v.name})`;
      out.push({ text: `En ${st.vehicle} i ${lane} träffar ${who}: ${harm}${lethal ? '!' : '.'}`, tone: lethal ? 'bad' : 'warn' });
    }
  }
  if (strikes.some((x) => x.dark) && !s.darkRevealed) out.push({ text: 'Något mullrar i mörkret, utan ljus. Vi vet inte i vilket körfält.', tone: 'bad' });
  if (s.encounterId === 'farm') out.push(...farmForecast(s, zoneOf));
  if (s.encounterId === 'river') out.push(...riverForecast(s, zoneOf));
  if (s.rescue) {
    const name = newcomer(s.rescue.who).name;
    out.push({ text: `${name} väntar ${encounterOf(s).rescue!.trapped} – tillit ${s.rescue.trust}/${RESCUE_TRUST}. Går vi härifrån utan ${name} blir ${name} kvar.`, tone: 'info' });
  }
  if (s.turn >= s.maxTurn) {
    out.push({ text: 'Sista timmen: alla som inte är över när den går blir kvar.', tone: 'bad' });
  }
  if (out.length === 0) out.push({ text: 'Inget händer oss den här timmen.', tone: 'good' });
  return out;
}

/** The farm: where the dogs end the hour and whom they bite, the alarm, and the flashlight. */
function farmForecast(s: GameState, zoneOf: Map<string, ZoneId>): ForecastLine[] {
  const out: ForecastLine[] = [];
  const at = (z: ZoneId) => s.animals.filter((a) => isActive(a) && zoneOf.get(a.id) === z && !a.flying);
  let alarm = s.alarm;
  if (s.animals.some((a) => isActive(a) && a.intent.kind === 'raid')) alarm += 3;
  if (!s.dogsAwake) {
    out.push({ text: 'Hundarna sover än. Nästa timme vaknar de och följer vår doft.', tone: 'info' });
  } else {
    const bitten = new Set<string>();
    for (const d of s.dogs) {
      if (!d.target) {
        out.push({ text: `${d.name} hittar ingen doft och stannar.`, tone: 'good' });
        continue;
      }
      const z = dogDestination(d);
      const here = at(z).filter((a) => !bitten.has(a.id));
      const place = zoneDef(s, z).name;
      if (!here.length) {
        out.push({ text: `${d.name} springer till ${place} – ingen av oss där.`, tone: 'good' });
        continue;
      }
      for (const a of here) bitten.add(a.id);
      const who = here.map((a) => a.name).join(' och ');
      out.push({ text: `${d.name} springer till ${place} och biter ${who}: skadar (blöder).`, tone: 'warn' });
    }
    if (bitten.size) alarm += 1;
  }
  if (s.farmerOut && s.farmerSweep) {
    const z = zoneDef(s, s.farmerSweep);
    const caught = z.cover ? [] : at(s.farmerSweep);
    out.push(caught.length
      ? { text: `Ficklampan lyser på ${z.name} och hittar ${caught.map((a) => a.name).join(' och ')}: dödar!`, tone: 'bad' }
      : { text: `Ficklampan lyser på ${z.name} – ingen av oss där.`, tone: 'good' });
  } else if (alarm >= alarmMax(s)) {
    out.push({ text: 'Larmet blir fullt: bonden kommer ut med ficklampan.', tone: 'bad' });
  } else if (alarm > s.alarm) {
    out.push({ text: `Larmet stiger till ${alarm} av ${alarmMax(s)}.`, tone: 'warn' });
  }
  return out;
}

/** The river: who slips, who the current takes, the heron, the cold, and the creaking dam. */
function riverForecast(s: GameState, zoneOf: Map<string, ZoneId>): ForecastLine[] {
  const out: ForecastLine[] = [];
  const active = s.animals.filter((a) => isActive(a) && zoneOf.has(a.id));
  for (const z of s.slipPlan[s.turn - 1] ?? []) {
    const slip = active.filter((a) => zoneOf.get(a.id) === z && !aboveTheWater(a) && !a.braced);
    for (const a of slip) zoneOf.set(a.id, CURRENT);
    out.push(slip.length
      ? { text: `${zoneDef(s, z).name[0].toUpperCase()}${zoneDef(s, z).name.slice(1)} är hal: ${slip.map((a) => a.name).join(' och ')} glider ner i strömmen.`, tone: 'warn' }
      : { text: `${zoneDef(s, z).name[0].toUpperCase()}${zoneDef(s, z).name.slice(1)} är hal – ingen av oss där.`, tone: 'good' });
  }
  const inCurrent = active.filter((a) => zoneOf.get(a.id) === CURRENT && !aboveTheWater(a));
  const anchor = inCurrent.find((a) => a.size === 'large');
  if (s.currentPlan[s.turn - 1] === 'strid') {
    const taken = inCurrent.filter((a) => a.size !== 'large' && !swims(a) && !anchor);
    out.push(taken.length
      ? { text: `Strömmen är strid: ${taken.map((a) => a.name).join(' och ')} dras mot forsen – dödar!`, tone: 'bad' }
      : { text: 'Strömmen är strid – men ingen av oss dras med.', tone: 'good' });
    if (anchor) for (const a of inCurrent.filter((x) => x !== anchor && !swims(x))) out.push({ text: `${a.name} håller sig fast i ${anchor.name}.`, tone: 'good' });
  } else {
    out.push({ text: 'Strömmen är lugn den här timmen.', tone: 'good' });
  }
  if (s.peekNext && s.turn < s.maxTurn) out.push({ text: `Nästa timme är strömmen ${s.currentPlan[s.turn]}.`, tone: 'info' });
  if (s.heron) {
    const pecked = active.filter((a) => zoneOf.get(a.id) === s.heron && a.size === 'small' && !a.flying);
    out.push(pecked.length
      ? { text: `Hägern hugger på ${zoneDef(s, s.heron).name}: ${pecked.map((a) => a.name).join(' och ')} – skadar (blöder).`, tone: 'warn' }
      : { text: `Hägern väntar vid ${zoneDef(s, s.heron).name} – ingen av de små där.`, tone: 'good' });
  }
  if (s.time === 'night') {
    const cold = active.filter((a) => zoneDef(s, zoneOf.get(a.id)!).water && !aboveTheWater(a));
    if (cold.length) out.push({ text: `Kylan i vattnet: ${cold.map((a) => a.name).join(' och ')} tappar 1 tro.`, tone: 'warn' });
  }
  if (!s.closed.includes('dammen')) {
    const left = DAM_MAX - s.damCreak;
    if (left === 1) out.push({ text: `Dammen knakar ${s.damCreak}/${DAM_MAX}: nästa som går ut på den bryter den.`, tone: 'warn' });
    else if (left === 2) out.push({ text: `Dammen knakar ${s.damCreak}/${DAM_MAX}: ett stort djur till bryter den.`, tone: 'warn' });
  }
  return out;
}
