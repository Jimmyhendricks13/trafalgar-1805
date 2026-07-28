import { describe, expect, it } from 'vitest'
import { canPlace, placeShip, randomLayout, shipCells, villeneuveLayout } from './board'
import { COMBINED_FLEET, ROYAL_NAVY } from './fleets'
import { createRng } from './rng'
import type { Ship } from './types'
import { toIndex } from './types'

const ship = (length: number, x: number, y: number, vertical = false): Ship => ({
  id: `test-${length}-${x}-${y}`,
  name: 'Test',
  guns: 74,
  length,
  note: '',
  origin: toIndex(x, y),
  orientation: vertical ? 'vertical' : 'horizontal',
})

describe('shipCells', () => {
  it('lays cells out along the axis', () => {
    expect(shipCells(ship(3, 2, 4))).toEqual([toIndex(2, 4), toIndex(3, 4), toIndex(4, 4)])
    expect(shipCells(ship(3, 2, 4, true))).toEqual([toIndex(2, 4), toIndex(2, 5), toIndex(2, 6)])
  })
})

describe('canPlace', () => {
  it('rejects ships that run off the board', () => {
    expect(canPlace([], ship(5, 6, 0))).toBe(false)
    expect(canPlace([], ship(5, 5, 0))).toBe(true)
    expect(canPlace([], ship(4, 9, 7, true))).toBe(false)
  })

  it('rejects overlaps but allows ships to touch', () => {
    const existing = [ship(3, 3, 3)]
    expect(canPlace(existing, ship(2, 4, 3))).toBe(false)
    expect(canPlace(existing, ship(2, 3, 4))).toBe(true)
    expect(canPlace(existing, ship(2, 6, 3))).toBe(true)
  })

  it('ignores the ship being moved when checking its own cells', () => {
    const moving = ship(3, 3, 3)
    expect(canPlace([moving], { ...moving, origin: toIndex(4, 3) })).toBe(true)
  })
})

describe('placeShip', () => {
  it('returns null for an illegal move and leaves the fleet alone', () => {
    const ships = villeneuveLayout(COMBINED_FLEET)
    expect(placeShip(ships, 'trinidad', toIndex(9, 9), 'horizontal')).toBeNull()
    expect(placeShip(ships, 'no-such-ship', toIndex(0, 0), 'horizontal')).toBeNull()
  })

  it('moves a ship when the move is legal', () => {
    const ships = villeneuveLayout(COMBINED_FLEET)
    const moved = placeShip(ships, 'achille-fr', toIndex(0, 9), 'horizontal')
    expect(moved).not.toBeNull()
    expect(moved?.find((s) => s.id === 'achille-fr')?.origin).toBe(toIndex(0, 9))
  })
})

describe('layouts', () => {
  it("Villeneuve's formation is legal and occupies 17 cells", () => {
    const ships = villeneuveLayout(COMBINED_FLEET)
    const cells = new Set(ships.flatMap(shipCells))
    expect(cells.size).toBe(17)
    for (const s of ships) expect(canPlace(ships, s)).toBe(true)
  })

  it('random layouts are always legal', () => {
    for (let seed = 0; seed < 300; seed += 1) {
      const rng = createRng(seed)
      for (const specs of [COMBINED_FLEET, ROYAL_NAVY]) {
        const ships = randomLayout(specs, rng)
        const cells = ships.flatMap(shipCells)
        expect(new Set(cells).size).toBe(17)
        expect(cells.every((cell) => cell >= 0 && cell < 100)).toBe(true)
        for (const s of ships) expect(canPlace(ships, s)).toBe(true)
      }
    }
  })

  it('honours the edge-crowding limit used at Nelson level', () => {
    const rng = createRng(7)
    const ships = randomLayout(ROYAL_NAVY, rng, { maxEdgeShips: 2 })
    expect(ships).toHaveLength(5)
  })
})
