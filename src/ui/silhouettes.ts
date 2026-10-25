import type { SceneArt } from '../data/meetings';
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
  hedgehog: {
    paper: '#8a6d50',
    svg: `
      <path d="M12 38 Q12 20 32 18 Q48 18 52 34 L52 38 Z"/>
      <path d="M14 30 l-4 -3 M18 24 l-3 -5 M24 20 l-1 -6 M31 18 l1 -6 M38 19 l3 -5 M44 22 l5 -4 M48 27 l5 -2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M50 30 Q58 31 60 35 Q56 38 50 38 Z" fill="#c8a882"/>
      <circle cx="60" cy="35" r="1.3" fill="${CUT}"/><circle cx="53" cy="33" r="1" fill="${CUT}"/>
      <path d="M20 26 l3 3 M27 23 l3 3 M34 23 l3 3 M41 25 l3 3 M24 31 l3 3 M31 29 l3 3 M38 30 l3 3" stroke="${CUT}" stroke-width="0.9"/>
      <rect x="20" y="37" width="3" height="5" rx="1"/><rect x="42" y="37" width="3" height="5" rx="1"/>`,
  },
  squirrel: {
    paper: '#b5643a',
    svg: `
      <path d="M22 40 Q4 38 6 20 Q8 6 20 10 Q14 16 16 24 Q18 32 26 34 Z"/>
      <ellipse cx="34" cy="33" rx="9" ry="8"/>
      <circle cx="42" cy="22" r="6"/>
      <path d="M39 17 L40 9 L43 16 Z"/><path d="M44 17 L47 10 L47 18 Z"/>
      <circle cx="44.5" cy="21" r="1.2" fill="${CUT}"/>
      <path d="M38 33 Q42 30 44 33" stroke="${CUT}" stroke-width="1" fill="none"/>
      <path d="M28 40 L26 45 L32 45 L32 40 Z"/><rect x="38" y="38" width="3" height="7" rx="1"/>
      <path d="M12 16 q3 4 2 9 M16 26 q3 3 6 4" stroke="${CUT}" stroke-width="0.9" fill="none"/>`,
  },
  mole: {
    paper: '#4e4a52',
    svg: `
      <path d="M4 44 Q32 34 60 44 Z" fill="#6b4f36"/>
      <ellipse cx="30" cy="34" rx="17" ry="9"/>
      <path d="M45 30 Q56 32 60 35 Q55 38 45 38 Z"/>
      <circle cx="59.5" cy="35" r="1.3" fill="#d8a8a0"/>
      <path d="M41 39 q4 4 9 3 l-1 -3 l2 -1 l-2 -1 Z" fill="#d8a8a0"/>
      <path d="M18 39 q-4 4 -9 3 l1 -3 l-2 -1 l2 -1 Z" fill="#d8a8a0"/>
      <circle cx="47" cy="32" r="0.6" fill="${CUT}"/>
      <path d="M14 34 q-3 1 -6 -1" stroke="currentColor" stroke-width="1.4" fill="none"/>`,
  },
  beaver: {
    paper: '#7a5236',
    svg: `
      <ellipse cx="34" cy="31" rx="17" ry="11"/>
      <ellipse cx="11" cy="37" rx="9" ry="4" transform="rotate(-12 11 37)" fill="#3e2c22"/>
      <path d="M5 35 l12 3 M6 38 l11 1" stroke="${CUT}" stroke-width="0.7"/>
      <circle cx="50" cy="26" r="7.5"/>
      <circle cx="47" cy="19.5" r="2"/>
      <circle cx="53" cy="24.5" r="1.2" fill="${CUT}"/>
      <rect x="55" y="29" width="3.4" height="3.6" rx="0.6" fill="#efe3c8"/>
      <rect x="24" y="39" width="5" height="5" rx="1.5"/><rect x="40" y="39" width="5" height="5" rx="1.5"/>
      <path d="M24 26 q5 -3 10 0 q5 -3 10 0" stroke="${CUT}" stroke-width="0.9" fill="none"/>`,
  },
  fawn: {
    paper: '#b58350',
    svg: `
      <ellipse cx="30" cy="25" rx="14" ry="7.5"/>
      <path d="M41 21 Q46 12 46 6 L51 6 Q52 14 47 23 Z"/>
      <ellipse cx="51" cy="8" rx="6.5" ry="4.2"/>
      <path d="M46 5 L42 0 L48 3 Z"/><path d="M50 4 L51 -1 L53 4 Z"/>
      <circle cx="52" cy="7" r="1.1" fill="${CUT}"/><circle cx="57.5" cy="8.8" r="0.9" fill="${CUT}"/>
      <path d="M17 22 L14 19 L17 25 Z"/>
      <rect x="19" y="30" width="2.4" height="15" rx="1"/><rect x="24" y="30" width="2.4" height="15" rx="1"/>
      <rect x="35" y="30" width="2.4" height="15" rx="1"/><rect x="40" y="30" width="2.4" height="15" rx="1"/>
      <circle cx="24" cy="23" r="1.3" fill="#efe3c8"/><circle cx="30" cy="21" r="1.3" fill="#efe3c8"/><circle cx="36" cy="24" r="1.3" fill="#efe3c8"/>
      <circle cx="27" cy="26.5" r="1.1" fill="#efe3c8"/><circle cx="33" cy="27" r="1.1" fill="#efe3c8"/>`,
  },
};

