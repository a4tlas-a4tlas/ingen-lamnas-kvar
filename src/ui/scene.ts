import type { ZoneId } from '../engine/types';

/** Vertical bands of the scene, in percent of its height (top → bottom). */
export const BANDS: Record<Exclude<ZoneId, 'culvert'>, [number, number]> = {
  farDike: [14, 28],
  lane2: [28, 44],
  median: [44, 52],
  lane1: [52, 68],
  dike: [68, 100],
};

/** The culvert runs under the road on the left edge. */
export const CULVERT_X: [number, number] = [0, 15];

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

/** The static night-road backdrop. viewBox 400×500 maps 1:1 to the bands above. */
export function sceneSvg(): string {
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
    </linearGradient>
    <filter id="cut" x="-5%" y="-5%" width="110%" height="120%">
      <feDropShadow dx="0" dy="2.5" stdDeviation="1.6" flood-color="#000" flood-opacity="0.55"/>
    </filter>
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
