import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Aftermath } from './components/Aftermath'
import { Battle } from './components/Battle'
import { Deployment } from './components/Deployment'
import { Preamble } from './components/Preamble'
import { Title } from './components/Title'
import type { DispatchTone } from './content/dispatches'
import { shipCells } from './game/board'
import { createInitialState, gameReducer } from './game/reducer'
import { isSunk } from './game/resolve'
import { BOARD_SIZE, toX, toY } from './game/types'
import { playCombat, preloadCombatSounds } from './sound'

/** Each shot holds the turn for as long as its animation runs. */
const MISS_MS = 400
const HIT_MS = 300
const SUNK_MS = 650
const SHAKE_MS = 150
const NELSON_THINKING_MS = 550
/** The silence before the first broadside. Both fleets in sight, no guns yet. */
const STAND_TO_MS = 1500
/** Round shot in the air. Ours carry further than theirs because they are ours. */
const OUR_FLIGHT_MS = 400
const THEIR_FLIGHT_MS = 320
/** The kill cam: in, held on the wreck, and out. */
const ZOOM_MS = 400
const HOLD_MS = 750
const WINNING_HOLD_MS = 1200

const beatFor = (tone: DispatchTone): number => {
  if (tone === 'sunk' || tone === 'grave') return SUNK_MS
  if (tone === 'hit') return HIT_MS
  return MISS_MS
}

const prefersStillness = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

interface Flight {
  readonly side: 'player' | 'ai'
  readonly target: number
}

