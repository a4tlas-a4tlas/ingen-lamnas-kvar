// HTML for the screens between encounters: the guide's map, the campfire and
// the memorial stone. Pure functions of state (plus the campfire plan).
import { CARDS } from '../data/cards';
import { guideName } from '../engine/roles';
import { FOREST, pathsFrom, type Place } from '../data/journey';
import { type FirePlan, TEACH_BOND, emberPairs, hungryWatcher, inheritanceLine, living, lockedAtFire, planProblem, sitsAlone, teachable } from '../engine/campfire';
import { MEETINGS, currentFrame, labelOf, meetingOptions, speakerOf } from '../data/meetings';
import { keptPromises } from '../engine/promises';
import { encounterOf, type EncounterDef, type ZoneDef } from '../engine/encounters';
import { animal, bond, canFly } from '../engine/rules';
import { GUIDES, HIT_ROWS, HOUR_STEPS, RESCUE_ROWS, TIME_NAMES, TIME_NOTES, type GuideRow } from '../data/guides.sv';
import type { Animal, CardKind, GameState, Teaching } from '../engine/types';
import { crowSilhouette, sceneArt, silhouette, speciesColor } from './silhouettes';
import { animalStatuses } from './status';

export const esc = (t: string) => t.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);

// ---------------------------------------------------------------- the map

// Map coordinates: places are in percent; the drawing is 80 wide and 100 tall.
const mx = (x: number) => x * 0.8;

function curve(a: Place, b: Place): { d: string; at: (t: number) => [number, number] } {
  const x1 = mx(a.x), y1 = a.y, x2 = mx(b.x), y2 = b.y;
  const cx = (x1 + x2) / 2 + (y2 - y1) * 0.25;
  const cy = (y1 + y2) / 2 + (x1 - x2) * 0.25;
  const at = (t: number): [number, number] => [
    (1 - t) ** 2 * x1 + 2 * (1 - t) * t * cx + t ** 2 * x2,
    (1 - t) ** 2 * y1 + 2 * (1 - t) * t * cy + t ** 2 * y2,
  ];
  return { d: `M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`, at };
}

/** The machines waiting below the ridge: tracks, a cab, and the arm raised. */
const MACHINE_ICON = '<rect x="-2.6" y="0.7" width="3.6" height="1" rx="0.5" /><rect x="-2" y="-0.9" width="2.2" height="1.5" /><path d="M0.2 -0.5 L1.6 -1.9 L2.6 -0.1 L2 0.6" fill="none" stroke="currentColor" stroke-width="0.45" />';

