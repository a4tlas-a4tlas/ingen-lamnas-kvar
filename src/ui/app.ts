import { SPECIES, START_GROUP, castDef } from '../data/animals';
import { LOADOUT, SKILLS, allSkills } from '../data/skills';
import { guideName } from '../engine/roles';
import { CARDS, TAG_NAMES } from '../data/cards';
import { HOPE_LINES, KRAFT_OUT_LINES } from '../data/text.sv';
import { roarZones } from '../engine/encounters/machines';
import { tractorRow, visibleMist } from '../engine/encounters/sprayer';
import { DITCH_MAX, GATE_PUSH, SWEEPS_MEDIUM, SWEEPS_SMALL, levelAfter } from '../engine/encounters/fence';
import { cutting } from '../engine/encounters/harvest';
import { LAMPED, lit, walkerZone } from '../engine/encounters/lamps';
import { catSigns, guard, pounced, scarer } from '../engine/encounters/cats';
import { bikesAt, feetAt, tramIn, tramKnown } from '../engine/encounters/street';
import { SOUND, TUNNELS, bittenByRats, depthIn, isFound } from '../engine/encounters/sewer';
import { burstsNow, crowdNow, reaches } from '../engine/encounters/fireworks';
import { ENCOUNTERS, byTime, encounterOf, otherTime, zoneDef } from '../engine/encounters';
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
  rescueBlockReason,
  rescueHelpers,
  moonHidden,
  verseStatus,
} from '../engine/rules';
import { OATH_VERSES, castOffers, createGame, type CastGroup } from '../engine/setup';
import { XP_TO_LEARN, step } from '../engine/step';
import type { Action, Animal, Card, CardKind, CastId, GameEvent, Teaching, GameState, LogEntry, VerseId, ZoneId } from '../engine/types';
import { sceneSvg, slotIn } from './scene';
import { fireSceneSvg, firePanelHtml, guideHtml, mapSvg, meetingHtml, memoryLine, memorialHtml, moveToSeat, occupants, planFromSeats, rosterHtml, seatsFromPlan, type Seat, type Seats } from './screens';
import { MEETINGS, currentFrame } from '../data/meetings';
import { REGIONS } from '../data/regions';
import { brokenByTravel, promises } from '../engine/promises';
import { PROMISES, PROMISE_GIFT } from '../data/promises.sv';
import { crowCards, defaultPlan } from '../engine/campfire';
import { forkVoices, voiceStake } from '../engine/voices';
import { pathsFrom, place } from '../data/journey';
import { dogSilhouette, silhouette, speciesColor } from './silhouettes';
import { alarmMax, dogDestination } from '../engine/encounters/farm';
import { CURRENT, DAM, DAM_MAX } from '../engine/encounters/river';
import { TIME_NAMES, TIME_NOTES } from '../data/guides.sv';
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

type Sel = { mode: 'idle' } | { mode: 'card'; uid: number; animal?: string } | { mode: 'lead' | 'lure'; animal?: string } | { mode: 'rescue'; animal?: string } | { mode: 'toll' };

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

const kindName = (s: GameState, id: string) => SPECIES[animal(s, id).species].kindName;

