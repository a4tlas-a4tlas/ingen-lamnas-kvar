// What the animals say when the way forks: who wants which path, and why.
import type { EncounterId, RegionId, Species } from '../engine/types';

export interface Leaning {
  /** +1: wants to go there; −1: wants anything but there. */
  pull: 1 | -1;
  line: string;
}

/** Each kind's own nature. */
export const LEANINGS: Partial<Record<Species, Partial<Record<EncounterId, Leaning>>>> = {
  toad: {
    bog: { pull: 1, line: 'Mossen är min. Jag vet var den bär.' },
    wisps: { pull: 1, line: 'Irrblossen? Jag har sett dem hela mitt liv. Jag vet vilket som är sant.' },
    river: { pull: 1, line: 'Vattnet är mitt hem. Ta ån – jag visar er stenarna.' },
    sprayer: { pull: 1, line: 'Det går en bäck längs det fältet. I vattnet når dimman oss inte.' },
    sewer: { pull: 1, line: 'Vatten och mörker. Där nere hittar jag vägen.' },
  },
  mice: {
    river: { pull: -1, line: 'Vi kan inte simma. Inte ån, snälla.' },
    raptor: { pull: -1, line: 'Skuggan. Vi såg skuggan över fälten. Inte där.' },
    sprayer: { pull: -1, line: 'Den söta lukten. Våra kusiner åt av det fältet och vaknade aldrig.' },
    fence: { pull: -1, line: 'Tråden som surrar. Vi rörde vid en sådan en gång. Bara en gång.' },
    lamps: { pull: -1, line: 'Hundar på gatan. Vi hör dem härifrån.' },
    cats: { pull: -1, line: 'Katter. Det finns inget värre än katter. Inte gårdarna, snälla.' },
    street: { pull: -1, line: 'Alla de där fötterna. Vi är för små för en sådan gata.' },
    sewer: { pull: -1, line: 'Råttor. Våra stora, elaka kusiner. Inte under jorden.' },
    wisps: { pull: -1, line: 'Djupa gölar i mörkret. Vi kan inte simma. Inte där.' },
    cranes: { pull: -1, line: 'Så stora fötter. De ser oss inte ens när de trampar.' },
  },
  fox: {
    farm: { pull: -1, line: 'Jag har sprungit från hundar förut. Aldrig mer en gård.' },
    cats: { pull: 1, line: 'Katter? De backar för en räv. Låt mig gå först över gården.' },
  },
  adder: { cats: { pull: 1, line: 'Katterna vet vad en huggorm är. De håller sig undan.' } },
  badger: {
    river: { pull: 1, line: 'Strömmen rubbar inte mig. Håll er i mig, så går vi över.' },
    bog: { pull: -1, line: 'Jag är för tung för mossan. Jag sjunker som en sten.' },
  },
  owl: {
    farm: { pull: -1, line: 'Jag har sett gården från ovan. Hundarna sover inte så djupt som ni tror.' },
    raptor: { pull: -1, line: 'Där ute är det jag som är bytet. Inte fälten.' },
    lamps: { pull: 1, line: 'Mellan lyktorna är natten min. Jag ser var ljuset inte når.' },
    wisps: { pull: 1, line: 'Ljusen lurar inte mig. Från ovan ser jag vad som finns under dem.' },
    street: { pull: 1, line: 'Över gatan flyger jag på ett ögonblick. Jag kan se vagnen komma.' },
  },
  hare: {
    cranes: { pull: 1, line: 'Fast mark, och vida! Där kan jag springa runt dem.' },
    fence: { pull: -1, line: 'Stängsel. Jag har sett en hare fastna i ett. Den skrek länge.' },
    lamps: { pull: -1, line: 'Hundar i koppel är fortfarande hundar.' },
    cats: { pull: -1, line: 'En katt hoppar längre än jag tror. Inte bakgårdarna.' },
    street: { pull: -1, line: 'Så mycket folk. Jag vet inte åt vilket håll jag ska springa.' },
    sewer: { pull: -1, line: 'Under jorden kan jag inte springa. Jag vill se himlen.' },
  },
  hedgehog: { farm: { pull: 1, line: 'Gårdar har sniglar och mjölk. Hundarna biter inte i taggar.' } },
  squirrel: { raptor: { pull: -1, line: 'Inga träd på fälten. Ingenstans att klättra. Inte där.' } },
  mole: {
    river: { pull: -1, line: 'Jag ser inte vattnet. Jag hör det bara. Inte ån.' },
    sprayer: { pull: 1, line: 'Dimman ligger ovanpå jorden. Under den är det rent.' },
    fence: { pull: 1, line: 'Ett stängsel? Jag gräver under det. Följ mig.' },
    street: { pull: -1, line: 'Jag känner fötterna i marken härifrån. Så många fötter.' },
    sewer: { pull: 1, line: 'Tunnlar. Jag hör vart de leder.' },
  },
  beaver: {
    bog: { pull: 1, line: 'Under mossan är det vatten. Där flyter jag.' },
    river: { pull: 1, line: 'Ån är min. Jag vet var dammen håller.' },
    sprayer: { pull: 1, line: 'Bäcken där borta tvättar bort vad som helst.' },
    fence: { pull: 1, line: 'Ett dike som stiger? Jag har dämt större än så.' },
    sewer: { pull: 1, line: 'Strömmande vatten under staden. Håll er i mig.' },
  },
  fawn: {
    cranes: { pull: -1, line: 'De är lika långa som mamma. Och de skriker.' },
    farm: { pull: -1, line: 'Där bor människor. Mamma sa: aldrig nära människorna.' },
    sprayer: { pull: -1, line: 'Traktorn. Jag har sett vad den gör med dem som ligger stilla i raderna.' },
  },
};