function icon(p: Place): string {
  switch (p.kind) {
    case 'start':
      return '<path d="M-2.4 1.2 Q-1.2 -1.6 0 0.4 Q1.2 -1.8 2.4 1.2 Z" />';
    case 'encounter':
      if (p.encounter === 'farm') return '<path d="M-2 1.4 V-0.4 L0 -1.8 L2 -0.4 V1.4 Z" /><rect x="-0.5" y="0.2" width="1" height="1.2" fill="var(--map-paper)" />';
      if (p.encounter === 'machines') return MACHINE_ICON;
      // A bird of prey: a V of wings.
      if (p.encounter === 'fence') return '<path d="M-2.6 -2 V2 M0 -2 V2 M2.6 -2 V2 M-2.6 -1 H2.6 M-2.6 0.8 H2.6" stroke="currentColor" stroke-width="0.7" fill="none" />';
      if (p.encounter === 'sprayer') return '<path d="M-2 -1.6 Q-2 -0.2 -1.2 0.4 Q-0.4 -0.2 -0.4 -1.6 L-1.2 -2.8 Z M0.6 -0.4 Q0.6 1 1.4 1.6 Q2.2 1 2.2 -0.4 L1.4 -1.6 Z M-1.4 1.2 Q-1.4 2.2 -0.8 2.6 Q-0.2 2.2 -0.2 1.2 L-0.8 0.4 Z" />';
      if (p.encounter === 'raptor') return '<path d="M-2.6 -0.6 Q-1.3 -1.6 0 0.4 Q1.3 -1.6 2.6 -0.6 Q1.3 -0.4 0 1.4 Q-1.3 -0.4 -2.6 -0.6 Z" />';
      if (p.encounter === 'river') return '<path d="M-2.4 -0.8 q0.6 -0.6 1.2 0 t1.2 0 t1.2 0 t1.2 0 M-2.4 0.6 q0.6 -0.6 1.2 0 t1.2 0 t1.2 0 t1.2 0" fill="none" stroke="currentColor" stroke-width="0.45" />';
      return '<rect x="-2.2" y="-0.9" width="4.4" height="1.8" rx="0.3" /><path d="M-1.6 0 h0.8 M-0.2 0 h0.8 M1.2 0 h0.6" stroke="var(--map-paper)" stroke-width="0.3" />';
    case 'campfire':
      return '<path d="M0 -2 C1.2 -0.6 1.4 0.6 0 1.5 C-1.4 0.6 -1.2 -0.6 0 -2 Z" fill="var(--map-fire)" /><path d="M-1.6 1.7 L1.6 1.1 M-1.6 1.1 L1.6 1.7" stroke="currentColor" stroke-width="0.35" />';
    case 'meeting':
      // Two figures, facing each other.
      return '<circle cx="-1.1" cy="-0.9" r="0.7" /><path d="M-2 1.6 Q-1.1 -0.4 -0.2 1.6 Z" /><circle cx="1.1" cy="-0.9" r="0.7" /><path d="M0.2 1.6 Q1.1 -0.4 2 1.6 Z" />';
    case 'find':
      // A leaf.
      return '<path d="M-1.8 1.6 Q-2 -1.6 1.8 -1.8 Q1.6 1.4 -1.8 1.6 Z" /><path d="M-1.6 1.4 L1.2 -1.2" stroke="var(--map-paper)" stroke-width="0.3" />';
    case 'end':
      // Where the region ends: a gate in a hedge.
      return '<path d="M-2.6 1.6 V-0.6 Q-1.8 -1.8 -1 -0.6 V1.6 Z M1 1.6 V-0.6 Q1.8 -1.8 2.6 -0.6 V1.6 Z" /><path d="M-1 0 H1 M-1 1 H1" stroke="currentColor" stroke-width="0.35" />';
  }
}

function pencilPines(): string {
  const out: string[] = [];
  for (let i = 0; i < 13; i++) {
    const x = 6 + i * 5.6 + (i % 2) * 1.4;
    const y = 7 + (i % 3) * 1;
    out.push(`<path d="M${x} ${y - 5} L${x + 1.8} ${y} L${x - 1.8} ${y} Z M${x} ${y - 3} L${x + 2.2} ${y + 1.4} L${x - 2.2} ${y + 1.4} Z" />`);
  }
  return out.join('');
}

/** The guide's pencil map of the region. What lies ahead shows only what kind of place it is; the details are in fog. */
export function mapSvg(s: GameState, interactive: boolean): string {
  const visited = new Set(s.journey.visited);
  const here = s.journey.at;
  const nodes = s.journey.nodes;
  const next = new Set(pathsFrom(s, here).map((p) => p.to));
  const reachable = interactive && s.phase === 'map' && !s.meeting ? next : new Set<string>();
  const byId = new Map(nodes.map((p) => [p.id, p]));

  const paths = nodes.flatMap((a) => a.next.map((to) => {
    const b = byId.get(to)!;
    const c = curve(a, b);
    const walked = visited.has(a.id) && visited.has(b.id);
    const paws = walked
      ? Array.from({ length: 5 }, (_, i) => {
          const [x, y] = c.at((i + 0.5) / 5);
          return `<ellipse cx="${x + (i % 2 ? 0.6 : -0.6)}" cy="${y}" rx="0.4" ry="0.55" />`;
        }).join('')
      : '';
    return `<path d="${c.d}" class="${walked ? 'walked' : 'unwalked'}" />${paws ? `<g class="paws">${paws}</g>` : ''}`;
  })).join('');

  const places = nodes.map((p) => {
    const known = visited.has(p.id);
    const near = next.has(p.id) || p.id === here;
    const cls = ['place', known ? 'known' : 'fog', near || known ? '' : 'far', p.id === here ? 'here' : '', reachable.has(p.id) ? 'reachable' : '', `kind-${p.kind}`].join(' ');
    const act = reachable.has(p.id) ? `data-act="travel" data-to="${p.id}" role="button" tabindex="0" aria-label="Gå mot ${esc(known ? p.name : p.fogName)}"` : '';
    // Only what we know, or what is next, carries a name; further ahead only its kind shows.
    const label = known ? p.name : near ? p.fogName : '';
    const memo = near ? memoryLine(s, p.id) : null;
    return `<g class="${cls}" ${act} transform="translate(${mx(p.x)} ${p.y})">
      ${p.id === here ? '<circle class="ring" r="4.6" />' : ''}
      <circle class="dot" r="3" />
      <g class="glyph">${icon(p)}</g>
      ${label ? `<text y="5.8" text-anchor="middle">${esc(label)}</text>` : ''}
      ${memo ? `<text class="memory ${s.journey.scouted.includes(p.id) ? 'seen' : ''}" y="8.4" text-anchor="middle">${esc(memo)}</text>` : ''}
    </g>`;
  }).join('');

  return `
    <svg class="map-svg" viewBox="0 0 80 100" role="img" aria-label="${esc(guideName(s))}s karta över vägen">
      <defs><filter id="fog" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" /></filter></defs>
      <g class="pines">${pencilPines()}</g>
      <text class="forest-name" x="${mx(FOREST.x)}" y="${FOREST.y}" text-anchor="middle">${FOREST.name}</text>
      <g class="fogbank" filter="url(#fog)">
        <ellipse cx="40" cy="6" rx="44" ry="7" /><ellipse cx="18" cy="40" rx="14" ry="6" /><ellipse cx="64" cy="30" rx="14" ry="5" />
      </g>
      <path class="hills" d="M0 98 Q12 90 24 97 Q36 89 48 96 Q60 90 80 98" />
      <g class="trail">${paths}</g>
      ${places}
    </svg>`;
}

