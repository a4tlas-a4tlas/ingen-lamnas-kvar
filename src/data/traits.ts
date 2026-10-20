// Traits are what we are like, not what we can do: modifiers, light and dark.
// Each of us starts with one of each. More come from what we live through, and a
// light trait drives out the dark one opposite it – and keeps it from coming back.
import type { TraitId } from '../engine/types';

export interface TraitDef {
  name: string;
  /** "Sotfot är modig nu." – and for a swarm: "Fröna är modiga nu." */
  adj: string;
  plural: string;
  /** "Fröna bär Kvarns {noun}" when the trait is inherited by the fire. */
  noun: string;
  light: boolean;
  /** What it does, for the player. */
  note: string;
  /** How it comes, along the way. */
  comes: string;
  /** The dark trait a light one drives out, and keeps away. */
  drivesOut?: TraitId;
  /** Only predators can be this. */
  predatorOnly?: boolean;
  /** No one is born this: it only comes along the way. */
  earned?: boolean;
}

export const TRAITS: Record<TraitId, TraitDef> = {
  // Light.
  modig: { name: 'Modig', adj: 'modig', plural: 'modiga', noun: 'mod', light: true, drivesOut: 'skygg',
    note: 'Följer oss ner till 4 i tro. Hårdnar av sorg.', comes: 'Av att kasta sig emellan, och överleva det.' },
  envis: { name: 'Envis', adj: 'envis', plural: 'envisa', noun: 'envishet', light: true, drivesOut: 'vattenradd',
    note: 'Hårdnar av sorg. Ett blödande sår tar ingen tro.', comes: 'Av att ta sig över fast det blöder.' },
  omtanksam: { name: 'Omtänksam', adj: 'omtänksam', plural: 'omtänksamma', noun: 'omtanke', light: true, drivesOut: 'sluten',
    note: 'Dess tröst ger en tro mer.', comes: 'Av att lära någon annan vid elden.' },
  klok: { name: 'Klok', adj: 'klok', plural: 'kloka', noun: 'klokskap', light: true, drivesOut: 'otalig',
    note: 'Lär sig något nytt efter två faror i stället för tre.', comes: 'Av att bli lärd vid elden.' },
  trogen: { name: 'Trogen', adj: 'trogen', plural: 'trogna', noun: 'trohet', light: true, drivesOut: 'bitter',
    note: 'Hinner fram i sista stund från två steg bort – även när den fryser.', comes: 'Av att bli räddad i sista stund.' },
  vaksam: { name: 'Vaksam', adj: 'vaksam', plural: 'vaksamma', noun: 'vaksamhet', light: true, drivesOut: 'morkradd',
    note: 'Vilar fast den vakar: såren läker ändå.', comes: 'Av att vaka vid elden fast såren värker.' },
  lekfull: { name: 'Lekfull', adj: 'lekfull', plural: 'lekfulla', noun: 'lekfullhet', light: true,
    note: 'Vid glöden blir natten ljusare för alla: mer hopp.', comes: 'Föds så, eller ärvs av en död.' },
  // Dark.
  skygg: { name: 'Skygg', adj: 'skygg', plural: 'skygga', noun: 'skygghet', light: false,
    note: 'Tvivlar redan under 6 i dagsljus, och fryser lätt.', comes: 'Av att se någon dö, när den redan darrar.' },
  otalig: { name: 'Otålig', adj: 'otålig', plural: 'otåliga', noun: 'otålighet', light: false,
    note: 'Rusar hellre än väntar.', comes: 'Av att vänta, när den redan tvivlar.' },
  morkradd: { name: 'Mörkrädd', adj: 'mörkrädd', plural: 'mörkrädda', noun: 'mörkrädsla', light: false,
    note: 'Tvivlar redan under 6 om natten.', comes: 'Av det som slår ur mörkret.' },
  vattenradd: { name: 'Vattenrädd', adj: 'vattenrädd', plural: 'vattenrädda', noun: 'vattenrädsla', light: false,
    note: 'Tvivlar redan under 6 vid ån.', comes: 'Av forsen, och av dammen som brast.' },
  bitter: { name: 'Bitter', adj: 'bitter', plural: 'bittra', noun: 'bitterhet', light: false,
    note: 'Tröst når den sämre: en tro mindre.', comes: 'Av ett brutet löfte, eller av en nära vi lät gå.' },
  sluten: { name: 'Sluten', adj: 'sluten', plural: 'slutna', noun: 'slutenhet', light: false,
    note: 'Kommer ingen närmare vid glöden.', comes: 'Av att sitta ensam i mörkret och tvivla.' },
  glupsk: { name: 'Glupsk', adj: 'glupsk', plural: 'glupska', noun: 'glupskhet', light: false, predatorOnly: true, earned: true,
    note: 'Glömmer eden en tro tidigare.', comes: 'Av att ha jagat en av oss. Släpper om den vakar över de små utan att jaga.' },
};

export const TRAIT_IDS = Object.keys(TRAITS) as TraitId[];
export const LIGHT_TRAITS = TRAIT_IDS.filter((t) => TRAITS[t].light);
export const DARK_TRAITS = TRAIT_IDS.filter((t) => !TRAITS[t].light);

/** The light trait that keeps this dark one away, if any. */
export const heldOffBy = (t: TraitId) => LIGHT_TRAITS.find((l) => TRAITS[l].drivesOut === t);
