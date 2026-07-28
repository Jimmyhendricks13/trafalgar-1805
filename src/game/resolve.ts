import { shipCells } from './board'
import type { CellState, FleetState, Ship, ShotResult } from './types'

export const shipAt = (fleet: FleetState, index: number): Ship | undefined =>
  fleet.ships.find((ship) => shipCells(ship).includes(index))

export const isSunk = (fleet: FleetState, ship: Ship): boolean =>
  shipCells(ship).every((cell) => fleet.incoming[cell] === 'hit')

export const sunkShips = (fleet: FleetState): Ship[] =>
  fleet.ships.filter((ship) => isSunk(fleet, ship))

export const survivingShips = (fleet: FleetState): Ship[] =>
  fleet.ships.filter((ship) => !isSunk(fleet, ship))

export const isDefeated = (fleet: FleetState): boolean =>
  fleet.ships.every((ship) => isSunk(fleet, ship))

export interface ShotOutcome {
  readonly fleet: FleetState
  readonly result: ShotResult
  readonly ship?: Ship
}

/** Returns null when the cell has already been fired at: a shot is never wasted twice. */
export const fireAt = (fleet: FleetState, index: number): ShotOutcome | null => {
  if (index < 0 || index >= fleet.incoming.length) return null
  if (fleet.incoming[index] !== 'unknown') return null

  const ship = shipAt(fleet, index)
  const incoming: CellState[] = [...fleet.incoming]
  incoming[index] = ship ? 'hit' : 'miss'
  const next: FleetState = { ...fleet, incoming }

  if (!ship) return { fleet: next, result: 'miss' }
  return { fleet: next, result: isSunk(next, ship) ? 'sunk' : 'hit', ship }
}
