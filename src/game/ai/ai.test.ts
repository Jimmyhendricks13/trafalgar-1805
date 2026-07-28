import { describe, expect, it } from 'vitest'
import { createRng } from '../rng'
import { shotsToVictory } from '../simulate'
import type { CellState } from '../types'
import { emptyIncoming, toIndex, toX, toY } from '../types'
import { chooseShot, emptyMemory, noteSink } from './index'
import { densityMap } from './nelson'
import { neighbours } from './view'

const view = (hits: readonly number[] = [], misses: readonly number[] = []): CellState[] => {
  const cells = emptyIncoming()
  for (const hit of hits) cells[hit] = 'hit'
  for (const miss of misses) cells[miss] = 'miss'
  return cells
}

const ALL_LENGTHS = [5, 4, 3, 3, 2]

describe('Midshipman', () => {
  it('only ever fires at unfired cells', () => {
    const rng = createRng(1)
    const cells = view([toIndex(0, 0)], [toIndex(1, 1), toIndex(2, 2)])
    for (let i = 0; i < 200; i += 1) {
      const shot = chooseShot(
        { cells, remainingLengths: ALL_LENGTHS, memory: emptyMemory(), difficulty: 'midshipman' },
        rng,
      )
      expect(shot).not.toBeNull()
      expect(cells[shot as number]).toBe('unknown')
    }
  })
})

describe('Post-Captain', () => {
  it('works a lone hit by firing at one of its neighbours', () => {
    const rng = createRng(2)
    const hit = toIndex(4, 4)
    const cells = view([hit])
    for (let i = 0; i < 50; i += 1) {
      const shot = chooseShot(
        { cells, remainingLengths: ALL_LENGTHS, memory: emptyMemory(), difficulty: 'captain' },
        rng,
      )
      expect(neighbours(hit)).toContain(shot)
    }
  })

  it('extends a line of two hits along that line', () => {
    const rng = createRng(3)
    const cells = view([toIndex(4, 4), toIndex(5, 4)])
    const expected = [toIndex(3, 4), toIndex(6, 4)]
    for (let i = 0; i < 50; i += 1) {
      const shot = chooseShot(
        { cells, remainingLengths: ALL_LENGTHS, memory: emptyMemory(), difficulty: 'captain' },
        rng,
      )
      expect(expected).toContain(shot)
    }
  })

  it('stops chasing hits belonging to a ship already sunk', () => {
    const rng = createRng(4)
    const sunkCells = [toIndex(4, 4), toIndex(4, 5)]
    const cells = view(sunkCells)
    const memory = noteSink(emptyMemory(), cells, sunkCells[1], 2)
    expect(memory.resolvedHits).toHaveLength(2)

    let sawDistantShot = false
    for (let i = 0; i < 50; i += 1) {
      const shot = chooseShot(
        { cells, remainingLengths: [5, 4, 3, 3], memory, difficulty: 'captain' },
        rng,
      )
      if (shot !== null && !neighbours(sunkCells[0]).includes(shot)) sawDistantShot = true
    }
    expect(sawDistantShot).toBe(true)
  })
})

describe('Nelson', () => {
  it('respects parity while hunting', () => {
    const rng = createRng(5)
    const cells = emptyIncoming()
    for (let i = 0; i < 50; i += 1) {
      const shot = chooseShot(
        { cells, remainingLengths: ALL_LENGTHS, memory: emptyMemory(), difficulty: 'nelson' },
        rng,
      )
      expect(shot).not.toBeNull()
      expect((toX(shot as number) + toY(shot as number)) % 2).toBe(0)
    }
  })

  it('abandons parity to finish a wounded ship', () => {
    const rng = createRng(6)
    const hit = toIndex(3, 3)
    const cells = view([hit])
    for (let i = 0; i < 50; i += 1) {
      const shot = chooseShot(
        { cells, remainingLengths: ALL_LENGTHS, memory: emptyMemory(), difficulty: 'nelson' },
        rng,
      )
      expect(neighbours(hit)).toContain(shot)
    }
  })

  it('never fires into a cell no surviving ship could occupy', () => {
    // A single cell boxed in by misses cannot hold a ship of length 2 or more.
    const boxed = toIndex(5, 5)
    const cells = view([], neighbours(boxed))
    const density = densityMap(cells, ALL_LENGTHS, emptyMemory())
    expect(density[boxed]).toBe(0)

    const rng = createRng(7)
    for (let i = 0; i < 50; i += 1) {
      const shot = chooseShot(
        { cells, remainingLengths: ALL_LENGTHS, memory: emptyMemory(), difficulty: 'nelson' },
        rng,
      )
      expect(shot).not.toBe(boxed)
    }
  })

  it('prefers the centre of an empty board, where more placements fit', () => {
    const density = densityMap(emptyIncoming(), ALL_LENGTHS, emptyMemory())
    expect(density[toIndex(4, 4)]).toBeGreaterThan(density[toIndex(0, 0)])
  })
})

describe('shot quality', () => {
  const sample = (difficulty: 'midshipman' | 'captain' | 'nelson', games: number): number => {
    let total = 0
    for (let seed = 1; seed <= games; seed += 1) total += shotsToVictory(difficulty, seed * 7919)
    return total / games
  }

  it('Midshipman needs most of the board', () => {
    expect(sample('midshipman', 200)).toBeGreaterThan(85)
  })

  it('Post-Captain is markedly better than random', () => {
    const mean = sample('captain', 200)
    expect(mean).toBeGreaterThan(50)
    expect(mean).toBeLessThan(80)
  })

  it('Nelson approaches optimal play', () => {
    const mean = sample('nelson', 200)
    expect(mean).toBeGreaterThan(36)
    expect(mean).toBeLessThan(52)
  })

  it('each level is stronger than the one below it', () => {
    expect(sample('nelson', 60)).toBeLessThan(sample('captain', 60))
    expect(sample('captain', 60)).toBeLessThan(sample('midshipman', 60))
  })
})
