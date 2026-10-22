// Every state an animal can be in, in words for the player, plus a forecast
// of what letting the hour pass will do. Shared by tokens, the info panel and
// the forecast box so they always say the same thing.
import { roarZones } from '../engine/encounters/machines';
import { sheltered } from '../engine/encounters/raptor';
import { mistAfter, rowZones, tractorRow } from '../engine/encounters/sprayer';
import { GATE_PUSH, levelAfter, onTheWire, sweptIn } from '../engine/encounters/fence';
import { cutting, inWheat, stubblePrey } from '../engine/encounters/harvest';
import { bitten, lit, walkerZone } from '../engine/encounters/lamps';
import { catSigns, guard, pounced, scarer } from '../engine/encounters/cats';
import { encounterOf, zoneDef } from '../engine/encounters';
import { HEN_HOUSE, alarmMax, dogDestination } from '../engine/encounters/farm';
import { CURRENT, DAM_MAX, aboveTheWater, holdsOnTo, swims } from '../engine/encounters/river';
import { animal, backZone, boltZone, huntsAt, isActive, isLethal, swarmLoss, zoneDistance } from '../engine/rules';
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

  if (a.climbing) out.push({ key: 'climbing', icon: '⇞', label: 'uppe i ett träd', tone: 'good', explain: `${a.name} sitter uppe i ett träd: inget på marken når dit den här timmen. Men fåglar gör det – och ett träd som fälls.` });
  else if (a.flying) out.push({ key: 'flying', icon: '⇡', label: 'flyger', tone: 'good', explain: `${a.name} är i luften och kan inte träffas av bilar den här timmen.` });
  if (a.curled) out.push({ key: 'curled', icon: '✳︎', label: 'rullar ihop sig', tone: 'good', explain: `${a.name} är en boll av taggar: bett och klor missar den här timmen. Bilar och maskiner gör det inte.` });
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
  if (s.encounterId === 'machines') out.push(...machinesStatuses(s, a));
  if (s.encounterId === 'raptor') out.push(...raptorStatuses(s, a));
  if (s.encounterId === 'sprayer') out.push(...sprayerStatuses(s, a));
  if (s.encounterId === 'fence') out.push(...fenceStatuses(s, a));
  if (s.encounterId === 'harvest') out.push(...harvestStatuses(s, a));
  if (s.encounterId === 'lamps') out.push(...lampsStatuses(s, a));
  if (s.encounterId === 'cats') out.push(...catsStatuses(s, a));
  out.push(...lasting(s, a));
  if (a.predator && a.intent.kind !== 'hunt' && a.belief <= huntsAt(s, a) + 1) {
    out.push({ key: 'hungry', icon: '✶', label: 'tvivlar', tone: 'warn',
      explain: `${a.name}s tro är låg. Sjunker den till ${huntsAt(s, a)} kan ${a.name} glömma eden och börja jaga.` });
  } else if (a.belief <= 3 && a.intent.kind === 'follow') {
    out.push({ key: 'doubt', icon: '✶', label: 'tvivlar', tone: 'warn', explain: `${a.name}s tro är låg (${a.belief}). Snart kan ${a.name} frysa, fly eller rusa på egen hand.` });
  }
  return out;
}

/** Over the fields: hidden from the bird, or in its shadow. */
function raptorStatuses(s: GameState, a: Animal): Status[] {
  if (a.status !== 'active' || s.turn === 1) return [];
  const bird = s.time === 'night' ? 'Berguven' : 'Vråken';
  if (s.time === 'night' && a.flying) return [{ key: 'raptor', icon: '◌', label: 'hörs i luften', tone: 'bad', explain: `Berguven hör ${a.name}s vingar. Den slår till i luften när timmen går.` }];
  const watched = s.raptors.some((b) => b.zone === a.zone || b.maybe.includes(a.zone));
  if (!watched) return [];
  if (a.size === 'large') return [{ key: 'raptor', icon: '◉', label: 'för stor', tone: 'good', explain: `${bird} kan inte lyfta ${a.name}.` }];
  if (sheltered(a)) return [{ key: 'raptor', icon: '♣', label: 'gömd', tone: 'good', explain: `${a.name} ligger gömd här. ${bird} ser ${a.name} inte.` }];
  return [{ key: 'raptor', icon: '◒', label: s.time === 'night' ? 'vingslag' : 'i skuggan', tone: a.size === 'small' ? 'bad' : 'warn',
    explain: `${bird} ${s.time === 'night' ? 'kan slå ner' : 'slår ner'} här när timmen går. ${a.size === 'small' ? `Tar den ${a.name} bärs ${a.name} bort.` : `${a.name} får klorna i sig och blöder.`} Den tar den minsta som inte är gömd.` }];
}

