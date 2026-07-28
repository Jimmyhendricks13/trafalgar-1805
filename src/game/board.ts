import type { Rng } from './rng'
import type { Orientation, Ship, ShipSpec } from './types'
import { BOARD_SIZE, toIndex, toX, toY } from './types'

export const shipCells = (ship: Pick<Ship, 'origin' | 'orientation' | 'length'>): number[] => {
  const x = toX(ship.origin)
  const y = toY(ship.origin)
  const cells: number[] = []
  for (let i = 0; i < ship.length; i += 1) {
    cells.push(
      ship.orientation === 'horizontal' ? toIndex(x + i, y) : toIndex(x, y + i),
    )
  }
  return cells
}

export const fitsOnBoard = (
  origin: number,
  orientation: Orientation,
  length: number,
): boolean => {
  const x = toX(origin)
  const y = toY(origin)
  return orientation === 'horizontal' ? x + length <= BOARD_SIZE : y + length <= BOARD_SIZE
}

/** Ships must lie wholly on the board and may not overlap. Touching is legal. */
export const canPlace = (
  ships: readonly Ship[],
  candidate: Pick<Ship, 'id' | 'origin' | 'orientation' | 'length'>,
): boolean => {
  if (!fitsOnBoard(candidate.origin, candidate.orientation, candidate.length)) return false
  const taken = new Set<number>()
  for (const ship of ships) {
    if (ship.id === candidate.id) continue
    for (const cell of shipCells(ship)) taken.add(cell)
  }
  return shipCells(candidate).every((cell) => !taken.has(cell))
}

export const placeShip = (
  ships: readonly Ship[],
  id: string,
  origin: number,
  orientation: Orientation,
): Ship[] | null => {
  const target = ships.find((ship) => ship.id === id)
  if (!target) return null
  const candidate: Ship = { ...target, origin, orientation }
  if (!canPlace(ships, candidate)) return null
  return ships.map((ship) => (ship.id === id ? candidate : ship))
}

const edgeHugging = (ship: Ship): boolean => {
  const cells = shipCells(ship)
  return cells.every((cell) => {
    const x = toX(cell)
    const y = toY(cell)
    return x === 0 || y === 0 || x === BOARD_SIZE - 1 || y === BOARD_SIZE - 1
  })
}

export interface LayoutOptions {
  /** Nelson would not crowd the edges: edge-heavy lines fall quickly to density search. */
  readonly maxEdgeShips?: number
}

export const randomLayout = (
  specs: readonly ShipSpec[],
  rng: Rng,
  options: LayoutOptions = {},
): Ship[] => {
  const maxEdgeShips = options.maxEdgeShips ?? specs.length
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const ships: Ship[] = []
    let edgeShips = 0
    let failed = false
    for (const spec of specs) {
      let placed: Ship | null = null
      for (let tries = 0; tries < 400 && !placed; tries += 1) {
        const orientation: Orientation = rng.next() < 0.5 ? 'horizontal' : 'vertical'
        const span = BOARD_SIZE - spec.length + 1
        const x = orientation === 'horizontal' ? rng.int(span) : rng.int(BOARD_SIZE)
        const y = orientation === 'horizontal' ? rng.int(BOARD_SIZE) : rng.int(span)
        const candidate: Ship = { ...spec, origin: toIndex(x, y), orientation }
        if (!canPlace(ships, candidate)) continue
        if (edgeHugging(candidate) && edgeShips >= maxEdgeShips) continue
        placed = candidate
      }
      if (!placed) {
        failed = true
        break
      }
      if (edgeHugging(placed)) edgeShips += 1
      ships.push(placed)
    }
    if (!failed) return ships
  }
  // Deterministic fallback, only reachable if the RNG is pathologically unlucky.
  return specs.map((spec, row) => ({ ...spec, origin: toIndex(0, row), orientation: 'horizontal' }))
}

/**
 * The real Combined Fleet formed a ragged crescent rather than a clean line of battle.
 * Deterministic, and therefore a known quantity to an opponent who has read the same books.
 */
const VILLENEUVE_PLACEMENTS: Record<string, { origin: number; orientation: Orientation }> = {
  trinidad: { origin: toIndex(4, 2), orientation: 'vertical' },
  bucentaure: { origin: toIndex(5, 1), orientation: 'vertical' },
  'santa-ana': { origin: toIndex(3, 6), orientation: 'vertical' },
  redoutable: { origin: toIndex(6, 5), orientation: 'vertical' },
  'achille-fr': { origin: toIndex(7, 1), orientation: 'vertical' },
}

export const villeneuveLayout = (specs: readonly ShipSpec[]): Ship[] =>
  specs.map((spec) => {
    const placement = VILLENEUVE_PLACEMENTS[spec.id]
    if (!placement) throw new Error(`No historical station for ${spec.id}`)
    return { ...spec, ...placement }
  })
