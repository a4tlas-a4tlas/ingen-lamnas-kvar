import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/engine/setup';
import { step } from '../../src/engine/step';
import { cardBlockReason, cardZones, leadBlockReason, leadCost, leadZones, verseStatus } from '../../src/engine/rules';
import type { Action, GameState } from '../../src/engine/types';
import { calmGame, car, get, run, truck } from './helpers';

const ALL3 = ['ingenLamnas', 'viJagarInte', 'denStarke'] as const;

describe('determinism', () => {
  it('replays identically from the same seed and actions', () => {
    const play = () => {
      let s: GameState = createGame(1234);
      const actions: Action[] = [{ type: 'swear', verses: [ALL3[0]] }, { type: 'travel', to: 'vagen' }];
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

  it('rejects an oath that is not exactly one verse', () => {
    const r = step(createGame(1), { type: 'swear', verses: ['ingenLamnas', 'manen'] });
    expect(r.events[0].kind).toBe('error');
    expect(r.state.phase).toBe('oath');
  });
});

describe('belief', () => {
  it('an animal with no belief leaves when the oath does not hold it', () => {
    let s = calmGame(['viJagarInte', 'denStarke', 'manen']);
    get(s, 'toad').belief = 0;
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'toad').intent.kind).toBe('leave');
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'toad').status).toBe('left');
    expect(s.draw.concat(s.hand, s.discard).some((c) => c.owner === 'toad')).toBe(false);
  });

  it('"Ingen lämnas kvar" keeps belief from reaching zero', () => {
    let s = calmGame([...ALL3]);
    get(s, 'mice').belief = 1;
    get(s, 'fox').intent = { kind: 'hunt', target: 'mice' };
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'mice').belief).toBe(1);
  });
});

describe('the truce', () => {
  it('a predator with low belief turns its intent on prey', () => {
    let s = calmGame(['ingenLamnas', 'denStarke', 'manen']);
    get(s, 'fox').belief = 2;
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'fox').intent).toEqual({ kind: 'hunt', target: 'mice' });
  });

  it('the truce verse holds the same predator back', () => {
    let s = calmGame([...ALL3]);
    get(s, 'fox').belief = 2;
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'fox').intent.kind).not.toBe('hunt');
  });

  it('a hunt breaks the truce verse into its inverse', () => {
    let s = calmGame([...ALL3]);
    get(s, 'fox').intent = { kind: 'hunt', target: 'mice' };
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'mice').count).toBe(5);
    const v = s.verses.find((x) => x.base === 'viJagarInte')!;
    expect(v.flipped).toBe(true);
    expect(v.flippedText).toBe('Vi jagade varandra.');
  });
});

describe('the last moment', () => {
  function lethal(verses = [...ALL3]) {
    const s = calmGame(verses);
    get(s, 'toad').zone = 'lane1';
    s.trafficPlan[0] = [truck('lane1')];
    // Only Kvarn is in danger: Ljung waits in the median.
    get(s, 'badger').zone = 'median';
    return run(s, { type: 'endTurn' });
  }

  it('pauses on a killing, telegraphed hit', () => {
    const s = lethal();
    expect(s.phase).toBe('lastMoment');
    expect(s.pending?.victim).toBe('toad');
  });

  it('verses cannot be spent to save a life', () => {
    const s = lethal();
    const r = step(s, { type: 'lastMoment', choice: 'verse', verse: 'denStarke' } as unknown as Action);
    expect(r.events[0].kind).toBe('error');
    expect(r.state.phase).toBe('lastMoment');
    expect(verseStatus(r.state, 'denStarke')).toBe('intact');
  });

  it('letting go kills, flips "Ingen lämnas kvar" and leaves a memory', () => {
    let s = lethal();
    s = run(s, { type: 'lastMoment', choice: 'letGo' });
    expect(get(s, 'toad').status).toBe('dead');
    expect(verseStatus(s, 'ingenLamnas')).toBe('flipped');
    const all = s.draw.concat(s.hand, s.discard);
    expect(all.filter((c) => c.owner === 'toad').map((c) => c.kind)).toEqual(['minne']);
    expect(s.verses.find((v) => v.id === 'minne-toad')?.text).toBe('För Kvarn, som vi lät gå.');
  });

  it('another animal can throw itself in the way', () => {
    let s = lethal();
    s = run(s, { type: 'lastMoment', choice: 'shield', by: 'badger' });
    // Ljung pushes Kvarn away and is hurt, not killed.
    expect(get(s, 'toad').injuries).toEqual([]);
    expect(get(s, 'badger').status).toBe('active');
    expect(get(s, 'badger').injuries).toHaveLength(1);
  });

  it('a dark car gives no last moment', () => {
    const s = calmGame([...ALL3]);
    const k = get(s, 'toad');
    k.zone = 'lane2';
    s.trafficPlan[0] = [{ lane: 'lane2', severity: 'kill', vehicle: 'mörk bil', dark: true }];
    const after = run(s, { type: 'endTurn' });
    expect(after.phase).toBe('play');
    expect(get(after, 'toad').status).toBe('dead');
  });
});

