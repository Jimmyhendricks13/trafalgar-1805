import { DIFFICULTIES } from '../game/ai'
import type { Action, GameState } from '../game/reducer'
import { SUBTITLE, TAGLINE, TITLE } from '../content/history'

interface Props {
  readonly state: GameState
  readonly dispatch: (action: Action) => void
}

export const Title = ({ state, dispatch }: Props) => (
  <main className="screen screen--title">
    <header className="title">
      <p className="title__eyebrow">{SUBTITLE}</p>
      <h1 className="title__name">{TITLE}</h1>
      <p className="title__tagline">{TAGLINE}</p>
    </header>

    <section className="panel" aria-labelledby="opponent-heading">
      <h2 id="opponent-heading" className="panel__heading">
        Who commands the British line?
      </h2>
      <ul className="choices">
        {DIFFICULTIES.map((option) => (
          <li key={option.id}>
            <button
              type="button"
              className={`choice${state.difficulty === option.id ? ' choice--active' : ''}`}
              aria-pressed={state.difficulty === option.id}
              onClick={() => dispatch({ type: 'SET_DIFFICULTY', difficulty: option.id })}
            >
              <span className="choice__name">{option.name}</span>
              <span className="choice__blurb">{option.blurb}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>

    <div className="title__actions">
      <button type="button" className="button button--primary" onClick={() => dispatch({ type: 'BEGIN' })}>
        Read the despatches
      </button>
      <button
        type="button"
        className="button"
        onClick={() => dispatch({ type: 'ENTER_DEPLOYMENT' })}
      >
        Straight to the fleet
      </button>
    </div>
  </main>
)
