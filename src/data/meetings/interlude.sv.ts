// Mellan två landskap: when a region's boss lies behind us. We look back, someone
// may ask a promise of us, and then the guide shows the ways on.
import { REGIONS } from '../regions';
import { isPresent } from '../../engine/rules';
import { guideName, nameOf } from '../../engine/roles';
import { regionVoices } from '../../engine/voices';
import type { GameState, RegionId, Species } from '../../engine/types';
import type { MeetingFrame, MeetingOption } from './crow.sv';

const region = (s: GameState) => REGIONS[s.journey.region];

/** What each kind says, looking back on what we leave. {region} is its name, {name} the one speaking. */
export const LOOK_BACK: Partial<Record<RegionId, Partial<Record<Species, string>>>> = {
  dalen: {
    badger: '”Jag föddes under ekarna där nere. Nu finns de bara i mig.”',
    toad: '”Bäcken där jag lade mina ägg. Jag hör den fortfarande.”',
    fox: '”Jag trodde aldrig att jag skulle sakna något. Jag hade fel.”',
    owl: '”Från ovan ser det ut som ett sår. Jag tittar inte mer.”',
    adder: '”Stenen där jag solade mig. Den är borta nu.”',
    mice: '”Vi var fler när vi gick därifrån.” {name} kryper tätare ihop.',
    hare: '”Jag kände den inte. Men jag ser att ni gör det.”',
    hedgehog: '”Lövhögen där jag sov om vintrarna. Någon annan får sova där nu. Eller ingen.”',
    squirrel: '”Jag hade gömt nötter överallt. Nu får träden dem – om det finns några träd.”',
    mole: '”Mina gångar. Jag grävde dem i hela mitt liv. Maskinerna fyllde dem på en morgon.”',
    beaver: '”Min damm höll i tre vintrar. Den håller inte en till.”',
    fawn: '”Mamma sa att vi skulle mötas vid bäcken. Hon kom aldrig.”',
  },
  akrarna: {
    badger: '”Så mycket jord, och inte ett enda gryt. Ingen bor kvar där.”',
    toad: '”Diket vid stängslet. Vattnet var varmt där, en enda kväll.”',
    fox: '”Ingenstans att gömma sig. Jag har aldrig känt mig så synlig.”',
    owl: '”Vråken såg mig också. Jag tror den minns mig.”',
    adder: '”Solen låg på stenarna hela dagen. Det var nästan som hemma.”',
    mice: '”All den säden.” {name} ser länge bakåt. ”Vi kunde ha stannat.”',
    hare: '”Jag har aldrig sprungit så fritt. Jag kommer att sakna himlen.”',
    hedgehog: '”Fårorna var djupa. Jag tänker på den som låg kvar i en av dem.”',
    squirrel: '”Inte ett träd. Inte ett enda. Jag blir yr av att tänka på det.”',
    mole: '”Plogen hade varit där före mig, överallt. Jorden smakade järn.”',
    beaver: '”Kanalen var rak som en käpp. Ingen bäver hade byggt den så.”',
    fawn: '”Vetet var högre än jag. Jag var inte rädd där inne. Inte förrän det brummade.”',
  },
  staden: {
    badger: '”Det fanns inte en fläck jord som inte någon hade lagt sten på.”',
    toad: '”Ån genom stan. Den mindes mig inte, men jag mindes den.”',
    fox: '”Jag förstår dem som stannar där. Det är det värsta.”',
    owl: '”Ljuset slocknade aldrig. Jag såg inte en enda stjärna.”',
    adder: '”Varma stenar överallt, och ändå frös jag.”',
    mice: '”Vi var aldrig så rädda som där. Och aldrig så mätta.”',
    hare: '”Så många fötter. Jag hör dem fortfarande när jag blundar.”',
    hedgehog: '”Trädgårdarna luktade gott. Men bakom varje staket fanns en hund.”',
    squirrel: '”Parkerna var fina. Men träden stod ensamma, som fångar.”',
    mole: '”Under asfalten finns jord. Den väntar, tror jag.”',
    beaver: '”De hade murat in ån. Den kunde inte ens svämma över.”',
    fawn: '”Barnet i fönstret såg på mig. Mamma sa att de var farliga. Det var inte farligt.”',
  },
  mossen: {
    badger: '”Jag har aldrig känt mig så tung. Marken ville inte ha mig.”',
    toad: '”Där var det tyst som hemma. Kanske för tyst.”',
    fox: '”Ingen jagade oss där. Ingen alls. Det var nästan värre.”',
    owl: '”Från ovan såg mossen ut som ett öga. Det tittade på oss.”',
    adder: '”Kallt vatten, och ingen sten att ligga på.”',
    mice: '”Vi höll i varandra hela vägen. Alla svansar i en knut.”',
    hare: '”Jag kunde inte springa. Första gången i mitt liv.”',
    hedgehog: '”Jag rullade ihop mig, och mossan rullade ihop sig runt mig.”',
    squirrel: '”En enda tall, mitt i alltihop. Jag satt i den och var ensam.”',
    mole: '”Där fanns ingen jord att gräva i. Bara vatten, hela vägen ner.”',
    beaver: '”Ingen damm, ingen å, men vatten överallt. Jag kommer att sakna det.”',
    fawn: '”Jag ropade på mamma där. Ingen svarade. Inte ens ett eko.”',
  },
};
const GENERIC = '”Jag kommer att minnas {region}.”';

export const INTERLUDE: Record<string, MeetingFrame> = {
  start: {
    id: 'start',
    speaker: 'story',
    text: (s) => {
      const alive = s.animals.filter((a) => a.status === 'active' || a.status === 'safe').length;
      return `Vi stannar och ser tillbaka. ${region(s).name} ligger bakom oss nu. Vi är ${alive === 1 ? 'en' : alive} som står här.`;
    },
    options: [
      ...Array.from({ length: 10 }, (_, i): MeetingOption => {
        const one = (s: GameState) => s.animals.filter(isPresent)[i];
        return {
          id: `look-${i}`, by: (s) => one(s)?.id, effect: 'lookBack', next: 'start',
          label: (s) => (LOOK_BACK[s.journey.region]?.[one(s)!.species] ?? GENERIC).replace('{region}', region(s).name.toLowerCase()).replace('{name}', one(s)!.name),
        };
      }),
      { id: 'onward', label: '”Vi vänder oss om, och går.”' },
    ],
  },
  way: {
    id: 'way',
    speaker: 'story',
    text: (s) => {
      if (s.run.offered.length < 2) return `${guideName(s)} ser länge ut över landet. ”Jag minns bara en väg härifrån.”`;
      const voices = regionVoices(s).map((v) => ` ${nameOf(s, v.who)}: ”${v.line}”`).join('');
      return `${guideName(s)} ser länge ut över landet. ”Jag minns två vägar härifrån. Men inte vart de leder, inte riktigt. Och vi kan bara gå en av dem.”${voices}`;
    },
    options: (Object.keys(REGIONS) as RegionId[]).map((id): MeetingOption => ({
      id: `go-${id}`, label: () => `Mot ${REGIONS[id].fogName}`, effect: 'chooseRegion',
      when: (s) => s.run.offered.includes(id),
    })),
  },
};
