export interface Rng {
  /** Float in [0, 1). */
  next(): number
  /** Integer in [0, max). */
  int(max: number): number
  pick<T>(items: readonly T[]): T
}

/** mulberry32 — small, fast, good enough, and seedable so games are reproducible. */
export const createRng = (seed: number): Rng => {
  let state = seed >>> 0
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (max: number): number => Math.floor(next() * max)
  return {
    next,
    int,
    pick: <T>(items: readonly T[]): T => items[int(items.length)],
  }
}

export const randomSeed = (): number => Math.floor(Math.random() * 0xffffffff) >>> 0
