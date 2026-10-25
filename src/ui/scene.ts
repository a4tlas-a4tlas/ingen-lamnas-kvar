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
  return id === 'farm' ? farmSvg() : id === 'river' ? riverSvg() : id === 'machines' ? machinesSvg() : id === 'raptor' ? fieldSvg() : id === 'sprayer' ? sprayerSvg() : id === 'fence' ? fenceSvg() : id === 'harvest' ? harvestSvg() : id === 'lamps' ? lampsSvg() : id === 'cats' ? catsSvg() : id === 'street' ? streetSvg() : id === 'sewer' ? sewerSvg() : id === 'fireworks' ? fireworksSvg() : id === 'bog' ? bogSvg() : id === 'wisps' ? wispsSvg() : id === 'cranes' ? cranesSvg() : roadSvg();
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
    <ellipse cx="${x(37)}" cy="${y(71)}" rx="50" ry="19" fill="#7f8584"/>
    <ellipse cx="${x(35)}" cy="${y(69)}" rx="34" ry="9" fill="#9aa09d"/>
    <ellipse cx="${x(39)}" cy="${y(53.5)}" rx="48" ry="18" fill="#7f8584"/>
    <ellipse cx="${x(41)}" cy="${y(51.5)}" rx="32" ry="8" fill="#9aa09d"/>
    <ellipse cx="${x(36)}" cy="${y(36)}" rx="46" ry="18" fill="#7f8584"/>
    <ellipse cx="${x(34)}" cy="${y(34)}" rx="30" ry="8" fill="#9aa09d"/>
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

/** Dalens sista morgon: the ridge in the sunrise, spruce below it, birches, a clear-cut and stones, and the clearing where the machines come in. */
function machinesSvg(): string {
  const y = (p: number) => p * 5;
  const x = (p: number) => p * 4;
  const ridgePines: string[] = [];
  for (let i = 0; i < 18; i++) ridgePines.push(pine(6 + i * 23 + (i % 2) * 6, y(14) - (i % 3) * 3, 14 + (i % 4) * 4));
  const spruceBack: string[] = [];
  for (let i = 0; i < 15; i++) spruceBack.push(pine(-6 + i * 29, y(36), 48 + ((i * 5) % 4) * 8));
  const spruceFront: string[] = [];
  for (let i = 0; i < 13; i++) spruceFront.push(pine(8 + i * 32 + (i % 2) * 5, y(46), 56 + ((i * 3) % 4) * 8));
  const birches: string[] = [];
  for (let i = 0; i < 6; i++) {
    const bx = x(3) + i * 21 + (i % 2) * 4;
    const by = y(74) - (i % 3) * 6;
    birches.push(`<rect x="${bx}" y="${by - 104}" width="5" height="104" fill="#e6dfcc"/>` +
      `<path d="M${bx} ${by - 70} h5 M${bx} ${by - 44} h5 M${bx} ${by - 20} h5" stroke="#2a2420" stroke-width="2"/>` +
      `<ellipse cx="${bx + 2}" cy="${by - 108}" rx="17" ry="22" fill="#6f8a4a"/>`);
  }
  const stumps: string[] = [];
  for (let i = 0; i < 9; i++) {
    const sx = x(37) + (i % 3) * 38 + (i % 2) * 8;
    const sy = y(52) + Math.floor(i / 3) * 42;
    stumps.push(`<rect x="${sx}" y="${sy}" width="14" height="10" fill="#7a5a3a"/><ellipse cx="${sx + 7}" cy="${sy}" rx="7" ry="2.6" fill="#d8b98a"/>`);
  }
  const rocks: string[] = [];
  for (let i = 0; i < 9; i++) {
    const rx = x(69) + (i % 3) * 38 + (i % 2) * 6;
    const ry = y(56) + Math.floor(i / 3) * 40;
    rocks.push(`<ellipse cx="${rx}" cy="${ry}" rx="${17 + (i % 2) * 5}" ry="${11 + (i % 3) * 2}" fill="#8a8d88"/><ellipse cx="${rx - 3}" cy="${ry - 4}" rx="${9 + (i % 2) * 3}" ry="4" fill="#a7aaa4"/>`);
  }
  const tufts: string[] = [];
  for (let i = 0; i < 20; i++) tufts.push(tuft(10 + i * 20, y(100) - 2 - (i % 3) * 3, 1.3 + (i % 4) * 0.2));
  return `
<svg class="scene-bg machines" viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden="true">
  <defs>
    <linearGradient id="dawn" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5c6a8c"/><stop offset="0.55" stop-color="#d99a72"/><stop offset="1" stop-color="#f0cf96"/>
    </linearGradient>${DEFS}
  </defs>
  <rect width="400" height="${y(16)}" fill="url(#dawn)"/>
  <circle cx="${x(70)}" cy="${y(13)}" r="22" fill="#f6dc9c" opacity="0.9"/>
  <path d="M0 ${y(15)} Q${x(30)} ${y(8)} ${x(55)} ${y(12)} T400 ${y(10)} V${y(25)} H0 Z" fill="#5d6b44" filter="url(#cut)"/>
  <g fill="#3e5032" filter="url(#cut)">${ridgePines.join('')}</g>
  <rect y="${y(24)}" width="400" height="${y(23)}" fill="#2f3f2a"/>
  <g fill="#24341f" filter="url(#cut)">${spruceBack.join('')}</g>
  <g fill="#1d2b19" filter="url(#cut)">${spruceFront.join('')}</g>
  <rect y="${y(46)}" width="${x(34)}" height="${y(30)}" fill="#6b7d46"/>
  <rect x="${x(34)}" y="${y(46)}" width="${x(32)}" height="${y(30)}" fill="#8a6c48"/>
  <path d="M${x(36)} ${y(60)} l40 -6 M${x(44)} ${y(70)} l50 4 M${x(50)} ${y(50)} l30 8" stroke="#5a4630" stroke-width="5" stroke-linecap="round"/>
  <rect x="${x(66)}" y="${y(46)}" width="${x(34)}" height="${y(30)}" fill="#76785c"/>
  <g filter="url(#cut)">${birches.join('')}</g>
  <g filter="url(#cut)">${stumps.join('')}</g>
  <g filter="url(#cut)">${rocks.join('')}</g>
  <rect y="${y(76)}" width="400" height="${y(24)}" fill="#6e8048" filter="url(#cut)"/>
  <g fill="#556636" filter="url(#cut)">${tufts.join('')}</g>
  <g class="machine-feller" fill="#c99a2e" filter="url(#cut)">
    <rect x="${x(4)}" y="${y(94)}" width="46" height="18" rx="3"/><rect x="${x(6)}" y="${y(90)}" width="20" height="14" fill="#2a2420"/>
    <path d="M${x(4) + 40} ${y(95)} L${x(4) + 70} ${y(84)} L${x(4) + 82} ${y(88)}" stroke="#c99a2e" stroke-width="6" fill="none"/>
    <circle cx="${x(5) + 4}" cy="${y(99)}" r="6" fill="#2a2420"/><circle cx="${x(5) + 34}" cy="${y(99)}" r="6" fill="#2a2420"/>
  </g>
  <g class="machine-dozer" fill="#c9692e" filter="url(#cut)">
    <rect x="${x(76)}" y="${y(93)}" width="54" height="16" rx="3"/><rect x="${x(80)}" y="${y(88)}" width="22" height="14" fill="#2a2420"/>
    <rect x="${x(72)}" y="${y(92)}" width="8" height="22"/>
    <rect x="${x(76)}" y="${y(98)}" width="56" height="8" rx="4" fill="#2a2420"/>
  </g>
</svg>`;
}