/** What we think a place is: Kvarn's guess with a question, or what the owl saw. Null for places without fog, or already known. */
export function memoryLine(s: GameState, id: string): string | null {
  const p = s.journey.nodes.find((x) => x.id === id);
  if (!p?.memory || s.journey.visited.includes(id)) return null;
  if (s.journey.scouted.includes(id)) return `Sett från ovan: ${p.memory[s.journey.truth[id] ?? 'normal']} ✓`;
  return `${guideName(s)} tror: ${p.memory[s.journey.guess[id] ?? 'normal']}?`;
}

// ---------------------------------------------------------------- the memorial stone

export function memorialHtml(s: GameState): string {
  const lines = s.verses.filter((v) => v.kind === 'memorial');
  if (!lines.length) return '';
  return `
    <section class="memorial-stone" aria-label="Minnesstenen">
      <h3>Minnesstenen</h3>
      ${lines.map((v) => {
        const a = s.animals.find((x) => v.id === `minne-${x.id}`);
        return `<p>${a ? silhouette(a.species, 'currentColor') : ''}<span>${esc(v.text)}</span></p>`;
      }).join('')}
    </section>`;
}

// ---------------------------------------------------------------- the group

export function rosterHtml(s: GameState): string {
  return living(s)
    .map((a) => {
      const chips = animalStatuses(s, a).filter((st) => st.key !== 'safe');
      return `<li style="--owner:${speciesColor(a.species)}">${silhouette(a.species)}
        <span><b>${esc(a.name)}</b>${a.count !== undefined ? ` ×${a.count}` : ''} <span class="muted">✶${a.belief}</span>
        ${chips.map((st) => `<span class="chip tone-${st.tone}" data-tip-icon="${esc(st.icon)}" data-tip-title="${esc(st.label)}" data-tip="${esc(st.explain)}">${st.icon} ${esc(st.label)}</span>`).join(' ')}</span></li>`;
    })
    .join('');
}

// ---------------------------------------------------------------- the campfire

export type Seat = 'watch' | 'scout' | 'ember0' | 'ember1' | 'dark' | 'apart';
export type Seats = Record<string, Seat>;

export const SEAT_NAMES: Record<Seat, string> = {
  watch: 'Vakten',
  scout: 'Spanar',
  ember0: 'Glöd 1',
  ember1: 'Glöd 2',
  dark: 'Mörkret',
  apart: 'Hos kråkan',
};

const canAnyFly = (s: GameState) => living(s).some(canFly);

/** How many fit in each place tonight, after what the crow took. */
export function seatCapacity(s: GameState, seat: Seat): number {
  switch (seat) {
    case 'watch': return 1;
    case 'scout': return canAnyFly(s) ? 1 : 0;
    case 'ember0': return emberPairs(s) >= 1 ? 2 : 0;
    case 'ember1': return emberPairs(s) >= 2 ? 2 : 0;
    case 'dark': return Infinity;
    case 'apart': return 0;
  }
}

