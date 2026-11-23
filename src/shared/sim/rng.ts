// Seeded deterministic randomness: a replayed leap always gives the same result.

export const hashStr = (s: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

export class Rng {
  private s: number;
  constructor(seed: string | number) {
    this.s = typeof seed === 'number' ? seed >>> 0 : hashStr(seed);
    if (this.s === 0) this.s = 0x9e3779b9;
  }
  next(): number {
    // mulberry32
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  pick<T>(arr: readonly T[]): T {
    const v = arr[Math.floor(this.next() * arr.length)];
    if (v === undefined) throw new Error('pick from empty array');
    return v;
  }
  weighted<T>(items: readonly (readonly [T, number])[]): T {
    const total = items.reduce((a, [, w]) => a + w, 0);
    let r = this.next() * total;
    for (const [v, w] of items) {
      r -= w;
      if (r < 0) return v;
    }
    const last = items[items.length - 1];
    if (!last) throw new Error('weighted from empty list');
    return last[0];
  }
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const a = arr[i];
      const b = arr[j];
      if (a !== undefined && b !== undefined) {
        arr[i] = b;
        arr[j] = a;
      }
    }
    return arr;
  }
}
