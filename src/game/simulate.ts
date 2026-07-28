import { chooseShot, emptyMemory, noteSink } from './ai'
import { randomLayout } from './board'
import { COMBINED_FLEET } from './fleets'
import { fireAt, isDefeated, survivingShips } from './resolve'
import { createRng } from './rng'
import type { Difficulty, FleetState } from './types'
import { emptyIncoming } from './types'

/**
 * Plays one AI level against a random layout until every ship is sunk and returns the
 * number of shots it needed. Used by the statistical test harness, which is the only
 * meaningful regression test for targeting quality.
 */
export const shotsToVictory = (difficulty: Difficulty, seed: number): number => {
  const rng = createRng(seed)
  let fleet: FleetState = {
    side: 'player',
    ships: randomLayout(COMBINED_FLEET, rng),
    incoming: emptyIncoming(),
  }
  let memory = emptyMemory()
  let shots = 0

  while (!isDefeated(fleet)) {
    const index = chooseShot(
      {
        cells: fleet.incoming,
        remainingLengths: survivingShips(fleet).map((ship) => ship.length),
        memory,
        difficulty,
      },
      rng,
    )
    if (index === null) throw new Error('AI ran out of cells before sinking the fleet')

    const outcome = fireAt(fleet, index)
    if (!outcome) throw new Error(`AI fired twice at cell ${index}`)

    fleet = outcome.fleet
    shots += 1
    if (outcome.result === 'sunk' && outcome.ship) {
      memory = noteSink(memory, fleet.incoming, index, outcome.ship.length)
    }
  }

  return shots
}
