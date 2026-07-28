import { useCallback } from 'react'
import { shipCells } from '../game/board'
import type { CellState, Ship } from '../game/types'
import { BOARD_SIZE, COLUMNS, cellName, toIndex, toX, toY } from '../game/types'

const ROWS = Array.from({ length: BOARD_SIZE }, (_, i) => i + 1)

const hullPoints = (length: number, vertical: boolean): string => {
  const along = length * 10
  const points: [number, number][] = [
    [1, 5],
    [3.2, 1.5],
    [along - 3.2, 1.5],
    [along - 1, 5],
    [along - 3.2, 8.5],
    [3.2, 8.5],
  ]
  return points.map(([u, v]) => (vertical ? `${v},${u}` : `${u},${v}`)).join(' ')
}

const Hull = ({ ship, sunk }: { ship: Ship; sunk: boolean }) => {
  const vertical = ship.orientation === 'vertical'
  const along = ship.length * 10
  const masts = Array.from({ length: ship.length }, (_, i) => i * 10 + 5).slice(
    0,
    Math.max(1, ship.length - 1),
  )

  return (
    <svg
      className={`hull${sunk ? ' hull--sunk' : ''}`}
      viewBox={vertical ? `0 0 10 ${along}` : `0 0 ${along} 10`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polygon points={hullPoints(ship.length, vertical)} />
      {masts.map((offset) => (
        <circle
          key={offset}
          cx={vertical ? 5 : offset + 2}
          cy={vertical ? offset + 2 : 5}
          r={0.9}
        />
      ))}
    </svg>
  )
}

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
    <div className={`board board--${variant}`}>
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
        className="board__grid"
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
                <Hull ship={ship} sunk={sunkShipIds.includes(ship.id)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