export function seatsFromPlan(s: GameState, plan: FirePlan): Seats {
  const seats: Seats = {};
  for (const a of living(s)) seats[a.id] = 'dark';
  for (const id of s.fireDebt.apart) seats[id] = 'apart';
  if (plan.watch) seats[plan.watch] = 'watch';
  if (plan.scout) seats[plan.scout] = 'scout';
  plan.pairs.forEach((p, i) => p.forEach((id) => (seats[id] = i === 0 ? 'ember0' : 'ember1')));
  return seats;
}

/** Only full pairs sit by the embers; a lone animal at an ember is as alone as in the dark. */
export function planFromSeats(seats: Seats, mourning: FirePlan['mourning'], teach?: Teaching): FirePlan {
  const ids = (seat: Seat) => Object.keys(seats).filter((id) => seats[id] === seat);
  const pairs = (['ember0', 'ember1'] as Seat[]).map(ids).filter((p) => p.length === 2) as [string, string][];
  // A teaching only holds while the two still sit together by the embers.
  const together = teach && pairs.some((p) => p.includes(teach.teacher) && p.includes(teach.learner));
  return { watch: ids('watch')[0], scout: ids('scout')[0], pairs, mourning, teach: together ? teach : undefined };
}

/** Who sits in a place, in the order they are drawn. */
export const occupants = (s: GameState, seats: Seats, seat: Seat) => living(s).filter((a) => (seats[a.id] ?? 'dark') === seat).map((a) => a.id);

/**
 * Put an animal in a place, as when dropped there: into a free spot, or swapping
 * with whoever sits on that spot. Some places refuse, and say why.
 */
export function moveToSeat(s: GameState, seats: Seats, id: string, seat: Seat, slot = 0): { seats: Seats; refusal?: string } {
  const a = animal(s, id);
  if (lockedAtFire(s).includes(id)) return { seats, refusal: `${a.name} har redan sin plats i natt.` };
  if (seat === 'apart') return { seats, refusal: 'Den platsen är redan tagen i natt.' };
  if (seat === 'scout' && !canFly(a)) return { seats, refusal: 'Bara den som kan flyga kan spana.' };
  const cap = seatCapacity(s, seat);
  if (cap === 0) return { seats, refusal: 'Kråkan sitter där i natt. Den glöden räcker inte till fler.' };
  const from = seats[id] ?? 'dark';
  if (from === seat) return { seats };
  const next = { ...seats };
  const here = occupants(s, seats, seat).filter((x) => x !== id);
  if (here.length >= cap) {
    // Swap: whoever sat on that spot takes our old place – if they can.
    const other = here[Math.min(slot, here.length - 1)];
    const ok = from !== 'scout' || canFly(animal(s, other));
    next[other] = ok ? from : 'dark';
  }
  next[id] = seat;
  return { seats: next };
}

/** Where each place's spots are in the fire scene, in percent. */
const SPOTS: Record<Seat, [number, number][]> = {
  ember0: [[28, 66], [40, 72]],
  ember1: [[60, 72], [72, 66]],
  watch: [[86, 44]],
  scout: [[50, 12]],
  apart: [[74, 16], [64, 14]],
  dark: [[9, 34], [20, 30], [31, 28], [42, 31], [58, 31], [9, 50], [20, 46], [69, 30]],
};

