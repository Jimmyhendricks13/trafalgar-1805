import { describe, expect, it } from 'vitest'
import { villeneuveLayout } from './board'
import { COMBINED_FLEET } from './fleets'
import { fireAt, isDefeated, isSunk, shipAt, survivingShips } from './resolve'
import type { FleetState } from './types'
import { emptyIncoming, toIndex } from './types'

const fleet = (): FleetState => ({
  side: 'player',
  ships: villeneuveLayout(COMBINED_FLEET),
  incoming: emptyIncoming(),
})

const sink = (state: FleetState, shipId: string): FleetState => {
  const ship = state.ships.find((s) => s.id === shipId)
  if (!ship) throw new Error(shipId)
  let current = state
  for (let i = 0; i < ship.length; i += 1) {
    const cell =
      ship.orientation === 'horizontal' ? ship.origin + i : ship.origin + i * 10
    const outcome = fireAt(current, cell)
    if (!outcome) throw new Error(`already fired at ${cell}`)
    current = outcome.fleet
  }
  return current
}

describe('fireAt', () => {
  it('reports a miss on open water', () => {
    const outcome = fireAt(fleet(), toIndex(0, 0))
    expect(outcome?.result).toBe('miss')
    expect(outcome?.ship).toBeUndefined()
  })

  it('reports a hit that does not finish the ship', () => {
    const state = fleet()
    const trinidad = state.ships.find((s) => s.id === 'trinidad')
    const outcome = fireAt(state, trinidad?.origin ?? -1)
    expect(outcome?.result).toBe('hit')
    expect(outcome?.ship?.id).toBe('trinidad')
  })

  it('reports sunk only on the final cell', () => {
    let state = fleet()
    const achille = state.ships.find((s) => s.id === 'achille-fr')
    if (!achille) throw new Error('missing ship')
    const first = fireAt(state, achille.origin)
    expect(first?.result).toBe('hit')
    state = first?.fleet ?? state
    const second = fireAt(state, achille.origin + 10)
    expect(second?.result).toBe('sunk')
    expect(second?.ship?.name).toBe('Achille')
  })

  it('refuses a repeated shot', () => {
    const state = fleet()
    const first = fireAt(state, toIndex(0, 0))
    expect(first).not.toBeNull()
    expect(fireAt(first?.fleet ?? state, toIndex(0, 0))).toBeNull()
  })

  it('refuses shots off the board', () => {
    expect(fireAt(fleet(), -1)).toBeNull()
    expect(fireAt(fleet(), 100)).toBeNull()
  })
})

describe('fleet status', () => {
  it('tracks survivors and defeat', () => {
    let state = fleet()
    expect(survivingShips(state)).toHaveLength(5)
    expect(isDefeated(state)).toBe(false)

    for (const spec of COMBINED_FLEET) state = sink(state, spec.id)

    expect(survivingShips(state)).toHaveLength(0)
    expect(isDefeated(state)).toBe(true)
    for (const ship of state.ships) expect(isSunk(state, ship)).toBe(true)
  })

  it('finds the ship occupying a cell', () => {
    const state = fleet()
    const bucentaure = state.ships.find((s) => s.id === 'bucentaure')
    expect(shipAt(state, bucentaure?.origin ?? -1)?.id).toBe('bucentaure')
    expect(shipAt(state, toIndex(0, 0))).toBeUndefined()
  })
})