describe('swarms', () => {
  it('shrinks instead of dying, and breaks "Den starke bär den svage"', () => {
    let s = calmGame([...ALL3]);
    get(s, 'mice').zone = 'lane1';
    get(s, 'badger').zone = 'lane1';
    s.trafficPlan[0] = [car('lane1')];
    get(s, 'badger').braced = true;
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'mice').count).toBe(5);
    expect(get(s, 'mice').status).toBe('active');
    expect(verseStatus(s, 'denStarke')).toBe('flipped');
  });
});

describe('the road', () => {
  it('the culvert is slow: one hour inside before crawling out', () => {
    let s = calmGame([...ALL3]);
    s.hand.push({ uid: 900, kind: 'gamlaVagar', owner: 'toad' });
    s = run(s, { type: 'play', uid: 900 });
    expect(s.revealed).toContain('culvert');
    expect(get(s, 'toad').zone).toBe('culvert');
    s.hand.push({ uid: 901, kind: 'smaSteg', owner: 'toad' });
    expect(cardZones(s, s.hand.at(-1)!)).toEqual([]);
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'toad').slowTime).toBe(1);
    s = run(s, { type: 'lead', target: 'toad', zone: 'farDike' });
    expect(get(s, 'toad').status).toBe('safe');
  });

  it('dawn leaves the stragglers behind and breaks the first verse', () => {
    let s = calmGame([...ALL3]);
    s.turn = s.maxTurn;
    s = run(s, { type: 'endTurn' });
    // No one made it across: the oath falls and the run ends here.
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
    // No need to let the hour pass: the night ends when the last one is over, and the map opens.
    expect(s.phase).toBe('map');
    expect(s.animals.every((a) => a.status === 'safe')).toBe(true);
  });

  it('walking onto asphalt in moonlight breaks the moon verse', () => {
    let s = calmGame(['ingenLamnas', 'denStarke', 'manen']);
    s.moonPlan[0] = false;
    s = run(s, { type: 'lead', target: 'badger', zone: 'lane1' });
    expect(verseStatus(s, 'manen')).toBe('flipped');
  });
});

describe('size and flight', () => {
  it('only small animals fit through the culvert', () => {
    const s = calmGame([...ALL3]);
    s.revealed = ['culvert'];
    expect(leadZones(s, get(s, 'toad'))).toContain('culvert');
    expect(leadZones(s, get(s, 'mice'))).toContain('culvert');
    expect(leadZones(s, get(s, 'fox'))).not.toContain('culvert');
    expect(leadZones(s, get(s, 'badger'))).not.toContain('culvert');
  });

  it('the owl flies two steps and cannot be hit while airborne', () => {
    let s = calmGame([...ALL3]);
    expect(leadZones(s, get(s, 'owl'))).toEqual(expect.arrayContaining(['lane1', 'median']));
    s.trafficPlan[0] = [truck('lane1')];
    s = run(s, { type: 'lead', target: 'owl', zone: 'lane1' });
    expect(get(s, 'owl').flying).toBe(true);
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'owl').status).toBe('active');
    expect(get(s, 'owl').injuries).toEqual([]);
  });

  it('an owl that sits still on the road has landed and can be hit', () => {
    let s = calmGame([...ALL3]);
    get(s, 'owl').zone = 'lane1';
    s.trafficPlan[0] = [car('lane1')];
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'owl').injuries).toHaveLength(1);
  });

  it('a flying owl does not break the moon verse', () => {
    let s = calmGame(['ingenLamnas', 'denStarke', 'manen']);
    s.moonPlan[0] = false;
    s = run(s, { type: 'lead', target: 'owl', zone: 'lane1' });
    expect(verseStatus(s, 'manen')).toBe('intact');
  });
});

describe('reasons shown to the player', () => {
  it('explains frozen animals and missing kraft', () => {
    const s = calmGame([...ALL3]);
    get(s, 'fox').intent = { kind: 'freeze' };
    expect(leadBlockReason(s, get(s, 'fox'))).toMatch(/fryser/);
    expect(cardBlockReason(s, { uid: 1, kind: 'snabbaTassar', owner: 'fox' })).toBe('Sotfot fryser.');
    s.kraft = 0;
    expect(cardBlockReason(s, { uid: 2, kind: 'bitaIhop', owner: 'badger' })).toBe('Behöver ◆1.');
    expect(leadBlockReason(s, get(s, 'toad'))).toMatch(/kostar/);
  });
});

