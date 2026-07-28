import type { Dispatch } from '../content/dispatches'
import {
  NELSON_FALLS,
  OPENING_DISPATCH,
  hitLine,
  missLine,
  sinkLine,
} from '../content/dispatches'
import type { AiMemory } from './ai'
import { chooseShot, emptyMemory, noteSink } from './ai'
import { placeShip, randomLayout, shipCells, villeneuveLayout } from './board'
import { COMBINED_FLEET, NELSON_FLAGSHIP_ID, ROYAL_NAVY } from './fleets'
import { fireAt, isDefeated, isSunk, survivingShips } from './resolve'
import { createRng, randomSeed } from './rng'
import type { Difficulty, FleetState, Orientation, Ship, Side } from './types'
import { emptyIncoming } from './types'

export type Phase = 'title' | 'preamble' | 'deployment' | 'battle' | 'aftermath'

export type BattleSub =
  | 'awaitingPlayerShot'
  | 'resolvingPlayerShot'
  | 'aiThinking'
  | 'resolvingAiShot'

export interface GameState {
  readonly phase: Phase
  readonly difficulty: Difficulty
  readonly deathOfNelson: boolean
  readonly soundOn: boolean
  readonly player: FleetState
  readonly enemy: FleetState
  readonly selectedShipId: string | null
  readonly orientation: Orientation
  readonly turn: Side
  readonly battleSub: BattleSub
  readonly log: readonly Dispatch[]
  readonly nextDispatchId: number
  readonly aiMemory: AiMemory
  readonly lastPlayerShot: number | null
  readonly lastAiShot: number | null
  readonly winner: Side | null
  readonly resigned: boolean
  readonly rngState: number
}

export type Action =
  | { readonly type: 'BEGIN' }
  | { readonly type: 'ENTER_DEPLOYMENT' }
  | { readonly type: 'SET_DIFFICULTY'; readonly difficulty: Difficulty }
  | { readonly type: 'TOGGLE_VARIANT' }
  | { readonly type: 'TOGGLE_SOUND' }
  | { readonly type: 'SELECT_SHIP'; readonly id: string | null }
  | { readonly type: 'SET_ORIENTATION'; readonly orientation: Orientation }
  | { readonly type: 'PLACE_SHIP'; readonly id: string; readonly origin: number }
  | { readonly type: 'ROTATE_SHIP'; readonly id: string }
  | { readonly type: 'RANDOMISE' }
  | { readonly type: 'ADOPT_FORMATION' }
  | { readonly type: 'CONFIRM_DEPLOYMENT' }
  | { readonly type: 'FIRE'; readonly index: number }
  | { readonly type: 'RESOLVE' }
  | { readonly type: 'AI_FIRE' }
  | { readonly type: 'RESIGN' }
  | { readonly type: 'REMATCH' }
  | { readonly type: 'NEW_GAME' }

const LOG_LIMIT = 200

/** Draws the next RNG state first so the reducer stays a pure function of `rngState`. */
const drawRng = (rngState: number) => {
  const rng = createRng(rngState)
  const nextState = Math.floor(rng.next() * 0xffffffff) >>> 0
  return { rng, nextState }
}

const emptyFleet = (side: Side, ships: readonly Ship[]): FleetState => ({
  side,
  ships,
  incoming: emptyIncoming(),
})

export const createInitialState = (seed: number = randomSeed()): GameState => {
  const { rng, nextState } = drawRng(seed)
  return {
    phase: 'title',
    difficulty: 'nelson',
    deathOfNelson: false,
    soundOn: false,
    player: emptyFleet('player', randomLayout(COMBINED_FLEET, rng)),
    enemy: emptyFleet('ai', []),
    selectedShipId: COMBINED_FLEET[0].id,
    orientation: 'vertical',
    turn: 'player',
    battleSub: 'awaitingPlayerShot',
    log: [],
    nextDispatchId: 1,
    aiMemory: emptyMemory(),
    lastPlayerShot: null,
    lastAiShot: null,
    winner: null,
    resigned: false,
    rngState: nextState,
  }
}

