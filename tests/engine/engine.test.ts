import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/engine/setup';
import { step } from '../../src/engine/step';
import { cardBlockReason, cardCost, cardZones, leadBlockReason, leadZones, verseStatus } from '../../src/engine/rules';
import type { Action, GameState } from '../../src/engine/types';
import { calmGame, car, get, run, setTraffic } from './helpers';

const ALL3 = ['ingenLamnas', 'viJagarInte', 'denStarke'] as const;

describe('determinism', () => {
  it('replays identically from the same seed and actions', () => {
    const play = () => {
      let s: GameState = createGame(1234);
      const actions: Action[] = [{ type: 'swear', verses: [...ALL3] }];
      for (const a of actions) s = step(s, a).state;
      for (let i = 0; i < 12 && s.phase !== 'over'; i++) {
        const a: Action = s.phase === 'lastMoment' ? { type: 'lastMoment', choice: 'letGo' } : { type: 'endTurn' };
        s = step(s, a).state;
      }
      return s;
    };
    expect(play()).toEqual(play());
  });

  it('gives every animal three cards', () => {
    const s = createGame(99);
    for (const a of s.animals) expect(s.draw.filter((c) => c.owner === a.id)).toHaveLength(3);
    expect(s.animals.every((a) => a.traits.length === 2)).toBe(true);
  });

  it('rejects an oath without exactly three verses', () => {
    const r = step(createGame(1), { type: 'swear', verses: ['ingenLamnas'] });
    expect(r.events[0].kind).toBe('error');
    expect(r.state.phase).toBe('oath');
  });
});

describe('belief', () => {
  it('an animal with no belief leaves when the oath does not hold it', () => {
    let s = calmGame(['viJagarInte', 'denStarke', 'manen']);
    get(s, 'kvarn').belief = 0;
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'kvarn').intent.kind).toBe('leave');
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'kvarn').status).toBe('left');
    expect(s.draw.concat(s.hand, s.discard).some((c) => c.owner === 'kvarn')).toBe(false);
  });

  it('"Ingen lämnas kvar" keeps belief from reaching zero', () => {
    let s = calmGame([...ALL3]);
    get(s, 'frona').belief = 1;
    get(s, 'sotfot').intent = { kind: 'hunt', target: 'frona' };
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'frona').belief).toBe(1);
  });
});

describe('the truce', () => {
  it('a predator with low belief turns its intent on prey', () => {
    let s = calmGame(['ingenLamnas', 'denStarke', 'manen']);
    get(s, 'sotfot').belief = 2;
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'sotfot').intent).toEqual({ kind: 'hunt', target: 'frona' });
  });

  it('the truce verse holds the same predator back', () => {
    let s = calmGame([...ALL3]);
    get(s, 'sotfot').belief = 2;
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'sotfot').intent.kind).not.toBe('hunt');
  });

  it('a hunt breaks the truce verse into its inverse', () => {
    let s = calmGame([...ALL3]);
    get(s, 'sotfot').intent = { kind: 'hunt', target: 'frona' };
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'frona').count).toBe(5);
    const v = s.verses.find((x) => x.base === 'viJagarInte')!;
    expect(v.flipped).toBe(true);
    expect(v.flippedText).toBe('Vi jagade varandra.');
  });
});

