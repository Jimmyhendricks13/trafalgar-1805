import type { Rng } from '../rng'
import type { CellState } from '../types'
import { BOARD_SIZE, toIndex, toX, toY } from '../types'
import { captainShot } from './captain'
import type { AiMemory } from './view'
import { openHits } from './view'

/** How much more attractive a placement is when it would finish a wounded ship. */
const WOUND_WEIGHT = 8

export const densityMap = (
  cells: readonly CellState[],
  remainingLengths: readonly number[],
  memory: AiMemory,
): number[] => {
  const resolved = new Set(memory.resolvedHits)
  const wounded = new Set(openHits(cells, memory))
  const blocked = (cell: number): boolean => cells[cell] === 'miss' || resolved.has(cell)

  const density = new Array<number>(cells.length).fill(0)

  for (const length of remainingLengths) {
    for (let y = 0; y < BOARD_SIZE; y += 1) {
      for (let x = 0; x < BOARD_SIZE; x += 1) {
        for (const horizontal of [true, false]) {
          if (horizontal ? x + length > BOARD_SIZE : y + length > BOARD_SIZE) continue

          const placement: number[] = []
          let legal = true
          for (let i = 0; i < length; i += 1) {
            const cell = horizontal ? toIndex(x + i, y) : toIndex(x, y + i)
            if (blocked(cell)) {
              legal = false
              break
            }
            placement.push(cell)
          }
          if (!legal) continue

          const weight = placement.some((cell) => wounded.has(cell)) ? WOUND_WEIGHT : 1
          for (const cell of placement) {
            if (cells[cell] === 'unknown') density[cell] += weight
          }
        }
      }
    }
  }

  return density
}

/**
 * Probability-density targeting with a parity search. Every legal placement of every
 * surviving enemy ship votes for the cells it would occupy; the heaviest cell is fired
 * upon. No ship of length `m` can hide between cells spaced `m` apart, so while hunting
 * we only consider one cell in `m` — free information, half the shots.
 */
export const nelsonShot = (
  cells: readonly CellState[],
  remainingLengths: readonly number[],
  memory: AiMemory,
  rng: Rng,
): number | null => {
  if (remainingLengths.length === 0) return null
  const density = densityMap(cells, remainingLengths, memory)

  let candidates: number[] = []
  for (let cell = 0; cell < cells.length; cell += 1) {
    if (cells[cell] === 'unknown' && density[cell] > 0) candidates.push(cell)
  }
  if (candidates.length === 0) return captainShot(cells, memory, rng)

  if (openHits(cells, memory).length === 0) {
    const parity = Math.min(...remainingLengths)
    const onParity = candidates.filter((cell) => (toX(cell) + toY(cell)) % parity === 0)
    if (onParity.length > 0) candidates = onParity
  }

  const best = Math.max(...candidates.map((cell) => density[cell]))
  return rng.pick(candidates.filter((cell) => density[cell] === best))
}
