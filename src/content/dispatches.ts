import type { Rng } from '../game/rng'
import type { Side } from '../game/types'

export type DispatchTone = 'plain' | 'hit' | 'sunk' | 'grave'

export interface Dispatch {
  readonly id: number
  readonly side: Side | 'system'
  readonly tone: DispatchTone
  readonly text: string
  /** The ship a sinking refers to, so the log can set her name apart. */
  readonly ship?: string
}

const PLAYER_MISS = [
  'Shot fell short. The swell is heavy off Cape Trafalgar.',
  'Wide. The smoke is thick and the range badly judged.',
  'Nothing there but water and powder smoke.',
  'The ball skipped twice and sank. No damage reported.',
  'Over. The gunners are firing on the roll and missing it.',
  'Empty water. The lookouts saw only spray.',
  'A clean miss. The Spanish gunners are slow to reload.',
  'No target. The chart is marked and the guns run in.',
]

const PLAYER_HIT = [
  'Ball struck home. Splinters on her gundeck.',
  'A hit. Her rigging is cut and men are down.',
  'Struck her amidships. The cheering carries across the water.',
  'A hit, low on the waterline. She is taking water.',
  'Timber gone from her side. She holds her course.',
]

const AI_MISS = [
  'A British broadside falls astern of the line. No damage.',
  'Their shot goes high through the rigging. Nothing carried away.',
  'The British fire wide. The smoke is blinding them too.',
  'Roundshot into the sea. The helmsman does not flinch.',
  'They have wasted a broadside on open water.',
]

const AI_HIT = [
  'A British broadside tells. Splinters sweep the deck.',
  'We are hulled. The carpenters are called for.',
  'Their fire is accurate. Guns are silenced on the lower deck.',
  'A shot through the gunports. Casualties reported.',
  'The line is struck hard. Men are carried below.',
]

/** Avoids repeating the previous line, which is what makes randomness feel written. */
const pickFresh = (lines: readonly string[], rng: Rng, previous: string | undefined): string => {
  const pool = lines.filter((line) => line !== previous)
  return rng.pick(pool.length > 0 ? pool : lines)
}

export const missLine = (side: Side, rng: Rng, previous?: string): string =>
  pickFresh(side === 'player' ? PLAYER_MISS : AI_MISS, rng, previous)

export const hitLine = (side: Side, rng: Rng, previous?: string): string =>
  pickFresh(side === 'player' ? PLAYER_HIT : AI_HIT, rng, previous)

export const sinkLine = (side: Side, shipName: string, remaining: number): string => {
  const left =
    remaining === 0
      ? ''
      : remaining === 1
        ? ' One of the line remains.'
        : ` ${remaining} of the line remain.`

  return side === 'player'
    ? `${shipName} is dismasted and strikes her colours.${left}`
    : `${shipName} has struck her colours.${left}`
}

export const NELSON_FALLS = 'Victory is gone. Nelson is down. Signal the fleet.'

export const OPENING_DISPATCH =
  'The Combined Fleet is formed. Nelson bears down in two columns. Open fire when ready.'

export const VILLENEUVE_FORMATION_NOTE =
  'The stations held on the day. Note that your enemy has read the same despatches.'