/** The street lights: a dark street with lamp posts, a bus shelter, bins, front yards and the gardens' hedges. */
function lampsSvg(): string {
  const y = (p: number) => p * 5;
  const x = (p: number) => p * 4;
  const hedge: string[] = [];
  for (let i = 0; i < 16; i++) hedge.push(`<ellipse cx="${6 + i * 26}" cy="${y(14) - (i % 3) * 3}" rx="${22 + (i % 2) * 6}" ry="${16 + (i % 3) * 3}"/>`);
  const houses = [x(6), x(70)].map((hx) => `<path d="M${hx} ${y(36)} L${hx + 50} ${y(28)} L${hx + 100} ${y(36)} V${y(48)} H${hx} Z" fill="#3a3440"/><rect x="${hx + 38}" y="${y(40)}" width="14" height="16" fill="#e8c86a" opacity="0.8"/>`).join('');
  const posts = [x(19), x(81)].flatMap((px) => [`<rect x="${px}" y="${y(52)}" width="3" height="${y(24)}" fill="#2a2a30"/>`, `<rect x="${px - 6}" y="${y(51)}" width="15" height="4" fill="#2a2a30"/>`,
    `<rect x="${px}" y="${y(24)}" width="3" height="${y(24)}" fill="#2a2a30"/>`, `<rect x="${px - 6}" y="${y(23)}" width="15" height="4" fill="#2a2a30"/>`]).join('');
  const tufts: string[] = [];
  for (let i = 0; i < 22; i++) tufts.push(tuft(8 + i * 18.5, y(100) - 2 - (i % 3) * 3, 1.5 + (i % 4) * 0.25));
  return `
<svg class="scene-bg lamps" viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden="true">
  <defs>${DEFS}</defs>
  <rect width="400" height="500" fill="#151a2a"/>
  <g fill="#24361f" filter="url(#cut)">${hedge.join('')}</g>
  <rect y="${y(22)}" width="400" height="${y(28)}" fill="#2c3a28"/>
  ${houses}
  <rect x="${x(38)}" y="${y(26)}" width="${x(24)}" height="${y(20)}" fill="#1c2020"/>
  <rect x="${x(42)}" y="${y(32)}" width="22" height="30" rx="3" fill="#2f4a3a"/><rect x="${x(50)}" y="${y(32)}" width="22" height="30" rx="3" fill="#4a3a2a"/>
  <rect y="${y(50)}" width="400" height="${y(28)}" fill="#2a2a30"/>
  <path d="M0 ${y(64)} H400" stroke="#cfc6a6" stroke-width="3" stroke-dasharray="22 18" opacity="0.6"/>
  <rect x="${x(40)}" y="${y(52)}" width="${x(20)}" height="${y(20)}" fill="#3a4450" opacity="0.85"/><rect x="${x(40)}" y="${y(52)}" width="${x(20)}" height="6" fill="#55606c"/>
  ${posts}
  <rect y="${y(78)}" width="400" height="${y(22)}" fill="#2e3a24" filter="url(#cut)"/>
  <g fill="#26321e" filter="url(#cut)">${tufts.join('')}</g>
</svg>`;
}

