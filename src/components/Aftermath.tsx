import { DEFEAT_CODA, VICTORY_CODA } from '../content/history'
import { DIFFICULTIES } from '../game/ai'
import type { Action, GameState } from '../game/reducer'
import { isSunk, survivingShips } from '../game/resolve'
import { Grid } from './Grid'

interface Props {
  readonly state: GameState
  readonly dispatch: (action: Action) => void
}

export const Aftermath = ({ state, dispatch }: Props) => {
  const won = state.winner === 'player'
  const shots = state.enemy.incoming.filter((cell) => cell !== 'unknown').length
  const hits = state.enemy.incoming.filter((cell) => cell === 'hit').length
  const accuracy = shots === 0 ? 0 : Math.round((hits / shots) * 100)
  const lost = state.player.ships.filter((ship) => isSunk(state.player, ship))
  const opponent = DIFFICULTIES.find((option) => option.id === state.difficulty)

  return (
    <main className="screen screen--aftermath">
      <header className="screen__header">
        <p className="title__eyebrow">21 October 1805, evening</p>
        <h1 className="screen__title">
          {state.resigned
            ? 'You struck your colours'
            : won
              ? 'The British line is broken'
              : 'The Combined Fleet is destroyed'}
        </h1>
      </header>

      <div className="aftermath">
        <article className="despatch">
          {(won ? VICTORY_CODA : DEFEAT_CODA).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}

          <dl className="figures">
            <div>
              <dt>Opponent</dt>
              <dd>{opponent?.name}</dd>
            </div>
            <div>
              <dt>Broadsides fired</dt>
              <dd>{shots}</dd>
            </div>
            <div>
              <dt>Accuracy</dt>
              <dd>{accuracy}%</dd>
            </div>
            <div>
              <dt>British ships taken</dt>
              <dd>{5 - survivingShips(state.enemy).length} of 5</dd>
            </div>
            <div>
              <dt>Your losses</dt>
              <dd>{lost.length === 0 ? 'none' : lost.map((ship) => ship.name).join(', ')}</dd>
            </div>
          </dl>

          <div className="screen__actions">
            <button
              type="button"
              className="button button--primary"
              onClick={() => dispatch({ type: 'REMATCH' })}
            >
              Put to sea again
            </button>
            <button type="button" className="button" onClick={() => dispatch({ type: 'NEW_GAME' })}>
              Change opponent
            </button>
          </div>
        </article>

        <section className="aftermath__boards">
          <div>
            <h2 className="panel__heading">Where Nelson's ships lay</h2>
            <Grid
              cells={state.enemy.incoming}
              ships={state.enemy.ships}
              sunkShipIds={state.enemy.ships.filter((ship) => isSunk(state.enemy, ship)).map((ship) => ship.id)}
              ariaLabel="The British fleet revealed."
              variant="own"
            />
          </div>
          <div>
            <h2 className="panel__heading">Your own line</h2>
            <Grid
              cells={state.player.incoming}
              ships={state.player.ships}
              sunkShipIds={lost.map((ship) => ship.id)}
              ariaLabel="Your fleet at the close of the action."
              variant="own"
            />
          </div>
        </section>
      </div>
    </main>
  )
}
