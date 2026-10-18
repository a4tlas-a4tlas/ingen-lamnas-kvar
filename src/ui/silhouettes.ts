import type { Species } from '../engine/types';

// Papercut silhouettes, drawn on a 64×48 grid. Each is a few cut shapes
// in one paper colour with small "cut-out" details in the background ink.
const CUT = 'var(--ink)';

const shapes: Record<Species, { paper: string; svg: string }> = {
  fox: {
    paper: '#c8673a',
    svg: `
      <path d="M18 29 Q4 20 2 33 Q9 42 20 35 Z"/>
      <circle cx="4.5" cy="33" r="2.6" fill="#efe3c8"/>
      <ellipse cx="32" cy="30" rx="15" ry="8"/>
      <path d="M43 22 L59 27 L46 33 Z"/>
      <path d="M44 23 L46 13 L50 22 Z"/><path d="M49 22 L53 14 L54 24 Z"/>
      <rect x="23" y="35" width="3" height="9" rx="1"/><rect x="29" y="35" width="3" height="9" rx="1"/>
      <rect x="37" y="35" width="3" height="9" rx="1"/><rect x="42" y="34" width="3" height="10" rx="1"/>
      <circle cx="50" cy="26" r="1.2" fill="${CUT}"/>
      <path d="M26 27 l3 -2 l3 2 l3 -2 l3 2" stroke="${CUT}" stroke-width="1" fill="none"/>`,
  },
  badger: {
    paper: '#8f9396',
    svg: `
      <ellipse cx="30" cy="31" rx="20" ry="10"/>
      <path d="M45 24 L62 31 L46 38 Z"/>
      <path d="M46 27 L60 31 L46 32 Z" fill="#efe3c8"/>
      <rect x="15" y="37" width="4" height="7" rx="1"/><rect x="23" y="38" width="4" height="6" rx="1"/>
      <rect x="35" y="38" width="4" height="6" rx="1"/><rect x="42" y="37" width="4" height="7" rx="1"/>
      <circle cx="50" cy="29" r="1.2" fill="${CUT}"/>
      <path d="M16 28 q7 -5 14 0 q7 -5 14 0" stroke="${CUT}" stroke-width="1" fill="none"/>`,
  },
  toad: {
    paper: '#8c8a4c',
    svg: `
      <ellipse cx="32" cy="32" rx="18" ry="10"/>
      <circle cx="24" cy="23" r="5"/><circle cx="40" cy="23" r="5"/>
      <circle cx="24" cy="22.5" r="1.8" fill="${CUT}"/><circle cx="40" cy="22.5" r="1.8" fill="${CUT}"/>
      <path d="M14 36 Q6 40 9 45 L18 42 Z"/><path d="M50 36 Q58 40 55 45 L46 42 Z"/>
      <circle cx="28" cy="32" r="1.4" fill="${CUT}"/><circle cx="35" cy="35" r="1.4" fill="${CUT}"/>
      <circle cx="40" cy="30" r="1.1" fill="${CUT}"/><circle cx="23" cy="36" r="1.1" fill="${CUT}"/>`,
  },
  owl: {
    paper: '#a37b52',
    svg: `
      <ellipse cx="32" cy="27" rx="13" ry="17"/>
      <path d="M21 13 L23 3 L28 12 Z"/><path d="M43 13 L41 3 L36 12 Z"/>
      <circle cx="27" cy="19" r="4.6" fill="#efe3c8"/><circle cx="37" cy="19" r="4.6" fill="#efe3c8"/>
      <circle cx="27" cy="19" r="2" fill="${CUT}"/><circle cx="37" cy="19" r="2" fill="${CUT}"/>
      <path d="M30.5 23 L32 27 L33.5 23 Z" fill="${CUT}"/>
      <path d="M25 31 l3 3 l4 -3 l4 3 l3 -3 M25 37 l3 3 l4 -3 l4 3 l3 -3" stroke="${CUT}" stroke-width="1" fill="none"/>
      <path d="M26 44 l-2 3 M29 44 l0 3 M35 44 l0 3 M38 44 l2 3" stroke="currentColor" stroke-width="1.6"/>`,
  },
  adder: {
    paper: '#7d8ea6',
    svg: `
      <path d="M5 38 C12 30 18 44 26 37 S38 27 45 33 S53 33 56 27" stroke="currentColor" stroke-width="7.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="57.5" cy="25.5" rx="5.5" ry="4"/>
      <path d="M9 36 l2.5 -2.5 l2.5 2.5 l2.5 -2.5 l2.5 2.5 M22 37 l2.5 -2.5 l2.5 2.5 l2.5 -2.5 M33 33 l2.5 -2.5 l2.5 2.5 l2.5 -2.5 l2.5 2.5 M45 32 l2.5 -2.5 l2.5 2.5" stroke="${CUT}" stroke-width="1.3" fill="none"/>
      <circle cx="59" cy="24.5" r="1.1" fill="${CUT}"/>
      <path d="M62.5 26 l1.5 -1 M62.5 26 l1.5 1" stroke="${CUT}" stroke-width="0.8"/>`,
  },
  hare: {
    paper: '#b8a07e',
    svg: `
      <ellipse cx="30" cy="31" rx="15" ry="9"/>
      <circle cx="16" cy="29" r="4.5" fill="#efe3c8"/>
      <ellipse cx="44" cy="25" rx="7" ry="6"/>
      <path d="M43 20 Q40 6 44 3 Q47 8 46 20 Z"/><path d="M47 20 Q48 7 53 5 Q53 11 49 21 Z"/>
      <path d="M22 37 Q16 44 26 44 L30 38 Z"/>
      <rect x="37" y="36" width="3" height="8" rx="1"/><rect x="42" y="35" width="3" height="9" rx="1"/>
      <circle cx="47" cy="24" r="1.1" fill="${CUT}"/>
      <path d="M50 27 l2 0.6" stroke="${CUT}" stroke-width="0.8"/>`,
  },
  mice: {
    paper: '#cdb894',
    svg: [
      [12, 36],
      [34, 40],
      [46, 28],
    ]
      .map(
        ([x, y]) => `
      <ellipse cx="${x}" cy="${y}" rx="7.5" ry="4.6"/>
      <circle cx="${x + 6}" cy="${y - 4}" r="2.8"/>
      <path d="M${x - 7} ${y} q-5 -1 -6 -6" stroke="currentColor" stroke-width="1.2" fill="none"/>
      <circle cx="${x + 8}" cy="${y - 1.5}" r="0.9" fill="${CUT}"/>`,
      )
      .join(''),
  },
};