/** What the body says louder than nature: injuries and hunger. */
export const BODY_LEANINGS = {
  halt: { encounter: 'river', pull: -1, line: 'Benet bär inte på hala stenar.' },
  bleeding: { encounter: 'farm', pull: -1, line: 'Hundarna känner lukten av mitt blod.' },
  hungry: { encounter: 'farm', pull: 1, line: 'Det luktar höns från gården…' },
} as const satisfies Record<string, { encounter: EncounterId } & Leaning>;

/** Between two landscapes: which way each kind wants, and why. */
export const REGION_LEANINGS: Partial<Record<Species, Partial<Record<RegionId, Leaning>>>> = {
  badger: {
    akrarna: { pull: 1, line: 'Jorden på fälten är mjuk. Där kan jag gräva oss ett gryt.' },
    mossen: { pull: -1, line: 'Mossen bär inte en som jag. Inte dit.' },
  },
  toad: {
    mossen: { pull: 1, line: 'Mossen! Där finns vatten överallt, och ingen människa.' },
    akrarna: { pull: 1, line: 'Det går diken mellan fälten. Vatten, hela vägen.' },
  },
  fox: { staden: { pull: 1, line: 'I staden finns mat i varje tunna. Det har jag hört.' } },
  owl: { staden: { pull: 1, line: 'Staden har tak och torn att se ifrån. Fälten har bara himmel – och vråkar.' } },
  adder: { akrarna: { pull: 1, line: 'Fälten är varma av sol, och fulla av sork.' } },
  mice: { staden: { pull: -1, line: 'Katter, råttor, hundar. Inte staden, snälla.' } },
  hare: { akrarna: { pull: 1, line: 'Fälten! Där kan jag springa så långt jag vill.' } },
  hedgehog: { staden: { pull: 1, line: 'Trädgårdar. Sniglar i varje rabatt.' } },
  squirrel: { staden: { pull: 1, line: 'Fälten har inga träd. Staden har parker.' } },
  mole: { staden: { pull: -1, line: 'Asfalt. Man kan inte gräva i asfalt.' } },
  beaver: {
    mossen: { pull: 1, line: 'Mossen är bara en damm som ingen har byggt. Där trivs jag.' },
    staden: { pull: -1, line: 'Människorna där dämmer inte åarna. De murar in dem.' },
  },
  fawn: {
    staden: { pull: -1, line: 'Mamma sa: aldrig nära människorna.' },
    mossen: { pull: -1, line: 'Mina ben är för smala för mossan. Jag sjunker.' },
  },
};

/** What weighs heavier at the crossroads than nature: grief for the glen, and hunger. */
export const BODY_REGION_LEANINGS = {
  grieving: { region: 'staden', pull: -1, line: 'Där bor maskinerna. Inte dit.' },
  hungry: { region: 'staden', pull: 1, line: 'Det luktar mat därifrån…' },
} as const satisfies Record<string, { region: RegionId } & Leaning>;
