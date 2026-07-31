/**
 * A ship of the line seen from above, as she would be drawn on a plotting chart:
 * hull, courses set on three yards, gunports down both sides, ensign over the stern.
 * Drawn bow-right in a `length × 10` space and rotated whole when she lies
 * north–south, so the geometry below only ever has to think in one direction.
 */

const CELL = 10
/** Centreline of the cell she sits in. */
const AXIS = 5

interface Mast {
  readonly at: number
  readonly yard: number
}

/** Three masts for a ship of the line; two for anything small enough to be a brig. */
const mastLine = (cells: number): readonly Mast[] =>
  cells >= 3
    ? [
        { at: 0.22, yard: 3.5 },
        { at: 0.5, yard: 4.6 },
        { at: 0.78, yard: 4 },
      ]
    : [
        { at: 0.32, yard: 3.9 },
        { at: 0.7, yard: 4.4 },
      ]

/** A hull from transom `a` to stem `b`, `w` half-beam either side of the centreline. */
const hull = (a: number, b: number, w: number): string => {
  const run = b - a
  const shoulder = a + run * 0.42
  return [
    `M ${a} ${AXIS - w * 0.66}`,
    `C ${a - run * 0.035} ${AXIS - w * 0.3}, ${a - run * 0.035} ${AXIS + w * 0.3}, ${a} ${AXIS + w * 0.66}`,
    `C ${shoulder} ${AXIS + w}, ${b - run * 0.08} ${AXIS + w * 0.86}, ${b} ${AXIS}`,
    `C ${b - run * 0.08} ${AXIS - w * 0.86}, ${shoulder} ${AXIS - w}, ${a} ${AXIS - w * 0.66}`,
    'Z',
  ].join(' ')
}

interface Props {
  readonly cells: number
  readonly vertical?: boolean
  readonly sunk?: boolean
  /** Whose colours fly over her taffrail. */
  readonly colours?: 'combined' | 'british'
  readonly className?: string
}

export const ShipMark = ({
  cells,
  vertical = false,
  sunk = false,
  colours = 'combined',
  className = '',
}: Props) => {
  const along = cells * CELL
  const stern = 1.6
  const bow = along - 0.9
  const beam = 3.1
  const masts = mastLine(cells)
  const ports = Math.max(3, cells * 3)

  return (
    <svg
      className={`ship ship--${colours}${sunk ? ' ship--sunk' : ''}${
        className ? ` ${className}` : ''
      }`}
      viewBox={vertical ? `0 0 ${CELL} ${along}` : `0 0 ${along} ${CELL}`}
      aria-hidden="true"
      focusable="false"
    >
      <g transform={vertical ? `rotate(90) translate(0 ${-CELL})` : undefined}>
        <path className="ship__hull" d={hull(stern, bow, beam)} />
        <path className="ship__deck" d={hull(stern + 0.9, bow - 1.6, beam - 1.5)} />

        {/* the batteries: a port every few feet down both sides */}
        {Array.from({ length: ports }, (_, i) => {
          const x = stern + 1.1 + ((bow - stern - 2.8) * i) / Math.max(1, ports - 1)
          return (
            <g key={`port-${x}`} className="ship__ports">
              <rect x={x - 0.24} y={AXIS - beam * 0.78} width={0.48} height={0.46} />
              <rect x={x - 0.24} y={AXIS + beam * 0.78 - 0.46} width={0.48} height={0.46} />
            </g>
          )
        })}

        {/* canvas: the courses seen from above, bellied out by the weather quarter,
            standing over her deck as they would to a lookout at the masthead */}
        {masts.map(({ at, yard }) => {
          const x = stern + (bow - stern) * at
          const d = `M ${x} ${AXIS - yard} Q ${x - 2.3} ${AXIS} ${x} ${AXIS + yard}`
          return (
            <g key={`sail-${at}`} className="ship__sails">
              <path className="ship__sail-shadow" d={d} />
              <path className="ship__sail" d={d} />
              <circle className="ship__mast" cx={x} cy={AXIS} r={0.55} />
            </g>
          )
        })}

        {/* bowsprit and jibboom forward, ensign staff over the taffrail */}
        <line className="ship__spar" x1={bow - 0.6} y1={AXIS} x2={along - 0.1} y2={AXIS} />
        <line className="ship__spar" x1={stern + 0.3} y1={AXIS} x2={0.2} y2={AXIS} />
        <path className="ship__ensign" d={`M 0.2 ${AXIS} L 0.2 ${AXIS - 2.1} L 2.1 ${AXIS - 1.3} Z`} />

        {sunk && (
          <g className="ship__smoke">
            <ellipse cx={(stern + bow) / 2} cy={AXIS} rx={(bow - stern) * 0.32} ry={4.2} />
            <ellipse cx={(stern + bow) * 0.34} cy={AXIS - 0.8} rx={(bow - stern) * 0.2} ry={3.1} />
            <ellipse cx={(stern + bow) * 0.62} cy={AXIS + 0.9} rx={(bow - stern) * 0.17} ry={2.6} />
          </g>
        )}
      </g>
    </svg>
  )
}
