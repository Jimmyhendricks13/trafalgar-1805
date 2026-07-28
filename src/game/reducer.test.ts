import { describe, expect, it } from 'vitest'
import { shipCells } from './board'
import { NELSON_FLAGSHIP_ID } from './fleets'
import type { Action, GameState } from './reducer'
import { createInitialState, gameReducer } from './reducer'
import { isDefeated, survivingShips } from './resolve'
import { toIndex } from './types'

const run = (state: GameState, actions: readonly Action[]): GameState =>
  actions.reduce(gameReducer, state)

const inBattle = (seed = 42): GameState =>
  run(createInitialState(seed), [
    { type: 'BEGIN' },
    { type: 'ENTER_DEPLOYMENT' },
    { type: 'ADOPT_FORMATION' },
    { type: 'CONFIRM_DEPLOYMENT' },
  ])

/** Fires at every cell of the given fleet's ships, letting the AI reply in between. */
const sinkEverything = (start: GameState, target: 'enemy' | 'player'): GameState => {
  let state = start
  const cells = state[target].ships.flatMap(shipCells)
  for (const cell of cells) {
    if (state.phase !== 'battle') break
    state = run(state, [{ type: 'FIRE', index: cell }, { type: 'RESOLVE' }])
    while (state.phase === 'battle' && state.battleSub !== 'awaitingPlayerShot') {
      state = run(state, [{ type: 'AI_FIRE' }, { type: 'RESOLVE' }])
    }
  }
  return state
}

describe('phases', () => {
  it('walks title → preamble → deployment → battle', () => {
    let state = createInitialState(1)
    expect(state.phase).toBe('title')
    state = gameReducer(state, { type: 'BEGIN' })
    expect(state.phase).toBe('preamble')
    state = gameReducer(state, { type: 'ENTER_DEPLOYMENT' })
    expect(state.phase).toBe('deployment')
    expect(state.enemy.ships).toHaveLength(0)
    state = gameReducer(state, { type: 'CONFIRM_DEPLOYMENT' })
    expect(state.phase).toBe('battle')
    expect(state.enemy.ships).toHaveLength(5)
    expect(state.log).toHaveLength(1)
  })
})

describe('deployment', () => {
  it('adopts the historical formation and randomises legally', () => {
    let state = run(createInitialState(2), [{ type: 'ENTER_DEPLOYMENT' }, { type: 'ADOPT_FORMATION' }])
    const historical = state.player.ships.map((ship) => ship.origin)
    state = gameReducer(state, { type: 'RANDOMISE' })
    expect(new Set(state.player.ships.flatMap(shipCells)).size).toBe(17)
    state = gameReducer(state, { type: 'ADOPT_FORMATION' })
    expect(state.player.ships.map((ship) => ship.origin)).toEqual(historical)
  })

  it('refuses an illegal placement and keeps the fleet intact', () => {
    const state = run(createInitialState(3), [
      { type: 'ENTER_DEPLOYMENT' },
      { type: 'ADOPT_FORMATION' },
    ])
    const next = gameReducer(state, { type: 'PLACE_SHIP', id: 'trinidad', origin: toIndex(9, 9) })
    expect(next.player.ships).toEqual(state.player.ships)
  })

  it('rotates a ship when there is room', () => {
    const state = run(createInitialState(4), [
      { type: 'ENTER_DEPLOYMENT' },
      { type: 'ADOPT_FORMATION' },
      { type: 'ROTATE_SHIP', id: 'achille-fr' },
    ])
    expect(state.player.ships.find((ship) => ship.id === 'achille-fr')?.orientation).toBe(
      'horizontal',
    )
  })

  it('ignores deployment actions once the battle has begun', () => {
    const state = inBattle()
    expect(gameReducer(state, { type: 'RANDOMISE' }).player.ships).toEqual(state.player.ships)
  })
})

describe('firing', () => {
  it('locks out input until the shot has resolved', () => {
    const state = inBattle()
    const target = state.enemy.ships[0].origin
    const fired = gameReducer(state, { type: 'FIRE', index: target })
    expect(fired.battleSub).toBe('resolvingPlayerShot')

    const other = state.enemy.ships[1].origin
    const blocked = gameReducer(fired, { type: 'FIRE', index: other })
    expect(blocked).toBe(fired)
  })

  it('rejects a repeated shot and logs exactly one dispatch per shot', () => {
    let state = inBattle()
    const empty = state.enemy.incoming.findIndex((_, index) => !state.enemy.ships.some((ship) => shipCells(ship).includes(index)))
    state = run(state, [{ type: 'FIRE', index: empty }, { type: 'RESOLVE' }])
    const logLength = state.log.length
    state = run(state, [{ type: 'AI_FIRE' }, { type: 'RESOLVE' }])
    expect(state.battleSub).toBe('awaitingPlayerShot')
    const again = gameReducer(state, { type: 'FIRE', index: empty })
    expect(again.log).toHaveLength(logLength + 1)
    expect(again.battleSub).toBe('awaitingPlayerShot')
  })

  it('announces a sinking by name', () => {
    let state = inBattle()
    const mars = state.enemy.ships.find((ship) => ship.id === 'mars')
    if (!mars) throw new Error('missing ship')
    for (const cell of shipCells(mars)) {
      state = run(state, [{ type: 'FIRE', index: cell }, { type: 'RESOLVE' }])
      while (state.phase === 'battle' && state.battleSub !== 'awaitingPlayerShot') {
        state = run(state, [{ type: 'AI_FIRE' }, { type: 'RESOLVE' }])
      }
    }
    expect(state.log.some((entry) => entry.text.includes('HMS Mars'))).toBe(true)
    expect(survivingShips(state.enemy)).toHaveLength(4)
  })
})

