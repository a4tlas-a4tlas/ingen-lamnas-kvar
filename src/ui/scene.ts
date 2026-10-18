import type { ZoneDef } from '../engine/encounters';
import type { EncounterId } from '../engine/types';

/**
 * Where token i of n stands inside a zone: spread along the zone's long side.
 * Wide bands (the road) spread sideways; tall columns (the culvert) spread down.
 */
export function slotIn(z: ZoneDef, i: number, n: number): { x: number; y: number } {
  const [x, y, w, h] = z.rect;
  if (w >= h * 1.5) {
    const pad = Math.min(19, w * 0.12);
    return { x: x + pad + ((i + 0.5) * (w - 2 * pad)) / n, y: y + h / 2 - (z.start && h > 20 ? 2 : 0) };
  }
  return { x: x + w / 2, y: y + h * 0.27 + ((i + 0.5) * h * 0.46) / Math.max(n, 2) };
}

// Folk-style pine: a stack of cut triangles.
function pine(x: number, base: number, h: number): string {
  const w = h * 0.45;
  const tiers = [0, 0.3, 0.55];
  return tiers
    .map((t, i) => {
      const top = base - h + h * t;
      const bw = w * (1 - i * 0.22);
      return `<path d="M${x} ${top} L${x + bw / 2} ${top + h * 0.42} L${x - bw / 2} ${top + h * 0.42} Z"/>`;
    })
    .join('') + `<rect x="${x - 1.2}" y="${base - h * 0.12}" width="2.4" height="${h * 0.12}"/>`;
}

function tuft(x: number, y: number, s: number): string {
  return `<path d="M${x} ${y} q${-2 * s} ${-6 * s} ${-4 * s} ${-9 * s} q${3 * s} ${3 * s} ${4 * s} ${6 * s} q0 ${-6 * s} ${2 * s} ${-10 * s} q${1 * s} ${5 * s} ${0.5 * s} ${10 * s} q${2 * s} ${-4 * s} ${5 * s} ${-6 * s} q${-2 * s} ${4 * s} ${-3 * s} ${9 * s} Z"/>`;
}

function flower(x: number, y: number): string {
  return `<g transform="translate(${x} ${y})"><path d="M0 0 v-9" stroke="var(--grass-dark)" stroke-width="1.2"/>` +
    [0, 72, 144, 216, 288].map((r) => `<ellipse cx="0" cy="-12.5" rx="1.6" ry="3" transform="rotate(${r} 0 -9)"/>`).join('') +
    `<circle cx="0" cy="-9" r="1.4" fill="var(--paper)"/></g>`;
}

/** The static backdrop of an encounter. viewBox 400×500 maps 1:1 to the zone rects (x×4, y×5). */
export function sceneSvg(id: EncounterId): string {
  return id === 'farm' ? farmSvg() : id === 'river' ? riverSvg() : roadSvg();
}

const DEFS = `
    <filter id="cut" x="-5%" y="-5%" width="110%" height="120%">
      <feDropShadow dx="0" dy="2.5" stdDeviation="1.6" flood-color="#000" flood-opacity="0.55"/>
    </filter>`;

