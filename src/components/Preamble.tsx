import { useState } from 'react'
import {
  FLEET_ROLL,
  FLEET_ROLL_HEADING,
  FLEET_ROLL_LEDE,
  NAPOLEON_QUOTE,
  PREAMBLE,
  PREAMBLE_AFTER,
} from '../content/history'
import type { Action } from '../game/reducer'

interface Props {
  readonly dispatch: (action: Action) => void
}

/** Two despatches read in turn before the fleet is stationed. */
export const Preamble = ({ dispatch }: Props) => {
  const [roll, setRoll] = useState(false)

  if (!roll) {
    return (
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
          onClick={() => setRoll(true)}
        >
          Read the fleet list
        </button>
      </main>
    )
  }

  return (
    <main className="screen screen--preamble">
      <article className="despatch">
        <h1 className="despatch__heading">{FLEET_ROLL_HEADING}</h1>
        <p className="despatch__lede">{FLEET_ROLL_LEDE}</p>

        <dl className="roll">
          {FLEET_ROLL.map((ship) => (
            <div className="roll__ship" key={ship.name}>
              <dt className="roll__name">{ship.name}</dt>
              <dd className="roll__line">{ship.line}</dd>
            </div>
          ))}
        </dl>
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
}