export function fireSceneSvg(s: GameState, seats: Seats, o: { crow?: boolean; picked?: string } = {}): string {
  const used: Record<Seat, number> = { ember0: 0, ember1: 0, watch: 0, scout: 0, dark: 0, apart: 0 };
  const locked = lockedAtFire(s);
  const tokens = living(s)
    .map((a) => {
      const seat = seats[a.id] ?? 'dark';
      const [x, y] = SPOTS[seat][Math.min(used[seat]++, SPOTS[seat].length - 1)];
      const lock = locked.includes(a.id);
      return `<div class="fire-token seat-${seat} ${o.picked === a.id ? 'picked' : ''} ${lock ? 'locked' : ''}" ${lock ? '' : `data-act="fire-pick" data-drag="${a.id}" tabindex="0" role="button" aria-label="Flytta ${esc(a.name)}"`}
        data-animal="${a.id}" style="left:${x}%;top:${y}%;--owner:${speciesColor(a.species)}">${silhouette(a.species)}<span>${esc(a.name)}</span></div>`;
    })
    .join('');
  const slots = (['ember0', 'ember1', 'watch', 'scout'] as Seat[])
    .filter((seat) => seatCapacity(s, seat) > 0)
    .flatMap((seat) => SPOTS[seat].map(([x, y], i) =>
      `<button class="fire-slot seat-${seat}" data-act="fire-slot" data-seat="${seat}" data-slot="${i}" style="left:${x}%;top:${y}%" aria-label="${SEAT_NAMES[seat]}"></button>`))
    .join('');
  const gone = (['ember0', 'ember1'] as Seat[]).filter((seat) => seatCapacity(s, seat) === 0);
  return `
    <div class="fire-scene ${o.picked ? 'picking' : ''}">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <radialGradient id="glow" cx="50%" cy="64%" r="45%"><stop offset="0" stop-color="#f3b45c" stop-opacity="0.55" /><stop offset="1" stop-color="#f3b45c" stop-opacity="0" /></radialGradient>
        </defs>
        <rect width="100" height="100" fill="#0d121b" />
        <path d="M0 22 L6 8 L12 22 L18 6 L24 22 L30 9 L36 22 L42 5 L48 22 L54 8 L60 22 L66 6 L72 22 L78 9 L84 22 L90 7 L96 22 L100 12 L100 0 L0 0 Z" fill="#070b12" />
        <rect y="22" width="100" height="78" fill="#141c19" />
        <ellipse cx="50" cy="64" rx="48" ry="34" fill="url(#glow)" />
        <ellipse cx="50" cy="68" rx="9" ry="3" fill="#2a1d14" />
        <path class="flame" d="M50 50 C56 58 57 64 50 68 C43 64 44 58 50 50 Z" fill="#e7a24a" />
        <path class="flame inner" d="M50 56 C53 60 53 64 50 67 C47 64 47 60 50 56 Z" fill="#f7dd8f" />
        <ellipse cx="86" cy="51" rx="6" ry="2.4" fill="#2b3530" />
      </svg>
      <button class="fire-dark-zone" data-act="fire-slot" data-seat="dark" aria-label="Mörkret"></button>
      <span class="fire-label ember0 ${gone.includes('ember0') ? 'gone' : ''}">Glöd 1</span><span class="fire-label ember1 ${gone.includes('ember1') ? 'gone' : ''}">${gone.includes('ember1') ? 'Kråkans plats' : 'Glöd 2'}</span>
      <span class="fire-label watch">Vakten</span><span class="fire-label dark">Mörkret</span>
      ${canAnyFly(s) ? '<span class="fire-label scout">Spanar</span>' : ''}
      ${slots}
      ${tokens}
      ${o.crow ? `<div class="fire-crow" aria-hidden="true">${crowSilhouette()}</div>` : ''}
    </div>`;
}