/** Below the ridge: the falling trees, the bulldozer, the roar. */
function machinesStatuses(s: GameState, a: Animal): Status[] {
  const out: Status[] = [];
  if (a.flying) return out;
  if (s.fellPlan[s.turn - 1] === a.zone) {
    out.push({ key: 'fell', icon: '⚒', label: 'träden faller', tone: 'bad', explain: `Fällaren tar träden här när timmen går. Led ${a.name} härifrån, annars faller de över ${a.name}.` });
  }
  if (s.dozePlan[s.turn - 1] === a.zone) {
    out.push({ key: 'doze', icon: '▰', label: 'schaktaren', tone: 'bad', explain: `Schaktaren tar marken här när timmen går. ${a.name} måste vidare.` });
  }
  if (roarZones(s).includes(a.zone) && !a.injuries.includes('shock')) {
    out.push({ key: 'roar', icon: '≋', label: 'bruset', tone: 'warn', explain: `Träden faller alldeles bredvid. ${a.name} står i det öppna och får chock när timmen går.` });
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
    else if (strid) out.push({ key: 'current', icon: '↯', label: 'dras mot forsen', tone: 'bad', explain: `Strömmen är strid. ${a.name} dras mot forsen när timmen går. Led ${a.name} upp på en sten eller i land, eller ställ ett stort djur bredvid.` });
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
    // We grieve the fallen, and sometimes a place: the glen we lost.
    const names = a.grief.map((id) => s.animals.find((x) => x.id === id)?.name ?? (id === 'dalen' ? 'dalen' : id)).join(' och ');
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
    case 'poisoned':
      return { key: 'poisoned', icon: '☠', label: 'förgiftad', tone: 'bad',
        explain: `${a.name} är förgiftad: ${a.name}s egna kort går inte att spela. ${a.name} kan fortfarande ledas. Läker vid lägerelden${a.swimmer ? ', eller i bäcken' : ''}.` };
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
  if (s.encounterId === 'machines') out.push(...machinesForecast(s, zoneOf));
  if (s.encounterId === 'raptor') out.push(...raptorForecast(s, zoneOf));
  if (s.encounterId === 'sprayer') out.push(...sprayerForecast(s, zoneOf));
  if (s.encounterId === 'fence') out.push(...fenceForecast(s, zoneOf));
  if (s.encounterId === 'harvest') out.push(...harvestForecast(s, zoneOf));
  if (s.encounterId === 'lamps') out.push(...lampsForecast(s, zoneOf));
  if (s.encounterId === 'cats') out.push(...catsForecast(s, zoneOf));
  if (s.rescue) {
    const name = s.rescue.name;
    out.push({ text: `${name} väntar ${encounterOf(s).rescue!.trapped} – tillit ${s.rescue.trust}/${s.rescue.need}. Går vi härifrån utan ${name} blir ${name} kvar.`, tone: 'info' });
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
      // The spines turn a bite away.
      const here = at(z).filter((a) => !bitten.has(a.id) && !a.curled);
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
    const pecked = active.filter((a) => zoneOf.get(a.id) === s.heron && a.size === 'small' && !a.flying && !a.curled);
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

/** The street: in the light where the dog will pass, or in the light at all. */
function lampsStatuses(s: GameState, a: Animal): Status[] {
  if (a.status !== 'active' || a.flying) return [];
  if (s.lamps.walkers.some((w) => walkerZone(w) === a.zone) && lit(s, a.zone) && !a.hidden) {
    return [{ key: 'dog', icon: '◣', label: 'hunden ser', tone: 'bad', explain: `Mannen med hunden går här i ljuset när timmen går. Hunden biter den minsta och jagar de andra tillbaka.` }];
  }
  if (lit(s, a.zone)) return [{ key: 'light', icon: '☀', label: 'i ljuset', tone: 'warn', explain: `${a.name} står under en tänd lykta. Går mannen med hunden förbi här syns ${a.name}.` }];
  return [];
}

/** The street: whom the dog finds, and which lamps come on next. */
function lampsForecast(s: GameState, zoneOf: Map<string, ZoneId>): ForecastLine[] {
  const out: ForecastLine[] = [];
  const where = (a: Animal) => zoneOf.get(a.id) ?? a.zone;
  for (const w of s.lamps.walkers) {
    const z = walkerZone(w);
    const place = zoneDef(s, z).name;
    if (!lit(s, z)) { out.push({ text: `Mannen med hunden går genom ${place} – där är det mörkt.`, tone: 'good' }); continue; }
    const v = bitten(s, z, where);
    const rest = s.animals.filter((a) => isActive(a) && a !== v && where(a) === z && !a.flying && !a.hidden);
    out.push(v
      ? { text: `Hunden får syn på oss i ${place}: biter ${v.name} (blöder)${rest.length ? ` och jagar ${rest.map((a) => a.name).join(' och ')} tillbaka` : ''}.`, tone: 'warn' }
      : { text: `Mannen med hunden går genom ljuset i ${place} – ingen av oss syns där.`, tone: 'good' });
  }
  const next = Object.entries(s.lamps.litAt).filter(([, h]) => h === s.turn + 1).map(([z]) => zoneDef(s, z).name);
  if (next.length && s.turn < s.maxTurn) out.push({ text: `Nästa timme tänds lyktan över ${next.join(' och ')}.`, tone: 'info' });
  return out;
}

/** The courtyard: where a cat lies in wait – or might – and who keeps it off. */
function catsStatuses(s: GameState, a: Animal): Status[] {
  if (a.status !== 'active' || (a.flying && !a.climbing)) return [];
  const signs = catSigns(s).filter((zs) => zs.includes(a.zone));
  if (!signs.length) return [];
  if (scarer(s, a.zone) === a) return [{ key: 'cat', icon: '!', label: 'skrämmer katten', tone: 'good', explain: `Katten här vågar inte möta ${a.name}. Den backar när timmen går.` }];
  if (guard(s, a.zone) === a) return [{ key: 'cat', icon: '■', label: 'vaktar', tone: 'good', explain: `${a.name} är stor. Ingen katt slår till här medan ${a.name} står kvar.` }];
  if (guard(s, a.zone)) return [{ key: 'cat', icon: '■', label: 'en stor vaktar', tone: 'good', explain: `${guard(s, a.zone)!.name} står här. Katten vågar inte slå till.` }];
  if (scarer(s, a.zone) || s.cats.fed) return [];
  const sure = signs.some((zs) => zs.length === 1);
  if (pounced(s, a.zone) === a) {
    return [{ key: 'cat', icon: '◆', label: sure ? 'katten lurar här' : 'ögon i mörkret', tone: 'bad',
      explain: sure
        ? `En katt ligger på lur här. När timmen går slår den till mot ${a.name}${a.size === 'small' ? ' – en liten tas' : ' och river'}.`
        : `Här glimmar ögon. Är det katten, slår den till mot ${a.name} när timmen går.` }];
  }
  return [{ key: 'cat', icon: '◆', label: sure ? 'katten lurar här' : 'ögon i mörkret', tone: 'warn', explain: `En katt kan ligga här, men den tar en mindre än ${a.name} först.` }];
}

/** The courtyard: whom each cat would take – and what keeps it off. */
function catsForecast(s: GameState, zoneOf: Map<string, ZoneId>): ForecastLine[] {
  const out: ForecastLine[] = [];
  const where = (a: Animal) => zoneOf.get(a.id) ?? a.zone;
  if (s.cats.fed) return [{ text: 'Katterna slåss om maten den här timmen. Ingen av dem slår till.', tone: 'good' }];
  /** What the cat does where it lies, and whether it hurts. */
  const outcome = (z: ZoneId): { text: string; bad: boolean } => {
    const p = scarer(s, z, where);
    if (p) return { text: `${p.name} skrämmer bort den`, bad: false };
    const g = guard(s, z, where);
    if (g) return { text: `${g.name} vaktar, den vågar inte`, bad: false };
    const v = pounced(s, z, where);
    return v ? { text: `slår till mot ${v.name}: ${v.size === 'small' ? 'dödar' : 'river (blöder)'}`, bad: true } : { text: 'väntar – ingen av oss är där', bad: false };
  };
  for (const zs of catSigns(s)) {
    if (zs.length === 1) {
      const o = outcome(zs[0]);
      out.push({ text: `Katten i ${zoneDef(s, zs[0]).name} ${o.bad || o.text.startsWith('väntar') ? o.text : `– ${o.text}`}.`, tone: o.bad ? 'bad' : 'good' });
      continue;
    }
    const os = zs.map((z) => ({ z, ...outcome(z) }));
    const hurt = os.filter((o) => o.bad);
    out.push({
      text: `Ögon i mörkret vid ${zs.map((z) => zoneDef(s, z).name).join(' eller ')}.${hurt.map((o) => ` Är det katten i ${zoneDef(s, o.z).name} ${o.text}.`).join('')}`,
      tone: hurt.length ? 'warn' : 'info',
    });
  }
  if (!s.cats.foodUsed) out.push({ text: 'Kasta mat (◆1): en gång på gården slår katterna inte till mot någon den timmen.', tone: 'info' });
  return out;
}

/** The harvest: in the harvester's way, in the buzzard's shadow, or hidden in the wheat. */
function harvestStatuses(s: GameState, a: Animal): Status[] {
  if (a.status !== 'active') return [];
  if (!a.flying && cutting(s).includes(a.zone)) return [{ key: 'harvest', icon: '▤', label: 'i skördetröskans väg', tone: 'bad', explain: `Skördetröskan skär här när timmen går. Står ${a.name} kvar blir ${a.name} överkörd.` }];
  if (s.harvest.shadow === a.zone && stubblePrey(s, a.zone) === a) return [{ key: 'raptor', icon: '◒', label: 'i skuggan', tone: a.size === 'small' ? 'bad' : 'warn', explain: `Vråken slår ner här i stubben när timmen går och tar ${a.name}.` }];
  if (inWheat(s, a.zone)) return [{ key: 'wheat', icon: '♣', label: 'i vetet', tone: 'good', explain: `${a.name} är gömd i vetet. Vråken ser inte ${a.name} här – men skördetröskan kommer.` }];
  return [];
}

/** The harvest: whom the harvester runs over, whom the buzzard takes, where it cuts next. */
function harvestForecast(s: GameState, zoneOf: Map<string, ZoneId>): ForecastLine[] {
  const out: ForecastLine[] = [];
  const where = (a: Animal) => zoneOf.get(a.id) ?? a.zone;
  const names = (xs: Animal[]) => xs.map((a) => a.name).join(' och ');
  const strip = cutting(s);
  const run = s.animals.filter((a) => isActive(a) && !a.flying && strip.includes(where(a)));
  const place = strip.map((z) => zoneDef(s, z).name).join(' och ');
  if (strip.length) out.push(run.length ? { text: `Skördetröskan skär ${place} och kör över ${names(run)}: dödar!`, tone: 'bad' } : { text: `Skördetröskan skär ${place} – ingen av oss där.`, tone: 'good' });
  const z = s.harvest.shadow;
  if (z) {
    const v = stubblePrey(s, z, where);
    out.push(v && !run.includes(v)
      ? { text: `Vråken slår ner i ${zoneDef(s, z).name} och ${v.size === 'small' ? `bär bort ${v.name}: dödar!` : `klöser ${v.name}: skadar (blöder).`}`, tone: v.size === 'small' ? 'bad' : 'warn' }
      : { text: `Vråken slår ner i ${zoneDef(s, z).name} – ingen av oss där.`, tone: 'good' });
  }
  const next = s.harvest.plan[s.turn] ?? [];
  if (s.turn < s.maxTurn && next.length) out.push({ text: `Nästa timme skär den ${next.map((x) => zoneDef(s, x).name).join(' och ')}.`, tone: 'info' });
  return out;
}

/** The ditch and the gate: swept away, on the wire. */
function fenceStatuses(s: GameState, a: Animal): Status[] {
  if (a.status !== 'active') return [];
  if (sweptIn(s, levelAfter(s)).includes(a)) {
    return [{ key: 'ditch', icon: '≋', label: 'dras med', tone: 'bad', explain: `Vattnet i diket stiger till ${levelAfter(s)}. Står ${a.name} kvar här dras ${a.name} med (sista stunden). Ett stort djur i samma del av diket kan hålla emot.` }];
  }
  if (s.fence.pulsePlan[s.turn - 1] && onTheWire(s).includes(a)) {
    return [{ key: 'wire', icon: '⚡', label: a.size === 'small' ? 'strömmen · dödar' : 'strömmen · chock', tone: a.size === 'small' ? 'bad' : 'warn', explain: `Strömmen är på. Står ${a.name} kvar vid stängslet ${a.size === 'small' ? 'dör ' + a.name + ' (sista stunden)' : 'får ' + a.name + ' chock'}.` }];
  }
  return [];
}

/** The ditch and the gate: the water and whom it takes; the wire and whom it touches; the gate. */
function fenceForecast(s: GameState, zoneOf: Map<string, ZoneId>): ForecastLine[] {
  const out: ForecastLine[] = [];
  const where = (a: Animal) => zoneOf.get(a.id) ?? a.zone;
  const names = (xs: Animal[]) => xs.map((a) => a.name).join(' och ');
  const level = levelAfter(s);
  const swept = sweptIn(s, level, where);
  const rise = level > s.fence.level ? `Diket stiger till ${level}` : `Diket står kvar på ${level}`;
  // A swarm loses some of its own; anyone else is lost.
  const kills = (xs: Animal[]) => xs.map((a) => (a.count !== undefined ? `${swarmLoss({ severity: 'kill' })} av ${a.name}` : a.name)).join(' och ');
  const lethal = (xs: Animal[]) => xs.some((a) => isLethal(a, { severity: 'kill' }));
  out.push(swept.length ? { text: `${rise} och drar med ${kills(swept)}${lethal(swept) ? ': dödar!' : '.'}`, tone: 'bad' } : { text: `${rise}.`, tone: level >= 2 ? 'warn' : 'info' });
  const on = s.fence.pulsePlan[s.turn - 1];
  const touch = on ? onTheWire(s, where).filter((a) => !swept.includes(a)) : [];
  const dies = touch.filter((a) => a.size === 'small');
  const shocked = touch.filter((a) => a.size !== 'small');
  if (!on) out.push({ text: 'Strömmen i stängslet är av den här timmen.', tone: 'good' });
  else if (!touch.length) out.push({ text: 'Strömmen i stängslet är på – ingen av oss rör vid det.', tone: 'good' });
  if (dies.length) out.push({ text: `Strömmen i stängslet tar ${kills(dies)}${lethal(dies) ? ': dödar!' : '.'}`, tone: 'bad' });
  if (shocked.length) out.push({ text: `Strömmen i stängslet slår ${names(shocked)}: chock.`, tone: 'warn' });
  if (s.turn < s.maxTurn && (s.time === 'day' || s.peekNext)) out.push({ text: `Nästa timme är strömmen ${s.fence.pulsePlan[s.turn] ? 'på' : 'av'}.`, tone: 'info' });
  if (!s.fence.gateOpen) out.push({ text: `Grinden är stängd. Ett stort djur kan trycka upp den, eller två av oss tillsammans (◆${GATE_PUSH} extra).`, tone: 'info' });
  if (s.time === 'night') {
    const cold = s.animals.filter((a) => isActive(a) && !a.flying && zoneDef(s, where(a)).water && !swept.includes(a));
    if (cold.length) out.push({ text: `Vattnet är iskallt: ${names(cold)} tappar 1 tro.`, tone: 'warn' });
  }
  return out;
}

/** The sprayed field: in the tractor's way, or where the mist will lie. */
function sprayerStatuses(s: GameState, a: Animal): Status[] {
  if (a.status !== 'active' || a.underground) return [];
  if (!a.flying && tractorRow(s).includes(a.zone)) {
    return [{ key: 'tractor', icon: '▤', label: 'i traktorns väg', tone: 'bad', explain: `Traktorn kör här när timmen går. Står ${a.name} kvar blir ${a.name} överkörd.` }];
  }
  if (mistAfter(s).includes(a.zone)) {
    return [{ key: 'mist', icon: '≈', label: 'i dimman', tone: 'warn', explain: `Dimman ligger här när timmen går. ${a.name} blir förgiftad: ${a.name}s egna kort går inte att spela förrän vid elden.` }];
  }
  return [];
}

/** The sprayed field: where the tractor drives and whom it runs over; where the wind takes the mist, and who breathes it. */
function sprayerForecast(s: GameState, zoneOf: Map<string, ZoneId>): ForecastLine[] {
  const out: ForecastLine[] = [];
  const at = (zs: ZoneId[]) => s.animals.filter((a) => isActive(a) && zs.includes(zoneOf.get(a.id) ?? a.zone) && !a.underground);
  const names = (xs: Animal[]) => xs.map((a) => a.name).join(' och ');
  const row = tractorRow(s);
  const run = at(row).filter((a) => !a.flying);
  if (row.length) {
    const place = zoneDef(s, row[0]).name;
    out.push(run.length ? { text: `Traktorn kör längs ${place} och kör över ${names(run)}: dödar!`, tone: 'bad' } : { text: `Traktorn kör längs ${place} – ingen av oss där.`, tone: 'good' });
  }
  const wind = s.spray.windPlan[s.turn - 1];
  const mist = mistAfter(s);
  const sick = at(mist).filter((a) => !run.includes(a) && !a.injuries.includes('poisoned'));
  out.push({ text: `Vinden drar mot ${wind}.${mist.length ? ` Dimman ligger sedan i ${mist.map((z) => zoneDef(s, z).name).join(', ')}.` : ' Ingen dimma vi kan se.'}`, tone: 'info' });
  if (sick.length) out.push({ text: `${names(sick)} andas in dimman: förgiftad.`, tone: 'warn' });
  if (s.time === 'night' && !s.peekNext && !s.darkRevealed) out.push({ text: 'I mörkret ser vi bara en del av dimman.', tone: 'info' });
  for (const a of s.animals.filter((x) => isActive(x) && x.swimmer && x.injuries.includes('poisoned') && zoneDef(s, zoneOf.get(x.id) ?? x.zone).water)) {
    out.push({ text: `${a.name} tvättar av sig giftet i bäcken.`, tone: 'good' });
  }
  if (s.peekNext && s.turn < s.maxTurn) {
    const next = s.time === 'day' ? ` Traktorn kör längs ${zoneDef(s, rowZones(s.spray.rowPlan[s.turn])[0]).name}.` : '';
    out.push({ text: `Nästa timme drar vinden mot ${s.spray.windPlan[s.turn]}.${next}`, tone: 'info' });
  }
  return out;
}

/** The machines: who the trees fall on, whom the roar frightens, what the bulldozer takes. */
function machinesForecast(s: GameState, zoneOf: Map<string, ZoneId>): ForecastLine[] {
  const out: ForecastLine[] = [];
  // Up a tree is no shelter here: the trees are what falls.
  const at = (z: ZoneId) => s.animals.filter((a) => isActive(a) && zoneOf.get(a.id) === z && (!a.flying || a.climbing));
  const names = (xs: Animal[]) => xs.map((a) => a.name).join(' och ');
  const fell = s.fellPlan[s.turn - 1];
  if (fell) {
    const under = at(fell);
    const place = zoneDef(s, fell).name;
    out.push(under.length
      ? { text: `Träden faller i ${place} över ${names(under)}: dödar!`, tone: 'bad' }
      : { text: `Träden faller i ${place} – ingen av oss där.`, tone: 'good' });
    const roar = roarZones(s).flatMap((z) => at(z)).filter((a) => !a.injuries.includes('shock'));
    if (roar.length) out.push({ text: `Bruset: ${names(roar)} får chock.`, tone: 'warn' });
  }
  const doze = s.dozePlan[s.turn - 1];
  if (doze) {
    const there = at(doze);
    const place = zoneDef(s, doze).name;
    out.push(there.length
      ? { text: `Schaktaren tar ${place} med ${names(there)}: dödar!`, tone: 'bad' }
      : { text: `Schaktaren tar ${place} – ingen av oss där.`, tone: 'warn' });
  }
  if (s.knowledge.includes('machines') && s.turn < s.maxTurn) {
    out.push({ text: `Spåren sa oss: nästa timme vänder sig fällaren mot ${zoneDef(s, s.fellPlan[s.turn]).name}.`, tone: 'info' });
  }
  return out;
}

/** The fields: where the birds strike, and whom they would take. */
function raptorForecast(s: GameState, zoneOf: Map<string, ZoneId>): ForecastLine[] {
  if (s.turn === 1) return [{ text: 'Fågeln kretsar bara den första timmen. Nästa timme slår den ner.', tone: 'info' }];
  const out: ForecastLine[] = [];
  const night = s.time === 'night';
  const bird = night ? 'Berguven' : 'Vråken';
  const after = (a: Animal) => ({ ...a, zone: zoneOf.get(a.id) ?? a.zone });
  const moved = s.animals.filter((a) => isActive(a) && zoneOf.has(a.id)).map(after);
  const victim = (z: ZoneId) => moved.filter((a) => a.zone === z && a.size !== 'large' && !sheltered(a)).sort((a, b) => (a.size === 'small' ? 0 : 1) - (b.size === 'small' ? 0 : 1))[0];
  const harm = (a: Animal) => (a.curled ? `griper efter ${a.name} – men sticker sig på taggarna.` : a.size === 'small' ? `bär bort ${a.name}: dödar!` : `klöser ${a.name}: skadar (blöder).`);
  const flier = night ? moved.find((a) => a.flying) : undefined;
  if (flier) out.push({ text: `Berguven hör ${flier.name}s vingar: skadar.`, tone: 'warn' });
  for (const b of s.raptors) {
    if (flier && b === s.raptors[0]) continue;
    if (b.zone) {
      const v = victim(b.zone);
      const place = zoneDef(s, b.zone).name;
      out.push(v ? { text: `${bird} slår ner i ${place} och ${harm(v)}`, tone: v.curled ? 'good' : v.size === 'small' ? 'bad' : 'warn' } : { text: `${bird} slår ner i ${place} – ingen av oss syns där.`, tone: 'good' });
    } else if (b.maybe.length) {
      const vs = b.maybe.map((z) => victim(z)).filter(Boolean) as Animal[];
      const places = b.maybe.map((z) => zoneDef(s, z).name).join(' eller ');
      out.push(vs.length
        ? { text: `${bird} slår ner i ${places}. Där syns ${vs.map((a) => a.name).join(' och ')}.`, tone: vs.some((a) => a.size === 'small') ? 'bad' : 'warn' }
        : { text: `${bird} slår ner i ${places} – ingen av oss syns där.`, tone: 'good' });
    }
  }
  return out;
}
