import { NAPOLEON_QUOTE, PREAMBLE, PREAMBLE_AFTER } from '../content/history'
import type { Action } from '../game/reducer'

interface Props {
  readonly dispatch: (action: Action) => void
}

export const Preamble = ({ dispatch }: Props) => (
  <main className="screen screen--preamble">
    <article className="despatch">
      <h1 className="despatch__heading">Boulogne, 1805</h1>
      {PREAMBLE.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}

      <blockquote className="quote">
        <p>{NAPOLEON_QUOTE.text}</p>
        <footer>— {NAPOLEON_QUOTE.attribution}</footer>
      </blockquote>

      {PREAMBLE_AFTER.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </article>

    <button
      type="button"
      className="button button--primary"
      autoFocus
      onClick={() => dispatch({ type: 'ENTER_DEPLOYMENT' })}
    >
      Take command
    </button>
  </main>
)