export function firePanelHtml(s: GameState, seats: Seats, mourning: FirePlan['mourning'], hint = '', teach?: Teaching): string {
  const plan = planFromSeats(seats, mourning, teach);
  const problem = planProblem(s, plan);
  const w = plan.watch ? animal(s, plan.watch) : undefined;
  const sc = plan.scout ? animal(s, plan.scout) : undefined;
  const alone = sitsAlone(s, plan);
  const resting = (a: Animal) => a !== w && a !== sc && !s.fireDebt.apart.includes(a.id);
  const healers = living(s).filter((a) => resting(a) && a.injuries.some((k) => k === 'bleeding' || k === 'shock'));
  const notes: string[] = [];
  if (w && hungryWatcher(s, w)) notes.push(`⚠ ${esc(w.name)} är hungrig. Att låta ${esc(w.name)} vaka över de små är ett prov på tillit – det kan gå illa, eller bli början på något nytt.`);
  if (w && w.injuries.some((k) => k === 'bleeding' || k === 'shock')) notes.push(`${esc(w.name)} vakar och får ingen vila – det som kunde läka får vänta.`);
  if (sc) notes.push(`${esc(sc.name)} flyger före i mörkret och ser vad som väntar – i stället för ${esc(guideName(s))}s minne. Men ${esc(sc.name)} får ingen vila och ingen plats vid glöden.`);
  for (const id of s.fireDebt.apart) notes.push(`${esc(animal(s, id).name)} sitter hos kråkan och berättar om dalen i natt – ingen vila, men inte ensam.`);
  for (const id of s.fireDebt.dark) notes.push(`${esc(animal(s, id).name)} gav sin plats vid glöden till kråkan och sitter i mörkret.`);
  if (healers.length) notes.push(`Läker i natt: ${healers.map((a) => esc(a.name)).join(', ')}.`);
  if (alone.length) notes.push(`Sitter ensam i mörkret (−1 tro): ${alone.map((a) => esc(a.name)).join(', ')}.`);
  const lonely = keptPromises(s).find((v) => v.promise.rule === 'noneAlone');
  if (alone.length && lonely) notes.push(`⚠ Bryter löftet ”${esc(lonely.text)}” – −1 hopp, och ${esc(animal(s, lonely.promise.by).name)} tappar 2 tro.`);
  const pairText = plan.pairs
    .map((p) => {
      const n = seats[p[0]] === 'ember0' ? 1 : 2;
      const b = bond(s, p[0], p[1]);
      // Either of them may teach the other, if they are close enough.
      const lessons = [[p[0], p[1]], [p[1], p[0]]].flatMap(([t, l]) => teachable(s, t, l).map((k) => ({ t, l, k })));
      const on = (x: { t: string; l: string; k: string }) => plan.teach?.teacher === x.t && plan.teach.learner === x.l && plan.teach.skill === x.k;
      const teachRow = lessons.length
        ? `<div class="teach-row">${lessons.map((x) => `<button class="seg ${on(x) ? 'on' : ''}" data-act="fire-teach" data-teacher="${x.t}" data-learner="${x.l}" data-skill="${x.k}">${esc(animal(s, x.t).name)} lär ${esc(animal(s, x.l).name)}: ${esc(CARDS[x.k as CardKind].name)}</button>`).join('')}</div>`
        : b < TEACH_BOND ? ` <span class="muted small">Vid band ${TEACH_BOND} kan de lära varandra.</span>` : '';
      return `<li><b>Glöd ${n}:</b> ${esc(animal(s, p[0]).name)} och ${esc(animal(s, p[1]).name)} <span class="muted">(band ${b} → ${Math.min(3, b + 1)}, båda +1 tro)</span>${teachRow}</li>`;
    })
    .join('');
  if (plan.teach) notes.push(`${esc(animal(s, plan.teach.teacher).name)} lär ${esc(animal(s, plan.teach.learner).name)} ${esc(CARDS[plan.teach.skill].name)} i natt – ingen av dem vilar, och det som kunde läka får vänta.`);

  return `
    ${s.unmourned.length ? `<section class="fire-step">
      <h3>De vi förlorade</h3>
      ${s.unmourned.map((id) => {
        const d = animal(s, id);
        const verse = s.verses.find((v) => v.id === `minne-${id}`)?.text ?? '';
        const choice = mourning[id];
        return `<div class="mourn">
          ${silhouette(d.species, 'var(--paper-dim)')}
          <div><p class="verse-line">${esc(verse)}</p>
          <p class="muted small">${esc(inheritanceLine(s, id) ?? '')}</p>
          <div class="seg-row">
            <button class="seg ${choice === 'bury' ? 'on' : ''}" data-act="fire-mourn" data-dead="${id}" data-choice="bury">Begrav</button>
            <button class="seg ${choice === 'carry' ? 'on' : ''}" data-act="fire-mourn" data-dead="${id}" data-choice="carry">Bär med oss</button>
          </div>
          <p class="small">${choice === 'carry'
            ? `Minnet förblir starkt (+2 tro, −1 hopp när det spelas), men de som stod ${esc(d.name)} nära sörjer och tvivlar lättare.`
            : 'Sorgen får vila. Minneskortet blir mildare: +1 tro, och inget hopp förloras.'}</p></div>
        </div>`;
      }).join('')}
    </section>` : ''}
    <section class="fire-step">
      <h3>Vem sitter var?</h3>
      <p class="muted small">Dra djuren till sina platser vid elden – eller tryck på ett djur och sedan på en plats. En håller vakt och får ingen vila. ${emberPairs(s)} par får plats vid glöden – de pratar och kommer varandra närmare. Den som inte får plats sitter ensam i mörkret.${canAnyFly(s) ? ' Den som kan flyga kan spana framåt.' : ''}</p>
      ${hint ? `<p class="fire-hint">${esc(hint)}</p>` : ''}
      <ul class="seat-summary">${living(s).map((a) => `<li style="--owner:${speciesColor(a.species)}">${silhouette(a.species)}<b>${esc(a.name)}</b> <span class="muted">✶${a.belief}</span> <span class="seat-tag">${SEAT_NAMES[seats[a.id] ?? 'dark']}</span></li>`).join('')}</ul>
      ${pairText ? `<ul class="pair-list">${pairText}</ul>` : ''}
      ${notes.length ? `<ul class="fire-notes">${notes.map((n) => `<li>${n}</li>`).join('')}</ul>` : ''}
    </section>
    <div class="fire-go">
      <button class="btn primary" data-act="fire-rest" ${problem ? 'disabled' : ''}>Låt natten gå</button>
      <span class="muted small">${problem ? esc(problem) : 'Elden ger +1 hopp. Blödning och chock läker för alla som får vila.'}</span>
    </div>`;
}