function loadSave(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    return s.version === 31 && s.phase !== 'over' ? s : null;
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
  /** Before the oath we choose who goes; until then the oath screen shows the groups. */
  private castPicked = false;
  private deckView: DeckView | null = null;
  /** The skills each of us knows, and which three we carry: on the map and by the fire. */
  private skillsOpen = false;
  private skillsHint = '';
  private mapOpen = false;
  private guideOpen = false;
  private fireSeats: Seats | null = null;
  private fireMourning: Record<string, 'bury' | 'carry'> = {};
  /** The lesson one pair by the embers will spend the night on, if any. */
  private fireTeach: Teaching | undefined;
  /** Picking a card for the crow: which reply, and which card so far. */
  private meetingPick: { option: string; uid?: number } | null = null;
  /** The animal lifted up by a tap, waiting for a place. */
  private firePicked: string | null = null;
  private fireHint = '';
  private drag: { id: string; x: number; y: number; ghost?: HTMLElement } | null = null;
  private suppressClick = false;
  private mounted = false;
  private busy = false;
  private hint = '';
  private sound = new Sound();
  private tip = document.createElement('div');

  constructor(private root: HTMLElement) {
    root.addEventListener('click', (e) => this.onClick(e));
    root.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
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
      if (this.deckView || this.guideOpen || this.mapOpen || this.skillsOpen) {
        this.deckView = null;
        this.guideOpen = false;
        this.mapOpen = false;
        this.skillsOpen = false;
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
        this.castPicked = false;
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
      case 'cast-pick':
        this.castPicked = true;
        this.dispatch({ type: 'chooseCast', cast: el.dataset.cast as CastId });
        break;
      case 'cast-back':
        this.castPicked = false;
        this.render();
        break;
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
        // Paying the rats: the card chosen goes to them.
        if (this.sel.mode === 'toll') {
          this.sel = { mode: 'idle' };
          this.hint = '';
          return this.dispatch({ type: 'payToll', uid: card.uid });
        }
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
      case 'skills-open':
        this.skillsOpen = true;
        this.skillsHint = '';
        return this.render();
      case 'skills-close':
        this.skillsOpen = false;
        return this.render();
      case 'skill': {
        const a = animal(s, el.dataset.animal!);
        const kind = el.dataset.kind as CardKind;
        const carried = a.loadout.includes(kind);
        if (carried && a.loadout.length === 1) {
          this.skillsHint = `${a.name} måste bära minst en förmåga.`;
          return this.render();
        }
        if (!carried && a.loadout.length >= LOADOUT) {
          this.skillsHint = `${a.name} bär redan ${LOADOUT}. Lägg undan en först.`;
          return this.render();
        }
        this.skillsHint = '';
        return this.dispatch({ type: 'equip', animal: a.id, skills: carried ? a.loadout.filter((k) => k !== kind) : [...a.loadout, kind] });
      }
      case 'map-close':
        this.mapOpen = false;
        return this.render();
      case 'travel':
        return this.dispatch({ type: 'travel', to: el.dataset.to!, wait: el.dataset.wait === '1' });
      case 'fire-pick': {
        if (this.suppressClick) return;
        const id = el.dataset.drag!;
        // With someone already lifted, tapping another puts the first on that one's spot.
        if (this.firePicked && this.firePicked !== id && this.fireSeats && s) {
          const seat = this.fireSeats[id] ?? 'dark';
          return this.seatAnimal(this.firePicked, seat, occupants(s, this.fireSeats, seat).indexOf(id));
        }
        this.firePicked = this.firePicked === id ? null : id;
        this.fireHint = '';
        return this.render();
      }
      case 'fire-slot':
        if (this.firePicked) this.seatAnimal(this.firePicked, el.dataset.seat as Seat, Number(el.dataset.slot ?? 0));
        return;
      case 'fire-mourn':
        this.fireMourning = { ...this.fireMourning, [el.dataset.dead!]: el.dataset.choice as 'bury' | 'carry' };
        return this.render();
      case 'fire-rest': {
        if (!this.fireSeats) return;
        const plan = planFromSeats(this.fireSeats, this.fireMourning, this.fireTeach);
        this.fireTeach = undefined;
        return this.dispatch({ type: 'restAtFire', watch: plan.watch, scout: plan.scout, pairs: plan.pairs, mourning: plan.mourning, teach: plan.teach });
      }
      case 'fire-teach': {
        const t: Teaching = { teacher: el.dataset.teacher!, learner: el.dataset.learner!, skill: el.dataset.skill as CardKind };
        const same = this.fireTeach && this.fireTeach.teacher === t.teacher && this.fireTeach.learner === t.learner && this.fireTeach.skill === t.skill;
        this.fireTeach = same ? undefined : t;
        return this.render();
      }
      case 'learn':
        return this.dispatch({ type: 'learn', animal: el.dataset.animal!, skill: el.dataset.kind as CardKind });
      case 'meet': {
        const option = currentFrame(s)?.options.find((o) => o.id === el.dataset.option);
        if (option?.pickCard) {
          this.meetingPick = { option: option.id };
          return this.render();
        }
        return this.dispatch({ type: 'respond', option: el.dataset.option! });
      }
      case 'meet-card':
        if (this.meetingPick) this.meetingPick = { ...this.meetingPick, uid: Number(el.dataset.uid) };
        return this.render();
      case 'meet-give':
        if (this.meetingPick?.uid !== undefined) return this.dispatch({ type: 'respond', option: this.meetingPick.option, uid: this.meetingPick.uid });
        return;
      case 'meet-back':
        this.meetingPick = null;
        return this.render();
      case 'food-card':
        return this.dispatch({ type: 'throwFood' });
      case 'toll-card':
        if (this.sel.mode === 'toll') return this.cancel();
        this.sel = { mode: 'toll' };
        this.hint = 'Välj ett kort ur handen att lämna åt råttorna.';
        return this.render();
      case 'rescue-card':
        if (this.sel.mode === 'rescue') return this.cancel();
        this.sel = { mode: 'rescue' };
        this.hint = rescueHelpers(s).length ? '' : 'Ingen av oss kan nå fram just nu. Led någon närmare.';
        return this.render();
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
    if (this.sel.mode === 'rescue') return rescueHelpers(s);
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
    if (this.sel.mode === 'rescue') {
      if (rescueHelpers(s).includes(id)) return this.dispatch({ type: 'rescue', by: id });
      this.hint = rescueBlockReason(s, animal(s, id)) ?? '';
      return this.render();
    }
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
    const hadMeeting = !!this.state.meeting;
    const r = step(this.state, action);
    const err = r.events.find((e) => e.kind === 'error');
    if (err && err.kind === 'error') {
      this.hint = err.text;
      return this.render();
    }
    this.state = r.state;
    this.sel = { mode: 'idle' };
    this.hint = '';
    // The meeting's end decides who has a place tonight: seat everyone afresh.
    if (this.state.phase !== 'campfire' || (hadMeeting && !this.state.meeting)) {
      this.fireSeats = null;
      this.firePicked = null;
    }
    this.meetingPick = null;
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
        <div class="title-cast">${START_GROUP.map((d) => silhouette(d.species)).join('')}</div>
        <h1>Ingen lämnas kvar</h1>
        <p class="sub">Vi lämnade dalen i skymningen.<br>Framför oss låg vägen.</p>
        <div class="title-buttons">
          <button class="btn primary" data-act="new">Börja vandringen</button>
          ${hasSave ? '<button class="btn" data-act="continue">Fortsätt vandringen</button>' : ''}
        </div>
        <p class="small">Första kapitlet: <em>Dalen – ut ur dalen innan maskinerna tar den</em> · ca 30–40 minuter</p>
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

  /** Vilka går? The groups side by side: each is who they would be this run. */
  private renderCasts(s: GameState) {
    this.mounted = false;
    const member = (a: Animal) => `
      <li class="cast-member">
        ${silhouette(a.species)}
        <div><b>${esc(a.name)}</b> <span class="muted">· ${SPECIES[a.species].kindName}${a.count ? ` · ${a.count} st` : ''}${a.elder ? ' · den äldste' : ''}${a.guide ? ' · minns vägen' : ''}</span></div>
        <div>${a.traits.map((t) => `<span class="trait ${TRAITS[t].good ? 'good' : 'bad'}" title="${esc(TRAITS[t].note)}">${TRAITS[t].name}</span>`).join(' ')} <span class="muted">· tro ${a.belief}</span></div>
        <div class="cast-skills muted">${a.loadout.map((k) => esc(CARDS[k].name)).join(' · ')}</div>
      </li>`;
    const column = (g: CastGroup) => {
      const def = castDef(g.cast);
      const predators = g.animals.filter((a) => a.predator).length;
      return `<div class="cast-option" data-act="cast-pick" data-cast="${g.cast}">
        <h3>${esc(def.name)}</h3>
        <p class="cast-line">${esc(def.line)}</p>
        <p class="muted small">${g.animals.length} djur · ${predators ? `${predators} rovdjur` : 'inga rovdjur'}</p>
        <ul class="cast-list">${g.animals.map(member).join('')}</ul>
        <button class="btn primary" data-act="cast-pick" data-cast="${g.cast}">Låt ${esc(def.name.toLowerCase())} gå</button>
      </div>`;
    };
    this.root.innerHTML = `
      <div class="screen oath-screen cast-screen">
        <h2>Vilka går?</h2>
        <p class="lead-text">Maskinerna står vid dalens kant. Inte alla kan gå tillsammans – välj vilka som lämnar dalen i natt.</p>
        <div class="cast-options">${castOffers(s.seed).map(column).join('')}</div>
      </div>`;
  }

  private renderOath(s: GameState) {
    if (!this.castPicked) return this.renderCasts(s);
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
        <h3>Vi som går: ${esc(castDef(s.cast).name)} <button class="link" data-act="cast-back">Välj en annan grupp</button></h3>
        <div class="cast-grid">
          ${s.animals.map((a) => `
            <div class="cast-card">
              ${silhouette(a.species)}
              <div><b>${esc(a.name)}</b> <span class="muted">· ${kindName(s, a.id)}${a.predator ? ' · rovdjur' : ''}${a.count ? ` · ${a.count} st` : ''}</span></div>
              <div class="muted">${a.traits.map((t) => `<span class="trait ${TRAITS[t].good ? 'good' : 'bad'}" title="${esc(TRAITS[t].note)}">${TRAITS[t].name}</span>`).join(' ')} · tro ${a.belief}</div>
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
          <div class="scene ${enc.id} ${this.state!.time}${this.state!.roadKind === 'gravel' && enc.id === 'road' ? ' gravel' : ''}">
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
    scene.classList.toggle('dam-broken', s.closed.includes(DAM));
    scene.classList.toggle('current-strid', s.encounterId === 'river' && s.currentPlan[s.turn - 1] === 'strid');
    scene.querySelectorAll<HTMLElement>('.zone.hidden-zone').forEach((z) => z.classList.toggle('found', s.revealed.includes(z.dataset.zone!)));
    scene.querySelectorAll<HTMLElement>('.zone').forEach((z) => z.classList.toggle('closed', s.closed.includes(z.dataset.zone as ZoneId)));
    q('.moon').classList.toggle('hidden', moonHidden(s));
    const zones = this.targetZones();
    scene.querySelectorAll<HTMLElement>('.zone').forEach((z) => z.classList.toggle('target', zones.includes(z.dataset.zone as ZoneId)));
    q('.telegraph').innerHTML = this.telegraphHtml(s);
    q('.dogs').innerHTML = this.dogsHtml(s) + this.rescueHtml(s);
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
      s.phase === 'lastMoment' ? this.lastMomentHtml(s) : s.meeting ? meetingHtml(s, this.meetingPickerHtml(s)) : this.deckView ? this.deckHtml(s, this.deckView) : this.mapOpen ? this.mapModalHtml(s) : this.guideOpen ? guideHtml(s) : '';
  }

  // ------------------------------------------------------------ parts

  private topbarHtml(s: GameState): string {
    return `
      <div class="tb-title">Ingen lämnas kvar <span class="muted">· ${esc(s.encounterId === 'road' && s.roadKind === 'gravel' ? (s.time === 'night' ? 'Grusvägen om natten' : 'Grusvägen') : byTime(s, encounterOf(s).title))}${s.variant === 'hard' && place(s, s.journey.at).memory ? ` · ${esc(place(s, s.journey.at).memory!.hard)}` : ''}</span></div>
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
      ${s.encounterId === 'farm' ? this.alarmHtml(s) : s.encounterId === 'river' ? this.damHtml(s) : s.encounterId === 'machines' ? this.dozerHtml(s) : ''}
      <div class="meter kraft ${s.kraft === 0 ? 'empty' : ''}" ${kraftTip}>
        <span class="mlabel">Kraft <b>${s.kraft}</b></span>
        <span class="mpips">${pips(s.kraft, maxKraft, 'kraft')}</span>
      </div>`;
  }

  /** The farm's alarm: barking and stolen hens fill it; full, the farmer comes out. */
  private alarmHtml(s: GameState): string {
    const max = alarmMax(s);
    const tip = `data-tip-icon="!" data-tip-title="Larm ${s.alarm}/${max}" data-tip="${s.farmerOut
      ? 'Bonden är ute. Varje timme lyser ficklampan mot en zon – den som står där i det öppna dör. Snåret och det höga gräset skyddar.'
      : `Hundarnas skall väcker gården: +1 när de biter, +1 när någon lockar dem, +3 om ett rovdjur tar en höna. Vid ${max} kommer bonden ut med ficklampan.${s.time === 'night' ? ' I natt sover han djupt.' : ''}`}"`;
    const pips = Array.from({ length: max }, (_, i) => `<span class="pip alarm ${i < s.alarm ? 'on' : ''}"></span>`).join('');
    return `
      <div class="meter alarm ${s.farmerOut ? 'full' : ''}" ${tip}>
        <span class="mlabel">${s.farmerOut ? 'Bonden ute' : `Larm <b>${s.alarm}</b>/${max}`}</span>
        <span class="mpips">${pips}</span>
      </div>`;
  }

  /** The beaver dam: every step makes it creak; at the limit it breaks. */
  private damHtml(s: GameState): string {
    const broken = s.closed.includes(DAM);
    const tip = `data-tip-icon="⌇" data-tip-title="${broken ? 'Dammen har brustit' : `Dammen ${s.damCreak}/${DAM_MAX}`}" data-tip="${broken
      ? 'Bäverdammen är borta. Nu finns bara stenarna och strömmen.'
      : `Snabbast över ån, men den knakar: +1 för varje djur som går ut på den, +2 för de stora. Vid ${DAM_MAX} brister den – den som står där faller i strömmen, och flodvågen gör strömmen strid.`}"`;
    const pips = Array.from({ length: DAM_MAX }, (_, i) => `<span class="pip alarm ${i < s.damCreak ? 'on' : ''}"></span>`).join('');
    return `
      <div class="meter alarm ${broken ? 'full' : ''}" ${tip}>
        <span class="mlabel">${broken ? 'Dammen brusten' : `Dammen <b>${s.damCreak}</b>/${DAM_MAX}`}</span>
        <span class="mpips">${pips}</span>
      </div>`;
  }

  /** The bulldozer: when it next takes ground, and – if we have read the tracks, or it is the clearing – where. */
  private dozerHtml(s: GameState): string {
    const next = s.dozePlan.findIndex((z, i) => z && i >= s.turn - 1);
    if (next < 0) return '';
    const hours = next + 1 - s.turn;
    const zone = s.dozePlan[next]!;
    const known = hours === 0 || s.knowledge.includes('machines') || zone === 'glantan';
    const when = hours === 0 ? 'när timmen går' : `om ${hours + 1} timmar`;
    const where = known ? zoneDef(s, zone).label : 'marken bakom oss';
    const tip = `data-tip-icon="▰" data-tip-title="Schaktaren" data-tip="Schaktaren tar ${esc(where.toLowerCase())} ${when}. Den som står där då hinner knappt undan, och marken är borta sedan dess.${s.knowledge.includes('machines') ? ' Vi har läst spåren: vi vet hela vägen den tar.' : ''}"`;
    return `
      <div class="meter alarm ${hours === 0 ? 'full' : ''}" ${tip}>
        <span class="mlabel">Schaktaren: <b>${esc(where)}</b> ${hours === 0 ? 'nu' : `om ${hours + 1} tim`}</span>
      </div>`;
  }

  /** The machines: where the trees fall, the roar beside it, the ground the bulldozer takes. */
  private machinesTelegraphHtml(s: GameState): string {
    const out: string[] = [];
    const box = (z: string) => { const [x, y, w, h] = zoneDef(s, z).rect; return `left:${x}%;top:${y}%;width:${w}%;height:${h}%`; };
    const fell = s.fellPlan[s.turn - 1];
    const next = s.knowledge.includes('machines') && s.turn < s.maxTurn ? s.fellPlan[s.turn] : undefined;
    if (fell) out.push(`<div class="fell-mark" style="${box(fell)}"><span>Fällaren · dödar</span></div>`);
    for (const z of roarZones(s)) out.push(`<div class="roar-mark" style="${box(z)}"><span>bruset · chock</span></div>`);
    if (next && next !== fell) out.push(`<div class="next-mark" style="${box(next)}"><em>fällaren nästa timme</em></div>`);
    const doze = s.dozePlan[s.turn - 1];
    if (doze) out.push(`<div class="doze-mark" style="${box(doze)}"><span>Schaktaren · tar marken · dödar</span></div>`);
    return out.join('');
  }

  /** The fields: the buzzard's shadow where it will strike; at night only wingbeats, over one of two places. */
  private raptorTelegraphHtml(s: GameState): string {
    const box = (z: string) => { const [x, y, w, h] = zoneDef(s, z).rect; return `left:${x}%;top:${y}%;width:${w}%;height:${h}%`; };
    if (s.turn === 1) return '';
    return s.raptors.map((b) => b.zone
      ? `<div class="shadow-mark" style="${box(b.zone)}"><i></i><span>Vråken · tar de små</span></div>`
      : b.maybe.map((z) => `<div class="wing-mark" style="${box(z)}"><span>vingslag?</span></div>`).join('')).join('');
  }

  /** The sprayed field: where the tractor drives, the mist we can see, and which way the wind blows. */
  private sprayerTelegraphHtml(s: GameState): string {
    const out: string[] = [];
    const box = (z: string) => { const [x, y, w, h] = zoneDef(s, z).rect; return `left:${x}%;top:${y}%;width:${w}%;height:${h}%`; };
    const row = tractorRow(s);
    for (const z of visibleMist(s)) out.push(`<div class="mist-mark" style="${box(z)}"><i></i><span>dimma · förgiftar</span></div>`);
    for (const z of row) out.push(`<div class="tractor-mark" style="${box(z)}"><span>Traktorn · dödar</span></div>`);
    const wind = s.spray.windPlan[s.turn - 1];
    if (wind) out.push(`<div class="wind-mark wind-${wind === 'norr' ? 'n' : wind === 'söder' ? 's' : wind === 'öster' ? 'e' : 'w'}"><span>vinden → ${wind}</span></div>`);
    return out.join('');
  }

  /** The street: where the light falls, when the next lamps come on, and where the men with dogs walk. */
  private lampsTelegraphHtml(s: GameState): string {
    const out: string[] = [];
    const box = (z: string) => { const [x, y, w, h] = zoneDef(s, z).rect; return `left:${x}%;top:${y}%;width:${w}%;height:${h}%`; };
    for (const z of LAMPED) {
      const at = s.lamps.litAt[z];
      out.push(lit(s, z) ? `<div class="lamp-mark on" style="${box(z)}"><i></i><span>ljus</span></div>` : `<div class="lamp-mark" style="${box(z)}"><span>tänds om ${at - s.turn} ${at - s.turn === 1 ? 'timme' : 'timmar'}</span></div>`);
    }
    for (const w of s.lamps.walkers) {
      const z = walkerZone(w);
      out.push(`<div class="walker-mark ${lit(s, z) ? 'seen' : ''}" style="${box(z)}"><span>Mannen med hunden${lit(s, z) ? ' · skadar' : ' · i mörkret'}</span></div>`);
    }
    return out.join('');
  }

  /** The courtyard: where the cats lie in wait – or, at night, where eyes glint – and whom they would take. */
  private catsTelegraphHtml(s: GameState): string {
    const out: string[] = [];
    const box = (z: string) => { const [x, y, w, h] = zoneDef(s, z).rect; return `left:${x}%;top:${y}%;width:${w}%;height:${h}%`; };
    const seen = new Set<string>();
    for (const signs of catSigns(s)) {
      for (const z of signs) {
        if (seen.has(z)) continue;
        seen.add(z);
        const sure = signs.length === 1;
        const why = s.cats.fed ? 'äter' : scarer(s, z) ? 'rädd för rovdjuret' : guard(s, z) ? 'en stor vaktar' : pounced(s, z) ? 'slår till' : 'väntar';
        out.push(`<div class="cat-mark ${sure ? '' : 'eyes'} ${why === 'slår till' ? 'strikes' : ''}" style="${box(z)}"><i></i><span>${sure ? `Katten · ${why}` : 'ögon?'}</span></div>`);
      }
    }
    return out.join('');
  }

  /** The shopping street: the crowd and where it goes next, the busy bike lane, the tram's clock – or, at night, steps in the dark. */
  private streetTelegraphHtml(s: GameState): string {
    const out: string[] = [];
    const box = (z: string) => { const [x, y, w, h] = zoneDef(s, z).rect; return `left:${x}%;top:${y}%;width:${w}%;height:${h}%`; };
    const shown = s.time === 'day' || s.darkRevealed;
    if (shown) for (const z of feetAt(s)) out.push(`<div class="crowd-mark" style="${box(z)}"><span>${s.time === 'day' ? 'Folkmassan' : 'Någon vinglar'} · trampar de små</span></div>`);
    else for (const side of new Set(s.street.drunks.map((z) => (['trottoarenS', 'cykelS'].includes(z) ? 'S' : 'N')))) {
      out.push(`<div class="crowd-mark dark" style="${box(side === 'S' ? 'trottoarenS' : 'trottoarenN')}"><span>steg i mörkret · någonstans på den här sidan</span></div>`);
    }
    if (s.time === 'day' && s.turn < s.maxTurn) for (const z of s.street.crowdPlan[s.turn] ?? []) out.push(`<div class="next-mark" style="${box(z)}"><em>folkmassan nästa timme</em></div>`);
    const bike = bikesAt(s);
    if (bike) out.push(`<div class="bike-mark" style="${box(bike)}"><span>Cyklar · skadar</span></div>`);
    const n = tramIn(s);
    if (n !== null && tramKnown(s)) out.push(`<div class="tram-mark ${n === 0 ? 'now' : ''}" style="${box('sparet')}"><span>${n === 0 ? 'Spårvagnen · dödar' : n === 1 ? 'klockan plingar · spårvagnen nästa timme' : `spårvagnen om ${n} timmar`}</span></div>`);
    return out.join('');
  }

  /** New Year's Eve: where the rockets burst and how far the bang reaches, where the people walk now and next. */
  private fireworksTelegraphHtml(s: GameState): string {
    const out: string[] = [];
    const box = (z: string) => { const [x, y, w, h] = zoneDef(s, z).rect; return `left:${x}%;top:${y}%;width:${w}%;height:${h}%`; };
    const crowd = crowdNow(s);
    if (crowd) out.push(`<div class="crowd-mark" style="${box(crowd)}"><span>Folkmassan · stängt</span></div>`);
    const next = s.turn < s.maxTurn ? s.fireworks.crowdPlan[s.turn] : undefined;
    if (next) out.push(`<div class="next-mark" style="${box(next)}"><em>folkmassan nästa timme</em></div>`);
    const midnight = s.turn === s.maxTurn;
    const reached = new Set<string>();
    for (const b of burstsNow(s)) {
      out.push(`<div class="burst-mark s${b.strength}" style="${box(b.zone)}"><i></i><span>${midnight ? 'Midnatt · ' : ''}${b.strength === 2 ? 'stor smäll' : 'smäll'} · knuffar</span></div>`);
      for (const d of encounterOf(s).zones) if (!d.goal && d.id !== b.zone && reaches(b, d.id)) reached.add(d.id);
    }
    for (const z of reached) out.push(`<div class="burst-reach" style="${box(z)}"><em>smällen hörs hit</em></div>`);
    return out.join('');
  }

  /** The sewer: fog over the tunnels we have not found, and what we hear from them; the depth in those we have; the rats. */
  private sewerTelegraphHtml(s: GameState): string {
    const out: string[] = [];
    const box = (z: string) => { const [x, y, w, h] = zoneDef(s, z).rect; return `left:${x}%;top:${y}%;width:${w}%;height:${h}%`; };
    const KIND = { low: 'lågt rör', walk: 'gång', ledge: 'kant' } as const;
    for (const z of TUNNELS) {
      if (!isFound(s, z)) {
        const heard = s.sewer.heard.includes(z) ? (s.sewer.rats.includes(z) ? SOUND.rats : SOUND[s.sewer.kinds[z]]) : '';
        out.push(`<div class="sewer-fog" style="${box(z)}"><b>?</b>${heard ? `<span>hörs: ${heard}</span>` : ''}</div>`);
        continue;
      }
      const d = depthIn(s, z);
      const takes = d >= SWEEPS_MEDIUM ? 'drar med små och mellanstora' : d >= SWEEPS_SMALL ? 'drar med de små' : 'går att vada';
      out.push(`<div class="sewer-mark lvl-${Math.min(d, 3)}" style="${box(z)}"><em>${KIND[s.sewer.kinds[z]]}</em><span>djup ${d} · ${takes}</span></div>`);
      if (s.sewer.rats.includes(z)) out.push(`<div class="rat-mark ${bittenByRats(s, z) ? 'bites' : ''}" style="${box(z)}"><span>Råttorna${s.sewer.paid ? ' · betalda' : ' · vill ha tull'}</span></div>`);
    }
    return out.join('');
  }

  /** The harvest: the strip being cut, the next, the stubble, the buzzard's shadow. */
  private harvestTelegraphHtml(s: GameState): string {
    const out: string[] = [];
    const box = (z: string) => { const [x, y, w, h] = zoneDef(s, z).rect; return `left:${x}%;top:${y}%;width:${w}%;height:${h}%`; };
    for (const z of s.harvest.cut) out.push(`<div class="stubble-mark" style="${box(z)}"><span>stubb</span></div>`);
    for (const z of cutting(s)) out.push(`<div class="tractor-mark" style="${box(z)}"><span>Skördetröskan · dödar</span></div>`);
    if (s.turn < s.maxTurn) for (const z of s.harvest.plan[s.turn] ?? []) out.push(`<div class="next-mark" style="${box(z)}"><em>skördetröskan nästa timme</em></div>`);
    if (s.harvest.shadow) out.push(`<div class="shadow-mark" style="${box(s.harvest.shadow)}"><i></i><span>Vråken · tar de små</span></div>`);
    return out.join('');
  }

  /** The ditch and the gate: the water's level and who it takes; the wire when it hums; whether the gate stands open. */
  private fenceTelegraphHtml(s: GameState): string {
    const out: string[] = [];
    const box = (z: string) => { const [x, y, w, h] = zoneDef(s, z).rect; return `left:${x}%;top:${y}%;width:${w}%;height:${h}%`; };
    const level = levelAfter(s);
    const takes = level >= SWEEPS_MEDIUM ? 'drar med små och mellanstora' : level >= SWEEPS_SMALL ? 'drar med de små' : 'går att vada';
    for (const z of ['diketV', 'diketO']) out.push(`<div class="ditch-mark lvl-${level}" style="${box(z)}"><span>vatten ${level}/${DITCH_MAX} · ${takes}</span></div>`);
    if (s.fence.pulsePlan[s.turn - 1]) for (const z of ['stangslet', 'grinden']) out.push(`<div class="wire-mark" style="${box(z)}"><span>strömmen på · dödar små</span></div>`);
    const next = s.turn < s.maxTurn && (s.time === 'day' || s.peekNext) ? s.fence.pulsePlan[s.turn] : undefined;
    if (next !== undefined) out.push(`<div class="next-mark" style="${box('stangslet')}"><em>nästa timme: ${next ? 'på' : 'av'}</em></div>`);
    out.push(`<div class="gate-mark ${s.fence.gateOpen ? 'open' : ''}" style="${box('grinden')}"><em>${s.fence.gateOpen ? 'grinden öppen' : `stängd · ett stort djur, eller två tillsammans, trycker upp den (◆${GATE_PUSH})`}</em></div>`);
    return out.join('');
  }

  /** The river: the current in the water, the wet stones, the heron. */
  private riverTelegraphHtml(s: GameState): string {
    const out: string[] = [];
    const box = (z: string) => { const [x, y, w, h] = zoneDef(s, z).rect; return `left:${x}%;top:${y}%;width:${w}%;height:${h}%`; };
    const now = s.currentPlan[s.turn - 1];
    const next = s.peekNext && s.turn < s.maxTurn ? s.currentPlan[s.turn] : undefined;
    out.push(`<div class="current-mark ${now}" style="${box(CURRENT)}"><span>${now === 'strid' ? 'strid · drar mot forsen · dödar' : 'lugn ström'}</span>${next ? `<em>nästa timme: ${next}</em>` : ''}</div>`);
    for (const z of s.slipPlan[s.turn - 1] ?? []) out.push(`<div class="slip-mark" style="${box(z)}"><span>hal · glider ner</span></div>`);
    if (s.heron) out.push(`<div class="heron-mark" style="${box(s.heron)}"><span>Hägern · skadar små</span></div>`);
    return out.join('');
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
    if (s.encounterId === 'river') return s.phase === 'over' ? '' : this.riverTelegraphHtml(s);
    if (s.encounterId === 'machines') return s.phase === 'over' ? '' : this.machinesTelegraphHtml(s);
    if (s.encounterId === 'raptor') return s.phase === 'over' ? '' : this.raptorTelegraphHtml(s);
    if (s.encounterId === 'sprayer') return s.phase === 'over' ? '' : this.sprayerTelegraphHtml(s);
    if (s.encounterId === 'fence') return s.phase === 'over' ? '' : this.fenceTelegraphHtml(s);
    if (s.encounterId === 'harvest') return s.phase === 'over' ? '' : this.harvestTelegraphHtml(s);
    if (s.encounterId === 'lamps') return s.phase === 'over' ? '' : this.lampsTelegraphHtml(s);
    if (s.encounterId === 'cats') return s.phase === 'over' ? '' : this.catsTelegraphHtml(s);
    if (s.encounterId === 'street') return s.phase === 'over' ? '' : this.streetTelegraphHtml(s);
    if (s.encounterId === 'sewer') return s.phase === 'over' ? '' : this.sewerTelegraphHtml(s);
    if (s.encounterId === 'fireworks') return s.phase === 'over' ? '' : this.fireworksTelegraphHtml(s);
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
    layer.classList.toggle('crowded', Math.max(0, ...[...byZone.values()].map((g) => g.length)) > 6);
    const selAnimal = this.sel.mode !== 'idle' && this.sel.mode !== 'toll' ? this.sel.animal : undefined;
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
      } else if (this.sel.mode === 'rescue' && s.rescue) {
        const who = s.rescue.name;
        hint = s.rescue.trust >= s.rescue.need
          ? `Välj ett upplyst djur bredvid ${who} som befriar (◆1).`
          : `Välj ett upplyst djur inom ett steg från ${who} som når fram (◆1). Rovdjur skrämmer bara.`;
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
        <div><b>${esc(a.name)}</b> <span class="muted">· ${kindName(s, a.id)}${a.predator ? ' · rovdjur' : ''}${a.elder ? ' · den äldste' : ''}</span></div>
        <div class="muted trait-list">${a.traits.map((t) => `<span class="trait ${TRAITS[t].good ? 'good' : 'bad'}"><b>${TRAITS[t].name}</b> – ${esc(TRAITS[t].note)}</span>`).join('')}</div>
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
    return cards + this.rescueCardHtml(s) + this.foodCardHtml(s) + this.tollCardHtml(s);
  }

  /** While someone is trapped, a card of its own lies beside the hand: reach out, then free. */
  private rescueCardHtml(s: GameState): string {
    const r = s.rescue;
    if (!r || s.phase !== 'play') return '';
    const who = r.name;
    const free = r.trust >= r.need;
    const helpers = rescueHelpers(s);
    const selected = this.sel.mode === 'rescue';
    return `<button class="card special ${helpers.length ? '' : 'unplayable'} ${selected ? 'selected' : ''}" data-act="rescue-card" style="--owner:#e9dfc6">
      <span class="cband">${silhouette(r.species, 'var(--ink)')}<span class="cowner">${esc(who)}</span><span class="ccost" title="Kraft">1</span></span>
      <span class="cname">${free ? 'Befria' : 'Nå fram'}</span>
      <span class="ctag">Räddning · tillit ${r.trust}/${r.need}</span>
      <span class="ctext">${esc(free
        ? `Ett djur bredvid ${who} befriar ${who}. Sedan är ${who} en av oss.`
        : `Ett djur inom ett steg från ${who} kryper närmare: +1 tillit. Rovdjur skrämmer bara.`)}</span>
      ${helpers.length ? '' : `<span class="creason">${esc(free ? `Ingen står bredvid ${who}.` : `Ingen av oss är nära nog.`)}</span>`}
    </button>`;
  }

  /** In the courtyard, a card of its own lies beside the hand: food for the cats, once. */
  private foodCardHtml(s: GameState): string {
    if (s.encounterId !== 'cats' || s.phase !== 'play') return '';
    const k = s.cats;
    const why = k.fed ? 'Katterna äter redan.' : k.foodUsed ? 'Maten är slut.' : s.kraft < 1 ? 'Ingen kraft kvar.' : '';
    return `<button class="card special ${why ? 'unplayable' : ''}" data-act="food-card" style="--owner:#e9dfc6" ${why ? 'disabled' : ''}>
      <span class="cband"><span class="cowner">Soprummet</span><span class="ccost" title="Kraft">1</span></span>
      <span class="cname">Kasta mat</span>
      <span class="ctag">En gång på gården</span>
      <span class="ctext">Den här timmen slåss katterna om maten och slår inte till mot någon av oss.</span>
      ${why ? `<span class="creason">${esc(why)}</span>` : ''}
    </button>`;
  }

  /** In the sewer, a card of its own lies beside the hand: the rats' toll, paid with a card from the hand. */
  private tollCardHtml(s: GameState): string {
    if (s.encounterId !== 'sewer' || s.phase !== 'play') return '';
    const why = s.sewer.paid ? 'Tullen är betald den här timmen.' : s.hand.length ? '' : 'Inga kort att ge.';
    const selected = this.sel.mode === 'toll';
    return `<button class="card special ${why ? 'unplayable' : ''} ${selected ? 'selected' : ''}" data-act="toll-card" style="--owner:#e9dfc6" ${why ? 'disabled' : ''}>
      <span class="cband"><span class="cowner">Råttorna</span><span class="ccost" title="Kraft">0</span></span>
      <span class="cname">Betala tull</span>
      <span class="ctag">Ett kort ur handen</span>
      <span class="ctext">${selected ? 'Välj vilket kort råttorna får.' : 'Lämna ett kort ur handen åt råttorna. Den här timmen biter de ingen.'}</span>
      ${why ? `<span class="creason">${esc(why)}</span>` : ''}
    </button>`;
  }

  /** The trapped one, where it waits. */
  private rescueHtml(s: GameState): string {
    const r = s.rescue;
    if (!r || s.phase === 'over') return '';
    const def = { name: r.name, species: r.species };
    const [x, y, w, h] = zoneDef(s, r.zone).rect;
    const tip = `${def.name} sitter ${encounterOf(s).rescue!.trapped} och är rädd för oss. Använd kortet ”Nå fram” från ett djur inom ett steg (+1 tillit per gång, rovdjur skrämmer bara). Vid ${r.need}/${r.need} blir kortet ”Befria”: ett djur bredvid befriar ${def.name}, som då blir en av oss.`;
    return `<div class="newcomer" data-act="zone" data-zone="${r.zone}" style="left:${x + w * 0.2}%;top:${y + h * 0.55}%"
      data-tip-icon="?" data-tip-title="${esc(def.name)} · tillit ${r.trust}/${r.need}" data-tip="${esc(tip)}">
      ${silhouette(def.species)}<span class="tname">${esc(def.name)} · ${r.trust}/${r.need}</span></div>`;
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
      ${promises(s).map((v) => {
        const a = animal(s, v.promise.by);
        const def = PROMISES[v.promise.rule];
        const fill = (t: string) => t.replace(/\{a\}/g, a.name).replace(/\{b\}/g, v.promise.with ? animal(s, v.promise.with).name : '');
        return v.flipped
          ? `<p class="verse promise broken" style="--owner:${speciesColor(a.species)}"><span class="vby">${esc(a.name)}s löfte</span><s>${esc(v.text)}</s><span class="rewritten">${esc(v.flippedText!)}</span></p>`
          : `<p class="verse promise" style="--owner:${speciesColor(a.species)}"><span class="vby">${esc(a.name)}s löfte</span><span>${esc(v.text)}</span><span class="vnote">${esc(fill(PROMISE_GIFT))} <i>${esc(fill(def.binds))}</i></span></p>`;
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
    const here = place(s, s.journey.at);
    const onward = pathsFrom(s, here.id).map((p) => ({ path: p, to: place(s, p.to) }));
    const known = (id: string) => s.journey.visited.includes(id);
    this.root.innerHTML = `
      <div class="screen between map-screen">
        <div class="map-paper">${mapSvg(s, true)}</div>
        <aside class="between-side">
          <p class="muted small">${esc(guideName(s))}s minne av vägen · ${esc(REGIONS[s.journey.region].name)}</p>
          <h2>${esc(here.name)}</h2>
          <button class="btn small skills-btn ${s.animals.some((a) => isPresent(a) && a.offer) ? 'pending' : ''}" data-act="skills-open">Förmågor${s.animals.some((a) => isPresent(a) && a.offer) ? ' ●' : ''}</button>
          ${this.voicesHtml(s)}
          <div class="onward">
            ${onward.map(({ path, to }) => {
              const name = esc(known(to.id) ? to.name : to.fogName);
              const memo = memoryLine(s, to.id);
              const note = (path.note ? `<p class="muted small">${esc(path.note)}</p>` : '') + (memo ? `<p class="small memory-note">${esc(memo)}</p>` : '');
              const breaks = (time: 'day' | 'night') => brokenByTravel(s, to.id, time).map((v) => `<p class="small promise-warn">⚠ Bryter ${esc(animal(s, v.promise.by).name)}s löfte: ”${esc(v.text)}”</p>`).join('');
              if (to.kind !== 'encounter') return `<button class="btn primary" data-act="travel" data-to="${to.id}" data-kind="${to.kind}">Gå mot ${name}</button>${note}`;
              // The machines work at dawn, and don't wait for us.
              const fixed = ENCOUNTERS[to.encounter!].fixedTime;
              if (fixed) return `<div class="leg">
                <button class="btn primary" data-act="travel" data-to="${to.id}" data-kind="${to.encounter}">Gå mot ${name}</button>
                <p class="small time-note">☼ ${esc(TIME_NOTES[to.encounter!][fixed])}</p>
                ${breaks(fixed)}
                ${note}
              </div>`;
              // An encounter comes at the natural time of day, unless we wait for the other one.
              const now = s.clock;
              const later = otherTime(now);
              return `<div class="leg">
                <button class="btn primary" data-act="travel" data-to="${to.id}" data-kind="${to.encounter}">Gå mot ${name} – i ${TIME_NAMES[now]}</button>
                <p class="small time-note">${now === 'night' ? '☾' : '☼'} ${esc(TIME_NOTES[to.encounter!][now])}</p>
                ${breaks(now)}
                <button class="btn" data-act="travel" data-to="${to.id}" data-wait="1" ${s.hope > 0 ? '' : 'disabled'}>Vänta till ${later === 'night' ? 'natten' : 'dagen'} (−1 hopp)</button>
                <p class="small time-note">${later === 'night' ? '☾' : '☼'} ${esc(TIME_NOTES[to.encounter!][later])}</p>
                ${breaks(later)}
                ${note}
              </div>`;
            }).join('')}
          </div>
          <h3>Vi som går</h3>
          <ul class="roster">${rosterHtml(s)}</ul>
          ${memorialHtml(s)}
          <section class="log between-log">${this.logHtml(s.log.slice(-14))}</section>
          <button class="btn small mute-btn" data-act="mute">${this.sound.muted ? 'Ljud av' : 'Ljud på'}</button>
        </aside>
        ${meetingHtml(s, this.meetingPickerHtml(s)) || (this.skillsOpen ? this.skillsHtml(s) : '')}
      </div>`;
    const log = this.root.querySelector<HTMLElement>('.between-log');
    if (log) log.scrollTop = log.scrollHeight;
  }

  /** Each of us and the six things its kind can do: what it carries, what it knows, what it has yet to learn. */
  private skillsHtml(s: GameState): string {
    const sections = s.animals.filter(isPresent).map((a) => {
      const cards = allSkills(a.species).map((kind, i) => {
        if (!a.skills.includes(kind)) {
          const advanced = i >= SKILLS[a.species].basic.length;
          return `<div class="card mini skill-unknown" style="--owner:${speciesColor(a.species)}"><span class="cname">?</span><span class="ctext">${advanced ? 'Lärs på vägen.' : 'Okänd ännu.'}</span></div>`;
        }
        const carried = a.loadout.includes(kind);
        return cardFaceHtml(s, { uid: -1, kind, owner: a.id }, {
          tag: 'button',
          attrs: `data-act="skill" data-animal="${a.id}" data-kind="${kind}" aria-pressed="${carried}"`,
          classes: ['mini', carried ? 'carried' : 'resting'],
          footer: `<span class="cwhere">${carried ? 'bärs' : 'vilar'}</span>`,
        });
      }).join('');
      // Learned from another kind, by the fire.
      const foreign = a.skills.filter((k) => !allSkills(a.species).includes(k)).map((kind) => {
        const carried = a.loadout.includes(kind);
        return cardFaceHtml(s, { uid: -1, kind, owner: a.id }, {
          tag: 'button',
          attrs: `data-act="skill" data-animal="${a.id}" data-kind="${kind}" aria-pressed="${carried}"`,
          classes: ['mini', carried ? 'carried' : 'resting'],
          footer: `<span class="cwhere">${carried ? 'bärs' : 'vilar'} · lärd av en annan</span>`,
        });
      }).join('');
      const offer = a.offer?.length ? `<div class="skill-offer"><p class="small"><b>${esc(a.name)} har lärt sig något på vägen.</b> Välj en:</p>
        <div class="deck-grid skill-grid">${a.offer.map((kind) => cardFaceHtml(s, { uid: -1, kind, owner: a.id }, {
          tag: 'button', attrs: `data-act="learn" data-animal="${a.id}" data-kind="${kind}"`, classes: ['mini', 'offered'], footer: '<span class="cwhere">lär dig</span>',
        })).join('')}</div></div>` : '';
      const toNext = allSkills(a.species).some((k) => !a.skills.includes(k)) && !a.offer ? ` · ${XP_TO_LEARN - a.xp} faror till nästa` : '';
      return `<section class="deck-animal" style="--owner:${speciesColor(a.species)}">
        <h4>${silhouette(a.species)} ${esc(a.name)} <span class="muted">· ${esc(SPECIES[a.species].kindName)} · bär ${a.loadout.length} av ${LOADOUT}${toNext}</span></h4>
        ${offer}
        <div class="deck-grid skill-grid">${cards}${foreign}</div>
      </section>`;
    }).join('');
    return `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="skills-title">
        <div class="modal-card deck skills-modal">
          <div class="deck-head"><h2 id="skills-title">Förmågor</h2><button class="btn small" data-act="skills-close">Stäng</button></div>
          <p class="muted small">Varje art kan sex saker. Var och en av oss bär ${LOADOUT} av dem – det är dess kort i leken. Tryck för att bära eller lägga undan. Det går bara här, inte mitt i en fara. Den som tagit sig igenom ${XP_TO_LEARN} faror lär sig något nytt, och vid elden kan två som står varandra nära lära varandra.</p>
          ${this.skillsHint ? `<p class="hint">${esc(this.skillsHint)}</p>` : ''}
          ${sections}
        </div>
      </div>`;
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

  /** Choosing the card the crow will take: the mini cards, and the one chosen named. */
  private meetingPickerHtml(s: GameState): string {
    const pick = this.meetingPick;
    if (!pick) return '';
    const chosen = crowCards(s).find((c) => c.uid === pick.uid);
    const taker = (s.meeting && MEETINGS[s.meeting.id].taker) || 'Kråkan';
    return `<p class="small">${chosen ? `${taker} får <b>${esc(CARDS[chosen.kind].name)}</b> från ${esc(animal(s, chosen.owner).name)} – för alltid.` : `Vilket kort får ${taker.toLowerCase()}? Det försvinner för alltid.`}</p>
      <div class="deck-grid crow-pick">${byOwner(s, crowCards(s)).map((c) =>
        cardFaceHtml(s, c, { tag: 'button', attrs: `data-act="meet-card" data-uid="${c.uid}" aria-pressed="${pick.uid === c.uid}"`, classes: ['mini', pick.uid === c.uid ? 'selected' : ''] })).join('')}</div>
      <div class="meet-options">
        <button class="btn primary" data-act="meet-give" ${chosen ? '' : 'disabled'}>Ge ${taker.toLowerCase()} kortet</button>
        <button class="btn" data-act="meet-back">Tillbaka</button>
      </div>`;
  }

  /** Seat an animal where it was dropped, or say why it can't sit there. */
  private seatAnimal(id: string, seat: Seat, slot: number) {
    const s = this.state;
    if (!s || !this.fireSeats) return;
    const r = moveToSeat(s, this.fireSeats, id, seat, slot);
    this.fireSeats = r.seats;
    this.fireHint = r.refusal ?? '';
    this.firePicked = null;
    this.render();
  }

  /** Dragging an animal across the fire scene: a paper cut-out follows the finger or the mouse. */
  private onPointerDown(e: PointerEvent) {
    const tok = (e.target as HTMLElement).closest<HTMLElement>('.fire-token[data-drag]');
    if (!tok || this.state?.phase !== 'campfire' || this.state.meeting) return;
    this.drag = { id: tok.dataset.drag!, x: e.clientX, y: e.clientY };
    this.suppressClick = false;
  }

  private onPointerMove(e: PointerEvent) {
    const d = this.drag;
    if (!d) return;
    if (!d.ghost) {
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return;
      const tok = this.root.querySelector<HTMLElement>(`.fire-token[data-drag="${d.id}"]`);
      if (!tok) return;
      d.ghost = tok.cloneNode(true) as HTMLElement;
      d.ghost.classList.add('drag-ghost');
      d.ghost.style.width = `${tok.offsetWidth}px`;
      document.body.appendChild(d.ghost);
      tok.classList.add('dragging');
    }
    e.preventDefault();
    d.ghost.style.left = `${e.clientX}px`;
    d.ghost.style.top = `${e.clientY}px`;
    const over = this.slotAt(e.clientX, e.clientY);
    this.root.querySelectorAll('.fire-slot.over, .fire-dark-zone.over').forEach((x) => x.classList.remove('over'));
    over?.classList.add('over');
  }

  private onPointerUp(e: PointerEvent) {
    const d = this.drag;
    this.drag = null;
    if (!d?.ghost) return;
    d.ghost.remove();
    this.suppressClick = true;
    window.setTimeout(() => (this.suppressClick = false), 0);
    const slot = this.slotAt(e.clientX, e.clientY);
    if (slot) this.seatAnimal(d.id, slot.dataset.seat as Seat, Number(slot.dataset.slot ?? 0));
    else this.render();
  }

  /** The place under the pointer, looking through the dragged cut-out and the tokens. */
  private slotAt(x: number, y: number): HTMLElement | null {
    for (const el of document.elementsFromPoint(x, y)) {
      const slot = (el as HTMLElement).closest<HTMLElement>('.fire-slot, .fire-dark-zone');
      if (slot) return slot;
      const tok = (el as HTMLElement).closest<HTMLElement>('.fire-token[data-animal]');
      if (tok && !tok.classList.contains('dragging') && this.fireSeats && this.state) {
        // Dropped on someone: the spot they sit on.
        const seat = this.fireSeats[tok.dataset.animal!] ?? 'dark';
        const i = occupants(this.state, this.fireSeats, seat).indexOf(tok.dataset.animal!);
        return this.root.querySelector<HTMLElement>(`.fire-slot[data-seat="${seat}"][data-slot="${i}"]`) ?? this.root.querySelector<HTMLElement>(seat === 'dark' ? '.fire-dark-zone' : `.fire-slot[data-seat="${seat}"]`);
      }
    }
    return null;
  }

  /** At a fork, one or two of us speak up for a path. */
  private voicesHtml(s: GameState): string {
    const voices = forkVoices(s);
    if (!voices.length) return '';
    return `<div class="voices">${voices
      .map((v) => {
        const a = animal(s, v.who);
        const to = place(s, v.to);
        const name = s.journey.visited.includes(to.id) ? to.name : to.fogName;
        const d = voiceStake(s, a);
        return `<div class="voice" style="--owner:${speciesColor(a.species)}">
          ${silhouette(a.species)}
          <p><b>${esc(a.name)}:</b> ”${esc(v.line)}”</p>
          <span class="chip tone-info">vill mot ${esc(name)} · +${d} tro om vi går dit, −${d} annars</span>
        </div>`;
      })
      .join('')}</div>`;
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
          <h2>${esc(place(s, s.journey.at).name)} <span class="muted">· lägerelden</span> <button class="btn small skills-btn ${s.animals.some((a) => isPresent(a) && a.offer) ? 'pending' : ''}" data-act="skills-open">Förmågor${s.animals.some((a) => isPresent(a) && a.offer) ? ' ●' : ''}</button></h2>
          ${fireSceneSvg(s, this.fireSeats, { crow: !!s.meeting || s.fireDebt.apart.length > 0 || s.fireDebt.embers > 0, picked: this.firePicked ?? undefined })}
          ${memorialHtml(s)}
        </div>
        <aside class="between-side">${firePanelHtml(s, this.fireSeats, this.fireMourning, this.fireHint, this.fireTeach)}</aside>
        ${meetingHtml(s, this.meetingPickerHtml(s)) || (this.skillsOpen ? this.skillsHtml(s) : '')}
      </div>`;
  }

  private renderEnd(s: GameState) {
    this.mounted = false;
    const o = s.outcome!;
    const survivors = o.safe.map((id) => animal(s, id));
    const last = [...s.log].reverse().filter((e) => e.kind === 'narrate').slice(0, 2).reverse();
    this.root.innerHTML = `
      <div class="screen end-screen">
        <h2>${o.fallen ? 'Eden föll' : esc(place(s, s.journey.at).kind === 'encounter' ? REGIONS[s.journey.region].beyond : place(s, s.journey.at).name)}</h2>
        <p class="muted">${esc(castDef(s.cast).name)}</p>
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

