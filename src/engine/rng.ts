// Seeded mulberry32. The generator state lives inside GameState so a run
// is fully reproducible from its seed and its list of actions.
export interface RngHolder {
  rng: number;
}

export function random(h: RngHolder): number {
  let t = (h.rng = (h.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(h: RngHolder, n: number): number {
  return Math.floor(random(h) * n);
}

export function pick<T>(h: RngHolder, items: readonly T[]): T {
  return items[randInt(h, items.length)];
}

export function shuffle<T>(h: RngHolder, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randInt(h, i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
