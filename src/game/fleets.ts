import type { ShipSpec } from './types'

/**
 * Real ships present at Trafalgar on 21 October 1805. Length is assigned by rate:
 * the heavier the ship, the more cells she occupies.
 */

export const COMBINED_FLEET: readonly ShipSpec[] = [
  {
    id: 'trinidad',
    name: 'Santísima Trinidad',
    guns: 136,
    length: 5,
    note: 'Four decks. The largest warship in the world.',
  },
  {
    id: 'bucentaure',
    name: 'Bucentaure',
    guns: 80,
    length: 4,
    note: "Villeneuve's flagship. Your flag flies here.",
  },
  {
    id: 'santa-ana',
    name: 'Santa Ana',
    guns: 112,
    length: 3,
    note: 'Vice-Admiral de Álava, second in the Spanish line.',
  },
  {
    id: 'redoutable',
    name: 'Redoutable',
    guns: 74,
    length: 3,
    note: 'Captain Lucas. Her musketry killed Nelson.',
  },
  {
    id: 'achille-fr',
    name: 'Achille',
    guns: 74,
    length: 2,
    note: 'She burned to the waterline and blew up.',
  },
]

export const ROYAL_NAVY: readonly ShipSpec[] = [
  {
    id: 'victory',
    name: 'HMS Victory',
    guns: 104,
    length: 5,
    note: "Nelson's flagship. He is aboard her.",
  },
  {
    id: 'royal-sovereign',
    name: 'HMS Royal Sovereign',
    guns: 100,
    length: 4,
    note: "Collingwood's flagship, first into action.",
  },
  {
    id: 'temeraire',
    name: 'HMS Téméraire',
    guns: 98,
    length: 3,
    note: 'Later immortalised by Turner.',
  },
  {
    id: 'belleisle',
    name: 'HMS Belleisle',
    guns: 74,
    length: 3,
    note: 'Dismasted entirely, and fought on.',
  },
  {
    id: 'mars',
    name: 'HMS Mars',
    guns: 74,
    length: 2,
    note: 'Captain Duff, killed by a roundshot.',
  },
]

/** Sinking her is the loudest event in the game, and the optional instant win. */
export const NELSON_FLAGSHIP_ID = 'victory'