/** The courtyard: brick walls with lit windows, the gate beyond, bike racks, a sandbox, a bin shed, a flowerbed, a lawn, a maple. */
function catsSvg(): string {
  const y = (p: number) => p * 5;
  const x = (p: number) => p * 4;
  const windows: string[] = [];
  for (let i = 0; i < 9; i++) for (let r = 0; r < 2; r++) if (i !== 4) windows.push(`<rect x="${10 + i * 44}" y="${4 + r * 18}" width="14" height="11" fill="${(i + r) % 3 ? '#e8c86a' : '#3a3036'}" opacity="0.85"/>`);
  const bikes = [0, 1, 2].map((i) => `<g transform="translate(${x(5) + i * 38} ${y(66)})"><circle cx="0" cy="10" r="9"/><circle cx="24" cy="10" r="9"/><path d="M0 10 L10 -2 L24 10 M10 -2 H20 M6 -6 H12" fill="none"/></g>`).join('');
  const flowers: string[] = [];
  for (let i = 0; i < 12; i++) flowers.push(`<circle cx="${x(3) + i * 10}" cy="${y(36) + (i % 3) * 9}" r="3.2" fill="${['#c9692e', '#e8c86a', '#b03a48'][i % 3]}"/>`);
  const leaves: string[] = [];
  for (let i = 0; i < 9; i++) leaves.push(`<ellipse cx="${x(76) + (i % 3) * 24 - 10}" cy="${y(26) + Math.floor(i / 3) * 18}" rx="22" ry="14"/>`);
  const tufts: string[] = [];
  for (let i = 0; i < 12; i++) tufts.push(tuft(x(36) + i * 10.5, y(48) - (i % 3) * 3, 1.2 + (i % 4) * 0.2));
  return `
<svg class="scene-bg cats" viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden="true">
  <defs>${DEFS}</defs>
  <rect width="400" height="${y(22)}" fill="#6a3a2c"/>
  <g>${windows.join('')}</g>
  <rect x="${x(42)}" y="${y(6)}" width="${x(16)}" height="${y(16)}" fill="#1e1a1a"/><path d="M${x(42)} ${y(6)} Q${x(50)} ${y(1)} ${x(58)} ${y(6)}" fill="#1e1a1a"/>
  <rect y="${y(22)}" width="400" height="${y(56)}" fill="#7d7a70"/>
  <rect x="0" y="${y(22)}" width="${x(34)}" height="${y(28)}" fill="#4a3a26" filter="url(#cut)"/>
  <g filter="url(#cut)">${flowers.join('')}</g>
  <rect x="${x(34)}" y="${y(22)}" width="${x(32)}" height="${y(28)}" fill="#5e7a42" filter="url(#cut)"/>
  <g fill="#4a6434" filter="url(#cut)">${tufts.join('')}</g>
  <rect x="${x(80)}" y="${y(32)}" width="10" height="${y(16)}" fill="#3a2a1e"/>
  <g fill="#3e5a2c" filter="url(#cut)">${leaves.join('')}</g>
  <g stroke="#2a2a30" stroke-width="3" fill="none">${bikes}</g>
  <rect x="${x(40)}" y="${y(56)}" width="${x(20)}" height="${y(16)}" fill="#8a6a40"/><rect x="${x(42)}" y="${y(58)}" width="${x(16)}" height="${y(12)}" fill="#d9c08a"/>
  <rect x="${x(70)}" y="${y(52)}" width="${x(26)}" height="${y(22)}" fill="#4a4a46" filter="url(#cut)"/><rect x="${x(72)}" y="${y(60)}" width="${x(10)}" height="${y(14)}" fill="#2f4a3a"/><rect x="${x(84)}" y="${y(60)}" width="${x(10)}" height="${y(14)}" fill="#4a3a2a"/>
  <rect y="${y(78)}" width="400" height="${y(22)}" fill="#5a5048"/>
  <g fill="#6c6258">${[0, 1, 2, 3].map((i) => `<rect x="${x(30) + i * 10}" y="${y(80) + i * 14}" width="${x(40) - i * 20}" height="10"/>`).join('')}</g>
  <rect class="night-veil" width="400" height="500" fill="#0c1430" opacity="0.6"/>
  <g class="night-stars">${windows.filter((w) => w.includes('#e8c86a')).join('')}</g>
</svg>`;
}

/** The shopping street: shop fronts with awnings on both sides, a doorway, a bench, painted bike lanes, tram rails under their wire, the park beyond. */
function streetSvg(): string {
  const y = (p: number) => p * 5;
  const x = (p: number) => p * 4;
  const trees: string[] = [];
  for (let i = 0; i < 12; i++) trees.push(`<ellipse cx="${10 + i * 34}" cy="${y(14) - (i % 3) * 4}" rx="${24 + (i % 2) * 6}" ry="${20 + (i % 3) * 4}"/>`);
  const awnings = (top: number) => [0, 1, 2, 3, 4].map((i) => `<path d="M${i * 80 + 6} ${top} h68 l-6 10 h-56 Z" fill="${['#b03a48', '#2f5a6a', '#c9692e', '#4a6434', '#8a5a8a'][i]}"/>`).join('');
  const pavers = (top: number, h: number) => { const out: string[] = []; for (let r = 0; r < h / 12; r++) out.push(`<path d="M0 ${top + r * 12} H400" stroke="#9a9488" stroke-width="0.8" opacity="0.5"/>`); return out.join(''); };
  return `
<svg class="scene-bg street" viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden="true">
  <defs>${DEFS}</defs>
  <rect width="400" height="${y(26)}" fill="#4a6434"/>
  <g fill="#3e5a2c" filter="url(#cut)">${trees.join('')}</g>
  <rect y="${y(26)}" width="400" height="${y(20)}" fill="#b0a898"/>${pavers(y(26), y(20))}
  <rect x="0" y="${y(26)}" width="${x(30)}" height="${y(20)}" fill="#a04a3a" opacity="0.55"/>
  <path d="M${x(14)} ${y(30)} v${y(12)} M${x(4)} ${y(36)} h${x(20)}" stroke="#f0ead8" stroke-width="2" opacity="0.6"/>
  <g fill="#5a4630" filter="url(#cut)"><rect x="${x(74)}" y="${y(34)}" width="${x(22)}" height="6"/><rect x="${x(76)}" y="${y(36)}" width="4" height="${y(6)}"/><rect x="${x(90)}" y="${y(36)}" width="4" height="${y(6)}"/></g>
  <rect y="${y(46)}" width="400" height="${y(18)}" fill="#5a5650"/>
  <path d="M0 ${y(51)} H400 M0 ${y(59)} H400" stroke="#c8c4bc" stroke-width="3"/>
  ${[...Array(20)].map((_, i) => `<rect x="${i * 21}" y="${y(50)}" width="6" height="${y(10)}" fill="#3a3632"/>`).join('')}
  <path d="M0 ${y(47.5)} H400" stroke="#2a2a30" stroke-width="1.2"/>
  <rect y="${y(64)}" width="400" height="${y(20)}" fill="#b0a898"/>${pavers(y(64), y(20))}
  <rect x="${x(70)}" y="${y(64)}" width="${x(30)}" height="${y(20)}" fill="#a04a3a" opacity="0.55"/>
  <path d="M${x(84)} ${y(68)} v${y(12)} M${x(74)} ${y(74)} h${x(20)}" stroke="#f0ead8" stroke-width="2" opacity="0.6"/>
  <rect y="${y(84)}" width="400" height="${y(16)}" fill="#4a4440"/>
  <g filter="url(#cut)">${awnings(y(84))}</g>
  <rect x="${x(8)}" y="${y(64)}" width="${x(14)}" height="${y(20)}" fill="#2a2420"/><rect x="${x(10)}" y="${y(66)}" width="${x(10)}" height="${y(16)}" fill="#e8c86a" opacity="0.35"/>
  <rect class="night-veil" width="400" height="500" fill="#0c1430" opacity="0.6"/>
  <g class="night-stars"><rect x="${x(10)}" y="${y(66)}" width="${x(10)}" height="${y(16)}" fill="#e8c86a" opacity="0.5"/></g>
</svg>`;
}

