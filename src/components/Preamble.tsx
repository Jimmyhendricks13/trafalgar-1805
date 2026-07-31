import { useState } from 'react'
import {
  ENEMY_ROLL,
  ENEMY_ROLL_HEADING,
  ENEMY_ROLL_LEDE,
  FLEET_ROLL,
  FLEET_ROLL_HEADING,
  FLEET_ROLL_LEDE,
  NAPOLEON_QUOTE,
  PREAMBLE,
  PREAMBLE_AFTER,
} from '../content/history'
import type { Action } from '../game/reducer'
import { ShipMark } from './ShipMark'

interface Props {
  readonly dispatch: (action: Action) => void
}

interface RollShip {
  readonly name: string
  readonly line: string
  readonly cells: number
}

const Roll = ({
  ships,
  colours,
}: {
  ships: readonly RollShip[]
  colours: 'combined' | 'british'
}) => (
  <dl className="roll">
    {ships.map((ship) => (
      <div className="roll__ship" key={ship.name}>
        <ShipMark cells={ship.cells} colours={colours} className="roll__mark" />
        <dt className="roll__name">{ship.name}</dt>
        <dd className="roll__line">{ship.line}</dd>
      </div>
    ))}
  </dl>
)

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
        <Roll ships={FLEET_ROLL} colours="combined" />

        <h2 className="roll__heading">{ENEMY_ROLL_HEADING}</h2>
        <p className="despatch__lede">{ENEMY_ROLL_LEDE}</p>
        <Roll ships={ENEMY_ROLL} colours="british" />
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