// ---------------------------------------------------------------- meetings

/** A meeting in frames: the crow on its branch, who speaks, the words, and our replies. */
export function meetingHtml(s: GameState, picker = ''): string {
  const m = s.meeting;
  const frame = currentFrame(s);
  if (!m || !frame) return '';
  const options = meetingOptions(s);
  const speaker = (by?: string) => (by ? animal(s, by) : undefined);
  const proposer = m.id === 'proposal' && s.proposal ? animal(s, s.proposal.by) : undefined;
  const card = frame.card?.(s);
  // The one asking stands in the picture; whoever answered last faces them (or the crow).
  const def = MEETINGS[m.id];
  const main = proposer
    ? `<div class="meet-proposer" style="color:${speciesColor(proposer.species)}">${silhouette(proposer.species)}<span>${esc(proposer.name)}</span></div>`
    : def.art === 'crow' ? `${crowSilhouette()}<div class="meet-branch"></div>` : def.art === 'proposer' ? '' : `<div class="meet-thing">${sceneArt(def.art)}</div>`;
  const facing = m.by && m.by !== proposer?.id ? speaker(m.by) : undefined;
  return `
    <div class="modal meeting" role="dialog" aria-modal="true" aria-labelledby="meet-title">
      <div class="modal-card meeting-card ${m.id}" data-frame="${m.frame}">
        <div class="meet-art">${main}
          ${facing ? `<div class="meet-speaker" style="color:${speciesColor(facing.species)}">${silhouette(facing.species)}<span>${esc(facing.name)}</span></div>` : ''}</div>
        <div class="meet-body">
          <h2 id="meet-title">${esc(typeof def.title === 'function' ? def.title(s) : def.title)}</h2>
          <p class="meet-text ${frame.speaker === 'story' ? 'story' : ''}">${esc(frame.text(s))}</p>
          ${card ? `<div class="promise-card"><b>${esc(card.title)}</b>${card.lines.map((l) => `<span>${esc(l)}</span>`).join('')}</div>` : ''}
          ${picker || `<div class="meet-options">${options.map((o) => {
            const a = speaker(speakerOf(s, o));
            const odds = o.chance ? ` <span class="chip tone-warn">${Math.round(o.chance(s) * 100)} % chans</span>` : '';
            return `<button class="btn option meet-option ${a ? 'by-animal' : ''}" data-act="meet" data-option="${o.id}" ${a ? `style="--owner:${speciesColor(a.species)}"` : ''}>
              ${a ? `${silhouette(a.species)}<b>${esc(a.name)}</b>` : '<b>Eden</b>'}<span>${esc(labelOf(s, o))}${odds}</span></button>`;
          }).join('')}</div>`}
        </div>
      </div>
    </div>`;
}

// ---------------------------------------------------------------- the guide

type ZoneRole = 'start' | 'goal' | 'cover' | 'danger' | 'hidden' | 'plain';

function zoneRole(z: ZoneDef): ZoneRole {
  if (z.hidden) return 'hidden';
  if (z.goal) return 'goal';
  if (z.start) return 'start';
  if (z.cover) return 'cover';
  if (z.road || z.exposed || z.water) return 'danger';
  return 'plain';
}

const ROLE_NAMES: Record<ZoneRole, string> = {
  start: 'start',
  goal: 'målet',
  cover: 'skydd',
  danger: 'öppet – faran slår här',
  hidden: 'gömd väg',
  plain: 'öppet',
};