/** New Year's Eve in the city park: bare trees, the bandstand, the pond, the embankment with its rails, rockets in the sky. */
/** Gungflyet: a grey-green bog with black pools, three tussocks and an old plank, the pine islet beyond. */
function bogSvg(): string {
  const y = (p: number) => p * 5;
  const x = (p: number) => p * 4;
  const pools = [[12, 66], [80, 70], [16, 46], [52, 50], [10, 26], [86, 24], [60, 30]]
    .map(([px, py], i) => `<ellipse cx="${x(px)}" cy="${y(py)}" rx="${30 + (i % 3) * 10}" ry="${8 + (i % 2) * 4}" fill="#1c2a2a" opacity="0.85"/>`).join('');
  const tufts: string[] = [];
  for (let i = 0; i < 60; i++) tufts.push(`<path d="M${(i * 37) % 400} ${y(16) + ((i * 53) % 320)} l-2 -8 m2 8 l0 -10 m0 10 l3 -8"/>`);
  const tussock = (px: number, py: number) => `<ellipse cx="${x(px)}" cy="${y(py)}" rx="34" ry="14" fill="#4a5a32"/><path d="M${x(px) - 20} ${y(py) - 4} l-3 -12 m10 12 l0 -14 m10 14 l3 -12 m8 12 l5 -10" stroke="#6a7a40" stroke-width="2" fill="none"/>`;
  const pines = [10, 28, 50, 70, 88].map((px, i) => `<path d="M${x(px)} ${y(1)} L${x(px) - 14} ${y(13)} H${x(px) + 14} Z" fill="#1e2a1e" transform="translate(0 ${i % 2 ? 4 : 0})"/>`).join('');
  return `
<svg class="scene-bg bog" viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden="true">
  <defs>${DEFS}</defs>
  <rect width="400" height="500" fill="#5e6a4c"/>
  <rect width="400" height="${y(14)}" fill="#3a4a34"/>${pines}
  <g>${pools}</g>
  <g stroke="#7a8456" stroke-width="1.4" fill="none" opacity="0.7">${tufts.join('')}</g>
  ${tussock(50, 69)}${tussock(83, 47)}
  <rect x="${x(36)}" y="${y(23)}" width="${x(28)}" height="10" fill="#6a5438" filter="url(#cut)"/><rect x="${x(36)}" y="${y(23) + 12}" width="${x(28)}" height="4" fill="#4a3826"/>
  <rect y="${y(80)}" width="400" height="${y(20)}" fill="#6a6a44"/>
  <rect class="night-veil" width="400" height="500" fill="#0c1430" opacity="0.5"/>
</svg>`;
}

/** Tranmyren: an open bog at dawn under low mist, willows and birches at the far edge. */
function cranesSvg(): string {
  const y = (p: number) => p * 5;
  const x = (p: number) => p * 4;
  const tufts: string[] = [];
  for (let i = 0; i < 55; i++) tufts.push(`<path d="M${(i * 43) % 400} ${y(16) + ((i * 61) % 320)} l-2 -7 m2 7 l0 -9 m0 9 l3 -7"/>`);
  const birches = [72, 78, 84, 90, 96].map((px, i) => `<rect x="${x(px)}" y="${y(14 + (i % 2) * 2)}" width="4" height="${y(18)}" fill="#e8e2d4"/><ellipse cx="${x(px) + 2}" cy="${y(14)}" rx="16" ry="12" fill="#7a9a54" opacity="0.8"/>`).join('');
  const willows = [4, 12, 20, 28].map((px) => `<ellipse cx="${x(px)}" cy="${y(26)}" rx="22" ry="16" fill="#5a7040"/>`).join('');
  return `
<svg class="scene-bg cranes" viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden="true">
  <defs>${DEFS}</defs>
  <rect width="400" height="500" fill="#8a8a66"/>
  <rect width="400" height="${y(14)}" fill="#c9c2a4"/>
  <g stroke="#6a6a48" stroke-width="1.4" fill="none" opacity="0.7">${tufts.join('')}</g>
  ${willows}${birches}
  <rect y="${y(30)}" width="400" height="${y(10)}" fill="#efe9d8" opacity="0.35"/>
  <rect y="${y(52)}" width="400" height="${y(8)}" fill="#efe9d8" opacity="0.25"/>
  <rect y="${y(80)}" width="400" height="${y(20)}" fill="#6a6a44"/>
</svg>`;
}

