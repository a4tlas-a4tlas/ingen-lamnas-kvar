import type { Intent, ZoneId } from '../engine/types';

export const ZONE_NAMES: Record<ZoneId, string> = {
  dike: 'diket',
  lane1: 'första körfältet',
  median: 'mittremsan',
  lane2: 'andra körfältet',
  farDike: 'andra diket',
  culvert: 'trumman',
};

export const ZONE_LABELS: Record<ZoneId, string> = {
  dike: 'Diket',
  lane1: 'Körfält 1',
  median: 'Mittremsan',
  lane2: 'Körfält 2',
  farDike: 'Andra diket',
  culvert: 'Trumman',
};

export function intentLine(name: string, intent: Intent, targetName?: string): string | null {
  switch (intent.kind) {
    case 'follow': return null;
    case 'freeze': return `${name} stannar. Benen lyder inte.`;
    case 'flee': return `${name} tittar bakåt, mot diket och dalen.`;
    case 'bolt': return `${name} darrar. Snart springer ${name} utan oss.`;
    case 'leave': return `${name} tror inte längre på oss.`;
    case 'hunt': return `${name} betraktar ${targetName ?? 'någon'} lite för länge.`;
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
};
