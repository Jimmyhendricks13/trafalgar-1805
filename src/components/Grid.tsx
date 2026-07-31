import { useCallback } from 'react'
import { shipCells } from '../game/board'
import type { CellState, Ship } from '../game/types'
import { BOARD_SIZE, COLUMNS, cellName, toIndex, toX, toY } from '../game/types'
import { ShipMark } from './ShipMark'

const ROWS = Array.from({ length: BOARD_SIZE }, (_, i) => i + 1)

export interface GridProps {
  readonly cells: readonly CellState[]
  readonly ariaLabel: string
  readonly ships?: readonly Ship[]
  readonly sunkShipIds?: readonly string[]
  readonly interactive?: boolean
  readonly onCell?: (index: number) => void
  readonly onHover?: (index: number | null) => void
  readonly preview?: { readonly cells: readonly number[]; readonly legal: boolean } | null
  readonly lastShot?: number | null
  readonly variant?: 'target' | 'own'
  readonly shake?: boolean
  /** Whose colours the ships drawn on this board fly. */
  readonly colours?: 'combined' | 'british'
  /** Veils cells that have not been fired upon: only the enemy's waters wear it. */
  readonly fog?: boolean
}

export const Grid = ({
  cells,
  ariaLabel,
  ships,
  sunkShipIds = [],
  interactive = false,
  onCell,
  onHover,
  preview,
  lastShot,
  variant = 'target',
  shake = false,
  colours = 'combined',
  fog = false,
}: GridProps) => {
  const previewCells = new Set(preview?.cells ?? [])

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }
    const delta = deltas[event.key]
    if (!delta) return
    const active = document.activeElement as HTMLElement | null
    const from = Number(active?.dataset.index ?? NaN)
    if (Number.isNaN(from)) return
    event.preventDefault()
    const x = Math.min(BOARD_SIZE - 1, Math.max(0, toX(from) + delta[0]))
    const y = Math.min(BOARD_SIZE - 1, Math.max(0, toY(from) + delta[1]))
    const next = event.currentTarget.querySelector<HTMLElement>(
      `[data-index="${toIndex(x, y)}"]`,
    )
    next?.focus()
  }, [])

  const describe = (index: number, state: CellState): string => {
    const ship = ships?.find((candidate) => shipCells(candidate).includes(index))
    const occupant = ship ? `, ${ship.name}` : ''
    if (state === 'hit') return `${cellName(index)}, hit${occupant}`
    if (state === 'miss') return `${cellName(index)}, miss`
    return `${cellName(index)}, unfired${occupant}`
  }

  return (
    <div className={`board board--${variant}${fog ? ' board--fog' : ''}`}>
      <div className="board__labels board__labels--x" aria-hidden="true">
        {COLUMNS.map((column) => (
          <span key={column}>{column}</span>
        ))}
      </div>
      <div className="board__labels board__labels--y" aria-hidden="true">
        {ROWS.map((row) => (
          <span key={row}>{row}</span>
        ))}
      </div>
      <div
        className={`board__grid${shake ? ' board__grid--shake' : ''}`}
        role="group"
        aria-label={ariaLabel}
        onKeyDown={handleKeyDown}
        onMouseLeave={() => onHover?.(null)}
      >
        {cells.map((state, index) => {
          const classes = ['cell', `cell--${state}`]
          if (previewCells.has(index)) {
            classes.push(preview?.legal ? 'cell--preview' : 'cell--preview-bad')
          }
          if (lastShot === index) classes.push('cell--latest')
          return (
            <button
              key={index}
              type="button"
              data-index={index}
              className={classes.join(' ')}
              aria-label={describe(index, state)}
              disabled={!interactive}
              onClick={() => onCell?.(index)}
              onMouseEnter={() => onHover?.(index)}
              onFocus={() => onHover?.(index)}
            >
              <span className="cell__mark" aria-hidden="true" />
            </button>
          )
        })}
        {ships && (
          <div className="board__fleet" aria-hidden="true">
            {ships.map((ship) => (
              <div
                key={ship.id}
                className="board__ship"
                style={{
                  left: `${toX(ship.origin) * 10}%`,
                  top: `${toY(ship.origin) * 10}%`,
                  width: `${(ship.orientation === 'horizontal' ? ship.length : 1) * 10}%`,
                  height: `${(ship.orientation === 'vertical' ? ship.length : 1) * 10}%`,
                }}
              >
                <ShipMark
                  cells={ship.length}
                  colours={colours}
                  vertical={ship.orientation === 'vertical'}
                  sunk={sunkShipIds.includes(ship.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