function roadSvg(): string {
  const y = (p: number) => p * 5;
  const pines: string[] = [];
  for (let i = 0; i < 16; i++) pines.push(pine(12 + i * 26 + (i % 3) * 4, y(16), 34 + ((i * 7) % 5) * 7));
  const backPines: string[] = [];
  for (let i = 0; i < 14; i++) backPines.push(pine(-4 + i * 31, y(14.5), 26 + ((i * 5) % 4) * 6));
  const tufts: string[] = [];
  for (let i = 0; i < 22; i++) tufts.push(tuft(6 + i * 18.5, y(100) - 2 - (i % 3) * 3, 1.6 + (i % 4) * 0.25));
  const tuftsBack: string[] = [];
  for (let i = 0; i < 26; i++) tuftsBack.push(tuft(i * 16, y(70.5), 0.9 + (i % 3) * 0.2));
  const flowers = [40, 120, 210, 300, 372].map((x, i) => flower(x, y(96) - (i % 2) * 8)).join('');
  const dashes: string[] = [];
  for (let x = 6; x < 400; x += 34) {
    dashes.push(`<rect x="${x}" y="${y(36) - 1.2}" width="18" height="2.4"/>`, `<rect x="${x + 12}" y="${y(60) - 1.2}" width="18" height="2.4"/>`);
  }

  return `
<svg class="scene-bg" viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden="true">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--sky-top)"/><stop offset="1" stop-color="var(--sky-low)"/>
    </linearGradient>${DEFS}
  </defs>
  <rect width="400" height="${y(28)}" fill="url(#sky)"/>
  <g class="stars" fill="var(--paper)" opacity="0.7">
    <circle cx="40" cy="14" r="0.9"/><circle cx="96" cy="30" r="0.7"/><circle cx="150" cy="10" r="1"/>
    <circle cx="210" cy="26" r="0.7"/><circle cx="250" cy="9" r="0.8"/><circle cx="330" cy="20" r="0.7"/>
  </g>
  <g filter="url(#cut)" fill="var(--forest-back)">${backPines.join('')}</g>
  <g filter="url(#cut)" fill="var(--forest)">${pines.join('')}</g>
  <rect y="${y(14)}" width="400" height="${y(14)}" fill="var(--grass-far)" filter="url(#cut)"/>
  <rect y="${y(28)}" width="400" height="${y(16)}" fill="var(--asphalt)"/>
  <rect y="${y(44)}" width="400" height="${y(8)}" fill="var(--grass-mid)" filter="url(#cut)"/>
  <rect y="${y(52)}" width="400" height="${y(16)}" fill="var(--asphalt)"/>
  <g fill="var(--paint)" opacity="0.75">${dashes.join('')}</g>
  <rect y="${y(28)}" width="400" height="2" fill="var(--paint)" opacity="0.45"/>
  <rect y="${y(68) - 2}" width="400" height="2" fill="var(--paint)" opacity="0.45"/>
  <rect y="${y(68)}" width="400" height="${y(32)}" fill="var(--grass-near)" filter="url(#cut)"/>
  <g fill="var(--grass-mid)" filter="url(#cut)">${tuftsBack.join('')}</g>
  <g class="culvert-art" filter="url(#cut)">
    <path d="M6 ${y(70)} q24 -26 48 0 Z" fill="var(--ink)"/>
    <path d="M6 ${y(26.6)} q24 -16 48 0 Z" fill="var(--ink)"/>
    <rect x="22" y="${y(28)}" width="16" height="${y(40)}" fill="var(--ink)" opacity="0.35"/>
  </g>
  <g fill="var(--grass-dark)" filter="url(#cut)">${tufts.join('')}</g>
  <g fill="var(--flower)">${flowers}</g>
</svg>`;
}

function bush(x: number, y: number, r: number): string {
  return `<path d="M${x - r} ${y} a${r * 0.55} ${r * 0.55} 0 0 1 ${r * 0.5} ${-r * 0.7} a${r * 0.6} ${r * 0.6} 0 0 1 ${r} ${-r * 0.25} a${r * 0.55} ${r * 0.55} 0 0 1 ${r * 0.5} ${r * 0.95} Z"/>`;
}

function stone(x: number, y: number, w: number, h: number): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h * 0.45}"/>`;
}