/** Irrblosskärret: the bog at night, two black pools, a stone, a log bridge, and pale lights far out. */
function wispsSvg(): string {
  const y = (p: number) => p * 5;
  const x = (p: number) => p * 4;
  const tufts: string[] = [];
  for (let i = 0; i < 50; i++) tufts.push(`<path d="M${(i * 41) % 400} ${y(16) + ((i * 59) % 320)} l-2 -8 m2 8 l0 -10 m0 10 l3 -8"/>`);
  const glows = [[20, 30], [78, 26], [52, 50], [30, 62]].map(([px, py]) => `<circle cx="${x(px)}" cy="${y(py)}" r="16" fill="#9ad0ff" opacity="0.08"/><circle cx="${x(px)}" cy="${y(py)}" r="3" fill="#cfe8ff" opacity="0.5"/>`).join('');
  const spruce = [6, 20, 34, 50, 64, 80, 94].map((px, i) => `<path d="M${x(px)} ${y(0)} L${x(px) - 12} ${y(13)} H${x(px) + 12} Z" fill="#0e1612" transform="translate(0 ${i % 2 ? 3 : 0})"/>`).join('');
  return `
<svg class="scene-bg wisps" viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden="true">
  <defs>${DEFS}</defs>
  <rect width="400" height="500" fill="#1c2420"/>
  <rect width="400" height="${y(14)}" fill="#141c18"/>${spruce}
  <ellipse cx="${x(17)}" cy="${y(47)}" rx="58" ry="22" fill="#0a1012"/><ellipse cx="${x(83)}" cy="${y(47)}" rx="58" ry="22" fill="#0a1012"/>
  <g stroke="#34402e" stroke-width="1.4" fill="none">${tufts.join('')}</g>
  <ellipse cx="${x(50)}" cy="${y(70)}" rx="30" ry="16" fill="#3a3a36" filter="url(#cut)"/>
  ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${x(37) + i * 18}" y="${y(21)}" width="15" height="${y(9)}" rx="4" fill="#3a2e22"/>`).join('')}
  ${glows}
  <rect y="${y(80)}" width="400" height="${y(20)}" fill="#2a2a1e"/>
</svg>`;
}

function fireworksSvg(): string {
  const y = (p: number) => p * 5;
  const x = (p: number) => p * 4;
  const sparks = (cx: number, cy: number, r: number, col: string) => [...Array(14)].map((_, i) => {
    const a = (i / 14) * Math.PI * 2;
    return `<path d="M${cx + Math.cos(a) * r * 0.3} ${cy + Math.sin(a) * r * 0.3} L${cx + Math.cos(a) * r} ${cy + Math.sin(a) * r}" stroke="${col}" stroke-width="1.6" stroke-linecap="round"/>`;
  }).join('');
  const trees = [x(8), x(28), x(62), x(92)].map((tx, i) => `<path d="M${tx} ${y(52)} V${y(38)} M${tx} ${y(42)} l-14 -12 M${tx} ${y(40)} l12 -14 M${tx} ${y(46)} l10 -8" stroke="#2a2420" stroke-width="${i % 2 ? 3 : 4}" fill="none"/>`).join('');
  return `
<svg class="scene-bg fireworks" viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden="true">
  <defs>${DEFS}</defs>
  <rect width="400" height="500" fill="#121828"/>
  <g opacity="0.9">${sparks(x(20), y(8), 34, '#e8c86a')}${sparks(x(62), y(5), 26, '#d86a5a')}${sparks(x(86), y(13), 22, '#8ac0e0')}</g>
  <rect y="${y(15)}" width="400" height="${y(9)}" fill="#3a3430"/>
  <path d="M0 ${y(18)} H400 M0 ${y(21)} H400" stroke="#8a8478" stroke-width="2"/>
  ${[...Array(20)].map((_, i) => `<rect x="${i * 21}" y="${y(17.5)}" width="5" height="${y(4)}" fill="#2a2420"/>`).join('')}
  <rect x="${x(90)}" y="${y(6)}" width="3" height="${y(10)}" fill="#2a2a30"/><circle cx="${x(90) + 1.5}" cy="${y(7)}" r="4" fill="#d84a3a"/>
  <rect y="${y(24)}" width="400" height="${y(56)}" fill="#24321f"/>
  <path d="M${x(4)} ${y(46)} h${x(26)} l-${x(3)} -${y(8)} h-${x(20)} Z" fill="#3a3430"/><path d="M${x(2)} ${y(38)} Q${x(17)} ${y(28)} ${x(32)} ${y(38)} Z" fill="#4a3e36"/>
  <rect x="${x(36)}" y="${y(26)}" width="${x(28)}" height="${y(24)}" fill="#2c3c26"/>
  <g stroke="#5a5048" stroke-width="3" fill="none"><path d="M${x(72)} ${y(48)} V${y(32)} H${x(84)} M${x(78)} ${y(32)} l${x(10)} ${y(14)}"/></g>
  <ellipse cx="${x(83)}" cy="${y(67)}" rx="${x(14)}" ry="${y(9)}" fill="#1c2a3a"/><path d="M${x(74)} ${y(66)} h${x(6)} M${x(84)} ${y(69)} h${x(8)}" stroke="#e8c86a" stroke-width="1.4" opacity="0.6"/>
  <path d="M${x(50)} ${y(80)} C${x(48)} ${y(70)} ${x(52)} ${y(60)} ${x(50)} ${y(52)}" stroke="#6a6058" stroke-width="${x(10)}" fill="none" opacity="0.7"/>
  <g fill="#1e2c1a" filter="url(#cut)">${[...Array(7)].map((_, i) => `<ellipse cx="${x(4) + i * 18}" cy="${y(64) + (i % 2) * 8}" rx="16" ry="12"/>`).join('')}</g>
  ${trees}
  <rect y="${y(80)}" width="400" height="${y(20)}" fill="#2e2a26"/>
  <g stroke="#1a1614" stroke-width="3">${[...Array(16)].map((_, i) => `<path d="M${i * 26 + 6} ${y(80)} V${y(92)}"/>`).join('')}<path d="M0 ${y(83)} H400 M0 ${y(89)} H400"/></g>