/** A pencil sketch of the board, drawn from the encounter's own zones. Hidden zones show as ? until found. */
export function zoneSketchSvg(def: EncounterDef, revealed: string[]): string {
  const zones = [...def.zones].sort((a, b) => Number(!!a.hidden) - Number(!!b.hidden));
  const top = Math.min(...def.zones.map((z) => z.rect[1]));
  const rects = zones
    .map((z) => {
      const [x, y, w, h] = z.rect;
      const role = zoneRole(z);
      const known = !z.hidden || revealed.includes(z.id);
      const label = known ? z.label : '?';
      const tall = h * 5 > w * 4 * 1.2;
      const cx = (x + w / 2) * 4;
      const cy = (y - top + h / 2) * 5;
      // Small caps run about 0.62 em per letter; shrink the label to fit its box.
      const room = (tall ? h * 5 : w * 4) - 14;
      const size = Math.min(21, Math.max(11, room / (label.length * 0.62 + (z.goal ? 1.4 : 0))));
      return `<g class="sk-zone ${role}" data-zone="${z.id}">
        <rect x="${x * 4 + 2}" y="${(y - top) * 5 + 2}" width="${w * 4 - 4}" height="${h * 5 - 4}" rx="6"/>
        <text x="${cx}" y="${cy}" style="font-size:${size.toFixed(1)}px" ${tall ? `transform="rotate(-90 ${cx} ${cy})"` : ''}>${esc(label)}${z.goal ? ' ★' : ''}</text>
      </g>`;
    })
    .join('');
  return `<svg class="zone-sketch" viewBox="0 0 400 ${(100 - top) * 5}" role="img" aria-label="Skiss över platsen">${rects}</svg>`;
}

function legendHtml(def: EncounterDef): string {
  const roles = [...new Set(def.zones.map(zoneRole))];
  return `<div class="sk-legend">${roles.map((r) => `<span><i class="sk-swatch ${r}"></i>${ROLE_NAMES[r]}</span>`).join('')}</div>`;
}

function rowsHtml(rows: GuideRow[]): string {
  return `<ul class="guide-rows">${rows
    .map((r) => `<li><span class="g-icon">${esc(r.icon)}</span><div><b>${esc(r.name)}</b>${r.effect ? ` <span class="chip ${r.effect === 'dödar' ? 'tone-bad' : 'tone-warn'}">${r.effect}</span>` : ''}<p>${esc(r.text)}</p></div></li>`)
    .join('')}</ul>`;
}

/** The rulebook for the area we stand in: goal, board, the hour, dangers, shelter, tips. */
export function guideHtml(s: GameState): string {
  const def = encounterOf(s);
  const g = GUIDES[def.id];
  return `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="guide-title">
      <div class="modal-card guide-modal">
        <div class="deck-head"><h2 id="guide-title">${esc(g.title)}</h2><button class="btn small" data-act="guide-close">Stäng</button></div>
        <section class="guide-goal"><h3>Målet</h3><p>${esc(g.goal)}</p>${g.hard ? `<p class="small guide-hard ${s.variant === 'hard' ? 'now' : ''}">${s.variant === 'hard' ? '<b>Nu:</b> ' : ''}${esc(g.hard)}</p>` : ''}</section>
        ${def.fixedTime ? `<section class="guide-time"><h3>Tid</h3><p>${esc(TIME_NOTES[def.id][def.fixedTime])}</p></section>` : `<section class="guide-time"><h3>Dag och natt</h3><ul>${(['night', 'day'] as const)
          .map((t) => `<li class="${t === s.time ? 'now' : ''}"><b>${t === 'night' ? '☾ Natt' : '☼ Dag'}${t === s.time ? ` – nu, i ${TIME_NAMES[t]}` : ''}:</b> ${esc(TIME_NOTES[def.id][t])}</li>`)
          .join('')}</ul></section>`}
        <div class="guide-top">
          <section class="guide-sketch"><h3>Kartskiss</h3>${zoneSketchSvg(def, s.revealed)}${legendHtml(def)}</section>
          <section><h3>Så går en timme</h3><ol class="guide-steps">${HOUR_STEPS.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></section>
        </div>
        <div class="guide-cols">
          <section><h3>Faror</h3>${rowsHtml([...g.dangers, ...HIT_ROWS])}</section>
          <section><h3>Skydd &amp; knep</h3>${rowsHtml(g.shelter)}</section>
        </div>
        ${s.rescue ? `<section><h3>Någon att rädda</h3>${rowsHtml(RESCUE_ROWS)}</section>` : ''}
        <section class="guide-tips"><h3>Tips</h3><ul>${g.tips.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>
        <button class="btn primary" data-act="guide-close">Jag förstår</button>
      </div>
    </div>`;
}
