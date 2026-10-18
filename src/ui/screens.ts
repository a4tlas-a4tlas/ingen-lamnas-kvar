// HTML for the screens between encounters: the guide's map, the campfire and
// the memorial stone. Pure functions of state (plus the campfire plan).
import { FOREST, PATHS, PLACES, pathsFrom, type Place } from '../data/journey';
import { EMBER_PAIRS, type FirePlan, hungryWatcher, inheritanceLine, living, planProblem, sitsAlone } from '../engine/campfire';
import { encounterOf, type EncounterDef, type ZoneDef } from '../engine/encounters';
import { animal, bond } from '../engine/rules';
import { GUIDES, HIT_ROWS, HOUR_STEPS, type GuideRow } from '../data/guides.sv';
import type { Animal, GameState } from '../engine/types';
import { silhouette, speciesColor } from './silhouettes';
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

function icon(p: Place): string {
  switch (p.kind) {
    case 'start':
      return '<path d="M-2.4 1.2 Q-1.2 -1.6 0 0.4 Q1.2 -1.8 2.4 1.2 Z" />';
    case 'encounter':
      return '<rect x="-2.2" y="-0.9" width="4.4" height="1.8" rx="0.3" /><path d="M-1.6 0 h0.8 M-0.2 0 h0.8 M1.2 0 h0.6" stroke="var(--map-paper)" stroke-width="0.3" />';
    case 'campfire':
      return '<path d="M0 -2 C1.2 -0.6 1.4 0.6 0 1.5 C-1.4 0.6 -1.2 -0.6 0 -2 Z" fill="var(--map-fire)" /><path d="M-1.6 1.7 L1.6 1.1 M-1.6 1.1 L1.6 1.7" stroke="currentColor" stroke-width="0.35" />';
    case 'end':
      return '<path d="M-2.2 -1 Q0 -1.6 2.2 -1 M-2.2 0.1 Q0 -0.5 2.2 0.1 M-2.2 1.2 Q0 0.6 2.2 1.2" fill="none" stroke="currentColor" stroke-width="0.35" />';
  }
}

function pencilPines(): string {
  const out: string[] = [];
  for (let i = 0; i < 13; i++) {
    const x = 6 + i * 5.6 + (i % 2) * 1.4;
    const y = 12 + (i % 3) * 1.6;
    out.push(`<path d="M${x} ${y - 7} L${x + 2.4} ${y} L${x - 2.4} ${y} Z M${x} ${y - 4.5} L${x + 3} ${y + 2} L${x - 3} ${y + 2} Z" />`);
  }
  return out.join('');
}

