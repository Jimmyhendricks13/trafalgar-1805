import type { CellState, Orientation } from '../types'
import { BOARD_SIZE, toIndex, toX, toY } from '../types'

export interface AiMemory {
  /**
   * Hits the AI believes belong to ships already sunk. Inferred from its own shot
   * sequence and the announced ship's length — both public information.
   */
  readonly resolvedHits: readonly number[]
}

export const emptyMemory = (): AiMemory => ({ resolvedHits: [] })

export const unfiredCells = (cells: readonly CellState[]): number[] => {
  const result: number[] = []
  for (let i = 0; i < cells.length; i += 1) if (cells[i] === 'unknown') result.push(i)
  return result
}

/** Hits not yet accounted for by a sunk ship: somewhere out there is a wounded ship. */
export const openHits = (cells: readonly CellState[], memory: AiMemory): number[] => {
  const resolved = new Set(memory.resolvedHits)
  const result: number[] = []
  for (let i = 0; i < cells.length; i += 1) {
    if (cells[i] === 'hit' && !resolved.has(i)) result.push(i)
  }
  return result
}

export const neighbours = (index: number): number[] => {
  const x = toX(index)
  const y = toY(index)
  const result: number[] = []
  if (x > 0) result.push(toIndex(x - 1, y))
  if (x < BOARD_SIZE - 1) result.push(toIndex(x + 1, y))
  if (y > 0) result.push(toIndex(x, y - 1))
  if (y < BOARD_SIZE - 1) result.push(toIndex(x, y + 1))
  return result
}

/** The maximal unbroken line of hits through `index` in one axis, sorted along that axis. */
export const hitRun = (
  cells: readonly CellState[],
  index: number,
  orientation: Orientation,
): number[] => {
  const step = orientation === 'horizontal' ? 1 : BOARD_SIZE
  const sameLine = (candidate: number): boolean =>
    orientation === 'horizontal'
      ? toY(candidate) === toY(index)
      : toX(candidate) === toX(index)

  const run = [index]
  for (let cell = index - step; cell >= 0 && sameLine(cell) && cells[cell] === 'hit'; cell -= step) {
    run.unshift(cell)
  }
  for (
    let cell = index + step;
    cell < cells.length && sameLine(cell) && cells[cell] === 'hit';
    cell += step
  ) {
    run.push(cell)
  }
  return run
}

const trimRun = (run: readonly number[], anchor: number, length: number): number[] => {
  const anchorAt = run.indexOf(anchor)
  const start = Math.min(Math.max(0, anchorAt - length + 1), run.length - length)
  return run.slice(start, start + length)
}

/**
 * A ship of `sunkLength` has just gone down under a shot at `lastShot`. Work out which
 * hits she accounted for so they stop attracting fire.
 */
export const noteSink = (
  memory: AiMemory,
  cells: readonly CellState[],
  lastShot: number,
  sunkLength: number,
): AiMemory => {
  const runs = [hitRun(cells, lastShot, 'horizontal'), hitRun(cells, lastShot, 'vertical')]
  const exact = runs.find((run) => run.length === sunkLength)
  const longer = runs
    .filter((run) => run.length > sunkLength)
    .sort((a, b) => a.length - b.length)[0]
  const fallback = [...runs].sort((a, b) => b.length - a.length)[0]
  const footprint = exact ?? (longer ? trimRun(longer, lastShot, sunkLength) : fallback)

  return { resolvedHits: [...new Set([...memory.resolvedHits, ...footprint])] }
}