describe('the last moment', () => {
  function lethal(verses = [...ALL3]) {
    const s = calmGame(verses);
    const k = get(s, 'kvarn');
    k.zone = 'lane1';
    k.wounds = 2;
    get(s, 'ljung').zone = 'lane1';
    setTraffic(s, [car('lane2')]);
    s.trafficPlan[0] = [{ lane: 'lane1', wounds: 1, vehicle: 'bil', dark: false }];
    // Only Kvarn is in danger: Ljung waits in the median.
    get(s, 'ljung').zone = 'median';
    return run(s, { type: 'endTurn' });
  }

  it('pauses on a lethal, telegraphed hit', () => {
    const s = lethal();
    expect(s.phase).toBe('lastMoment');
    expect(s.pending?.victim).toBe('kvarn');
  });

  it('breaking a verse saves the animal and rewrites the verse', () => {
    let s = lethal();
    s = run(s, { type: 'lastMoment', choice: 'verse', verse: 'denStarke' });
    expect(get(s, 'kvarn').status).toBe('active');
    expect(get(s, 'kvarn').wounds).toBe(2);
    expect(verseStatus(s, 'denStarke')).toBe('flipped');
    expect(cardCost(s, { uid: 0, kind: 'bara', owner: 'ljung' })).toBe(2);
  });

  it('letting go kills, flips "Ingen lämnas kvar" and leaves a memory', () => {
    let s = lethal();
    s = run(s, { type: 'lastMoment', choice: 'letGo' });
    expect(get(s, 'kvarn').status).toBe('dead');
    expect(verseStatus(s, 'ingenLamnas')).toBe('flipped');
    const all = s.draw.concat(s.hand, s.discard);
    expect(all.filter((c) => c.owner === 'kvarn').map((c) => c.kind)).toEqual(['minne']);
    expect(s.verses.find((v) => v.id === 'minne-kvarn')?.text).toBe('För Kvarn, som vi lät gå.');
  });

  it('another animal can throw itself in the way', () => {
    let s = lethal();
    s = run(s, { type: 'lastMoment', choice: 'shield', by: 'ljung' });
    expect(get(s, 'kvarn').wounds).toBe(2);
    expect(get(s, 'ljung').wounds).toBe(1);
  });

  it('a dark car gives no last moment', () => {
    const s = calmGame([...ALL3]);
    const k = get(s, 'kvarn');
    k.zone = 'lane2';
    k.wounds = 1;
    s.trafficPlan[0] = [{ lane: 'lane2', wounds: 2, vehicle: 'mörk bil', dark: true }];
    const after = run(s, { type: 'endTurn' });
    expect(after.phase).toBe('play');
    expect(get(after, 'kvarn').status).toBe('dead');
  });
});

describe('swarms', () => {
  it('shrinks instead of dying, and breaks "Den starke bär den svage"', () => {
    let s = calmGame([...ALL3]);
    get(s, 'frona').zone = 'lane1';
    get(s, 'ljung').zone = 'lane1';
    s.trafficPlan[0] = [car('lane1')];
    get(s, 'ljung').braced = true;
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'frona').count).toBe(4);
    expect(get(s, 'frona').status).toBe('active');
    expect(verseStatus(s, 'denStarke')).toBe('flipped');
  });
});

describe('the road', () => {
  it('the culvert is slow: one hour inside before crawling out', () => {
    let s = calmGame([...ALL3]);
    s.hand.push({ uid: 900, kind: 'gamlaVagar', owner: 'kvarn' });
    s = run(s, { type: 'play', uid: 900 });
    expect(s.culvertRevealed).toBe(true);
    expect(get(s, 'kvarn').zone).toBe('culvert');
    s.hand.push({ uid: 901, kind: 'smaSteg', owner: 'kvarn' });
    expect(cardZones(s, s.hand.at(-1)!)).toEqual([]);
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'kvarn').culvertTime).toBe(1);
    s = run(s, { type: 'lead', target: 'kvarn', zone: 'farDike' });
    expect(get(s, 'kvarn').status).toBe('safe');
  });

  it('dawn leaves the stragglers behind and breaks the first verse', () => {
    let s = calmGame([...ALL3]);
    s.turn = s.maxTurn;
    s = run(s, { type: 'endTurn' });
    expect(s.phase).toBe('over');
    expect(s.outcome?.fallen).toBe(true);
    expect(s.animals.every((a) => a.status === 'left')).toBe(true);
    expect(verseStatus(s, 'ingenLamnas')).toBe('flipped');
  });

  it('crossing everyone ends the night well', () => {
    let s = calmGame([...ALL3]);
    for (const a of s.animals) a.zone = 'lane2';
    s.kraft = 99;
    for (const a of s.animals) s = run(s, { type: 'lead', target: a.id, zone: 'farDike' });
    // No need to let the hour pass: the night ends when the last one is over.
    expect(s.phase).toBe('over');
    expect(s.outcome?.safe).toHaveLength(6);
  });

  it('walking onto asphalt in moonlight breaks the moon verse', () => {
    let s = calmGame(['ingenLamnas', 'denStarke', 'manen']);
    s.moonPlan[0] = false;
    s = run(s, { type: 'lead', target: 'ljung', zone: 'lane1' });
    expect(verseStatus(s, 'manen')).toBe('flipped');
  });
});

