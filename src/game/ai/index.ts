import type { Rng } from '../rng'
import type { CellState, Difficulty } from '../types'
import { captainShot } from './captain'
import { nelsonShot } from './nelson'
import type { AiMemory } from './view'
import { unfiredCells } from './view'

export type { AiMemory } from './view'
export { emptyMemory, noteSink } from './view'

export interface AiInput {
  /**
   * The AI's own view of the waters it is firing into: what it has fired at and what
   * came back. It is given nothing else, so it cannot cheat by construction.
   */
  readonly cells: readonly CellState[]
  /** Lengths of enemy ships still afloat — public, since both fleets are named. */
  readonly remainingLengths: readonly number[]
  readonly memory: AiMemory
  readonly difficulty: Difficulty
}

export const chooseShot = (input: AiInput, rng: Rng): number | null => {
  const { cells, memory, remainingLengths, difficulty } = input

  if (difficulty === 'midshipman') {
    const unfired = unfiredCells(cells)
    return unfired.length > 0 ? rng.pick(unfired) : null
  }

  if (difficulty === 'captain') return captainShot(cells, memory, rng)

  return nelsonShot(cells, remainingLengths, memory, rng)
}

export const DIFFICULTIES: readonly {
  id: Difficulty
  name: string
  blurb: string
}[] = [
  {
    id: 'midshipman',
    name: 'Midshipman',
    blurb: 'A boy of fourteen with a telescope he cannot hold steady.',
  },
  {
    id: 'captain',
    name: 'Post-Captain',
    blurb: 'A competent officer. He will find you, and then he will finish you.',
  },
  {
    id: 'nelson',
    name: 'Nelson',
    blurb: 'He does not guess. History says you lose.',
  },
]
