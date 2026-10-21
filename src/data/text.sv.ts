import type { HopeReason, InjuryKind, Intent } from '../engine/types';

export function intentLine(name: string, intent: Intent, targetName?: string): string | null {
  switch (intent.kind) {
    case 'follow': return null;
    case 'freeze': return `${name} stannar. Benen lyder inte.`;
    case 'flee': return `${name} tittar bakåt, mot diket och dalen.`;
    case 'bolt': return `${name} darrar. Snart springer ${name} utan oss.`;
    case 'leave': return `${name} tror inte längre på oss.`;
    case 'hunt': return `${name} betraktar ${targetName ?? 'någon'} lite för länge.`;
    case 'raid': return `${name} vädrar hönsen. Det är svårt att tänka på något annat.`;
  }
}

export const DEATH_CAUSE: Record<string, string> = {
  car: 'som stannade på vägen',
  dark: 'som ljuset aldrig varnade',
  letGo: 'som vi lät gå',
  hunt: 'som togs av en av oss',
  sacrifice: 'som kastade sig emellan',
};

export const LEAVE_CAUSE: Record<string, string> = {
  dawn: 'som blev kvar när gryningen kom',
  doubt: 'som slutade tro på oss',
  stayed: 'som stannade kvar på åkrarna',
};

/** What an animal says when hope moves. {name} is the one it's about. */
export const HOPE_LINES: Record<HopeReason, string[]> = {
  death: ['Inte {name}. Inte {name} också.', 'Vi borde ha väntat.', 'Jag hörde {name} ropa.', 'Säg att {name} bara gömmer sig.'],
  leave: ['Kommer {name} tillbaka?', 'Varför gick {name}?', 'Vi lovade ju varandra.'],
  dawn: ['Vi kunde inte vänta på {name}.', 'Förlåt, {name}.'],
  flip: ['Vi lovade ju.', 'Det var inte så vi sa.', 'Vad är ett löfte värt nu?'],
  hunt: ['{name} lovade ju.', 'Det var ju en av oss.', 'Jag vågar inte sova bredvid {name}.'],
  memory: ['Jag saknar {name}.', '{name} hade velat att vi gick vidare.'],
  laugh: ['Minns ni ängen hemma?', 'Det låter nästan som förr.'],
  fire: ['Elden värmer. Det är nästan som hemma.', 'I natt sover vi tätt intill varandra.'],
  song: ['Den sjöng ju bara.', 'Det var det vackraste vi hört på länge.'],
  food: ['Första gången vi är mätta sedan dalen.', 'Spara lite till sen.'],
  cold: ['Den tittade på oss hela tiden.', 'Det var så kallt i natt.'],
  lost: ['Vet någon ens vart vi går?', 'Den som mindes vägen hade vetat.'],
  trapped: ['Jag hör den fortfarande.', 'Vi kunde ha hjälpt den.', 'Den var ju nästan en av oss.'],
  wait: ['Varje timme vi väntar är en timme närmare maskinerna.', 'Jag tycker inte om att vänta.', 'Är det verkligen bättre så här?'],
};

export const KRAFT_OUT_LINES = ['Vi orkar inte mer den här timmen.', 'Benen bär inte längre. Inte nu.', 'Vi måste vila en stund.'];

/** Said when an injury happens. {name} is the one hurt. */
export const INJURY_LINES: Record<InjuryKind, string> = {
  halt: '{name} träffas. Ett ben bär inte längre som förut.',
  broken: '{name} träffas. Något går av med ett ljud vi aldrig glömmer.',
  bleeding: '{name} blöder. Det slutar inte.',
  shock: '{name} såg det hända. Något i {name} stannade kvar där.',
  poisoned: '{name} andas in den söta dimman. Allt blir tungt och långsamt.',
};