</svg>`;
}

/** The sewer: brick vaults, the manhole shaft with its ladder, dark water in the channels, the outlet's arch with grey light beyond. */
function sewerSvg(): string {
  const y = (p: number) => p * 5;
  const x = (p: number) => p * 4;
  const bricks: string[] = [];
  for (let r = 0; r < 26; r++) for (let i = 0; i < 9; i++) bricks.push(`<rect x="${i * 46 + (r % 2) * 23 - 10}" y="${y(24) + r * 11}" width="42" height="9" fill="${(i + r) % 4 ? '#3a302a' : '#433630'}"/>`);
  const arches = [x(17), x(50), x(83)].map((cx) => `<path d="M${cx - 50} ${y(52)} V${y(34)} Q${cx} ${y(22)} ${cx + 50} ${y(34)} V${y(52)} Z" fill="#1a1614"/><path d="M${cx - 50} ${y(80)} V${y(62)} Q${cx} ${y(50)} ${cx + 50} ${y(62)} V${y(80)} Z" fill="#1a1614"/>`).join('');
  const water = [y(48), y(76)].map((wy) => `<rect x="0" y="${wy}" width="400" height="${y(4)}" fill="#2a3a40" opacity="0.9"/>`).join('');
  const rungs = [0, 1, 2, 3, 4].map((i) => `<rect x="${x(46)}" y="${y(82) + i * 18}" width="${x(8)}" height="3" fill="#6a6058"/>`).join('');
  return `
<svg class="scene-bg sewer" viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden="true">
  <defs>${DEFS}</defs>
  <rect width="400" height="500" fill="#2a2420"/>
  <rect width="400" height="${y(24)}" fill="#22201c"/>
  <path d="M${x(30)} ${y(24)} V${y(10)} Q${x(50)} ${y(-2)} ${x(70)} ${y(10)} V${y(24)} Z" fill="#8a9aa8" opacity="0.55"/>
  <path d="M${x(30)} ${y(24)} V${y(10)} Q${x(50)} ${y(-2)} ${x(70)} ${y(10)} V${y(24)}" fill="none" stroke="#4a3e36" stroke-width="8"/>
  <g>${bricks.join('')}</g>
  <g filter="url(#cut)">${arches}</g>
  ${water}
  <rect y="${y(80)}" width="400" height="${y(20)}" fill="#3a3430"/>
  <rect x="${x(44)}" y="${y(80)}" width="4" height="${y(20)}" fill="#6a6058"/><rect x="${x(54)}" y="${y(80)}" width="4" height="${y(20)}" fill="#6a6058"/>${rungs}
  <rect class="night-veil" width="400" height="500" fill="#0c1430" opacity="0.4"/>
</svg>`;
}

/** The harvest: tall golden wheat in six stands, the hedge beyond, the field edge where we start. */
function harvestSvg(): string {
  const y = (p: number) => p * 5;
  const hedge: string[] = [];
  for (let i = 0; i < 16; i++) hedge.push(`<ellipse cx="${6 + i * 26}" cy="${y(14) - (i % 3) * 3}" rx="${22 + (i % 2) * 6}" ry="${18 + (i % 3) * 4}"/>`);
  const ears: string[] = [];
  for (let r = 0; r < 10; r++) for (let i = 0; i < 26; i++) ears.push(`<path d="M${4 + i * 15.5 + (r % 2) * 7} ${y(24) + r * 27} v-14 m0 0 l-3 4 m3 -4 l3 4"/>`);
  const tufts: string[] = [];
  for (let i = 0; i < 22; i++) tufts.push(tuft(8 + i * 18.5, y(100) - 2 - (i % 3) * 3, 1.5 + (i % 4) * 0.25));
  return `
<svg class="scene-bg harvest" viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden="true">
  <defs>
    <linearGradient id="harvestsky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9bb2c8"/><stop offset="1" stop-color="#f0dca8"/>
    </linearGradient>${DEFS}
  </defs>
  <rect width="400" height="${y(10)}" fill="url(#harvestsky)"/>
  <g fill="#3f5a30" filter="url(#cut)">${hedge.join('')}</g>
  <rect y="${y(22)}" width="400" height="${y(56)}" fill="#d9b45a"/>
  <g stroke="#b08a34" stroke-width="1.6" fill="none">${ears.join('')}</g>
  <path d="M136 ${y(22)} V${y(78)} M264 ${y(22)} V${y(78)} M0 ${y(50)} H400" stroke="#a07a2a" stroke-width="2" opacity="0.6"/>
  <rect y="${y(78)}" width="400" height="${y(22)}" fill="#6e8048" filter="url(#cut)"/>
  <g fill="#566a36" filter="url(#cut)">${tufts.join('')}</g>
