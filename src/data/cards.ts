import type { CardKind } from '../engine/types';

/**
 * none       – played directly
 * zone       – the card's owner moves to a chosen zone
 * animal     – targets another animal
 * animalZone – targets an animal, then a zone they move to together
 */
export type TargetSpec = 'none' | 'zone' | 'animal' | 'animalZone';

export type CardTag = 'move' | 'guard' | 'comfort' | 'insight' | 'memory';

export const TAG_NAMES: Record<CardTag, string> = {
  move: 'Rörelse',
  guard: 'Skydd',
  comfort: 'Tröst',
  insight: 'Insikt',
  memory: 'Minne',
};

export interface CardDef {
  name: string;
  cost: number;
  target: TargetSpec;
  tag: CardTag;
  /** {o} is replaced by the owner's name. */
  text: string;
}

export const CARDS: Record<CardKind, CardDef> = {
  snabbaTassar: { name: 'Snabba tassar', cost: 1, target: 'zone', tag: 'move', text: '{o} springer upp till 2 steg.' },
  bara: { name: 'Bära', cost: 1, target: 'animalZone', tag: 'move', text: '{o} bär ett djur från samma zon 1 steg. Det skyddas denna timme.' },
  gamlaVagar: { name: 'Gamla vägar', cost: 1, target: 'none', tag: 'insight', text: 'Visar trumman under vägen – bara små djur får plats. {o} kryper ner. Syns den redan: se nästa timme.' },
  vingar: { name: 'Spana från ovan', cost: 0, target: 'none', tag: 'insight', text: '{o} lyfter och kan inte träffas denna timme. Visar mörka bilar och nästa timmes trafik.' },
  smaSteg: { name: 'Små steg', cost: 0, target: 'zone', tag: 'move', text: '{o} går 1 steg. Kostar inget.' },
  gaForst: { name: 'Gå först', cost: 1, target: 'zone', tag: 'move', text: '{o} går 1 steg. De som står kvar i zonen får +1 tro.' },
  trosta: { name: 'Trösta', cost: 1, target: 'animal', tag: 'comfort', text: 'Ett djur inom 1 steg från {o} får +2 tro och följer oss igen.' },
  lasaNatten: { name: 'Läsa natten', cost: 0, target: 'none', tag: 'insight', text: 'Se nästa timmes trafik. Dra 1 kort.' },
  skratt: { name: 'Pip i mörkret', cost: 1, target: 'none', tag: 'comfort', text: 'Alla i samma zon som {o} får +1 tro. +1 hopp.' },
  taEmot: { name: 'Ta emot', cost: 1, target: 'animal', tag: 'guard', text: '{o} tar träffen åt ett djur i samma zon denna timme.' },
  sprang: { name: 'Språng', cost: 1, target: 'zone', tag: 'move', text: '{o} tar ett språng, upp till 3 steg framåt.' },
  giftIReserv: { name: 'Gift i reserv', cost: 0, target: 'none', tag: 'comfort', text: '{o} lovar att inte bita: {o} får +2 tro. Bytesdjuren i samma zon får −1 tro.' },
  minne: { name: 'Minnet', cost: 0, target: 'none', tag: 'memory', text: 'Vi minns {o}. Alla får +2 tro, men −1 hopp. Försvinner efteråt.' },
  // The badger.
  gravaNer: { name: 'Gräva ner sig', cost: 1, target: 'none', tag: 'guard', text: '{o} gräver ner sig: kan inte träffas denna timme, men står kvar.' },
  gamlesRost: { name: 'Den gamles röst', cost: 1, target: 'none', tag: 'comfort', text: 'Alla inom 1 steg från {o} får +1 tro och följer oss igen.' },
  staSomSten: { name: 'Stå som en sten', cost: 1, target: 'none', tag: 'guard', text: 'Alla i samma zon som {o} biter ihop: nästa sår denna timme uteblir.' },
  // The toad.
  simma: { name: 'Simma', cost: 0, target: 'zone', tag: 'move', text: '{o} går 1 steg – i vatten upp till 2. Kostar inget.' },
  talamod: { name: 'Tålamod', cost: 1, target: 'animal', tag: 'comfort', text: '{o} väntar ut rädslan med ett djur inom 1 steg: +2 tro, och det följer oss igen.' },
  lyssnaIMarken: { name: 'Lyssna i marken', cost: 1, target: 'none', tag: 'insight', text: 'Se nästa timme och det som döljer sig i mörkret. Dra 2 kort.' },
  giftIHuden: { name: 'Gift i huden', cost: 0, target: 'none', tag: 'guard', text: 'Rovdjur som jagar i {o}s zon denna timme ger upp och tappar 2 tro. {o} får +1 tro.' },
  // The fox.
  smyga: { name: 'Smyga', cost: 0, target: 'zone', tag: 'move', text: '{o} smyger 1 steg och syns inte denna timme – inga spår, inget ljus, inga klor.' },
  lockbete: { name: 'Lockbete', cost: 1, target: 'zone', tag: 'move', text: '{o} springer upp till 2 steg och visar sig: hundar och rovfåglar vänder sig dit.' },
  list: { name: 'List', cost: 0, target: 'none', tag: 'insight', text: 'Dra 2 kort.' },
  mattForStunden: { name: 'Mätt för stunden', cost: 0, target: 'none', tag: 'comfort', text: '{o} får +2 tro och jagar inte mer här.' },
  // The owl.
  flyga: { name: 'Flyga', cost: 1, target: 'zone', tag: 'move', text: '{o} flyger upp till 2 steg.' },
  tystVinge: { name: 'Tyst vinge', cost: 1, target: 'animal', tag: 'guard', text: '{o} breder ut vingen över ett djur i samma zon: det syns inte denna timme.' },
  vaka: { name: 'Vaka', cost: 0, target: 'none', tag: 'insight', text: 'Se nästa timme. {o} får +1 tro.' },
  ropINatten: { name: 'Rop i natten', cost: 1, target: 'none', tag: 'comfort', text: 'Alla inom 2 steg från {o} som fryser, backar eller rusar följer oss igen.' },
  baraLiten: { name: 'Bära liten', cost: 1, target: 'animalZone', tag: 'move', text: '{o} lyfter ett litet djur ur samma zon upp till 2 steg. Det skyddas denna timme.' },
  // The adder.
  ringla: { name: 'Ringla', cost: 0, target: 'zone', tag: 'move', text: '{o} ringlar 1 steg. Kostar inget.' },
  gommaSig: { name: 'Gömma sig under sten', cost: 0, target: 'none', tag: 'guard', text: '{o} kan inte träffas denna timme, men står kvar.' },
  hota: { name: 'Hota', cost: 1, target: 'none', tag: 'guard', text: 'Hundar, fåglar och rovdjur som slår mot {o}s zon denna timme backar.' },
  varmaSig: { name: 'Värma sig', cost: 0, target: 'none', tag: 'comfort', text: '{o} får +2 tro, och hungern lägger sig lite.' },
  omsaSkinn: { name: 'Ömsa skinn', cost: 1, target: 'none', tag: 'comfort', text: 'Blödning och chock läker på {o}.' },
  // The mice.
  spridaSig: { name: 'Sprida sig', cost: 0, target: 'none', tag: 'guard', text: 'Nästa träff på {o} denna timme tar bara en av dem.' },
  krypaIn: { name: 'Krypa in', cost: 0, target: 'zone', tag: 'move', text: '{o} kryper 1 steg och syns inte denna timme.' },
  baraIhop: { name: 'Bära ihop', cost: 1, target: 'animalZone', tag: 'move', text: '{o} bär tillsammans ett litet djur ur samma zon 1 steg. Det skyddas denna timme.' },
  mangaOgon: { name: 'Många ögon', cost: 0, target: 'none', tag: 'insight', text: 'Se nästa timme. Dra 1 kort.' },
  // The hare.
  hacka: { name: 'Hacka', cost: 0, target: 'none', tag: 'guard', text: 'Nästa träff på {o} denna timme missar.' },
  frysaStilla: { name: 'Frysa stilla', cost: 0, target: 'none', tag: 'guard', text: '{o} blir helt stilla: kan inte träffas denna timme, men står kvar.' },
  stampa: { name: 'Stampa varning', cost: 1, target: 'none', tag: 'guard', text: 'Alla i samma zon som {o} biter ihop: nästa sår denna timme uteblir.' },
  lockaBort: { name: 'Locka bort', cost: 1, target: 'zone', tag: 'move', text: '{o} springer upp till 2 steg och visar sig: hundar och rovfåglar vänder sig dit.' },
  vidoga: { name: 'Vidöga', cost: 0, target: 'none', tag: 'insight', text: 'Se nästa timme. Dra 1 kort.' },
};