/** The guide's pencil map. Unvisited places sit in fog under half-remembered names. */
export function mapSvg(s: GameState, interactive: boolean): string {
  const visited = new Set(s.journey.visited);
  const here = s.journey.at;
  const reachable = interactive && s.phase === 'map' ? new Set(pathsFrom(here).map((p) => p.to)) : new Set<string>();
  const byId = new Map(PLACES.map((p) => [p.id, p]));

  const paths = PATHS.map((p) => {
    const a = byId.get(p.from)!, b = byId.get(p.to)!;
    const c = curve(a, b);
    const walked = visited.has(p.from) && visited.has(p.to);
    const paws = walked
      ? Array.from({ length: 7 }, (_, i) => {
          const [x, y] = c.at((i + 0.5) / 7);
          return `<ellipse cx="${x + (i % 2 ? 0.7 : -0.7)}" cy="${y}" rx="0.45" ry="0.6" />`;
        }).join('')
      : '';
    return `<path d="${c.d}" class="${walked ? 'walked' : 'unwalked'}" />${paws ? `<g class="paws">${paws}</g>` : ''}`;
  }).join('');

  const places = PLACES.map((p) => {
    const known = visited.has(p.id);
    const cls = ['place', known ? 'known' : 'fog', p.id === here ? 'here' : '', reachable.has(p.id) ? 'reachable' : ''].join(' ');
    const act = reachable.has(p.id) ? `data-act="travel" data-to="${p.id}" role="button" tabindex="0" aria-label="Gå mot ${esc(known ? p.name : p.fogName)}"` : '';
    return `<g class="${cls}" ${act} transform="translate(${mx(p.x)} ${p.y})">
      ${p.id === here ? '<circle class="ring" r="5.2" />' : ''}
      <circle class="dot" r="3.4" />
      <g class="glyph">${icon(p)}</g>
      <text y="7.4" text-anchor="middle">${esc(known ? p.name : p.fogName)}</text>
    </g>`;
  }).join('');

  return `
    <svg class="map-svg" viewBox="0 0 80 100" role="img" aria-label="Kvarns karta över vägen">
      <defs><filter id="fog" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" /></filter></defs>
      <g class="pines">${pencilPines()}</g>
      <text class="forest-name" x="${mx(FOREST.x)}" y="${FOREST.y + 15}" text-anchor="middle">${FOREST.name}</text>
      <g class="fogbank" filter="url(#fog)">
        <ellipse cx="40" cy="10" rx="44" ry="10" /><ellipse cx="20" cy="30" rx="16" ry="7" /><ellipse cx="62" cy="34" rx="16" ry="6" />
      </g>
      <path class="hills" d="M0 96 Q12 86 24 94 Q36 84 48 93 Q60 85 80 95" />
      <g class="trail">${paths}</g>
      ${places}
    </svg>`;
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

export type Seat = 'watch' | 'ember0' | 'ember1' | 'dark';
export type Seats = Record<string, Seat>;

export function seatsFromPlan(s: GameState, plan: FirePlan): Seats {
  const seats: Seats = {};
  for (const a of living(s)) seats[a.id] = 'dark';
  if (plan.watch) seats[plan.watch] = 'watch';
  plan.pairs.forEach((p, i) => p.forEach((id) => (seats[id] = i === 0 ? 'ember0' : 'ember1')));
  return seats;
}

/** Only full pairs sit by the embers; a lone animal at an ember is as alone as in the dark. */
export function planFromSeats(seats: Seats, mourning: FirePlan['mourning']): FirePlan {
  const ids = (seat: Seat) => Object.keys(seats).filter((id) => seats[id] === seat);
  const pairs = (['ember0', 'ember1'] as Seat[]).map(ids).filter((p) => p.length === 2) as [string, string][];
  return { watch: ids('watch')[0], pairs, mourning };
}

/** Seat an animal, keeping one watcher and at most two per ember. */
export function assignSeat(seats: Seats, id: string, seat: Seat): Seats {
  const next = { ...seats };
  const others = Object.keys(next).filter((x) => x !== id && next[x] === seat);
  if (seat === 'watch') others.forEach((x) => (next[x] = 'dark'));
  if ((seat === 'ember0' || seat === 'ember1') && others.length >= 2) next[others[0]] = 'dark';
  next[id] = seat;
  return next;
}

export function fireSceneSvg(s: GameState, seats: Seats): string {
  const spots: Record<Seat, [number, number][]> = {
    ember0: [[28, 66], [40, 72]],
    ember1: [[60, 72], [72, 66]],
    watch: [[86, 42]],
    dark: [[9, 36], [21, 31], [33, 29], [67, 29], [79, 31], [50, 27]],
  };
  const used: Record<Seat, number> = { ember0: 0, ember1: 0, watch: 0, dark: 0 };
  const tokens = living(s)
    .map((a) => {
      const seat = seats[a.id] ?? 'dark';
      const [x, y] = spots[seat][Math.min(used[seat]++, spots[seat].length - 1)];
      return `<div class="fire-token seat-${seat}" style="left:${x}%;top:${y}%;--owner:${speciesColor(a.species)}">${silhouette(a.species)}<span>${esc(a.name)}</span></div>`;
    })
    .join('');
  return `
    <div class="fire-scene">
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
        <ellipse cx="86" cy="49" rx="6" ry="2.4" fill="#2b3530" />
      </svg>
      <span class="fire-label ember0">Glöd 1</span><span class="fire-label ember1">Glöd 2</span>
      <span class="fire-label watch">Vakten</span><span class="fire-label dark">Mörkret</span>
      ${tokens}
    </div>`;
}

export function firePanelHtml(s: GameState, seats: Seats, mourning: FirePlan['mourning']): string {
  const plan = planFromSeats(seats, mourning);
  const problem = planProblem(s, plan);
  const w = plan.watch ? animal(s, plan.watch) : undefined;
  const alone = sitsAlone(s, plan);
  const healers = living(s).filter((a) => a !== w && a.injuries.some((k) => k === 'bleeding' || k === 'shock'));
  const notes: string[] = [];
  if (w && hungryWatcher(s, w)) notes.push(`⚠ ${esc(w.name)} är hungrig. Att låta ${esc(w.name)} vaka över de små är ett prov på tillit – det kan gå illa, eller bli början på något nytt.`);
  if (w && w.injuries.some((k) => k === 'bleeding' || k === 'shock')) notes.push(`${esc(w.name)} vakar och får ingen vila – det som kunde läka får vänta.`);
  if (healers.length) notes.push(`Läker i natt: ${healers.map((a) => esc(a.name)).join(', ')}.`);
  if (alone.length) notes.push(`Sitter ensam i mörkret (−1 tro): ${alone.map((a) => esc(a.name)).join(', ')}.`);

  const seatBtn = (a: Animal, seat: Seat, label: string) =>
    `<button class="seg ${seats[a.id] === seat ? 'on' : ''}" data-act="fire-seat" data-animal="${a.id}" data-seat="${seat}" aria-pressed="${seats[a.id] === seat}">${label}</button>`;
  const pairText = plan.pairs
    .map((p) => {
      const n = seats[p[0]] === 'ember0' ? 1 : 2;
      const b = bond(s, p[0], p[1]);
      return `<li><b>Glöd ${n}:</b> ${esc(animal(s, p[0]).name)} och ${esc(animal(s, p[1]).name)} <span class="muted">(band ${b} → ${Math.min(3, b + 1)}, båda +1 tro)</span></li>`;
    })
    .join('');

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
      <p class="muted small">En håller vakt och får ingen vila. ${EMBER_PAIRS} par får plats vid glöden – de pratar och kommer varandra närmare. Den som inte får plats sitter ensam i mörkret.</p>
      <ul class="seat-list">
        ${living(s).map((a) => `<li>
          ${silhouette(a.species)}<span class="seat-name"><b>${esc(a.name)}</b> <span class="muted">✶${a.belief}</span></span>
          <span class="seg-row">${seatBtn(a, 'watch', 'Vakt')}${seatBtn(a, 'ember0', 'Glöd 1')}${seatBtn(a, 'ember1', 'Glöd 2')}${seatBtn(a, 'dark', 'Mörkret')}</span>
        </li>`).join('')}
      </ul>
      ${pairText ? `<ul class="pair-list">${pairText}</ul>` : ''}
      ${notes.length ? `<ul class="fire-notes">${notes.map((n) => `<li>${n}</li>`).join('')}</ul>` : ''}
    </section>
    <div class="fire-go">
      <button class="btn primary" data-act="fire-rest" ${problem ? 'disabled' : ''}>Låt natten gå</button>
      <span class="muted small">${problem ? esc(problem) : 'Elden ger +1 hopp. Blödning och chock läker för alla utom vakten.'}</span>
    </div>`;
}

// ---------------------------------------------------------------- the guide

type ZoneRole = 'start' | 'goal' | 'cover' | 'danger' | 'hidden' | 'plain';

function zoneRole(z: ZoneDef): ZoneRole {
  if (z.hidden) return 'hidden';
  if (z.goal) return 'goal';
  if (z.start) return 'start';
  if (z.cover) return 'cover';
  if (z.road || z.exposed) return 'danger';
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
        <section class="guide-goal"><h3>Målet</h3><p>${esc(g.goal)}</p></section>
        <div class="guide-top">
          <section class="guide-sketch"><h3>Kartskiss</h3>${zoneSketchSvg(def, s.revealed)}${legendHtml(def)}</section>
          <section><h3>Så går en timme</h3><ol class="guide-steps">${HOUR_STEPS.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></section>
        </div>
        <div class="guide-cols">
          <section><h3>Faror</h3>${rowsHtml([...g.dangers, ...HIT_ROWS])}</section>
          <section><h3>Skydd &amp; knep</h3>${rowsHtml(g.shelter)}</section>
        </div>
        <section class="guide-tips"><h3>Tips</h3><ul>${g.tips.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>
        <button class="btn primary" data-act="guide-close">Jag förstår</button>
      </div>
    </div>`;
}