</svg>`;
}

/** The ditch and the gate: the field's edge, a ditch with a plank across, a wire fence on posts, the pasture beyond. */
function fenceSvg(): string {
  const y = (p: number) => p * 5;
  const x = (p: number) => p * 4;
  const posts: string[] = [];
  for (let i = 0; i < 9; i++) if (i !== 3 && i !== 4) posts.push(`<rect x="${6 + i * 48}" y="${y(21)}" width="6" height="${y(10)}" fill="#5a4630"/>`);
  const wires = [y(23), y(26.5), y(30)].map((wy) => `<path d="M0 ${wy} H${x(35)} M${x(65)} ${wy} H400" stroke="#b8b4a8" stroke-width="1.6"/>`).join('');
  const grass: string[] = [];
  for (let i = 0; i < 22; i++) grass.push(tuft(8 + i * 18.5, y(21) - (i % 3) * 2, 1.4 + (i % 4) * 0.2));
  const tufts: string[] = [];
  for (let i = 0; i < 22; i++) tufts.push(tuft(8 + i * 18.5, y(100) - 2 - (i % 3) * 3, 1.5 + (i % 4) * 0.25));
  return `
<svg class="scene-bg fence" viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden="true">
  <defs>
    <linearGradient id="fencesky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9fb3c4"/><stop offset="1" stop-color="#e2d8b6"/>
    </linearGradient>${DEFS}
  </defs>
  <rect width="400" height="${y(4)}" fill="url(#fencesky)"/>
  <rect y="${y(4)}" width="400" height="${y(18)}" fill="#7f9e52"/>
  <g fill="#6a8a44" filter="url(#cut)">${grass.join('')}</g>
  <rect y="${y(22)}" width="400" height="${y(24)}" fill="#8a7a52"/>
  ${posts.join('')}${wires}
  <g stroke="#6b5636" stroke-width="5" fill="none"><path d="M${x(36)} ${y(24)} H${x(64)} M${x(36)} ${y(30)} H${x(64)} M${x(36)} ${y(24)} L${x(64)} ${y(30)}"/></g>
  <rect x="${x(35)}" y="${y(22)}" width="6" height="${y(11)}" fill="#4a3826"/><rect x="${x(65) - 6}" y="${y(22)}" width="6" height="${y(11)}" fill="#4a3826"/>
  <ellipse cx="${x(82)}" cy="${y(36)}" rx="22" ry="12" fill="#2a1e14"/>
  <rect y="${y(46)}" width="400" height="${y(26)}" fill="#4d6f82" filter="url(#cut)"/>
  <path d="M0 ${y(54)} q20 -6 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" stroke="#86aebd" stroke-width="2" fill="none" opacity="0.7"/>
  <rect x="${x(40)}" y="${y(46)}" width="${x(20)}" height="${y(26)}" fill="#7a6040"/>
  <path d="M${x(40)} ${y(51)} H${x(60)} M${x(40)} ${y(59)} H${x(60)} M${x(40)} ${y(67)} H${x(60)}" stroke="#5a4428" stroke-width="2"/>
  <rect y="${y(72)}" width="400" height="${y(28)}" fill="#6e8048" filter="url(#cut)"/>
  <g fill="#566a36" filter="url(#cut)">${tufts.join('')}</g>
  <rect class="night-veil" width="400" height="500" fill="#0c1430" opacity="0.6"/>
  <g class="night-stars" fill="#fff6dc">
    <circle cx="40" cy="8" r="1.2"/><circle cx="140" cy="12" r="1"/><circle cx="240" cy="6" r="1.3"/><circle cx="320" cy="14" r="1"/><circle cx="380" cy="9" r="1.2"/>
  </g>
</svg>`;
}

/** The sprayed field: green crop rows, a stream down the left side, a patch of weeds, the grove beyond. */
function sprayerSvg(): string {
  const y = (p: number) => p * 5;
  const x = (p: number) => p * 4;
  const grove: string[] = [];
  for (let i = 0; i < 14; i++) grove.push(`<ellipse cx="${10 + i * 30}" cy="${y(12) - (i % 3) * 4}" rx="${24 + (i % 2) * 6}" ry="${26 + (i % 3) * 5}"/>`);
  const crop: string[] = [];
  for (const [top, h] of [[18, 22], [40, 22], [62, 20]] as const) {
    for (let r = 0; r < 4; r++) crop.push(`<path d="M${x(20)} ${y(top) + 10 + r * (y(h) / 4)} H400" />`);
  }
  const sprouts: string[] = [];
  for (let r = 0; r < 12; r++) for (let i = 0; i < 16; i++) sprouts.push(`<path d="M${x(21) + i * 20 + (r % 2) * 8} ${y(20) + r * 26} l-3 -7 M${x(21) + i * 20 + (r % 2) * 8} ${y(20) + r * 26} l3 -6"/>`);
  const weeds: string[] = [];
  for (let i = 0; i < 12; i++) weeds.push(tuft(x(62) + (i % 6) * 26, y(48) + Math.floor(i / 6) * 40, 2.2 + (i % 3) * 0.4));
  const tufts: string[] = [];
  for (let i = 0; i < 22; i++) tufts.push(tuft(8 + i * 18.5, y(100) - 2 - (i % 3) * 3, 1.5 + (i % 4) * 0.25));
  return `
