import { CAST } from '../data/animals';
import { CARDS, TAG_NAMES } from '../data/cards';
import { HOPE_LINES, KRAFT_OUT_LINES } from '../data/text.sv';
import { encounterOf, zoneDef } from '../engine/encounters';
import { TRAITS } from '../data/traits';
import { VERSES, VERSE_IDS } from '../data/verses';
import { Sound } from '../audio/sound';
import { randomSeed } from '../engine/rng';
import {
  animal,
  bond,
  canLure,
  cardBlockReason,
  cardAnimals,
  cardCost,
  cardTarget,
  handSize,
  cardZones,
  isLethal,
  isPresent,
  lastMomentShields,
  leadBlockReason,
  leadCost,
  leadTargets,
  leadZones,
  lureZones,
  moonHidden,
  verseStatus,
} from '../engine/rules';
import { OATH_VERSES, createGame } from '../engine/setup';
import { step } from '../engine/step';
import type { Action, Animal, Card, GameEvent, GameState, LogEntry, VerseId, ZoneId } from '../engine/types';
import { sceneSvg, slotIn } from './scene';
import { assignSeat, fireSceneSvg, firePanelHtml, guideHtml, mapSvg, memorialHtml, planFromSeats, rosterHtml, seatsFromPlan, type Seat, type Seats } from './screens';
import { defaultPlan } from '../engine/campfire';
import { pathsFrom, place } from '../data/journey';
import { dogSilhouette, silhouette, speciesColor } from './silhouettes';
import { ALARM_MAX, dogDestination } from '../engine/encounters/farm';
import { animalStatuses, forecast, type Status } from './status';

const SAVE_KEY = 'ingen-lamnas-kvar/save-v1';
const GUIDES_SEEN_KEY = 'ingen-lamnas-kvar/guides-seen';

/** Whether this browser has already been shown the guide for an area; marks it as seen. */
function firstVisit(id: string): boolean {
  try {
    const seen = JSON.parse(localStorage.getItem(GUIDES_SEEN_KEY) ?? '[]') as string[];
    if (seen.includes(id)) return false;
    localStorage.setItem(GUIDES_SEEN_KEY, JSON.stringify([...seen, id]));
  } catch {
    // No storage: show the guide every time rather than never.
  }
  return true;
}

type Sel = { mode: 'idle' } | { mode: 'card'; uid: number; animal?: string } | { mode: 'lead' | 'lure'; animal?: string };

const esc = (t: string) => t.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);
type DeckView = 'draw' | 'discard' | 'all';

/** Cards sorted by the animal they belong to, so each one's cards sit together. */
function byOwner(s: GameState, cards: Card[]): Card[] {
  const order = (c: Card) => s.animals.findIndex((a) => a.id === c.owner);
  return [...cards].sort((a, b) => order(a) - order(b) || a.kind.localeCompare(b.kind) || a.uid - b.uid);
}

/** One card face, shared by the hand and the deck checker. */
function cardFaceHtml(s: GameState, c: Card, o: { tag: 'button' | 'div'; attrs?: string; classes?: string[]; footer?: string }): string {
  const def = CARDS[c.kind];
  const owner = animal(s, c.owner);
  const memory = c.kind === 'minne';
  const classes = ['card', `tag-${def.tag}`, memory ? 'memory' : '', ...(o.classes ?? [])].filter(Boolean).join(' ');
  return `<${o.tag} class="${classes}" ${o.attrs ?? ''} data-owner="${c.owner}" style="--owner:${memory ? '#2a2e3b' : speciesColor(owner.species)}">
    <span class="cband">
      ${silhouette(owner.species, memory ? 'var(--paper)' : 'var(--ink)')}
      <span class="cowner">${memory ? 'Minnet av ' : ''}${esc(owner.name)}</span>
      <span class="ccost" title="Kraft">${cardCost(s, c)}</span>
    </span>
    <span class="cname">${esc(def.name)}</span>
    <span class="ctag">${TAG_NAMES[def.tag]}</span>
    <span class="ctext">${esc((c.buried ? 'Vi minns {o}, som vilar under granarna. Alla får +1 tro.' : def.text).replace(/\{o\}/g, owner.name))}</span>
    ${c.inheritedFrom ? `<span class="cwhere">${esc(animal(s, c.inheritedFrom).name)}s minne</span>` : ''}
    ${o.footer ?? ''}
  </${o.tag}>`;
}

function chipHtml(st: Status, withLabel: boolean): string {
  const tip = `data-tip-icon="${esc(st.icon)}" data-tip-title="${esc(st.label)}" data-tip="${esc(st.explain)}"`;
  return `<span class="chip tone-${st.tone}${st.intent ? ' intent' : ''}" ${tip} aria-label="${esc(`${st.label}: ${st.explain}`)}">${st.icon}${withLabel ? ` ${esc(st.label)}` : ''}</span>`;
}

const kindName = (id: string) => CAST.find((d) => d.id === id)?.kindName ?? '';

function loadSave(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    return s.version === 4 && s.phase !== 'over' ? s : null;
  } catch {
    return null;
  }
}

function writeSave(s: GameState | null) {
  try {
    if (s && s.phase !== 'over') localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    else localStorage.removeItem(SAVE_KEY);
  } catch {
    // Saving is a convenience; the game works without it.
  }
}

export class App {
  private state: GameState | null = null;
  private sel: Sel = { mode: 'idle' };
  private inspect: string | null = null;
  private oathPick: VerseId[] = [];
  private deckView: DeckView | null = null;
  private mapOpen = false;
  private guideOpen = false;
  private fireSeats: Seats | null = null;
  private fireMourning: Record<string, 'bury' | 'carry'> = {};
  private mounted = false;
  private busy = false;
  private hint = '';
  private sound = new Sound();
  private tip = document.createElement('div');