describe('Sicksack the adder', () => {
  it('is hungrier than the others: hunts even while the truce verse holds', () => {
    let s = calmGame([...ALL3]);
    get(s, 'adder').belief = 3;
    get(s, 'fox').belief = 3;
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'adder').intent.kind).toBe('hunt');
    expect(get(s, 'fox').intent.kind).not.toBe('hunt');
  });

  it('only hunts prey its own size or smaller', () => {
    let s = calmGame(['ingenLamnas', 'denStarke', 'manen']);
    for (const a of s.animals) if (a.id !== 'adder' && a.id !== 'badger') a.zone = 'farDike';
    for (const a of s.animals) if (a.zone === 'farDike') a.status = 'safe';
    get(s, 'adder').belief = 1;
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'adder').intent.kind).not.toBe('hunt');
  });

  it('fits through the culvert, and its promise scares the prey nearby', () => {
    let s = calmGame([...ALL3]);
    s.revealed = ['culvert'];
    expect(leadZones(s, get(s, 'adder'))).toContain('culvert');
    s.hand.push({ uid: 950, kind: 'giftIReserv', owner: 'adder' });
    s = run(s, { type: 'play', uid: 950 });
    expect(get(s, 'adder').belief).toBe(10);
    expect(get(s, 'mice').belief).toBe(7);
  });
});

describe('hope events', () => {
  it('say why hope sank, so an animal can speak about it', () => {
    const s = calmGame([...ALL3]);
    get(s, 'toad').zone = 'lane1';
    s.trafficPlan[0] = [truck('lane1')];
    const paused = run(s, { type: 'endTurn' });
    const r = step(paused, { type: 'lastMoment', choice: 'letGo' });
    const hope = r.events.filter((e) => e.kind === 'hope');
    expect(hope).toEqual(expect.arrayContaining([
      { kind: 'hope', delta: -1, reason: 'death', who: 'toad' },
      { kind: 'hope', delta: -2, reason: 'flip', who: undefined },
    ]));
  });
});

describe('injuries', () => {
  it('a car injures instead of killing, and the injury stays', () => {
    let s = calmGame([...ALL3]);
    get(s, 'toad').zone = 'lane1';
    s.trafficPlan[0] = [car('lane1')];
    s = run(s, { type: 'endTurn' });
    expect(s.phase).toBe('play');
    expect(get(s, 'toad').status).toBe('active');
    expect(['halt', 'broken']).toContain(get(s, 'toad').injuries[0]);
  });

  it('a limp allows only one step and makes leading cost more', () => {
    const s = calmGame([...ALL3]);
    const fox = get(s, 'fox');
    fox.injuries = ['halt'];
    expect(cardZones(s, { uid: 1, kind: 'snabbaTassar', owner: 'fox' })).toEqual(['lane1']);
    expect(leadCost(fox)).toBe(2);
  });

  it('a broken wing grounds the owl and blocks its species card', () => {
    const s = calmGame([...ALL3]);
    get(s, 'owl').injuries = ['broken'];
    expect(leadZones(s, get(s, 'owl'))).toEqual(['lane1']);
    expect(cardBlockReason(s, { uid: 2, kind: 'vingar', owner: 'owl' })).toBe('Skymnings vinge är bruten.');
  });

  it('bleeding drains belief every hour', () => {
    let s = calmGame([...ALL3]);
    get(s, 'badger').injuries = ['bleeding'];
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'badger').belief).toBe(7);
  });

  it('a witness standing beside the dead goes into shock', () => {
    let s = calmGame([...ALL3]);
    get(s, 'toad').zone = 'lane1';
    get(s, 'badger').zone = 'lane1';
    get(s, 'badger').braced = true;
    s.trafficPlan[0] = [{ lane: 'lane1', severity: 'kill', vehicle: 'mörk bil', dark: true }];
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'toad').status).toBe('dead');
    expect(get(s, 'badger').injuries).toContain('shock');
  });

  it("a predator's first bite tears; the second kills", () => {
    let s = calmGame(['ingenLamnas', 'denStarke', 'manen']);
    get(s, 'fox').intent = { kind: 'hunt', target: 'toad' };
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'toad').injuries).toContain('bleeding');
    get(s, 'fox').intent = { kind: 'hunt', target: 'toad' };
    s = run(s, { type: 'endTurn' });
    expect(get(s, 'toad').status).toBe('dead');
  });
});