<svg class="scene-bg sprayer" viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden="true">
  <defs>
    <linearGradient id="spraysky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a9b9c6"/><stop offset="1" stop-color="#e6dcbc"/>
    </linearGradient>${DEFS}
  </defs>
  <rect width="400" height="${y(18)}" fill="url(#spraysky)"/>
  <g fill="#35512c" filter="url(#cut)">${grove.join('')}</g>
  <rect x="${x(20)}" y="${y(18)}" width="${x(80)}" height="${y(64)}" fill="#7f9a4a"/>
  <g stroke="#5f7836" stroke-width="3">${crop.join('')}</g>
  <g stroke="#a6bf62" stroke-width="1.6" fill="none">${sprouts.join('')}</g>
  <path d="M${x(20)} ${y(40)} H400 M${x(20)} ${y(62)} H400" stroke="#4b5f2a" stroke-width="4"/>
  <rect x="${x(60)}" y="${y(40)}" width="${x(40)}" height="${y(22)}" fill="#5d6e34"/>
  <g fill="#3e5226" filter="url(#cut)">${weeds.join('')}</g>
  <path d="M0 ${y(18)} H${x(20)} V${y(82)} H0 Z" fill="#4f7a8c" filter="url(#cut)"/>
  <path d="M${x(4)} ${y(24)} q12 10 0 20 q-12 10 0 20 q12 10 0 20 q-12 10 0 20 q12 10 0 20 q-12 10 0 20 q12 10 0 20 q-12 10 0 20 q12 10 0 20 q-12 10 0 20 q12 10 0 20 q-12 10 0 20 q12 10 0 20 q-12 10 0 20" stroke="#8fb6c4" stroke-width="2" fill="none" opacity="0.7"/>
  <rect y="${y(82)}" width="400" height="${y(18)}" fill="#6e8048" filter="url(#cut)"/>
  <g fill="#566a36" filter="url(#cut)">${tufts.join('')}</g>
  <rect class="night-veil" width="400" height="500" fill="#0c1430" opacity="0.6"/>
  <g class="night-stars" fill="#fff6dc">
    <circle cx="40" cy="20" r="1.2"/><circle cx="140" cy="34" r="1"/><circle cx="240" cy="16" r="1.3"/><circle cx="320" cy="40" r="1"/><circle cx="380" cy="22" r="1.2"/>
  </g>
</svg>`;
}

/** Fältet under himlen: a hedge at the top, the open stubble field and the stone pile, three furrows, the grassy field edge. */
function fieldSvg(): string {
  const y = (p: number) => p * 5;
  const x = (p: number) => p * 4;
  const hedge: string[] = [];
  for (let i = 0; i < 16; i++) hedge.push(`<ellipse cx="${6 + i * 26}" cy="${y(17) - (i % 3) * 3}" rx="${22 + (i % 2) * 6}" ry="${20 + (i % 3) * 4}"/>`);
  const stubble: string[] = [];
  for (let r = 0; r < 5; r++) for (let i = 0; i < 14; i++) stubble.push(`<path d="M${6 + i * 17 + (r % 2) * 8} ${y(27) + r * 20} v-6"/>`);
  const rocks: string[] = [];
  for (let i = 0; i < 8; i++) {
    const rx = x(64) + (i % 4) * 36 + (i % 2) * 6;
    const ry = y(30) + Math.floor(i / 4) * 44;
    rocks.push(`<ellipse cx="${rx}" cy="${ry}" rx="${18 + (i % 2) * 5}" ry="${12 + (i % 3) * 2}" fill="#8a8a7e"/><ellipse cx="${rx - 3}" cy="${ry - 4}" rx="${9 + (i % 2) * 3}" ry="4" fill="#a8a89a"/>`);
  }
  const ridges: string[] = [];
  for (const fx of [x(16.5), x(50), x(83.5)]) for (let r = 0; r < 6; r++) ridges.push(`<path d="M${fx - 46} ${y(48) + r * 25} q46 -12 92 0" />`);
  const tufts: string[] = [];
  for (let i = 0; i < 22; i++) tufts.push(tuft(8 + i * 18.5, y(100) - 2 - (i % 3) * 3, 1.5 + (i % 4) * 0.25));
  return `
<svg class="scene-bg field" viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden="true">
  <defs>
    <linearGradient id="fieldsky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8fa6c0"/><stop offset="1" stop-color="#e3d2a6"/>
    </linearGradient>${DEFS}
  </defs>
  <rect width="400" height="${y(14)}" fill="url(#fieldsky)"/>
  <g fill="#3f5a30" filter="url(#cut)">${hedge.join('')}</g>
  <rect y="${y(24)}" width="${x(60)}" height="${y(22)}" fill="#c9ad6a"/>
  <g stroke="#9a7f42" stroke-width="2">${stubble.join('')}</g>
  <rect x="${x(60)}" y="${y(24)}" width="${x(40)}" height="${y(22)}" fill="#a39a74"/>
  <g filter="url(#cut)">${rocks.join('')}</g>
  <rect y="${y(46)}" width="400" height="${y(30)}" fill="#7a5c3a"/>
  <g stroke="#5a4028" stroke-width="5" fill="none">${ridges.join('')}</g>
  <path d="M${x(33)} ${y(46)} V${y(76)} M${x(67)} ${y(46)} V${y(76)}" stroke="#4a331f" stroke-width="3"/>
  <rect y="${y(76)}" width="400" height="${y(24)}" fill="#6e8048" filter="url(#cut)"/>
  <g fill="#566a36" filter="url(#cut)">${tufts.join('')}</g>
  <rect class="night-veil" width="400" height="500" fill="#0c1430" opacity="0.6"/>
  <g class="night-stars" fill="#fff6dc">
    <circle cx="40" cy="20" r="1.2"/><circle cx="120" cy="40" r="1"/><circle cx="220" cy="18" r="1.3"/><circle cx="300" cy="44" r="1"/><circle cx="370" cy="24" r="1.2"/>
  </g>
</svg>`;
}