  constructor(private root: HTMLElement) {
    root.addEventListener('click', (e) => this.onClick(e));
    root.addEventListener('pointerover', (e) => {
      this.highlightOwner(e, true);
      this.showTip(e);
    });
    root.addEventListener('pointerout', (e) => {
      this.highlightOwner(e, false);
      if ((e.target as HTMLElement).closest('[data-tip]')) this.tip.hidden = true;
    });
    this.tip.className = 'tooltip';
    this.tip.hidden = true;
    this.tip.setAttribute('role', 'tooltip');
    document.body.appendChild(this.tip);
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (this.deckView || this.guideOpen || this.mapOpen) {
        this.deckView = null;
        this.guideOpen = false;
        this.mapOpen = false;
        if (this.state) this.render();
      } else this.cancel();
    });
    this.renderTitle();
  }

  // ------------------------------------------------------------ flow

  private onClick(e: Event) {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!el || el.hasAttribute('disabled')) return;
    const act = el.dataset.act!;
    if (act !== 'mute') this.sound.start();
    switch (act) {
      case 'new':
        this.state = createGame(randomSeed());
        this.oathPick = [];
        this.fireSeats = null;
        this.mapOpen = false;
        this.mounted = false;
        writeSave(this.state);
        this.render();
        break;
      case 'continue':
        this.state = loadSave();
        this.mounted = false;
        this.render();
        break;
      case 'title':
        this.state = null;
        this.mounted = false;
        this.renderTitle();
        break;
      case 'mute':
        this.sound.setMuted(!this.sound.muted);
        this.sound.start();
        this.render();
        break;
      case 'verse-toggle': {
        const v = el.dataset.verse as VerseId;
        this.oathPick = this.oathPick.includes(v) ? [] : [v];
        this.render();
        break;
      }
      case 'swear':
        this.dispatch({ type: 'swear', verses: this.oathPick });
        break;
      default:
        if (!this.busy) this.onGameClick(act, el);
    }
  }

  private onGameClick(act: string, el: HTMLElement) {
    const s = this.state;
    if (!s) return;
    switch (act) {
      case 'card': {
        const card = s.hand.find((c) => c.uid === Number(el.dataset.uid));
        if (!card) return;
        if (this.sel.mode === 'card' && this.sel.uid === card.uid) return this.cancel();
        const blocked = cardBlockReason(s, card);
        if (blocked) {
          this.hint = blocked;
          return this.render();
        }
        if (cardTarget(card) === 'none') return this.dispatch({ type: 'play', uid: card.uid });
        this.sel = { mode: 'card', uid: card.uid };
        this.hint = '';
        return this.render();
      }
      case 'end':
        this.sel = { mode: 'idle' };
        return this.dispatch({ type: 'endTurn' });
      case 'cancel':
        return this.cancel();
      case 'deck':
        this.deckView = el.dataset.pile as DeckView;
        return this.render();
      case 'deck-close':
        this.deckView = null;
        return this.render();
      case 'guide-open':
        this.guideOpen = true;
        return this.render();
      case 'guide-close':
        this.guideOpen = false;
        return this.render();
      case 'map-open':
        this.mapOpen = true;
        return this.render();
      case 'map-close':
        this.mapOpen = false;
        return this.render();
      case 'travel':
        return this.dispatch({ type: 'travel', to: el.dataset.to! });
      case 'fire-seat':
        if (this.fireSeats) this.fireSeats = assignSeat(this.fireSeats, el.dataset.animal!, el.dataset.seat as Seat);
        return this.render();
      case 'fire-mourn':
        this.fireMourning = { ...this.fireMourning, [el.dataset.dead!]: el.dataset.choice as 'bury' | 'carry' };
        return this.render();
      case 'fire-rest': {
        if (!this.fireSeats) return;
        const plan = planFromSeats(this.fireSeats, this.fireMourning);
        return this.dispatch({ type: 'restAtFire', watch: plan.watch, pairs: plan.pairs, mourning: plan.mourning });
      }
      case 'lure':
        if (this.sel.mode === 'lead' && this.sel.animal) this.sel = { mode: 'lure', animal: this.sel.animal };
        else if (this.sel.mode === 'lure') this.sel = { mode: 'lead', animal: this.sel.animal };
        this.hint = '';
        return this.render();
      case 'animal':
        return this.pickAnimal(el.dataset.animal!);
      case 'zone':
        return this.pickZone(el.dataset.zone as ZoneId);
      case 'lm-shield':
        return this.dispatch({ type: 'lastMoment', choice: 'shield', by: el.dataset.animal! });
      case 'lm-letgo':
        return this.dispatch({ type: 'lastMoment', choice: 'letGo' });
    }
  }

  /** Hovering a status symbol explains what it does. */
  private showTip(e: Event) {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-tip]');
    if (!el) return;
    this.tip.innerHTML = `<b>${esc(el.dataset.tipIcon ?? '')} ${esc(el.dataset.tipTitle ?? '')}</b><span>${esc(el.dataset.tip ?? '')}</span>`;
    this.tip.hidden = false;
    const r = el.getBoundingClientRect();
    const w = this.tip.offsetWidth;
    const h = this.tip.offsetHeight;
    const left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2));
    const top = r.top - h - 8 >= 8 ? r.top - h - 8 : r.bottom + 8;
    this.tip.style.left = `${left + window.scrollX}px`;
    this.tip.style.top = `${top + window.scrollY}px`;
  }

  private highlightOwner(e: Event, on: boolean) {
    const card = (e.target as HTMLElement).closest<HTMLElement>('.card[data-owner]');
    if (!card) return;
    this.root.querySelector(`.token[data-animal="${card.dataset.owner}"]`)?.classList.toggle('card-owner', on);
  }

  private cancel() {
    this.sel = { mode: 'idle' };
    this.hint = '';
    if (this.state) this.render();
  }

  private selectedCard(): Card | undefined {
    const sel = this.sel;
    return sel.mode === 'card' ? this.state?.hand.find((c) => c.uid === sel.uid) : undefined;
  }

  private targetAnimals(): string[] {
    const s = this.state!;
    const card = this.selectedCard();
    if (card) {
      const spec = cardTarget(card);
      if ((spec === 'animal' || spec === 'animalZone') && this.sel.mode === 'card' && !this.sel.animal) return cardAnimals(s, card);
      return [];
    }
    return [];
  }

  private targetZones(): ZoneId[] {
    const s = this.state!;
    const card = this.selectedCard();
    if (card) {
      const spec = cardTarget(card);
      if (spec === 'zone') return cardZones(s, card);
      if (spec === 'animalZone' && this.sel.mode === 'card' && this.sel.animal) return cardZones(s, card);
      return [];
    }
    if (this.sel.mode === 'lead' && this.sel.animal) return leadZones(s, animal(s, this.sel.animal));
    if (this.sel.mode === 'lure' && this.sel.animal) return lureZones(s, animal(s, this.sel.animal));
    return [];
  }

  private pickAnimal(id: string) {
    const s = this.state!;
    const card = this.selectedCard();
    if (card && this.sel.mode === 'card' && this.targetAnimals().includes(id)) {
      if (cardTarget(card) === 'animal') return this.dispatch({ type: 'play', uid: card.uid, target: id });
      this.sel = { ...this.sel, animal: id };
      return this.render();
    }
    // While a card moves its owner, tapping an animal in a lit zone picks that zone.
    const zone = animal(s, id).zone;
    if ((card || this.sel.mode === 'lure') && this.targetZones().includes(zone)) return this.pickZone(zone);

    // Otherwise tapping an animal selects it: we see it, and lead it if it can go.
    this.hint = '';
    this.inspect = id;
    if ((this.sel.mode === 'lead' || this.sel.mode === 'lure') && this.sel.animal === id) this.sel = { mode: 'idle' };
    else if (s.phase === 'play' && leadTargets(s).includes(id)) this.sel = { mode: 'lead', animal: id };
    else this.sel = { mode: 'idle' };
    this.render();
  }

  private pickZone(zone: ZoneId) {
    if (!this.targetZones().includes(zone)) return;
    const card = this.selectedCard();
    if (card && this.sel.mode === 'card') {
      return this.dispatch({ type: 'play', uid: card.uid, target: this.sel.animal, zone });
    }
    if (this.sel.mode === 'lead' && this.sel.animal) this.dispatch({ type: 'lead', target: this.sel.animal, zone });
    if (this.sel.mode === 'lure' && this.sel.animal) this.dispatch({ type: 'lure', target: this.sel.animal, zone });
  }

  private dispatch(action: Action) {
    if (!this.state) return;
    const prevKraft = this.state.kraft;
    const r = step(this.state, action);
    const err = r.events.find((e) => e.kind === 'error');
    if (err && err.kind === 'error') {
      this.hint = err.text;
      return this.render();
    }
    this.state = r.state;
    this.sel = { mode: 'idle' };
    this.hint = '';
    if (this.state.phase !== 'campfire') this.fireSeats = null;
    writeSave(this.state);
    this.play(r.events, prevKraft);
  }

  /** Cars sweep first; the board updates once they have passed. */
  private play(events: GameEvent[], prevKraft: number) {
    const cars = events.filter((e): e is Extract<GameEvent, { kind: 'car' }> => e.kind === 'car');
    const after = () => {
      for (const e of events) {
        if (e.kind === 'hit') this.sound.hit();
        if (e.kind === 'death') this.sound.death();
        if (e.kind === 'flip') this.sound.flip();
        if (e.kind === 'safe') this.sound.safe();
      }
      const hurt = new Set(events.flatMap((e) => (e.kind === 'hit' || e.kind === 'death' ? [e.who] : [])));
      this.busy = false;
      this.render(hurt);
      this.speak(events, prevKraft);
    };
    if (!cars.length || !this.mounted) return after();
    this.busy = true;
    const actions = this.root.querySelector('.actions');
    if (actions && this.state) actions.innerHTML = this.actionsHtml(this.state);
    const layer = this.root.querySelector('.sweeps');
    cars.forEach((c, i) => {
      window.setTimeout(() => {
        this.sound.car(c.vehicle !== 'bil');
        if (!layer) return;
        const el = document.createElement('div');
        el.className = `sweep ${c.lane}${c.vehicle === 'mörk bil' ? ' dark' : ''}`;
        layer.appendChild(el);
        window.setTimeout(() => el.remove(), 1500);
      }, i * 350);
    });
    window.setTimeout(after, 900 + (cars.length - 1) * 350);
  }

  /** When hope moves, or kraft runs out, an animal says something about it. */
  private speak(events: GameEvent[], prevKraft: number) {
    const s = this.state;
    if (!s || !this.mounted) return;
    const present = s.animals.filter(isPresent);
    const pickAny = () => present[Math.floor(Math.random() * present.length)];
    const pickLine = (lines: string[], name = '') => lines[Math.floor(Math.random() * lines.length)].replace(/\{name\}/g, name);
    const bubbles: { who?: Animal; text: string; tag: string; tone: 'bad' | 'good' | 'warn' }[] = [];

    for (const e of events) {
      if (e.kind !== 'hope') continue;
      const about = e.who ? animal(s, e.who) : undefined;
      let who: Animal | undefined;
      if (e.reason === 'death' || e.reason === 'leave' || e.reason === 'dawn') {
        who = [...present].sort((a, b) => bond(s, b.id, about!.id) - bond(s, a.id, about!.id))[0];
      } else if (e.reason === 'hunt') {
        who = present.find((a) => !a.predator) ?? pickAny();
      } else if (e.reason === 'laugh') {
        who = about && isPresent(about) ? about : pickAny();
      } else who = pickAny();
      bubbles.push({ who, text: pickLine(HOPE_LINES[e.reason], about?.name), tag: `${e.delta > 0 ? '+' : '−'}${Math.abs(e.delta)} hopp`, tone: e.delta > 0 ? 'good' : 'bad' });
    }
    if (s.phase === 'play' && s.kraft === 0 && prevKraft > 0) {
      const active = present.filter((a) => a.status === 'active');
      bubbles.push({ who: active[Math.floor(Math.random() * active.length)], text: pickLine(KRAFT_OUT_LINES), tag: 'kraften är slut', tone: 'warn' });
    }

    const hopeDelta = events.reduce((t, e) => t + (e.kind === 'hope' ? e.delta : 0), 0);
    const meter = this.root.querySelector<HTMLElement>('.meter.hope');
    if (meter && hopeDelta) {
      meter.classList.add(hopeDelta < 0 ? 'drop' : 'rise');
      const f = document.createElement('span');
      f.className = `float ${hopeDelta < 0 ? 'bad' : 'good'}`;
      f.textContent = `${hopeDelta > 0 ? '+' : '−'}${Math.abs(hopeDelta)}`;
      meter.appendChild(f);
    }

    const layer = this.root.querySelector<HTMLElement>('.bubbles');
    if (!layer) return;
    bubbles.slice(0, 4).forEach((b, i) => {
      window.setTimeout(() => {
        const el = document.createElement('div');
        const token = b.who ? this.root.querySelector<HTMLElement>(`.token[data-animal="${b.who.id}"]`) : null;
        const x = token ? parseFloat(token.style.left) : 22;
        const y = token ? parseFloat(token.style.top) : 12;
        el.className = `bubble ${y < 40 ? 'below' : ''}`;
        // Bubbles that show at the same time stack instead of overlapping.
        const lift = layer.querySelectorAll('.bubble').length * 9;
        el.style.top = `${y < 40 ? y + 6 + lift : y - 7 - lift}%`;
        el.innerHTML = `${b.who ? `<b>${esc(b.who.name)}</b> ` : ''}${esc(b.text)}<span class="chip tone-${b.tone}">${esc(b.tag)}</span>`;
        layer.appendChild(el);
        // Keep the whole bubble inside the scene, even for animals at the edge.
        const half = el.offsetWidth / 2 + 6;
        el.style.left = `${Math.max(half, Math.min(layer.clientWidth - half, (x / 100) * layer.clientWidth))}px`;
        window.setTimeout(() => el.remove(), 4600);
      }, i * 900);
    });
  }

  // ------------------------------------------------------------ screens

  private renderTitle() {
    const hasSave = loadSave() !== null;
    this.root.innerHTML = `
      <div class="screen title-screen">
        <div class="title-cast">${CAST.map((d) => silhouette(d.species)).join('')}</div>
        <h1>Ingen lämnas kvar</h1>
        <p class="sub">Vi lämnade dalen i skymningen.<br>Framför oss låg vägen.</p>
        <div class="title-buttons">
          <button class="btn primary" data-act="new">Börja vandringen</button>
          ${hasSave ? '<button class="btn" data-act="continue">Fortsätt vandringen</button>' : ''}
        </div>
        <p class="small">Första kapitlet: <em>från dalen till åkrarna</em> · ca 20 minuter</p>
        <details class="howto">
          <summary>Hur man spelar</summary>
          <ul>
            <li>Du är <b>Eden</b> – löftet som håller djuren samman. Du har ingen kropp, bara ord.</li>
            <li>Varje timme visar vägen var ljusen kommer. Djuren visar också vad <em>de själva</em> tänker göra.</li>
            <li>Tryck på ett djur med ljus ring för att <b>leda</b> det (◆1), eller spela kort. Varje kort tillhör ett djur. Få alla till andra diket innan gryningen.</li>
            <li><b>Tillstånd</b> syns som symboler ovanför djuren – håll muspekaren över en symbol, eller tryck på djuret, för att se vad den gör: <span class="chip tone-bad">❄︎ fryser</span> kan inte flyttas, <span class="chip tone-warn">↩︎ vill tillbaka</span> backar och <span class="chip tone-warn">» tänker rusa</span> springer ut på egen hand när timmen går, <span class="chip tone-bad">⚠︎ jagar</span> rovdjuret anfaller, <span class="chip tone-bad">✕ lämnar oss</span> försvinner. <b>Trösta</b> bryter dem. Rutan <i>När timmen går</i> visar vad som kommer att hända.</li>
            <li>Bara små djur får plats i trumman. Ugglan flyger när den flyttas, och kan inte träffas i luften.</li>
            <li>Djuren slåss aldrig. De gömmer sig, bär varandra, tröstar – och offrar.</li>
            <li><b>Tro</b> håller dem kvar. Rovdjur vars tro sviker minns vad de är.</li>
            <li>Bryts ett löfte skrivs historien om: <em>”Ingen lämnas kvar”</em> blir <em>”Någon lämnades kvar”</em>.</li>
          </ul>
        </details>
      </div>`;
  }

  private render(hurt?: Set<string>) {
    this.tip.hidden = true;
    const s = this.state;
    if (!s) return this.renderTitle();
    if (s.phase === 'oath') return this.renderOath(s);
    if (s.phase === 'map') return this.renderMap(s);
    if (s.phase === 'campfire') return this.renderCampfire(s);
    if (s.phase === 'over') return this.renderEnd(s);
    this.renderGame(s, hurt);
  }

  private renderOath(s: GameState) {
    this.mounted = false;
    const n = this.oathPick.length;
    this.root.innerHTML = `
      <div class="screen oath-screen">
        <h2>Eden</h2>
        <p class="lead-text">I dalens sista natt svär vi ett enda löfte. Välj det med omsorg – det binder oss, och om det bryts skrivs vår historia om.</p>
        <div class="verse-grid">
          ${VERSE_IDS.map((id) => {
            const v = VERSES[id];
            const chosen = this.oathPick.includes(id);
            return `<button class="verse-card ${chosen ? 'chosen' : ''}" data-act="verse-toggle" data-verse="${id}" aria-pressed="${chosen}">
              <span class="vtext">${esc(v.text)}</span>
              <span class="vrow"><b>Löfte</b> ${esc(v.promise)}</span>
              <span class="vrow"><b>Bryts</b> ${esc(v.breaks)}</span>
              <span class="vrow vflip"><b>Då</b> ”${esc(v.flippedText)}” ${esc(v.flipCost)}</span>
            </button>`;
          }).join('')}
        </div>
        <h3>Vi som går</h3>
        <div class="cast-grid">
          ${s.animals.map((a) => `
            <div class="cast-card">
              ${silhouette(a.species)}
              <div><b>${esc(a.name)}</b> <span class="muted">· ${kindName(a.id)}${a.predator ? ' · rovdjur' : ''}${a.count ? ` · ${a.count} st` : ''}</span></div>
              <div class="muted">${a.traits.map((t) => TRAITS[t].name).join(', ')} · tro ${a.belief}</div>
            </div>`).join('')}
        </div>
        <button class="btn primary swear" data-act="swear" ${n === OATH_VERSES ? '' : 'disabled'}>${n ? `Svär eden: ”${esc(VERSES[this.oathPick[0]].text)}”` : 'Välj ett löfte'}</button>
      </div>`;
  }

  private mountGame() {
    const zoneDivs = encounterOf(this.state!).zones
      .map((z) => {
        const [x, y, w, h] = z.rect;
        return `<div class="zone ${z.hidden ? 'hidden-zone' : ''} ${h > w ? 'column' : ''}" data-act="zone" data-zone="${z.id}" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%"><span>${esc(z.label)}</span></div>`;
      })
      .join('');
    const enc = encounterOf(this.state!);
    this.root.innerHTML = `
      <div class="game">
        <header class="topbar"></header>
        <main class="stage">
          <div class="scene ${enc.id} ${enc.night ? 'night' : 'day'}">
            ${sceneSvg(enc.id)}
            <div class="moon"><div class="cloud"></div></div>
            <div class="zones">${zoneDivs}
            </div>
            <div class="telegraph"></div>
            <div class="sweeps"></div>
            <div class="dogs"></div>
            <div class="tokens"></div>
            <div class="hud"></div>
            <div class="bubbles" aria-live="polite"></div>
          </div>
        </main>
        <section class="panel">
          <div class="actions"></div>
          <div class="forecast" aria-live="polite"></div>
          <div class="hand"></div>
          <div class="piles"></div>
          <div class="inspect-slot"></div>
          <div class="chronicle">
            <section class="poem"></section>
            <section class="log" aria-live="polite"></section>
          </div>
        </section>
        <div class="modal-root"></div>
      </div>`;
    this.mounted = true;
  }

  private renderGame(s: GameState, hurt?: Set<string>) {
    if (!this.mounted) {
      this.mountGame();
      this.guideOpen = s.phase === 'play' && s.turn === 1 && firstVisit(s.encounterId);
    }
    const q = <T extends HTMLElement>(sel: string) => this.root.querySelector<T>(sel)!;
    q('.topbar').innerHTML = this.topbarHtml(s);
    q('.hud').innerHTML = this.hudHtml(s);
    const scene = q('.scene');
    scene.classList.toggle('culvert-open', s.revealed.includes('culvert'));
    scene.classList.toggle('farmer-out', s.farmerOut);
    scene.querySelectorAll<HTMLElement>('.zone.hidden-zone').forEach((z) => z.classList.toggle('found', s.revealed.includes(z.dataset.zone!)));
    q('.moon').classList.toggle('hidden', moonHidden(s));
    const zones = this.targetZones();
    scene.querySelectorAll<HTMLElement>('.zone').forEach((z) => z.classList.toggle('target', zones.includes(z.dataset.zone as ZoneId)));
    q('.telegraph').innerHTML = this.telegraphHtml(s);
    q('.dogs').innerHTML = this.dogsHtml(s);
    this.updateTokens(s, q('.tokens'), hurt);
    q('.actions').innerHTML = this.actionsHtml(s);
    q('.forecast').innerHTML = s.phase === 'play' ? this.forecastHtml(s) : '';
    q('.hand').innerHTML = this.handHtml(s);
    q('.piles').innerHTML = s.phase === 'over' ? '' : this.pilesHtml(s);
    q('.inspect-slot').innerHTML = this.inspect && s.phase !== 'over' ? this.inspectHtml(s, animal(s, this.inspect)) : '';
    q('.poem').innerHTML = this.poemHtml(s);
    const log = q('.log');
    log.innerHTML = this.logHtml(s.log);
    log.scrollTop = log.scrollHeight;
    if (s.phase !== 'play') this.deckView = null;
    q('.modal-root').innerHTML =
      s.phase === 'lastMoment' ? this.lastMomentHtml(s) : this.deckView ? this.deckHtml(s, this.deckView) : this.mapOpen ? this.mapModalHtml(s) : this.guideOpen ? guideHtml(s) : '';
  }

  // ------------------------------------------------------------ parts

  private topbarHtml(s: GameState): string {
    return `
      <div class="tb-title">Ingen lämnas kvar <span class="muted">· ${esc(encounterOf(s).title)}</span></div>
      <div class="tb-stats">
        <span class="stat">Timme <b>${s.turn}</b>/${s.maxTurn}</span>
        <button class="btn small" data-act="guide-open">Guide</button>
        <button class="btn small" data-act="map-open">Kartan</button>
        <button class="btn small" data-act="mute">${this.sound.muted ? 'Ljud av' : 'Ljud på'}</button>
      </div>`;
  }

  /** Hope and kraft live in the sky of the scene, where the eye already is. */
  private hudHtml(s: GameState): string {
    const pips = (n: number, max: number, cls: string) =>
      Array.from({ length: max }, (_, i) => `<span class="pip ${cls} ${i < n ? 'on' : ''}"></span>`).join('');
    const hand = handSize(s);
    const low = hand < 5;
    const maxKraft = Math.max(3, s.kraft);
    const hopeTip = `data-tip-icon="●" data-tip-title="Hopp ${s.hope}/10" data-tip="Gruppens hopp. Sjunker när någon dör eller lämnas, när ett rovdjur jagar och när ett löfte bryts. Under 4 drar vi färre kort varje timme."`;
    const kraftTip = `data-tip-icon="◆" data-tip-title="Kraft ${s.kraft}" data-tip="Kraft att spela kort och leda djur den här timmen. Fylls på till 3 varje timme – månens vers kan ge eller ta en."`;
    return `
      <div class="meter hope ${low ? 'low' : ''}" ${hopeTip}>
        <span class="mlabel">Hopp <b>${s.hope}</b></span>
        <span class="mpips">${pips(s.hope, 10, 'hope')}</span>
        ${low ? `<span class="mnote">Lågt hopp – vi drar ${hand} kort</span>` : ''}
      </div>
      ${s.encounterId === 'farm' ? this.alarmHtml(s) : ''}
      <div class="meter kraft ${s.kraft === 0 ? 'empty' : ''}" ${kraftTip}>
        <span class="mlabel">Kraft <b>${s.kraft}</b></span>
        <span class="mpips">${pips(s.kraft, maxKraft, 'kraft')}</span>
      </div>`;
  }

  /** The farm's alarm: barking and stolen hens fill it; full, the farmer comes out. */
  private alarmHtml(s: GameState): string {
    const tip = `data-tip-icon="!" data-tip-title="Larm ${s.alarm}/${ALARM_MAX}" data-tip="${s.farmerOut
      ? 'Bonden är ute. Varje timme lyser ficklampan mot en zon – den som står där i det öppna dör. Snåret och det höga gräset skyddar.'
      : `Hundarnas skall väcker gården: +1 när de biter, +1 när någon lockar dem, +3 om ett rovdjur tar en höna. Vid ${ALARM_MAX} kommer bonden ut med ficklampan.`}"`;
    const pips = Array.from({ length: ALARM_MAX }, (_, i) => `<span class="pip alarm ${i < s.alarm ? 'on' : ''}"></span>`).join('');
    return `
      <div class="meter alarm ${s.farmerOut ? 'full' : ''}" ${tip}>
        <span class="mlabel">${s.farmerOut ? 'Bonden ute' : `Larm <b>${s.alarm}</b>/${ALARM_MAX}`}</span>
        <span class="mpips">${pips}</span>
      </div>`;
  }

  /** The dogs stand where they are; asleep, or turned toward a trail. */
  private dogsHtml(s: GameState): string {
    if (s.encounterId !== 'farm' || s.phase === 'over') return '';
    return s.dogs
      .map((d, i) => {
        const [x, y, w, h] = zoneDef(s, d.zone).rect;
        const twin = s.dogs.findIndex((o) => o.zone === d.zone) !== i;
        const tip = s.dogsAwake
          ? `${d.name} följer den starkaste doften${d.target ? ` mot ${zoneDef(s, d.target).name}` : ''}. Hundarna går upp till två steg i timmen och biter den som står där de stannar: en skada som blöder.`
          : `${d.name} sover vid hundkojan. Hundarna vaknar nästa timme och följer vår doft.`;
        return `<div class="dog ${s.dogsAwake ? 'awake' : 'asleep'}" data-act="zone" data-zone="${d.zone}" style="left:${x + w * (twin ? 0.66 : 0.85)}%;top:${y + h * 0.7}%"
          data-tip-icon="◣" data-tip-title="${esc(d.name)}" data-tip="${esc(tip)}">
          ${dogSilhouette()}<span class="tname">${esc(d.name)}${s.dogsAwake ? '' : ' · zzz'}</span></div>`;
      })
      .join('');
  }

  /** On the farm: scent trails, where the dogs end the hour, and the flashlight. */
  private farmTelegraphHtml(s: GameState): string {
    const out: string[] = [];
    const box = (z: string) => { const [x, y, w, h] = zoneDef(s, z).rect; return `left:${x}%;top:${y}%;width:${w}%;height:${h}%`; };
    for (const [z, v] of Object.entries(s.scent)) {
      if (v <= 0 || zoneDef(s, z).goal) continue;
      const tip = `Doft ${v}/3 i ${zoneDef(s, z).name}. Där vi står när timmen går blir doften starkare; den bleknar med 1 i timmen. Bäcken, gödselstacken och det höga gräset bryter den. Hundarna följer den starkaste doften.`;
      out.push(`<div class="scent" style="${box(z)}"><span data-act="zone" data-zone="${z}" data-tip-icon="∴" data-tip-title="Doft ${v}/3" data-tip="${esc(tip)}">doft ${'<i></i>'.repeat(v)}</span></div>`);
    }
    if (s.dogsAwake) {
      const dests = new Map<string, string[]>();
      for (const d of s.dogs) if (d.target) { const z = dogDestination(d); dests.set(z, [...(dests.get(z) ?? []), d.name]); }
      for (const [z, names] of dests) {
        out.push(`<div class="dog-mark" style="${box(z)}"><span>${esc(names.join(' & '))} · skadar</span></div>`);
      }
    }
    if (s.farmerOut && s.farmerSweep) {
      out.push(`<div class="flashlight" style="${box(s.farmerSweep)}"><span>Ficklampan · dödar</span></div>`);
    }
    return out.join('');
  }

  private telegraphHtml(s: GameState): string {
    if (s.encounterId === 'farm') return s.phase === 'over' ? '' : this.farmTelegraphHtml(s);
    const out: string[] = [];
    const mid = (z: string) => { const [, y, , h] = zoneDef(s, z).rect; return y + h / 2; };
    if (s.phase !== 'over') {
      for (const st of s.trafficPlan[s.turn - 1] ?? []) {
        if (st.dark && !s.darkRevealed) continue;
        out.push(`<div class="light ${st.dark ? 'dark' : ''} ${st.severity === 'kill' ? 'heavy' : ''}" style="top:${mid(st.lane)}%">
          <span>${st.vehicle} · ${st.severity === 'kill' ? 'dödar' : 'skadar'}</span></div>`);
      }
      if ((s.trafficPlan[s.turn - 1] ?? []).some((x) => x.dark) && !s.darkRevealed) {
        for (const z of ['lane1', 'lane2'] as const) out.push(`<div class="light rumble" style="top:${mid(z)}%"><span>mullrar…</span></div>`);
      }
      if (s.peekNext && s.turn < s.maxTurn) {
        for (const st of s.trafficPlan[s.turn] ?? []) {
          if (st.dark) continue;
          out.push(`<div class="light next" style="top:${mid(st.lane)}%"><span>nästa timme: ${st.vehicle}</span></div>`);
        }
      }
    }
    return out.join('');
  }

  private updateTokens(s: GameState, layer: HTMLElement, hurt?: Set<string>) {
    const targets = this.targetAnimals();
    const byZone = new Map<ZoneId, Animal[]>();
    for (const a of s.animals) if (isPresent(a)) byZone.set(a.zone, [...(byZone.get(a.zone) ?? []), a]);
    const selAnimal = this.sel.mode !== 'idle' ? this.sel.animal : undefined;
    const selCard = this.selectedCard();
    const movable = new Set(s.phase === 'play' && !this.busy && this.sel.mode !== 'card' ? leadTargets(s) : []);

    for (const a of s.animals) {
      let el = layer.querySelector<HTMLElement>(`[data-animal="${a.id}"]`);
      if (!el) {
        el = document.createElement('button');
        el.className = 'token';
        el.dataset.act = 'animal';
        el.dataset.animal = a.id;
        el.style.setProperty('--owner', speciesColor(a.species));
        layer.appendChild(el);
      }
      if (isPresent(a)) {
        const group = byZone.get(a.zone)!;
        const i = group.indexOf(a);
        const { x, y } = slotIn(zoneDef(s, a.zone), i, group.length);
        el.style.left = `${x}%`;
        el.style.top = `${y}%`;
      }
      el.classList.toggle('gone', !isPresent(a));
      el.classList.toggle('safe', a.status === 'safe');
      el.classList.toggle('target', targets.includes(a.id));
      el.classList.toggle('selected', selAnimal === a.id || selCard?.owner === a.id);
      el.classList.toggle('inspecting', this.inspect === a.id);
      el.classList.toggle('pending', s.pending?.victim === a.id);
      el.classList.toggle('can-move', movable.has(a.id));
      el.classList.toggle('airborne', a.flying && a.status === 'active');
      el.classList.toggle('frozen', a.status === 'active' && a.intent.kind === 'freeze');
      if (hurt?.has(a.id)) {
        el.classList.remove('hurt');
        void el.offsetWidth;
        el.classList.add('hurt');
      }
      el.setAttribute('aria-label', `${a.name}, tro ${a.belief}`);
      const statuses = s.phase === 'over' ? [] : animalStatuses(s, a);
      el.innerHTML = `
        <span class="chips">${statuses.map((st) => chipHtml(st, false)).join('')}</span>
        ${silhouette(a.species)}
        <span class="tname">${esc(a.name)}${a.count !== undefined ? ` <i>×${a.count}</i>` : ''}</span>
        <span class="tstats"><span class="belief" title="Tro">✶${a.belief}</span></span>`;
    }
  }

  private forecastHtml(s: GameState): string {
    return `<h3>När timmen går</h3><ul>${forecast(s).map((f) => `<li class="tone-${f.tone}">${esc(f.text)}</li>`).join('')}</ul>`;
  }

  private actionsHtml(s: GameState): string {
    let hint = this.hint;
    const card = this.selectedCard();
    if (!hint) {
      if (card) {
        const o = animal(s, card.owner).name;
        const spec = cardTarget(card);
        hint =
          spec === 'zone' ? `Välj en upplyst zon för ${o}.` :
          spec === 'animal' ? 'Välj ett upplyst djur.' :
          this.sel.mode === 'card' && this.sel.animal ? `Välj vart ${o} ska bära ${animal(s, this.sel.animal).name}.` : `Välj vem ${o} ska bära.`;
      } else if (this.sel.mode === 'lure' && this.sel.animal) {
        const a = animal(s, this.sel.animal);
        hint = `Välj var ${a.name} ska visa sig (◆1). Hundarna vänder sig dit och skäller – larmet ökar med 1.`;
      } else if (this.sel.mode === 'lead' && this.sel.animal) {
        const a = animal(s, this.sel.animal);
        hint = `Välj en upplyst zon för ${a.name} (◆${leadCost(a)})${a.flier ? ' – flyger upp till 2 steg' : ''}, eller spela ett av ${a.name}s kort.${canLure(s, a) ? ` ${a.name} kan också locka hundarna.` : ''}`;
      } else hint = 'Tryck på ett djur med ljus ring för att leda det (◆1), eller spela ett kort.';
    }
    return `
      <div class="action-row">
        <button class="btn primary" data-act="end" ${s.phase === 'play' && !this.busy ? '' : 'disabled'}>Låt timmen gå</button>
        ${this.lureButton(s)}
        ${this.sel.mode !== 'idle' ? '<button class="btn small" data-act="cancel">Avbryt</button>' : ''}
      </div>
      <p class="hint">${esc(hint)}</p>`;
  }

  private lureButton(s: GameState): string {
    const sel = this.sel;
    if ((sel.mode !== 'lead' && sel.mode !== 'lure') || !sel.animal || s.phase !== 'play' || this.busy) return '';
    const a = animal(s, sel.animal);
    if (!canLure(s, a)) return '';
    return `<button class="btn ${sel.mode === 'lure' ? 'active' : ''}" data-act="lure" aria-pressed="${sel.mode === 'lure'}" ${s.kraft >= 1 ? '' : 'disabled'}>Locka hundarna (◆1)</button>`;
  }

  private inspectHtml(s: GameState, a: Animal): string {
    const bondWord = (b: number) => (b >= 2 ? 'nära' : b === 1 ? 'vän' : b === 0 ? 'främling' : b === -1 ? 'misstro' : 'rädsla');
    const bonds = s.animals
      .filter((o) => o.id !== a.id && isPresent(o))
      .map((o) => { const b = bond(s, a.id, o.id); return `<span class="bond b${b}">${esc(o.name)}: ${bondWord(b)}</span>`; })
      .join('');
    return `
      <div class="inspect">
        <div><b>${esc(a.name)}</b> <span class="muted">· ${kindName(a.id)}${a.predator ? ' · rovdjur' : ''}${a.elder ? ' · den äldste' : ''}</span></div>
        <div class="muted">${a.traits.map((t) => `${TRAITS[t].name} – ${TRAITS[t].note}`).join(' · ')}</div>
        <div>Tro ${a.belief}${a.count !== undefined ? ` · ${a.count} kvar` : ''}${a.injuries.length ? '' : ' · oskadd'}</div>
        <ul class="status-list">${animalStatuses(s, a).map((st) => `<li>${chipHtml(st, true)}<span>${esc(st.explain)}</span></li>`).join('') || `<li class="muted">${a.status === 'active' ? `${esc(a.name)} följer oss. Inga särskilda tillstånd.` : ''}</li>`}</ul>
        ${a.status === 'active' ? `<div class="reason">${esc(leadBlockReason(s, a) ?? (a.flier ? `${a.name} kan ledas – flyger upp till 2 steg och kan inte träffas i luften.` : `${a.name} kan ledas ett steg.`))}</div>` : ''}
        <div class="bonds">${bonds}</div>
      </div>`;
  }

  private handHtml(s: GameState): string {
    if (s.phase === 'over') return '';
    const leading = this.sel.mode === 'lead' ? this.sel.animal : undefined;
    const cards = byOwner(s, s.hand)
      .map((c) => {
        const blocked = cardBlockReason(s, c);
        const selected = this.sel.mode === 'card' && this.sel.uid === c.uid;
        return cardFaceHtml(s, c, {
          tag: 'button',
          attrs: `data-act="card" data-uid="${c.uid}"`,
          classes: [blocked ? 'unplayable' : '', selected ? 'selected' : '', leading === c.owner ? 'owned' : ''],
          footer: blocked ? `<span class="creason">${esc(blocked)}</span>` : '',
        });
      })
      .join('');
    return cards;
  }

  private pilesHtml(s: GameState): string {
    return `
      <button class="btn small" data-act="deck" data-pile="draw">Dragbunten <b>${s.draw.length}</b></button>
      <button class="btn small" data-act="deck" data-pile="discard">Kasthögen <b>${s.discard.length}</b></button>
      <button class="btn small" data-act="deck" data-pile="all">Hela leken</button>`;
  }

  /** The deck checker: what's left to draw, what's been played, and every card by animal. */
  private deckHtml(s: GameState, view: DeckView): string {
    const face = (c: Card, where?: string) =>
      cardFaceHtml(s, c, { tag: 'div', classes: ['mini'], footer: where ? `<span class="cwhere">${where}</span>` : '' });
    const tabs = (['draw', 'discard', 'all'] as DeckView[])
      .map((v) => {
        const label = v === 'draw' ? `Dragbunten (${s.draw.length})` : v === 'discard' ? `Kasthögen (${s.discard.length})` : `Hela leken (${s.draw.length + s.hand.length + s.discard.length})`;
        return `<button class="tab ${v === view ? 'active' : ''}" data-act="deck" data-pile="${v}" aria-pressed="${v === view}">${label}</button>`;
      })
      .join('');
    let body: string;
    if (view === 'draw') {
      body = s.draw.length
        ? `<p class="muted small">Ordningen är hemlig – korten visas sorterade per djur. När dragbunten tar slut blandas kasthögen in.</p><div class="deck-grid">${byOwner(s, s.draw).map((c) => face(c)).join('')}</div>`
        : '<p class="muted">Dragbunten är tom. Nästa gång vi drar blandas kasthögen in.</p>';
    } else if (view === 'discard') {
      body = s.discard.length
        ? `<p class="muted small">Senast spelade först.</p><div class="deck-grid">${[...s.discard].reverse().map((c) => face(c)).join('')}</div>`
        : '<p class="muted">Kasthögen är tom.</p>';
    } else {
      const where = new Map<number, string>();
      s.draw.forEach((c) => where.set(c.uid, 'i dragbunten'));
      s.hand.forEach((c) => where.set(c.uid, 'i handen'));
      s.discard.forEach((c) => where.set(c.uid, 'i kasthögen'));
      const all = [...s.draw, ...s.hand, ...s.discard];
      body = s.animals
        .map((a) => {
          const cards = byOwner(s, all.filter((c) => c.owner === a.id));
          const gone = a.status === 'dead' || a.status === 'left';
          return `<section class="deck-animal" style="--owner:${speciesColor(a.species)}">
            <h4>${silhouette(a.species)} ${esc(a.name)} <span class="muted">· ${gone ? (a.status === 'dead' ? 'död – bara minnet finns kvar' : 'lämnade oss – korten är borta') : `${cards.length} kort`}</span></h4>
            ${cards.length ? `<div class="deck-grid">${cards.map((c) => face(c, where.get(c.uid))).join('')}</div>` : ''}
          </section>`;
        })
        .join('');
    }
    return `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="deck-title">
        <div class="modal-card deck">
          <div class="deck-head">
            <h2 id="deck-title">Leken</h2>
            <button class="btn small" data-act="deck-close">Stäng</button>
          </div>
          <div class="tabs">${tabs}</div>
          ${body}
        </div>
      </div>`;
  }

  private poemHtml(s: GameState): string {
    const oath = s.verses.filter((v) => v.kind === 'oath');
    const memorial = s.verses.filter((v) => v.kind === 'memorial');
    return `
      <h2>Eden</h2>
      ${oath.map((v) => {
        const def = VERSES[v.base!];
        return v.flipped
          ? `<p class="verse broken"><s>${esc(v.text)}</s><span class="rewritten">${esc(v.flippedText!)}</span><span class="vnote">${esc(def.flipCost)}</span></p>`
          : `<p class="verse"><span>${esc(v.text)}</span><span class="vnote">${esc(def.promise)} <i>Bryts: ${esc(def.breaks)}</i></span></p>`;
      }).join('')}
      ${memorial.length ? `<div class="memorial">${memorial.map((v) => `<p class="verse mem">${esc(v.text)}</p>`).join('')}</div>` : ''}`;
  }

  private logHtml(log: LogEntry[]): string {
    return log
      .slice(-50)
      .map((e) => {
        if (e.kind === 'turn') return `<h4>${esc(e.text)}</h4>`;
        return `<p class="${e.kind}">${esc(e.text)}</p>`;
      })
      .join('');
  }

  private lastMomentHtml(s: GameState): string {
    const h = s.pending!;
    const v = animal(s, h.victim);
    const shields = lastMomentShields(s).map((id) => animal(s, id));
    // Whoever throws themselves in the way is injured, not killed (a last mouse can still be lost).
    const lethalFor = (a: Animal) => isLethal(a, { severity: 'injure' });
    return `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="lm-title">
        <div class="modal-card lm">
          ${silhouette(v.species)}
          <h2 id="lm-title">Sista ögonblicket</h2>
          <p>${h.source === 'lastbil' || h.source === 'bil' ? 'Ljuset fyller allt. ' : ''}${esc(v.name)} står kvar i ${esc(zoneDef(s, v.zone).name)}. ${esc(`En ${h.source}`)} som dödar. Det finns ett ögonblick kvar.</p>
          <div class="lm-options">
            ${shields.map((a) => `<button class="btn option" data-act="lm-shield" data-animal="${a.id}">
              <b>${esc(a.name)} kastar sig emellan</b>
              <span>${lethalFor(a) ? `Det blir ${esc(a.name)}s död.` : `${esc(a.name)} knuffar undan ${esc(v.name)} och skadas själv – en skada som stannar.`} Bandet dem emellan stärks.</span></button>`).join('')}
            ${shields.length ? '' : `<p class="muted">Ingen av oss hinner fram.</p>`}
            <button class="btn option grave" data-act="lm-letgo">
              <b>Låt ${esc(v.name)} gå</b>
              <span>${{ intact: '”Ingen lämnas kvar” blir ”Någon lämnades kvar”.', flipped: 'Vi har gjort det förut.', none: `${esc(v.name)} dör.` }[verseStatus(s, 'ingenLamnas')]}</span></button>
          </div>
        </div>
      </div>`;
  }

  // ------------------------------------------------------------ between places

  private renderMap(s: GameState) {
    this.mounted = false;
    this.mapOpen = false;
    const here = place(s.journey.at);
    const onward = pathsFrom(here.id).map((p) => ({ path: p, to: place(p.to) }));
    const known = (id: string) => s.journey.visited.includes(id);
    this.root.innerHTML = `
      <div class="screen between map-screen">
        <div class="map-paper">${mapSvg(s, true)}</div>
        <aside class="between-side">
          <p class="muted small">Kvarns minne av vägen</p>
          <h2>${esc(here.name)}</h2>
          <div class="onward">
            ${onward.map(({ path, to }) => `<button class="btn primary" data-act="travel" data-to="${to.id}">Gå mot ${esc(known(to.id) ? to.name : to.fogName)}</button>${path.note ? `<p class="muted small">${esc(path.note)}</p>` : ''}`).join('')}
          </div>
          <h3>Vi som går</h3>
          <ul class="roster">${rosterHtml(s)}</ul>
          ${memorialHtml(s)}
          <section class="log between-log">${this.logHtml(s.log.slice(-14))}</section>
          <button class="btn small mute-btn" data-act="mute">${this.sound.muted ? 'Ljud av' : 'Ljud på'}</button>
        </aside>
      </div>`;
    const log = this.root.querySelector<HTMLElement>('.between-log');
    if (log) log.scrollTop = log.scrollHeight;
  }

  private mapModalHtml(s: GameState): string {
    return `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="map-title">
        <div class="modal-card map-modal">
          <div class="deck-head"><h2 id="map-title">Kartan</h2><button class="btn small" data-act="map-close">Stäng</button></div>
          <div class="map-paper">${mapSvg(s, false)}</div>
        </div>
      </div>`;
  }

  private renderCampfire(s: GameState) {
    this.mounted = false;
    if (!this.fireSeats) {
      const plan = defaultPlan(s);
      this.fireSeats = seatsFromPlan(s, plan);
      this.fireMourning = plan.mourning;
    }
    this.root.innerHTML = `
      <div class="screen between fire-screen">
        <div class="fire-wrap">
          <h2>${esc(place(s.journey.at).name)} <span class="muted">· lägerelden</span></h2>
          ${fireSceneSvg(s, this.fireSeats)}
          ${memorialHtml(s)}
        </div>
        <aside class="between-side">${firePanelHtml(s, this.fireSeats, this.fireMourning)}</aside>
      </div>`;
  }

  private renderEnd(s: GameState) {
    this.mounted = false;
    const o = s.outcome!;
    const survivors = o.safe.map((id) => animal(s, id));
    const last = [...s.log].reverse().filter((e) => e.kind === 'narrate').slice(0, 2).reverse();
    this.root.innerHTML = `
      <div class="screen end-screen">
        <h2>${o.fallen ? 'Eden föll' : esc(place(s.journey.at).name)}</h2>
        ${last.map((e) => `<p class="lead-text">${esc(e.text)}</p>`).join('')}
        ${survivors.length ? `<h3>Vi som gick vidare</h3><ul class="roster">${rosterHtml(s)}</ul>` : ''}
        ${memorialHtml(s)}
        <h3>Vår dikt</h3>
        <div class="end-poem">
          ${s.verses.filter((v) => v.kind === 'oath').map((v) => `<p>${esc(v.flipped ? v.flippedText! : v.text)}</p>`).join('')}
        </div>
        ${o.fallen ? '' : '<p class="muted">Fortsättning följer: åkrarna, och skogen långt bortom.</p>'}
        <div class="title-buttons">
          <button class="btn primary" data-act="new">Gå igen</button>
          <button class="btn" data-act="title">Till början</button>
        </div>
      </div>`;
  }
}