describe('size and flight', () => {
  it('only small animals fit through the culvert', () => {
    const s = calmGame([...ALL3]);
    s.culvertRevealed = true;
    expect(leadZones(s, get(s, 'kvarn'))).toContain('culvert');
    expect(leadZones(s, get(s, 'frona'))).toContain('culvert');
    expect(leadZones(s, get(s, 'sotfot'))).not.toContain('culvert');
    expect(leadZones(s, get(s, 'ljung'))).not.toContain('culvert');
  });

  it('the owl flies two steps and cannot be hit while airborne', () => {
    let s = calmGame([...ALL3]);
    expect(leadZones(s, get(s, 'skymning'))).toEqual(expect.arrayContaining(['lane1', 'median']));
    s.trafficPlan[0] = [car('lane1', 2)];
    s = run(s, { type: 'lead', target: 'skymning', zone: 'lane1' });
    expect(get(s, 'skymning').flying).toBe(true);
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'skymning').wounds).toBe(0);
  });

  it('an owl that sits still on the road has landed and can be hit', () => {
    let s = calmGame([...ALL3]);
    get(s, 'skymning').zone = 'lane1';
    s.trafficPlan[0] = [car('lane1')];
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'skymning').wounds).toBe(1);
  });

  it('a flying owl does not break the moon verse', () => {
    let s = calmGame(['ingenLamnas', 'denStarke', 'manen']);
    s.moonPlan[0] = false;
    s = run(s, { type: 'lead', target: 'skymning', zone: 'lane1' });
    expect(verseStatus(s, 'manen')).toBe('intact');
  });
});

describe('reasons shown to the player', () => {
  it('explains frozen animals and missing kraft', () => {
    const s = calmGame([...ALL3]);
    get(s, 'sotfot').intent = { kind: 'freeze' };
    expect(leadBlockReason(s, get(s, 'sotfot'))).toMatch(/fryser/);
    expect(cardBlockReason(s, { uid: 1, kind: 'snabbaTassar', owner: 'sotfot' })).toBe('Sotfot fryser.');
    s.kraft = 0;
    expect(cardBlockReason(s, { uid: 2, kind: 'bitaIhop', owner: 'ljung' })).toBe('Behöver ◆1.');
    expect(leadBlockReason(s, get(s, 'kvarn'))).toMatch(/kostar/);
  });
});

describe('Sicksack the adder', () => {
  it('is hungrier than the others: hunts even while the truce verse holds', () => {
    let s = calmGame([...ALL3]);
    get(s, 'sicksack').belief = 3;
    get(s, 'sotfot').belief = 3;
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'sicksack').intent.kind).toBe('hunt');
    expect(get(s, 'sotfot').intent.kind).not.toBe('hunt');
  });

  it('only hunts prey its own size or smaller', () => {
    let s = calmGame(['ingenLamnas', 'denStarke', 'manen']);
    for (const a of s.animals) if (a.id !== 'sicksack' && a.id !== 'ljung') a.zone = 'farDike';
    for (const a of s.animals) if (a.zone === 'farDike') a.status = 'safe';
    get(s, 'sicksack').belief = 1;
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'sicksack').intent.kind).not.toBe('hunt');
  });

  it('fits through the culvert, and its promise scares the prey nearby', () => {
    let s = calmGame([...ALL3]);
    s.culvertRevealed = true;
    expect(leadZones(s, get(s, 'sicksack'))).toContain('culvert');
    s.hand.push({ uid: 950, kind: 'giftIReserv', owner: 'sicksack' });
    s = run(s, { type: 'play', uid: 950 });
    expect(get(s, 'sicksack').belief).toBe(10);
    expect(get(s, 'frona').belief).toBe(7);
  });
});

describe('hope events', () => {
  it('say why hope sank, so an animal can speak about it', () => {
    const s = calmGame([...ALL3]);
    const k = get(s, 'kvarn');
    k.zone = 'lane1';
    k.wounds = 2;
    s.trafficPlan[0] = [car('lane1')];
    const paused = run(s, { type: 'endTurn' });
    const r = step(paused, { type: 'lastMoment', choice: 'letGo' });
    const hope = r.events.filter((e) => e.kind === 'hope');
    expect(hope).toEqual(expect.arrayContaining([
      { kind: 'hope', delta: -1, reason: 'death', who: 'kvarn' },
      { kind: 'hope', delta: -2, reason: 'flip', who: undefined },
    ]));
  });
});