const appendLog = (
  state: GameState,
  entry: Omit<Dispatch, 'id'>,
): Pick<GameState, 'log' | 'nextDispatchId'> => ({
  log: [{ ...entry, id: state.nextDispatchId }, ...state.log].slice(0, LOG_LIMIT),
  nextDispatchId: state.nextDispatchId + 1,
})

const lastTextFor = (state: GameState, side: Side): string | undefined =>
  state.log.find((entry) => entry.side === side)?.text

const victoryFor = (state: GameState, defender: FleetState, side: Side): Side | null => {
  if (isDefeated(defender)) return side
  if (state.deathOfNelson && side === 'player') {
    const flagship = defender.ships.find((ship) => ship.id === NELSON_FLAGSHIP_ID)
    if (flagship && isSunk(defender, flagship)) return 'player'
  }
  return null
}

const fireShot = (state: GameState, attacker: Side, index: number): GameState => {
  const outcome = fireAt(attacker === 'player' ? state.enemy : state.player, index)
  if (!outcome) return state

  const { rng, nextState } = drawRng(state.rngState)
  const defender = outcome.fleet
  const remaining = survivingShips(defender).length
  const sunkShip = outcome.result === 'sunk' ? outcome.ship : undefined

  let tone: Dispatch['tone'] = 'plain'
  let text: string
  if (sunkShip) {
    const nelsonDown = attacker === 'player' && sunkShip.id === NELSON_FLAGSHIP_ID
    tone = nelsonDown ? 'grave' : 'sunk'
    text = nelsonDown ? NELSON_FALLS : sinkLine(attacker, sunkShip.name, remaining)
  } else if (outcome.result === 'hit') {
    tone = 'hit'
    text = hitLine(attacker, rng, lastTextFor(state, attacker))
  } else {
    text = missLine(attacker, rng, lastTextFor(state, attacker))
  }

  const withShot: GameState = {
    ...state,
    player: attacker === 'ai' ? defender : state.player,
    enemy: attacker === 'player' ? defender : state.enemy,
    rngState: nextState,
    lastPlayerShot: attacker === 'player' ? index : state.lastPlayerShot,
    lastAiShot: attacker === 'ai' ? index : state.lastAiShot,
    battleSub: attacker === 'player' ? 'resolvingPlayerShot' : 'resolvingAiShot',
    aiMemory:
      attacker === 'ai' && sunkShip
        ? noteSink(state.aiMemory, defender.incoming, index, sunkShip.length)
        : state.aiMemory,
    ...appendLog(state, { side: attacker, tone, text }),
  }

  return { ...withShot, winner: victoryFor(withShot, defender, attacker) }
}

const aiFire = (state: GameState): GameState => {
  const { rng, nextState } = drawRng(state.rngState)
  const index = chooseShot(
    {
      cells: state.player.incoming,
      remainingLengths: survivingShips(state.player).map((ship) => ship.length),
      memory: state.aiMemory,
      difficulty: state.difficulty,
    },
    rng,
  )
  if (index === null) return { ...state, rngState: nextState, battleSub: 'awaitingPlayerShot' }
  return fireShot({ ...state, rngState: nextState }, 'ai', index)
}

const startBattle = (state: GameState): GameState => {
  const { rng, nextState } = drawRng(state.rngState)
  const enemyShips = randomLayout(ROYAL_NAVY, rng, {
    maxEdgeShips: state.difficulty === 'nelson' ? 2 : ROYAL_NAVY.length,
  })
  const base: GameState = {
    ...state,
    phase: 'battle',
    enemy: emptyFleet('ai', enemyShips),
    turn: 'player',
    battleSub: 'awaitingPlayerShot',
    aiMemory: emptyMemory(),
    rngState: nextState,
  }
  return { ...base, ...appendLog(base, { side: 'system', tone: 'plain', text: OPENING_DISPATCH }) }
}

