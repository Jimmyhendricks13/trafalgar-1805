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

  const heading = state.orientation === 'vertical' ? 'north–south' : 'east–west'

  return (
    <main className="screen screen--deployment">
      <header className="screen__header">
        <h1 className="screen__title">Form the line</h1>
        <ol className="steps">
          <li className={`steps__step${selected ? '' : ' steps__step--now'}`}>
            Select a ship from your fleet.
          </li>
          <li className={`steps__step${selected ? ' steps__step--now' : ''}`}>
            {selected ? (
              <>
                Click the grid to place <strong>{selected.name}</strong>. Press <kbd>R</kbd> to
                rotate her heading.
              </>
            ) : (
              <>
                Click the grid to position her. Press <kbd>R</kbd> to rotate.
              </>
            )}
          </li>
          <li className="steps__step">
            Signal the fleet to engage. Ships may lie alongside one another, but not across.
          </li>
        </ol>
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
          <section className="roster__fleet">
            <h2 className="panel__heading">The Combined Fleet</h2>
            <ul className="roster__list">
              {state.player.ships.map((ship) => {
                const active = ship.id === state.selectedShipId
                return (
                  <li key={ship.id}>
                    <button
                      type="button"
                      className={`roster__ship${active ? ' roster__ship--active' : ''}`}
                      aria-pressed={active}
                      onClick={() => dispatch({ type: 'SELECT_SHIP', id: active ? null : ship.id })}
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
                      <span className="roster__state">
                        {active ? 'Selected — click the grid' : 'Stationed'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="roster__orders">
            <h2 className="panel__heading">Orders</h2>
            <div className="roster__controls">
              <button
                type="button"
                className="button button--stacked"
                onClick={() =>
                  // With a ship in hand the button brings her about, as R does; otherwise it
                  // only sets the heading the next placement will take.
                  selected
                    ? dispatch({ type: 'ROTATE_SHIP', id: selected.id })
                    : dispatch({
                        type: 'SET_ORIENTATION',
                        orientation: state.orientation === 'vertical' ? 'horizontal' : 'vertical',
                      })
                }
              >
                <span>
                  Rotate (<kbd>R</kbd>)
                </span>
                <span className="button__note">Currently {heading}</span>
              </button>
              <button
                type="button"
                className="button button--stacked"
                onClick={() => dispatch({ type: 'RANDOMISE' })}
              >
                <span>Let the sailing master decide</span>
                <span className="button__note">Stations all five ships at random</span>
              </button>
              <button
                type="button"
                className="button button--stacked"
                title={VILLENEUVE_FORMATION_NOTE}
                onClick={() => dispatch({ type: 'ADOPT_FORMATION' })}
              >
                <span>Adopt Villeneuve's formation</span>
                <span className="button__note">The real line of 21 October</span>
              </button>
            </div>
          </section>

          <section className="roster__variant">
            <h2 className="panel__heading">Variant rules</h2>
            <label className="toggle">
              <input
                type="checkbox"
                checked={state.deathOfNelson}
                onChange={() => dispatch({ type: 'TOGGLE_VARIANT' })}
              />
              <span>
                <strong>The Death of Nelson</strong> — sinking HMS Victory wins the day at once.
              </span>
            </label>
          </section>

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
