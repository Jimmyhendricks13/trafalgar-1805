import { useEffect, useReducer, useRef } from 'react'
import { Aftermath } from './components/Aftermath'
import { Battle } from './components/Battle'
import { Deployment } from './components/Deployment'
import { Preamble } from './components/Preamble'
import { Title } from './components/Title'
import { createInitialState, gameReducer } from './game/reducer'
import { playTone } from './sound'

const SMOKE_MS = 650
const NELSON_THINKING_MS = 550

export const App = () => {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => createInitialState())
  const lastHeard = useRef(0)

  // The resolution beat: hold on the smoke, then let the log line land.
  useEffect(() => {
    if (state.phase !== 'battle') return
    if (state.battleSub === 'resolvingPlayerShot' || state.battleSub === 'resolvingAiShot') {
      const timer = setTimeout(() => dispatch({ type: 'RESOLVE' }), SMOKE_MS)
      return () => clearTimeout(timer)
    }
    if (state.battleSub === 'aiThinking') {
      const timer = setTimeout(() => dispatch({ type: 'AI_FIRE' }), NELSON_THINKING_MS)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [state.phase, state.battleSub, state.nextDispatchId])

  useEffect(() => {
    const latest = state.log[0]
    if (!latest || latest.id === lastHeard.current) return
    lastHeard.current = latest.id
    if (state.soundOn && latest.side !== 'system') playTone(latest.tone)
  }, [state.log, state.soundOn])

  if (state.phase === 'title') return <Title state={state} dispatch={dispatch} />
  if (state.phase === 'preamble') return <Preamble dispatch={dispatch} />
  if (state.phase === 'deployment') return <Deployment state={state} dispatch={dispatch} />
  if (state.phase === 'battle') return <Battle state={state} dispatch={dispatch} />
  return <Aftermath state={state} dispatch={dispatch} />
}

export default App
