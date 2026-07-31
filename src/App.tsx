import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Aftermath } from './components/Aftermath'
import { Battle } from './components/Battle'
import { Deployment } from './components/Deployment'
import { Preamble } from './components/Preamble'
import { Title } from './components/Title'
import type { DispatchTone } from './content/dispatches'
import { createInitialState, gameReducer } from './game/reducer'
import { playTone } from './sound'

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
  const still = useRef(prefersStillness())
  const lastHeard = useRef(0)

  const resolving =
    state.battleSub === 'resolvingPlayerShot' || state.battleSub === 'resolvingAiShot'
  const pending = resolving ? state.log[0] : undefined

  // A shot is in the air from the moment the guns speak until it lands.
  useEffect(() => {
    if (state.phase !== 'battle' || still.current) return
    const ours = state.battleSub === 'resolvingPlayerShot' ? state.lastPlayerShot : null
    const theirs = state.battleSub === 'resolvingAiShot' ? state.lastAiShot : null
    const target = ours ?? theirs
    if (target === null) return
    setFlight({ side: ours !== null ? 'player' : 'ai', target })
  }, [state.phase, state.battleSub, state.lastPlayerShot, state.lastAiShot])

  const landNow = useCallback(() => setFlight(null), [])

  /** An impatient hand brings our own shot down at once. Theirs falls in its own time. */
  useEffect(() => {
    if (flight?.side !== 'player') return undefined
    window.addEventListener('pointerdown', landNow)
    return () => window.removeEventListener('pointerdown', landNow)
  }, [flight, landNow])

  // The resolution beat: hold on the animation, then let the log line land.
  useEffect(() => {
    if (state.phase !== 'battle') return
    if (flight) return
    if (pending) {
      const timer = setTimeout(() => {
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
  }, [state.phase, state.battleSub, state.nextDispatchId, pending, flight])

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

  // A sinking shakes the board it landed on, once.
  useEffect(() => {
    if (flight) return
    if (!pending || (pending.tone !== 'sunk' && pending.tone !== 'grave')) return
    setShake(state.battleSub === 'resolvingPlayerShot' ? 'target' : 'own')
    const timer = setTimeout(() => setShake(null), SHAKE_MS)
    return () => clearTimeout(timer)
  }, [pending, state.battleSub, flight])

  const visibleLog = useMemo(
    () => state.log.filter((entry) => entry.id <= revealed),
    [state.log, revealed],
  )

  useEffect(() => {
    const latest = visibleLog[0]
    if (!latest || latest.id === lastHeard.current) return
    lastHeard.current = latest.id
    if (state.soundOn && latest.side !== 'system') playTone(latest.tone)
  }, [visibleLog, state.soundOn])

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
      />
    )
  }
  return <Aftermath state={state} dispatch={dispatch} />
}

export default App
