import type { Dispatch } from '../content/dispatches'
import type { Action, GameState } from '../game/reducer'
import { isSunk } from '../game/resolve'
import type { FleetState, Ship } from '../game/types'
import { Grid } from './Grid'
import { SignalLog } from './SignalLog'

interface Props {
  readonly state: GameState
  readonly dispatch: (action: Action) => void
  readonly log: readonly Dispatch[]
  readonly shake: 'target' | 'own' | null
  /** False for the held beat before the first broadside. */
  readonly armed: boolean
}

const sunkShips = (fleet: FleetState): readonly Ship[] =>
  fleet.ships.filter((ship) => isSunk(fleet, ship))

const tally = (fleet: FleetState) => {
  const fired = fleet.incoming.filter((cell) => cell !== 'unknown').length
  const hits = fleet.incoming.filter((cell) => cell === 'hit').length
  return { fired, hits }
}

const FleetStatus = ({ fleet, heading }: { fleet: FleetState; heading: string }) => (
  <section className="status" aria-label={heading}>
    <h2 className="panel__heading">{heading}</h2>
    <ul className="status__list">
      {fleet.ships.map((ship) => {
        const sunk = isSunk(fleet, ship)
        return (
          <li key={ship.id} className={`status__ship${sunk ? ' status__ship--sunk' : ''}`}>
            <span className="status__name">{ship.name}</span>
            <span className="status__state">{sunk ? 'lost' : 'afloat'}</span>
          </li>
        )
      })}
    </ul>
  </section>
)

/** Read off the last thing our own guns did, rather than kept as its own state. */
const gunState = (state: GameState, log: readonly Dispatch[]): string => {
  if (state.winner) return 'silent'
  const ours = log.find((entry) => entry.side === 'player')
  if (!ours) return 'silent'
  return ours.tone === 'sunk' || ours.tone === 'grave' ? 'devastating' : 'engaged'
}

const turnLabel = (state: GameState): string => {
  if (state.battleSub === 'awaitingPlayerShot') return 'Your broadside. Choose a bearing.'
  if (state.battleSub === 'resolvingPlayerShot') return 'The smoke clears…'
  if (state.battleSub === 'aiThinking') return 'Nelson is laying his guns…'
  return 'The British fire.'
}

export const Battle = ({ state, dispatch, log, shake, armed }: Props) => {
  const ours = tally(state.enemy)
  const theirs = tally(state.player)
  const britishWrecks = sunkShips(state.enemy)
  const ourWrecks = sunkShips(state.player)

  return (
    <main className="screen screen--battle">
      <header className="screen__header screen__header--row">
        <div>
          <h1 className="screen__title">Cape Trafalgar</h1>
          <p className="screen__lede" aria-live="polite">
            {armed && <span className="screen__lede-text">{turnLabel(state)}</span>}
          </p>
        </div>
        <div className="screen__actions">
          <p className="tally">
            <span className="tally__ours">
              Broadsides: {ours.fired} fired · {ours.hits} struck
            </span>
            <span className="tally__theirs">Incoming: {theirs.hits}</span>
            <span className="tally__guns">Guns: {gunState(state, log)}</span>
          </p>
          <button type="button" className="button" onClick={() => dispatch({ type: 'TOGGLE_SOUND' })}>
            Cannon: {state.soundOn ? 'audible' : 'silent'}
          </button>
          <button type="button" className="button" onClick={() => dispatch({ type: 'RESIGN' })}>
            Strike your colours
          </button>
        </div>
      </header>

      <div className="battle">
        <section className="battle__target">
          <h2 className="panel__heading">The British line — your fire</h2>
          <Grid
            cells={state.enemy.incoming}
            ariaLabel="British waters. Choose a cell to fire upon."
            interactive={armed && state.battleSub === 'awaitingPlayerShot' && !state.winner}
            lastShot={state.lastPlayerShot}
            shake={shake === 'target'}
            fog
            ships={britishWrecks}
            sunkShipIds={britishWrecks.map((ship) => ship.id)}
            onCell={(index) => dispatch({ type: 'FIRE', index })}
          />
        </section>

        <div className="battle__side">
          <section className="battle__own">
            <h2 className="panel__heading">The Combined Fleet — under fire</h2>
            <Grid
              cells={state.player.incoming}
              ships={state.player.ships}
              sunkShipIds={ourWrecks.map((ship) => ship.id)}
              ariaLabel="Your fleet and the shots that have fallen among it."
              variant="own"
              lastShot={state.lastAiShot}
              shake={shake === 'own'}
            />
          </section>

          <div className="battle__statuses">
            <FleetStatus fleet={state.enemy} heading="Royal Navy" />
            <FleetStatus fleet={state.player} heading="Combined Fleet" />
          </div>
        </div>

        <SignalLog log={log} />
      </div>
    </main>
  )
}