/** Gårdshundarna: the farm at dawn. The wall at the top, the thicket at the bottom. */
function farmSvg(): string {
  const y = (p: number) => p * 5;
  const x = (p: number) => p * 4;
  // The stone wall: rows of rounded field stones.
  const stones: string[] = [];
  for (let row = 0; row < 3; row++) {
    for (let i = -1; i < 18; i++) {
      const w = 22 + ((i * 7 + row * 3) % 4) * 3;
      stones.push(stone(i * 24 + (row % 2) * 11, y(18) + row * 9, w, 10));
    }
  }
  const stubble: string[] = [];
  for (let i = 0; i < 40; i++) stubble.push(`<rect x="${i * 10 + (i % 3)}" y="${y(13) + (i % 4) * 3}" width="1.4" height="${4 + (i % 3)}"/>`);
  const grass: string[] = [];
  for (let i = 0; i < 9; i++) for (let r = 0; r < 4; r++) grass.push(tuft(4 + i * 15 + (r % 2) * 7, y(58) + r * 30, 1.5 + ((i + r) % 3) * 0.35));
  const thicket: string[] = [];
  for (let i = 0; i < 12; i++) thicket.push(bush(i * 36 + (i % 2) * 10, y(86) + (i % 3) * 8, 26 + (i % 4) * 5));
  const thicketFront: string[] = [];
  for (let i = 0; i < 11; i++) thicketFront.push(bush(14 + i * 38, y(100) - 4 - (i % 2) * 6, 30 + (i % 3) * 6));
  const gravel: string[] = [];
  for (let i = 0; i < 46; i++) gravel.push(`<circle cx="${x(36) + ((i * 37) % 150)}" cy="${y(42) + ((i * 53) % 170)}" r="${0.8 + (i % 3) * 0.4}"/>`);
  const reeds: string[] = [];
  for (let i = 0; i < 7; i++) reeds.push(tuft(x(28) + (i % 2) * 8, y(28) + i * 20, 1 + (i % 2) * 0.3));

  return `
<svg class="scene-bg farm" viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden="true">
  <defs>
    <linearGradient id="dawn" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2f3352"/><stop offset="0.65" stop-color="#8a5f6a"/><stop offset="1" stop-color="#d79a72"/>
    </linearGradient>${DEFS}
  </defs>
  <rect width="400" height="${y(14)}" fill="url(#dawn)"/>
  <circle class="sun" cx="300" cy="${y(13)}" r="22" fill="#f3c890" opacity="0.9"/>
  <path d="M0 ${y(11)} q60 -14 120 -4 t130 -6 t150 2 V${y(14)} H0 Z" fill="#4a3e52" filter="url(#cut)"/>
  <rect y="${y(12)}" width="400" height="${y(7)}" fill="#8c7a48" filter="url(#cut)"/>
  <g fill="#6b5c35">${stubble.join('')}</g>
  <rect y="${y(19)}" width="400" height="${y(33)}" fill="#3b4a3a"/>
  <g fill="#7d7a70" filter="url(#cut)">${stones.join('')}</g>
  <path d="M${x(0)} ${y(26)} H${x(34)} V${y(77)} H${x(0)} Z" fill="#344535"/>
  <path d="M${x(4)} ${y(25)} C${x(30)} ${y(32)} ${x(4)} ${y(40)} ${x(18)} ${y(46)} S${x(30)} ${y(52)} ${x(10)} ${y(53)} L${x(-2)} ${y(53)} L${x(-2)} ${y(25)} Z"
    fill="#4f6e80" filter="url(#cut)"/>
  <path d="M${x(6)} ${y(31)} q10 -3 18 0 M${x(9)} ${y(40)} q8 -3 14 0 M${x(5)} ${y(48)} q9 -3 16 0" stroke="#a9c3c9" stroke-width="1.4" fill="none" opacity="0.6"/>
  <g fill="#283a2c" filter="url(#cut)">${reeds.join('')}</g>
  <rect x="${x(34)}" y="${y(25)}" width="${x(40)}" height="${y(52)}" fill="#9a8a6c"/>
  <g fill="#776a52">${gravel.join('')}</g>
  <g class="barn" filter="url(#cut)">
    <path d="M${x(37)} ${y(39)} V${y(30)} L${x(54)} ${y(24.5)} L${x(71)} ${y(30)} V${y(39)} Z" fill="#8e3b2c"/>
    <path d="M${x(35.5)} ${y(30.6)} L${x(54)} ${y(24)} L${x(72.5)} ${y(30.6)} L${x(72.5)} ${y(29.4)} L${x(54)} ${y(22.8)} L${x(35.5)} ${y(29.4)} Z" fill="#2b2a2e"/>
    <rect x="${x(49)}" y="${y(32)}" width="${x(10)}" height="${y(7)}" fill="#3a1d18"/>
    <path d="M${x(49)} ${y(32)} L${x(59)} ${y(39)} M${x(59)} ${y(32)} L${x(49)} ${y(39)}" stroke="#d9c9a6" stroke-width="1.4"/>
    <rect class="farm-window" x="${x(40)}" y="${y(31.5)}" width="${x(5)}" height="${y(3)}"/>
    <rect class="farm-window" x="${x(63)}" y="${y(31.5)}" width="${x(5)}" height="${y(3)}"/>
  </g>
  <g filter="url(#cut)">
    <path d="M${x(76)} ${y(53)} Q${x(87)} ${y(28)} ${x(99)} ${y(53)} Z" fill="#5a4630"/>
    <path d="M${x(80)} ${y(44)} l6 -3 M${x(85)} ${y(38)} l7 2 M${x(90)} ${y(46)} l-5 -4 M${x(93)} ${y(49)} l6 -2" stroke="#c9a24a" stroke-width="1.3"/>
  </g>
  <g class="hen-house" filter="url(#cut)">
    <path d="M${x(78)} ${y(74)} V${y(63)} L${x(87.5)} ${y(57.5)} L${x(97)} ${y(63)} V${y(74)} Z" fill="#a8452f"/>
    <rect x="${x(85)}" y="${y(67)}" width="${x(5)}" height="${y(7)}" fill="#2b1612"/>
    <path d="M${x(85)} ${y(74)} L${x(80)} ${y(77)}" stroke="#d9c9a6" stroke-width="2.4"/>
    <circle cx="${x(82)}" cy="${y(66)}" r="2.2" fill="#efe3c8"/>
  </g>
  <g class="kennel" filter="url(#cut)">
    <path d="M${x(62)} ${y(74)} V${y(69)} L${x(66.5)} ${y(66)} L${x(71)} ${y(69)} V${y(74)} Z" fill="#5b4a3a"/>
    <path d="M${x(64.8)} ${y(74)} V${y(71)} a7 7 0 0 1 ${x(3.4)} 0 V${y(74)} Z" fill="#1a1410"/>
  </g>
  <rect x="${x(0)}" y="${y(52)}" width="${x(34)}" height="${y(25)}" fill="#3e5236"/>
  <g fill="#566d3e" filter="url(#cut)">${grass.join('')}</g>
  <rect y="${y(77)}" width="400" height="${y(23)}" fill="#24301f"/>
  <g fill="#1a2617" filter="url(#cut)">${thicket.join('')}</g>
  <g fill="#121b10" filter="url(#cut)">${thicketFront.join('')}</g>
  <g fill="#8b3a4a">${[30, 110, 190, 270, 350].map((cx, i) => `<circle cx="${cx}" cy="${y(90) + (i % 2) * 12}" r="2"/>`).join('')}</g>
  <rect class="night-veil" width="400" height="500" fill="#0c1430" opacity="0.62"/>
  <g class="window-glow">
    <rect class="farm-window" x="${x(40)}" y="${y(31.5)}" width="${x(5)}" height="${y(3)}"/>
    <rect class="farm-window" x="${x(63)}" y="${y(31.5)}" width="${x(5)}" height="${y(3)}"/>
  </g>
  <g class="night-stars" fill="#fff6dc">
    <circle cx="40" cy="12" r="1.2"/><circle cx="110" cy="26" r="1"/><circle cx="170" cy="8" r="1.3"/>
    <circle cx="240" cy="22" r="1"/><circle cx="300" cy="10" r="1.2"/><circle cx="360" cy="28" r="1"/>
  </g>
</svg>`;
}

