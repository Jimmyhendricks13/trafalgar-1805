import type { Rng } from '../rng'
import type { CellState, Orientation } from '../types'
import { toX, toY } from '../types'
import type { AiMemory } from './view'
import { hitRun, neighbours, openHits, unfiredCells } from './view'

const clusterOf = (seed: number, pool: Set<number>): number[] => {
  const cluster: number[] = []
  const stack = [seed]
  while (stack.length > 0) {
    const current = stack.pop()
    if (current === undefined || !pool.has(current)) continue
    pool.delete(current)
    cluster.push(current)
    for (const next of neighbours(current)) if (pool.has(next)) stack.push(next)
  }
  return cluster
}

const extensions = (
  cells: readonly CellState[],
  cluster: readonly number[],
): number[] => {
  if (cluster.length === 1) {
    return neighbours(cluster[0]).filter((cell) => cells[cell] === 'unknown')
  }

  const horizontal = cluster.every((cell) => toY(cell) === toY(cluster[0]))
  const orientation: Orientation = horizontal ? 'horizontal' : 'vertical'
  const collinear = horizontal || cluster.every((cell) => toX(cell) === toX(cluster[0]))

  if (!collinear) {
    // Two ships lying alongside each other. Probe outwards from every hit.
    return [...new Set(cluster.flatMap(neighbours))].filter((cell) => cells[cell] === 'unknown')
  }

  const run = hitRun(cells, cluster[0], orientation)
  const step = horizontal ? 1 : 10
  const head = run[0] - step
  const tail = run[run.length - 1] + step
  const inLine = (cell: number, from: number): boolean =>
    horizontal ? toY(cell) === toY(from) : toX(cell) === toX(from)

  const candidates: number[] = []
  if (head >= 0 && inLine(head, run[0]) && cells[head] === 'unknown') candidates.push(head)
  if (tail < cells.length && inLine(tail, run[run.length - 1]) && cells[tail] === 'unknown') {
    candidates.push(tail)
  }
  return candidates
}

/**
 * The way most people play by hand: fire blind until something is hit, then work the
 * wound. Falls out of the same helpers Nelson uses, and is also Nelson's safety net.
 */
export const captainShot = (
  cells: readonly CellState[],
  memory: AiMemory,
  rng: Rng,
): number | null => {
  const wounded = openHits(cells, memory)
  const pool = new Set(wounded)
  const clusters: number[][] = []
  for (const hit of wounded) {
    if (pool.has(hit)) clusters.push(clusterOf(hit, pool))
  }
  clusters.sort((a, b) => b.length - a.length)

  for (const cluster of clusters) {
    const candidates = extensions(cells, cluster)
    if (candidates.length > 0) return rng.pick(candidates)
  }

  const unfired = unfiredCells(cells)
  return unfired.length > 0 ? rng.pick(unfired) : null
}