/** Each animal's paper colour doubles as its identity on cards and name tags. */
export function speciesColor(species: Species): string {
  return shapes[species].paper;
}

export function silhouette(species: Species, color = shapes[species].paper): string {
  return `<svg class="sil" viewBox="0 0 64 48" aria-hidden="true" style="color:${color}" fill="currentColor">${shapes[species].svg}</svg>`;
}

/** What stands in a story part's picture: a thing of the place. */
export function sceneArt(kind: SceneArt): string {
  const svg = (body: string) => `<svg class="sil" viewBox="0 0 64 48" aria-hidden="true">${body}</svg>`;
  switch (kind) {
    case 'bird':
      return svg(`
        <path d="M2 40 Q30 30 62 34" stroke="#3a2a1e" stroke-width="2" fill="none"/>
        <path d="M22 30 Q26 18 38 20 L44 17 L48 19 L43 23 Q42 31 32 33 Z" fill="#0b0d12"/>
        <path d="M48 19 L53 19.5 L48 21 Z" fill="#e4a83a"/><path d="M22 30 L12 34 L23 33 Z" fill="#0b0d12"/>
        <circle cx="44" cy="19.5" r="0.9" fill="#e4a83a"/>
        <path d="M50 10 q3 -2 6 0 M54 6 q3 -2 6 0" stroke="#efe3c8" stroke-width="1" fill="none" opacity="0.7"/>`);
    case 'tree':
      return svg(`
        <path d="M20 46 Q18 24 24 12 Q32 4 40 12 Q46 24 44 46 Z" fill="#4a3826"/>
        <ellipse cx="32" cy="30" rx="6" ry="9" fill="#120c08"/>
        <path d="M24 12 Q14 6 10 10 M40 12 Q50 4 56 9" stroke="#4a3826" stroke-width="3" fill="none"/>`);
    case 'berries':
      return svg(`
        <path d="M6 46 Q10 22 22 18 Q30 10 40 16 Q54 18 58 46 Z" fill="#2f4a2a"/>
        ${[[20, 30], [26, 26], [34, 30], [40, 24], [46, 32], [28, 36], [38, 38], [16, 38]].map(([x, y], i) =>
          `<circle cx="${x}" cy="${y}" r="2.2" fill="${i % 3 ? '#3b4f9a' : '#b8323a'}"/>`).join('')}`);
    case 'path':
      return svg(`
        <path d="M24 48 Q30 34 26 24 Q22 14 32 4 L36 4 Q28 14 32 24 Q36 34 40 48 Z" fill="#8a6a44"/>
        <path d="M4 46 Q8 30 14 28 Q18 34 18 46 Z M46 46 Q48 28 56 26 Q62 34 60 46 Z" fill="#2f4a2a"/>
        <path d="M30 40 l1 -2 l1 2 M28 30 l1 -2 l1 2 M31 18 l1 -2 l1 2" stroke="#3a2a1e" stroke-width="1" fill="none"/>`);
    case 'den':
      return svg(`
        <path d="M4 46 Q8 26 20 22 L44 22 Q58 26 60 46 Z" fill="#4a3826"/>
        <path d="M18 22 Q18 12 24 10 L28 22 M40 22 L42 12 Q48 12 46 22" fill="#5a4630"/>
        <path d="M22 46 Q22 32 32 30 Q42 32 42 46 Z" fill="#120c08"/>`);
    case 'deer':
      return svg(`
        <path d="M8 40 Q14 30 30 30 Q46 30 50 36 L58 32 L60 36 L54 40 Q48 44 30 44 Q12 44 8 40 Z" fill="#7a5a3a"/>
        <path d="M56 32 L54 22 M54 26 L50 22 M56 28 L60 22" stroke="#3a2a1e" stroke-width="1.4" fill="none"/>
        <circle cx="55" cy="35" r="0.9" fill="#120c08"/>
        <path d="M2 46 L62 46" stroke="#3a2a1e" stroke-width="2"/>`);
    case 'basket':
      return svg(`
        <path d="M2 44 L18 36 L62 38 L48 46 Z" fill="#b8323a" opacity="0.8"/>
        <path d="M22 36 L24 22 L46 22 L48 36 Z" fill="#8a6a44"/>
        <path d="M26 22 Q35 8 44 22" stroke="#5a4630" stroke-width="2" fill="none"/>
        <ellipse cx="30" cy="22" rx="5" ry="2.4" fill="#d8b070"/><path d="M36 21 L44 19 L42 23 Z" fill="#e8d070"/>`);
    case 'fox':
      return silhouette('fox', '#5a3a26');
    case 'tracks':
      return svg(`
        <path d="M0 48 L64 48 L64 20 Q32 26 0 20 Z" fill="#5a4630"/>
        ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${4 + i * 10}" y="${26 + (i % 2)}" width="6" height="3" fill="#2a1e14"/><rect x="${4 + i * 10}" y="${38 + (i % 2)}" width="6" height="3" fill="#2a1e14"/>`).join('')}`);
    case 'toad':
      return silhouette('toad');
    case 'ridge':
      return svg(`
        <circle cx="44" cy="24" r="8" fill="#f0cf96"/>
        <path d="M0 48 L0 32 Q16 22 30 28 Q44 20 64 26 L64 48 Z" fill="#5d6b44"/>
        <path d="M0 48 L0 40 Q20 34 36 38 Q52 34 64 38 L64 48 Z" fill="#3e5032"/>`);
    case 'furrow':
      return svg(`
        <path d="M0 30 Q32 24 64 30 L64 48 L0 48 Z" fill="#7a5c3a"/>
        <path d="M6 38 Q32 32 58 38 Q32 46 6 38 Z" fill="#3e2c1c"/>
        <path d="M24 38 Q24 30 32 30 Q40 30 40 38 Z" fill="#8a6d50"/>
        <path d="M25 33 l-2 -3 M28 31 l-1 -3 M32 30 l0 -3 M36 31 l1 -3 M39 33 l2 -3" stroke="#8a6d50" stroke-width="1.6" stroke-linecap="round"/>
        <circle cx="40.5" cy="37" r="0.9" fill="#120c08"/>`);
    case 'scarecrow':
      return svg(`
        <path d="M0 40 Q32 36 64 40 L64 48 L0 48 Z" fill="#b89a52"/>
        <rect x="31" y="14" width="2.4" height="30" fill="#4a3826"/>
        <rect x="16" y="20" width="32" height="2.4" fill="#4a3826"/>
        <path d="M24 21 L40 21 L42 34 L22 34 Z" fill="#6a4a3a"/>
        <circle cx="32" cy="14" r="4.5" fill="#d8c08a"/>
        <path d="M25 11 H39 L36 7 H28 Z" fill="#2a1e14"/>
        <path d="M14 18 q2 -3 4 0 M46 18 q2 -3 4 0" stroke="#0b0d12" stroke-width="2.2" fill="none"/>`);
    case 'crows':
      return svg(`
        <path d="M0 16 Q32 20 64 16" stroke="#2a2a2a" stroke-width="1" fill="none"/>
        <rect x="4" y="10" width="2" height="38" fill="#4a3826"/><rect x="58" y="10" width="2" height="38" fill="#4a3826"/>
        ${[12, 20, 28, 36, 44, 52].map((x, i) => `<path d="M${x} ${18 + (i % 2)} q2 -6 5 -4 l2 -1 l-1 2 q0 4 -4 4 Z" fill="#0b0d12"/>`).join('')}
        <path d="M18 34 q3 -3 6 0 M36 30 q3 -3 6 0 M28 40 q3 -3 6 0" stroke="#0b0d12" stroke-width="1.6" fill="none"/>`);
    case 'grain':
      return svg(`
        <path d="M0 38 Q32 34 64 38 L64 48 L0 48 Z" fill="#9a8a5a"/>
        <ellipse cx="22" cy="40" rx="12" ry="5" fill="#e0c070"/><ellipse cx="42" cy="41" rx="10" ry="4" fill="#d8b860"/>
        ${[12, 18, 24, 30, 36, 42, 48, 54].map((x) => `<path d="M${x} 36 L${x} 18 M${x} 20 l-2 -2 M${x} 23 l2 -2 M${x} 26 l-2 -2" stroke="#c9a84a" stroke-width="1.2"/>`).join('')}`);
    case 'tractor':
      return svg(`
        <path d="M0 42 L64 42 L64 48 L0 48 Z" fill="#6e6a52"/>
        <rect x="14" y="22" width="26" height="12" fill="#7a3a26"/>
        <rect x="30" y="12" width="12" height="12" fill="#5a2e20"/><rect x="32" y="14" width="8" height="7" fill="#2a2a30"/>
        <rect x="20" y="16" width="2.4" height="6" fill="#3a3a3a"/>
        <circle cx="40" cy="36" r="8" fill="#1e1e1e"/><circle cx="40" cy="36" r="3" fill="#5a5a5a"/>
        <circle cx="18" cy="38" r="5" fill="#1e1e1e"/><circle cx="18" cy="38" r="2" fill="#5a5a5a"/>
        <path d="M44 22 l6 -2 M14 26 l-4 0" stroke="#8a5a3a" stroke-width="1.4"/>`);
    case 'hare':
      return svg(`
        <path d="M0 40 Q32 34 64 40 L64 48 L0 48 Z" fill="#7a5c3a"/>
        ${[[16, 0], [34, 2], [50, -1]].map(([x, d]) => `<ellipse cx="${x}" cy="${36 + d}" rx="6" ry="4" fill="#b8a07e"/><ellipse cx="${x + 5}" cy="${32 + d}" rx="3" ry="2.6" fill="#b8a07e"/><path d="M${x + 4} ${30 + d} q-1 -8 1 -10 q2 3 1 10 Z" fill="#b8a07e"/>`).join('')}`);
    case 'pigeons':
      return svg(`
        <path d="M0 22 L64 22 L64 26 L0 26 Z" fill="#5a5e66"/><path d="M0 26 L64 26 L64 48 L0 48 Z" fill="#3a3a40"/>
        <rect x="10" y="32" width="8" height="10" fill="#d8b860" opacity="0.7"/><rect x="40" y="32" width="8" height="10" fill="#1e1e24"/>
        ${[8, 20, 32, 44, 54].map((x, i) => `<ellipse cx="${x}" cy="${18 + (i % 2)}" rx="4.4" ry="3.4" fill="#8a8e9a"/><circle cx="${x + 3.4}" cy="${15 + (i % 2)}" r="1.9" fill="#6a6e7a"/><path d="M${x + 5} ${15 + (i % 2)} l1.6 0.6 l-1.6 0.4 Z" fill="#c9a84a"/>`).join('')}`);
    case 'window':
      return svg(`
        <path d="M0 0 L64 0 L64 48 L0 48 Z" fill="#3a3430"/>
        <rect x="16" y="8" width="32" height="26" fill="#e8c878"/>
        <path d="M32 8 V34 M16 21 H48" stroke="#3a3430" stroke-width="1.6"/>
        <path d="M22 34 Q22 24 27 22 Q24 18 27 15 Q31 13 33 17 Q35 21 31 22 Q36 24 36 34 Z" fill="#2a2420"/>
        <rect x="12" y="34" width="40" height="3" fill="#5a4e44"/>
        <path d="M0 46 L64 46" stroke="#1e1a16" stroke-width="4"/>`);
    case 'bin':
      return svg(`
        <path d="M0 42 L64 42 L64 48 L0 48 Z" fill="#4a4a4e"/>
        <path d="M14 18 L34 18 L32 44 L16 44 Z" fill="#3e5a44"/><path d="M12 14 L36 12 L37 17 L13 19 Z" fill="#2e4434"/>
        <path d="M40 22 L58 22 L56 44 L42 44 Z" fill="#3e5a44"/><path d="M39 20 L60 16 L60 19 L39 23 Z" fill="#2e4434"/>
        <path d="M44 44 Q48 38 54 42 L60 44 Z" fill="#8a6a44"/><ellipse cx="50" cy="45" rx="3" ry="1.2" fill="#d8b070"/>`);
    case 'allotment':
      return svg(`
        <path d="M0 36 L64 36 L64 48 L0 48 Z" fill="#4a3826"/>
        <path d="M34 36 L34 22 L46 14 L58 22 L58 36 Z" fill="#7a3a26"/><rect x="43" y="26" width="6" height="10" fill="#2a1e14"/>
        <path d="M32 22 L46 12 L60 22" stroke="#3a2a1e" stroke-width="2" fill="none"/>
        ${[4, 10, 16, 22].map((x) => `<path d="M${x} 36 L${x} 28 M${x} 30 l-2 -2 M${x} 31 l2 -2" stroke="#5d7b44" stroke-width="1.4"/>`).join('')}
        <path d="M2 30 L30 30 M4 26 L4 36 M28 26 L28 36" stroke="#8a7a5a" stroke-width="1"/>
        <ellipse cx="18" cy="42" rx="12" ry="4" fill="#2f2418"/>`);
    case 'pond':
      return svg(`
        <path d="M0 30 L64 30 L64 48 L0 48 Z" fill="#3e5032"/>
        <ellipse cx="32" cy="38" rx="28" ry="7" fill="#3a5a6e"/>
        <path d="M30 36 Q30 28 34 26 Q35 20 38 20 Q40 21 38 22 Q36 24 37 28 Q42 30 40 36 Z" fill="#efe9dc"/>
        <path d="M38 20 l2.6 0.8 l-2.4 0.6 Z" fill="#d87a3a"/>
        <path d="M6 34 L6 22 M9 34 L10 24 M56 34 L56 20 M59 34 L58 24" stroke="#5d6b44" stroke-width="1.2"/>
        <path d="M14 40 q3 -1.5 6 0 M44 42 q3 -1.5 6 0" stroke="#7a9aae" stroke-width="0.8" fill="none"/>`);
  }
}

/** The crow at the campfire: a stranger, all black but for the eye. */
export function crowSilhouette(): string {
  return `<svg class="sil crow-sil" viewBox="0 0 64 48" aria-hidden="true" fill="#0b0d12">
    <path d="M14 30 Q22 18 36 20 L44 16 L52 18 L46 22 Q48 30 38 34 L26 36 Z"/>
    <path d="M52 18 L60 20 L52 22 Z"/>
    <path d="M14 30 L4 34 L16 34 Z"/>
    <path d="M30 35 l-1 9 M36 34 l1 10" stroke="#0b0d12" stroke-width="1.6"/>
    <circle cx="47" cy="19" r="1.2" fill="#e4c070"/>
  </svg>`;
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