const allDeployed = (state: GameState): boolean => {
  const cells = new Set<number>()
  for (const ship of state.player.ships) for (const cell of shipCells(ship)) cells.add(cell)
  return cells.size === state.player.ships.reduce((sum, ship) => sum + ship.length, 0)
}

export const gameReducer = (state: GameState, action: Action): GameState => {
  switch (action.type) {
    case 'BEGIN':
      return { ...state, phase: 'preamble' }

    case 'ENTER_DEPLOYMENT':
      return { ...state, phase: 'deployment' }

    case 'SET_DIFFICULTY':
      return { ...state, difficulty: action.difficulty }

    case 'TOGGLE_VARIANT':
      return { ...state, deathOfNelson: !state.deathOfNelson }

    case 'TOGGLE_SOUND':
      return { ...state, soundOn: !state.soundOn }

    case 'SELECT_SHIP':
      return { ...state, selectedShipId: action.id }

    case 'SET_ORIENTATION':
      return { ...state, orientation: action.orientation }

    case 'PLACE_SHIP': {
      if (state.phase !== 'deployment') return state
      const ships = placeShip(state.player.ships, action.id, action.origin, state.orientation)
      if (!ships) return state
      return { ...state, player: { ...state.player, ships } }
    }

    case 'ROTATE_SHIP': {
      if (state.phase !== 'deployment') return state
      const target = state.player.ships.find((ship) => ship.id === action.id)
      if (!target) return state
      const flipped: Orientation = target.orientation === 'horizontal' ? 'vertical' : 'horizontal'
      const ships = placeShip(state.player.ships, action.id, target.origin, flipped)
      if (!ships) return state
      return { ...state, player: { ...state.player, ships }, orientation: flipped }
    }

    case 'RANDOMISE': {
      if (state.phase !== 'deployment') return state
      const { rng, nextState } = drawRng(state.rngState)
      return {
        ...state,
        player: { ...state.player, ships: randomLayout(COMBINED_FLEET, rng) },
        rngState: nextState,
      }
    }

    case 'ADOPT_FORMATION':
      if (state.phase !== 'deployment') return state
      return { ...state, player: { ...state.player, ships: villeneuveLayout(COMBINED_FLEET) } }

    case 'CONFIRM_DEPLOYMENT':
      if (state.phase !== 'deployment' || !allDeployed(state)) return state
      return startBattle(state)

    case 'FIRE': {
      if (state.phase !== 'battle' || state.battleSub !== 'awaitingPlayerShot') return state
      if (state.winner) return state
      return fireShot(state, 'player', action.index)
    }

    case 'RESOLVE': {
      if (state.phase !== 'battle') return state
      if (state.winner) return { ...state, phase: 'aftermath' }
      if (state.battleSub === 'resolvingPlayerShot') {
        return { ...state, battleSub: 'aiThinking', turn: 'ai' }
      }
      if (state.battleSub === 'resolvingAiShot') {
        return { ...state, battleSub: 'awaitingPlayerShot', turn: 'player' }
      }
      return state
    }

    case 'AI_FIRE': {
      if (state.phase !== 'battle' || state.battleSub !== 'aiThinking' || state.winner) return state
      return aiFire(state)
    }

    case 'RESIGN':
      if (state.phase !== 'battle') return state
      return { ...state, phase: 'aftermath', winner: 'ai', resigned: true }

    case 'REMATCH': {
      const fresh = createInitialState(state.rngState)
      return {
        ...fresh,
        phase: 'deployment',
        difficulty: state.difficulty,
        deathOfNelson: state.deathOfNelson,
        soundOn: state.soundOn,
      }
    }

    case 'NEW_GAME':
      return { ...createInitialState(state.rngState), soundOn: state.soundOn }

    default:
      return state
  }
}
