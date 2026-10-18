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
  return id === 'farm' ? farmSvg() : roadSvg();
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
  <circle cx="300" cy="${y(13)}" r="22" fill="#f3c890" opacity="0.9"/>
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
</svg>`;
}