describe('victory', () => {
  it('the player wins by sinking all five British ships', () => {
    const state = sinkEverything(inBattle(11), 'enemy')
    expect(isDefeated(state.enemy)).toBe(true)
    expect(state.winner).toBe('player')
    expect(gameReducer(state, { type: 'RESOLVE' }).phase).toBe('aftermath')
  })

  it('sinking Victory ends the game at once under the Death of Nelson variant', () => {
    let state = run(createInitialState(7), [
      { type: 'ENTER_DEPLOYMENT' },
      { type: 'TOGGLE_VARIANT' },
      { type: 'ADOPT_FORMATION' },
      { type: 'CONFIRM_DEPLOYMENT' },
    ])
    expect(state.deathOfNelson).toBe(true)

    const victory = state.enemy.ships.find((ship) => ship.id === NELSON_FLAGSHIP_ID)
    if (!victory) throw new Error('missing flagship')
    for (const cell of shipCells(victory)) {
      if (state.winner) break
      state = run(state, [{ type: 'FIRE', index: cell }, { type: 'RESOLVE' }])
      while (state.phase === 'battle' && !state.winner && state.battleSub !== 'awaitingPlayerShot') {
        state = run(state, [{ type: 'AI_FIRE' }, { type: 'RESOLVE' }])
      }
    }

    expect(state.winner).toBe('player')
    expect(survivingShips(state.enemy)).toHaveLength(4)
    expect(state.log[0].text).toContain('Nelson is down')
  })

  it('sinking Victory does not end the game under classic rules', () => {
    let state = inBattle(13)
    const victory = state.enemy.ships.find((ship) => ship.id === NELSON_FLAGSHIP_ID)
    if (!victory) throw new Error('missing flagship')
    for (const cell of shipCells(victory)) {
      state = run(state, [{ type: 'FIRE', index: cell }, { type: 'RESOLVE' }])
      while (state.phase === 'battle' && state.battleSub !== 'awaitingPlayerShot') {
        state = run(state, [{ type: 'AI_FIRE' }, { type: 'RESOLVE' }])
      }
    }
    expect(state.winner).toBeNull()
    expect(state.phase).toBe('battle')
  })

  it('resigning hands the day to the Royal Navy', () => {
    const state = gameReducer(inBattle(), { type: 'RESIGN' })
    expect(state.phase).toBe('aftermath')
    expect(state.winner).toBe('ai')
    expect(state.resigned).toBe(true)
  })

  it('a rematch keeps the settings and clears the boards', () => {
    const finished = gameReducer(inBattle(), { type: 'RESIGN' })
    const rematch = gameReducer(
      { ...finished, difficulty: 'captain', soundOn: true },
      { type: 'REMATCH' },
    )
    expect(rematch.phase).toBe('deployment')
    expect(rematch.difficulty).toBe('captain')
    expect(rematch.soundOn).toBe(true)
    expect(rematch.log).toHaveLength(0)
    expect(rematch.player.incoming.every((cell) => cell === 'unknown')).toBe(true)
  })
})

describe('the AI plays a whole game without cheating', () => {
  it('never fires twice at the same cell', () => {
    for (const difficulty of ['midshipman', 'captain', 'nelson'] as const) {
      let state = gameReducer(
        run(createInitialState(99), [
          { type: 'ENTER_DEPLOYMENT' },
          { type: 'SET_DIFFICULTY', difficulty },
        ]),
        { type: 'CONFIRM_DEPLOYMENT' },
      )
      const seen = new Set<number>()
      let guard = 0
      while (state.phase === 'battle' && guard < 500) {
        guard += 1
        if (state.battleSub === 'awaitingPlayerShot') {
          const target = state.enemy.incoming.findIndex((cell) => cell === 'unknown')
          state = run(state, [{ type: 'FIRE', index: target }, { type: 'RESOLVE' }])
        } else if (state.battleSub === 'aiThinking') {
          state = gameReducer(state, { type: 'AI_FIRE' })
          const shot = state.lastAiShot
          expect(shot).not.toBeNull()
          expect(seen.has(shot as number)).toBe(false)
          seen.add(shot as number)
        } else {
          state = gameReducer(state, { type: 'RESOLVE' })
        }
      }
      expect(state.winner).not.toBeNull()
    }
  })
})
