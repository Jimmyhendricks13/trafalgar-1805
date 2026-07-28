import { useEffect, useState } from 'react'
import { VILLENEUVE_FORMATION_NOTE } from '../content/dispatches'
import { canPlace, fitsOnBoard, shipCells } from '../game/board'
import type { Action, GameState } from '../game/reducer'
import { Grid } from './Grid'

interface Props {
  readonly state: GameState
  readonly dispatch: (action: Action) => void
}

export const Deployment = ({ state, dispatch }: Props) => {
  const [hover, setHover] = useState<number | null>(null)
  const selected = state.player.ships.find((ship) => ship.id === state.selectedShipId) ?? null

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'r' && selected) {
        dispatch({ type: 'ROTATE_SHIP', id: selected.id })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch, selected])

  const preview = (() => {
    if (hover === null || !selected) return null
    if (!fitsOnBoard(hover, state.orientation, selected.length)) {
      return { cells: [hover], legal: false }
    }
    const candidate = { ...selected, origin: hover, orientation: state.orientation }
    return { cells: shipCells(candidate), legal: canPlace(state.player.ships, candidate) }
  })()

  return (
    <main className="screen screen--deployment">
      <header className="screen__header">
        <h1 className="screen__title">Form the line</h1>
        <p className="screen__lede">
          Station your five ships. They may lie alongside one another, but not across.
          Press <kbd>R</kbd> or right-click to bring a ship about.
        </p>
      </header>

      <div className="deployment">
        <Grid
          cells={state.player.incoming}
          ships={state.player.ships}
          ariaLabel="Your waters. Click a cell to station the selected ship."
          interactive
          variant="own"
          preview={preview}
          onHover={setHover}
          onCell={(index) => {
            if (selected) dispatch({ type: 'PLACE_SHIP', id: selected.id, origin: index })
          }}
        />

        <aside className="roster" onContextMenu={(event) => event.preventDefault()}>
          <h2 className="panel__heading">The Combined Fleet</h2>
          <ul className="roster__list">
            {state.player.ships.map((ship) => (
              <li key={ship.id}>
                <button
                  type="button"
                  className={`roster__ship${
                    ship.id === state.selectedShipId ? ' roster__ship--active' : ''
                  }`}
                  aria-pressed={ship.id === state.selectedShipId}
                  onClick={() => dispatch({ type: 'SELECT_SHIP', id: ship.id })}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    dispatch({ type: 'ROTATE_SHIP', id: ship.id })
                  }}
                >
                  <span className="roster__name">{ship.name}</span>
                  <span className="roster__meta">
                    {ship.guns} guns · {ship.length} cells
                  </span>
                  <span className="roster__note">{ship.note}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="roster__controls">
            <button
              type="button"
              className="button"
              onClick={() =>
                dispatch({
                  type: 'SET_ORIENTATION',
                  orientation: state.orientation === 'vertical' ? 'horizontal' : 'vertical',
                })
              }
            >
              Heading: {state.orientation === 'vertical' ? 'north–south' : 'east–west'}
            </button>
            <button type="button" className="button" onClick={() => dispatch({ type: 'RANDOMISE' })}>
              Let the sailing master decide
            </button>
            <button
              type="button"
              className="button"
              title={VILLENEUVE_FORMATION_NOTE}
              onClick={() => dispatch({ type: 'ADOPT_FORMATION' })}
            >
              Adopt Villeneuve's formation
            </button>
          </div>

          <label className="toggle">
            <input
              type="checkbox"
              checked={state.deathOfNelson}
              onChange={() => dispatch({ type: 'TOGGLE_VARIANT' })}
            />
            <span>
              <strong>The Death of Nelson</strong> — variant rule: sinking HMS Victory wins the
              day at once.
            </span>
          </label>

          <button
            type="button"
            className="button button--primary"
            onClick={() => dispatch({ type: 'CONFIRM_DEPLOYMENT' })}
          >
            Signal the fleet to engage
          </button>
        </aside>
      </div>
    </main>
  )
}