function reed(x: number, base: number, h: number): string {
  return `<path d="M${x} ${base} q${-1} ${-h * 0.5} ${1.5} ${-h}" stroke="currentColor" stroke-width="2" fill="none"/><ellipse cx="${x + 1.4}" cy="${base - h + 4}" rx="2.2" ry="5"/>`;
}

/** Ån: the far bank at the top, the water across the middle flowing right into the rapids, the near bank below. */
function riverSvg(): string {
  const y = (p: number) => p * 5;
  const x = (p: number) => p * 4;
  const flow: string[] = [];
  for (let r = 0; r < 9; r++) {
    for (let i = 0; i < 4; i++) {
      const fx = x(24) + i * 46 + (r % 2) * 22;
      const fy = y(28) + r * 28;
      flow.push(`<path d="M${fx} ${fy} q10 -5 20 0 t20 0" />`);
    }
  }
  const fast: string[] = [];
  for (let r = 0; r < 10; r++) fast.push(`<path d="M${x(56)} ${y(29) + r * 25} q${18 + (r % 3) * 6} -6 ${40 + (r % 2) * 10} 0 t44 0" />`);
  const foam: string[] = [];
  for (let i = 0; i < 16; i++) foam.push(`<circle cx="${x(92) + (i % 4) * 7}" cy="${y(28) + i * 16}" r="${4 + (i % 3) * 2}"/>`);
  const logs: string[] = [];
  for (let i = 0; i < 12; i++) logs.push(`<rect x="${6 + (i % 2) * 6}" y="${y(26) + i * 21.5}" width="${70 - (i % 3) * 6}" height="12" rx="5" transform="rotate(${(i % 2 ? 4 : -4)} 44 ${y(26) + i * 21.5 + 6})"/>`);
  const ruin: string[] = [];
  for (let i = 0; i < 6; i++) ruin.push(`<rect x="${4 + (i % 3) * 22}" y="${y(30) + i * 44}" width="${30 - (i % 2) * 8}" height="9" rx="4" transform="rotate(${-30 + i * 17} ${20 + i * 8} ${y(30) + i * 44})"/>`);
  const reedsNear: string[] = [];
  for (let i = 0; i < 26; i++) reedsNear.push(reed(4 + i * 15.5 + (i % 3) * 2, y(100) - 4 - (i % 2) * 8, 46 + (i % 4) * 10));
  const reedsFar: string[] = [];
  for (let i = 0; i < 18; i++) reedsFar.push(reed(10 + i * 22, y(26.5), 20 + (i % 3) * 6));
  const birches = [40, 150, 270, 350].map((bx, i) =>
    `<rect x="${bx}" y="${y(4) + (i % 2) * 6}" width="5" height="${y(10)}" fill="#ddd6c4"/><ellipse cx="${bx + 2}" cy="${y(5) + (i % 2) * 6}" rx="18" ry="16" fill="#4f6a3e"/>`).join('');

  return `
<svg class="scene-bg river" viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden="true">
  <defs>
    <linearGradient id="riversky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7b8da6"/><stop offset="1" stop-color="#d9c7a6"/>
    </linearGradient>
    <linearGradient id="water" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#3f6478"/><stop offset="0.6" stop-color="#365a6e"/><stop offset="1" stop-color="#2c4a5c"/>
    </linearGradient>${DEFS}
  </defs>
  <rect width="400" height="${y(14)}" fill="url(#riversky)"/>
  <g filter="url(#cut)">${birches}</g>
  <rect y="${y(12)}" width="400" height="${y(15)}" fill="#55704a" filter="url(#cut)"/>
  <g color="#3b5534" fill="#6b5536" filter="url(#cut)">${reedsFar.join('')}</g>
  <rect y="${y(26)}" width="400" height="${y(52)}" fill="url(#water)"/>
  <g stroke="#a8c4cf" stroke-width="1.6" fill="none" opacity="0.45">${flow.join('')}</g>
  <g class="fast-water" stroke="#dbe9ec" stroke-width="2" fill="none" opacity="0.55">${fast.join('')}</g>
  <g fill="#eef3f0" opacity="0.85" filter="url(#cut)">${foam.join('')}</g>
  <g class="dam-whole" fill="#6e5236" filter="url(#cut)">${logs.join('')}
    <path d="M10 ${y(40)} l60 6 M14 ${y(58)} l56 -5" stroke="#3e2c1c" stroke-width="2"/>
  </g>
  <g class="dam-ruin" fill="#6e5236" filter="url(#cut)">${ruin.join('')}</g>
  <g filter="url(#cut)">
    <ellipse cx="${x(37)}" cy="${y(67)}" rx="52" ry="26" fill="#7f8584"/>
    <ellipse cx="${x(35)}" cy="${y(64)}" rx="36" ry="12" fill="#9aa09d"/>
    <ellipse cx="${x(37)}" cy="${y(40)}" rx="50" ry="25" fill="#7f8584"/>
    <ellipse cx="${x(39)}" cy="${y(37)}" rx="34" ry="11" fill="#9aa09d"/>
  </g>
  <rect y="${y(78)}" width="400" height="${y(22)}" fill="#4f5f3a" filter="url(#cut)"/>
  <path d="M0 ${y(79)} q100 10 200 2 t200 4 V${y(82)} H0 Z" fill="#6b5a3e"/>
  <g color="#2f4128" fill="#5a4630" filter="url(#cut)">${reedsNear.join('')}</g>
  <rect class="night-veil" width="400" height="500" fill="#0c1430" opacity="0.6"/>
  <g class="night-stars" fill="#fff6dc">
    <circle cx="60" cy="14" r="1.2"/><circle cx="130" cy="30" r="1"/><circle cx="210" cy="10" r="1.3"/>
    <circle cx="280" cy="26" r="1"/><circle cx="330" cy="12" r="1.2"/>
  </g>
</svg>`;
}
