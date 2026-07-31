import { useEffect, useRef } from 'react'
import { BOARD_SIZE, toX, toY } from '../game/types'

/** Trail puffs, oldest first. Each lags the ball a little further behind. */
const TRAIL = 6
const TRAIL_LAG_MS = 46

interface Props {
  /** The cell the shot falls into. */
  readonly target: number
  /** Ours rise from the near edge; theirs fall from the far one. */
  readonly from: 'bottom' | 'top'
  readonly flightMs: number
  readonly onLanded: () => void
}

/** Where a cell's centre sits on the grid, as a percentage of it. */
const centre = (index: number) => ({
  x: (toX(index) + 0.5) * (100 / BOARD_SIZE),
  y: (toY(index) + 0.5) * (100 / BOARD_SIZE),
})

/**
 * A round shot on its parabola. The horizontal run is linear and the fall is
 * eased, which is what a trajectory is; the apex is drawn above whichever end
 * is higher so the ball always rises before it drops.
 */
export const Cannonball = ({ target, from, flightMs, onLanded }: Props) => {
  const ball = useRef<HTMLDivElement | null>(null)
  const trail = useRef<(HTMLDivElement | null)[]>([])
  const landed = useRef(onLanded)
  landed.current = onLanded

  useEffect(() => {
    const to = centre(target)
    const start = { x: 50, y: from === 'bottom' ? 104 : -4 }
    const rise = from === 'bottom' ? 26 : 20
    const apex = Math.min(start.y, to.y) - rise

    let frame = 0
    const opened = performance.now()

    /** Quadratic Bézier through the apex: position at `t` along the flight. */
    const at = (t: number) => {
      const u = 1 - t
      return {
        x: u * u * start.x + 2 * u * t * ((start.x + to.x) / 2) + t * t * to.x,
        y: u * u * start.y + 2 * u * t * apex + t * t * to.y,
      }
    }

    const place = (node: HTMLDivElement | null, t: number, opacity: number) => {
      if (!node) return
      const point = at(Math.max(0, Math.min(1, t)))
      node.style.left = `${point.x}%`
      node.style.top = `${point.y}%`
      node.style.opacity = `${opacity}`
    }

    const step = () => {
      const through = (performance.now() - opened) / flightMs
      if (through >= 1) {
        landed.current()
        return
      }
      place(ball.current, through, 1)
      trail.current.forEach((puff, i) => {
        const lag = ((i + 1) * TRAIL_LAG_MS) / flightMs
        const t = through - lag
        place(puff, t, t <= 0 ? 0 : (1 - (i + 1) / (TRAIL + 1)) * 0.5)
      })
      frame = requestAnimationFrame(step)
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, from, flightMs])

  return (
    <div className={`shot shot--${from}`} aria-hidden="true">
      {Array.from({ length: TRAIL }, (_, i) => (
        <div
          key={i}
          className="shot__puff"
          ref={(node) => {
            trail.current[i] = node
          }}
        />
      ))}
      <div className="shot__ball" ref={ball} />
    </div>
  )
}
