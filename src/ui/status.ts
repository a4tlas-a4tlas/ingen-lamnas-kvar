// Every state an animal can be in, in words for the player, plus a forecast
// of what letting the hour pass will do. Shared by tokens, the info panel and
// the forecast box so they always say the same thing.
import { zoneDef } from '../engine/encounters';
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
    return out;
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
  for (const k of a.injuries) out.push(injuryStatus(a, k));
  if (a.predator && a.intent.kind !== 'hunt' && a.belief <= huntsAt(s, a) + 1) {
    out.push({ key: 'hungry', icon: '✶', label: 'tvivlar', tone: 'warn',
      explain: `${a.name}s tro är låg. Sjunker den till ${huntsAt(s, a)} kan ${a.name} glömma eden och börja jaga.` });
  } else if (a.belief <= 3 && a.intent.kind === 'follow') {
    out.push({ key: 'doubt', icon: '✶', label: 'tvivlar', tone: 'warn', explain: `${a.name}s tro är låg (${a.belief}). Snart kan ${a.name} frysa, fly eller rusa på egen hand.` });
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
  if (s.turn >= s.maxTurn) out.push({ text: 'Gryningen: alla som inte är över blir kvar.', tone: 'bad' });
  if (out.length === 0) out.push({ text: 'Inget händer oss den här timmen.', tone: 'good' });
  return out;
}
