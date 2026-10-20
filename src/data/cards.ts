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
  // The hedgehog.
  rullaIhop: { name: 'Rulla ihop', cost: 0, target: 'none', tag: 'guard', text: '{o} rullar ihop sig: bett, klor och klor från ovan missar denna timme. Bilar och maskiner gör det inte.' },
  taggar: { name: 'Taggar', cost: 1, target: 'none', tag: 'guard', text: 'De små i samma zon som {o} kryper intill taggarna: bett och klor missar dem denna timme.' },
  snoka: { name: 'Snoka', cost: 0, target: 'none', tag: 'insight', text: '{o} nosar upp en dold väg, om det finns någon. Annars: se nästa timme.' },
  tystGang: { name: 'Tyst gång', cost: 0, target: 'zone', tag: 'move', text: '{o} tassar 1 steg och syns inte denna timme.' },
  vintersomn: { name: 'Vintersömn', cost: 1, target: 'none', tag: 'comfort', text: '{o} somnar en stund: +3 tro, chocken läker. {o} står kvar denna timme.' },
  tryggRygg: { name: 'Trygg rygg', cost: 1, target: 'animal', tag: 'guard', text: 'Ett litet djur i samma zon som {o} kryper in under taggarna: bett och klor missar det denna timme.' },
  // The squirrel.
  klattra: { name: 'Klättra', cost: 0, target: 'none', tag: 'guard', text: '{o} klättrar upp i ett träd: inget på marken når dit denna timme. Men fåglar gör det – och ett fällt träd.' },
  hoppa: { name: 'Hoppa', cost: 1, target: 'zone', tag: 'move', text: '{o} hoppar upp till 2 steg, gren till gren.' },
  gommaForrad: { name: 'Gömma förråd', cost: 0, target: 'none', tag: 'insight', text: 'Dra 1 kort nu – och 1 till nästa timme.' },
  varna: { name: 'Varna', cost: 1, target: 'none', tag: 'insight', text: 'Se nästa timme. Alla i samma zon som {o} håller i sig: nästa sår denna timme uteblir.' },
  kastaKottar: { name: 'Kasta kottar', cost: 1, target: 'none', tag: 'guard', text: 'Hundar, fåglar och rovdjur som slår mot {o}s zon denna timme backar för kottarna.' },
  pigg: { name: 'Pigg', cost: 0, target: 'none', tag: 'comfort', text: '+1 kraft denna timme. {o} får +1 tro.' },
  // The mole.
  gravaGang: { name: 'Gräva gång', cost: 1, target: 'zone', tag: 'move', text: '{o} gräver 1 steg under marken, och de små i samma zon följer med. Ingen av dem syns denna timme.' },
  underJord: { name: 'Under jord', cost: 0, target: 'none', tag: 'guard', text: '{o} kan inte träffas denna timme, men står kvar.' },
  kannaSkakningar: { name: 'Känna skakningar', cost: 0, target: 'none', tag: 'insight', text: '{o} ser nästan inget, men känner marken: det som kommer i mörkret, och dolda vägar. Dra 1 kort.' },
  mjukJord: { name: 'Mjuk jord', cost: 1, target: 'animal', tag: 'comfort', text: 'Ett djur inom 1 steg från {o} vilar i den mjuka jorden: +2 tro, och det följer oss igen.' },
  gamlaGangar: { name: 'Gamla gångar', cost: 1, target: 'none', tag: 'insight', text: '{o} hittar gamla gångar: dolda vägar syns. Dra 1 kort.' },
  fastMark: { name: 'Fast mark', cost: 1, target: 'none', tag: 'guard', text: 'Marken under {o} håller: alla i samma zon biter ihop, nästa sår denna timme uteblir.' },
  // The beaver.
  lagaDammen: { name: 'Laga dammen', cost: 1, target: 'none', tag: 'guard', text: 'Vid ån: dammen knakar 2 mindre. Annars: alla i samma zon som {o} håller i sig, nästa sår uteblir.' },
  svansslag: { name: 'Svansslag', cost: 0, target: 'none', tag: 'comfort', text: '{o} slår med svansen: de i samma zon som fryser, backar eller rusar följer oss igen.' },
  fallaTrad: { name: 'Fälla träd', cost: 2, target: 'zone', tag: 'move', text: '{o} fäller ett träd att gå på: {o} och alla i samma zon går 1 steg tillsammans, skyddade denna timme.' },
  // The fawn.
  pipa: { name: 'Pipa', cost: 1, target: 'none', tag: 'comfort', text: '{o} piper efter sin mor. Alla inom 1 steg vill skydda det: +1 tro.' },
  vittring: { name: 'Vittring', cost: 0, target: 'none', tag: 'insight', text: '{o} vädrar: se nästa timme och det som kommer i mörkret. Dra 1 kort.' },
  ledaFlocken: { name: 'Leda flocken', cost: 1, target: 'zone', tag: 'move', text: '{o} springer upp till 2 steg. De som står kvar får +1 tro och följer oss igen.' },
};