/** Each animal's paper colour doubles as its identity on cards and name tags. */
export function speciesColor(species: Species): string {
  return shapes[species].paper;
}

export function silhouette(species: Species, color = shapes[species].paper): string {
  return `<svg class="sil" viewBox="0 0 64 48" aria-hidden="true" style="color:${color}" fill="currentColor">${shapes[species].svg}</svg>`;
}

/** The farm dogs: not one of us, so drawn darker and heavier. */
export function dogSilhouette(): string {
  return `<svg class="sil dog-sil" viewBox="0 0 64 48" aria-hidden="true" fill="currentColor">
    <path d="M12 26 Q4 16 6 12 Q10 20 16 24 Z"/>
    <ellipse cx="29" cy="28" rx="17" ry="8.5"/>
    <path d="M40 22 Q44 12 52 14 L61 20 L60 25 L50 27 Z"/>
    <path d="M47 15 L49 9 L52 15 Z"/>
    <rect x="15" y="32" width="4" height="12" rx="1.5"/><rect x="22" y="33" width="4" height="11" rx="1.5"/>
    <rect x="34" y="33" width="4" height="11" rx="1.5"/><rect x="40" y="32" width="4" height="12" rx="1.5"/>
    <circle cx="52" cy="18" r="1.3" fill="#e4c070"/>
    <path d="M55 24 l2 2 l2 -2" stroke="#efe3c8" stroke-width="1" fill="none"/>
  </svg>`;
}