export const App = () => {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => createInitialState())
  /** Highest dispatch id the log is allowed to show: a shot's line lands when its animation ends. */
  const [revealed, setRevealed] = useState(0)
  const [shake, setShake] = useState<'target' | 'own' | null>(null)
  const [armed, setArmed] = useState(false)
  /** The shot still in the air, whose fall is not yet known. */
  const [flight, setFlight] = useState<Flight | null>(null)
  /** The point the British board leans in on after a kill, in percentages. */
  const [killCam, setKillCam] = useState<{ x: number; y: number } | null>(null)
  const [closing, setClosing] = useState(false)
  const still = useRef(prefersStillness())
  /** The dispatch whose kill we have already dwelt on, so we do it once. */
  const dweltOn = useRef<number | null>(null)

  const resolving =
    state.battleSub === 'resolvingPlayerShot' || state.battleSub === 'resolvingAiShot'
  const pending = resolving ? state.log[0] : undefined

  useEffect(() => {
    if (state.phase === 'battle') preloadCombatSounds()
  }, [state.phase])

  // The guns speak as the shot leaves them, and the ball is in the air until it lands.
  useEffect(() => {
    if (state.phase !== 'battle') return
    const ours = state.battleSub === 'resolvingPlayerShot' ? state.lastPlayerShot : null
    const theirs = state.battleSub === 'resolvingAiShot' ? state.lastAiShot : null
    const target = ours ?? theirs
    if (target === null) return
    if (state.soundOn) playCombat(ours !== null ? 'ours' : 'theirs')
    if (!still.current) setFlight({ side: ours !== null ? 'player' : 'ai', target })
  }, [state.phase, state.battleSub, state.lastPlayerShot, state.lastAiShot, state.soundOn])

  const landNow = useCallback(() => setFlight(null), [])

  /** An impatient hand brings our own shot down at once. Theirs falls in its own time. */
  useEffect(() => {
    if (flight?.side !== 'player') return undefined
    window.addEventListener('pointerdown', landNow)
    return () => window.removeEventListener('pointerdown', landNow)
  }, [flight, landNow])

  /** The middle of the British ship our last shot finished, if it finished one. */
  const wreckCentre = useCallback((): { x: number; y: number } | null => {
    const at = state.lastPlayerShot
    if (at === null) return null
    const struck = state.enemy.ships.find(
      (ship) => shipCells(ship).includes(at) && isSunk(state.enemy, ship),
    )
    if (!struck) return null
    const cells = shipCells(struck)
    const middle = cells[Math.floor(cells.length / 2)]
    return {
      x: ((toX(middle) + 0.5) * 100) / BOARD_SIZE,
      y: ((toY(middle) + 0.5) * 100) / BOARD_SIZE,
    }
  }, [state.lastPlayerShot, state.enemy])

  // The resolution beat: hold on the animation, then let the log line land.
  useEffect(() => {
    if (state.phase !== 'battle') return
    if (flight || killCam) return
    if (pending) {
      const timer = setTimeout(() => {
        // Our own kill earns a moment on the wreck before the line is signalled.
        const ourKill =
          !still.current &&
          state.battleSub === 'resolvingPlayerShot' &&
          (pending.tone === 'sunk' || pending.tone === 'grave') &&
          dweltOn.current !== pending.id
        const centre = ourKill ? wreckCentre() : null
        if (centre) {
          dweltOn.current = pending.id
          setKillCam(centre)
          return
        }
        setRevealed(pending.id)
        dispatch({ type: 'RESOLVE' })
      }, beatFor(pending.tone))
      return () => clearTimeout(timer)
    }
    if (state.battleSub === 'aiThinking') {
      const timer = setTimeout(() => dispatch({ type: 'AI_FIRE' }), NELSON_THINKING_MS)
      return () => clearTimeout(timer)
    }
    setRevealed(state.nextDispatchId - 1)
    return undefined
  }, [state.phase, state.battleSub, state.nextDispatchId, pending, flight, killCam, wreckCentre])

  /**
   * Held on the wreck, then released. On the winning kill the board keeps its
   * zoom and fades instead, so the aftermath comes out of the moment rather
   * than cutting away from it.
   */
  useEffect(() => {
    if (!killCam) return undefined
    const hold = ZOOM_MS + (state.winner ? WINNING_HOLD_MS : HOLD_MS)
    if (state.winner) {
      const fading = setTimeout(() => setClosing(true), hold)
      return () => clearTimeout(fading)
    }
    const release = setTimeout(() => setKillCam(null), hold)
    return () => clearTimeout(release)
  }, [killCam, state.winner])

  /** Once the board has faded, the aftermath takes over. */
  useEffect(() => {
    if (!closing || !pending) return undefined
    const timer = setTimeout(() => {
      setRevealed(pending.id)
      dispatch({ type: 'RESOLVE' })
    }, ZOOM_MS)
    return () => clearTimeout(timer)
  }, [closing, pending])

  // Hold the line for a beat and a half when the fleets first sight one another.
  useEffect(() => {
    setArmed(false)
    if (state.phase !== 'battle') return undefined
    const timer = setTimeout(() => setArmed(true), STAND_TO_MS)
    return () => clearTimeout(timer)
  }, [state.phase])

  // Nothing is held back outside the battle screen.
  useEffect(() => {
    if (state.phase !== 'battle') setRevealed(state.nextDispatchId)
  }, [state.phase, state.nextDispatchId])

  // A sinking shakes the board it landed on, once, and is heard.
  useEffect(() => {
    if (flight) return
    if (!pending || (pending.tone !== 'sunk' && pending.tone !== 'grave')) return
    if (state.soundOn) playCombat('sinking')
    setShake(state.battleSub === 'resolvingPlayerShot' ? 'target' : 'own')
    const timer = setTimeout(() => setShake(null), SHAKE_MS)
    return () => clearTimeout(timer)
  }, [pending, state.battleSub, state.soundOn, flight])

  useEffect(() => {
    if (state.phase !== 'battle') {
      setKillCam(null)
      setClosing(false)
    }
  }, [state.phase])

  const visibleLog = useMemo(
    () => state.log.filter((entry) => entry.id <= revealed),
    [state.log, revealed],
  )

  if (state.phase === 'title') return <Title state={state} dispatch={dispatch} />
  if (state.phase === 'preamble') return <Preamble dispatch={dispatch} />
  if (state.phase === 'deployment') return <Deployment state={state} dispatch={dispatch} />
  if (state.phase === 'battle') {
    return (
      <Battle
        state={state}
        dispatch={dispatch}
        log={visibleLog}
        shake={shake}
        armed={armed}
        flight={flight}
        flightMs={flight?.side === 'player' ? OUR_FLIGHT_MS : THEIR_FLIGHT_MS}
        onLanded={landNow}
        killCam={killCam}
        closing={closing}
      />
    )
  }
  return <Aftermath state={state} dispatch={dispatch} />
}

export default App
