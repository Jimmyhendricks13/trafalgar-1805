export const BOARD_SIZE = 10
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE

export type Side = 'player' | 'ai'
export type Difficulty = 'midshipman' | 'captain' | 'nelson'
export type Orientation = 'horizontal' | 'vertical'

/** A cell as seen by the side firing into these waters. */
export type CellState = 'unknown' | 'miss' | 'hit'

export type ShotResult = 'miss' | 'hit' | 'sunk'

export interface ShipSpec {
  readonly id: string
  readonly name: string
  readonly guns: number
  readonly length: number
  readonly note: string
}

export interface Ship extends ShipSpec {
  readonly origin: number
  readonly orientation: Orientation
}

export interface FleetState {
  readonly side: Side
  readonly ships: readonly Ship[]
  /** Shots received by this fleet, indexed by cell. Public information to the enemy. */
  readonly incoming: readonly CellState[]
}

export const toIndex = (x: number, y: number): number => y * BOARD_SIZE + x
export const toX = (index: number): number => index % BOARD_SIZE
export const toY = (index: number): number => Math.floor(index / BOARD_SIZE)

export const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as const

export const cellName = (index: number): string => `${COLUMNS[toX(index)]}${toY(index) + 1}`

export const emptyIncoming = (): CellState[] => new Array<CellState>(CELL_COUNT).fill('unknown')
