export const TITLE = 'Trafalgar'
export const SUBTITLE = '21 October 1805 — off Cape Trafalgar'
export const TAGLINE = 'You command the Combined Fleet. Rewrite the afternoon.'

export const PREAMBLE: readonly string[] = [
  'Napoleon is master of Europe on land. England sits behind a wall of water and oak.',
  'The Grande Armée waits at Boulogne — two hundred thousand men, two thousand boats. All the Emperor needs is three days of naval supremacy in the Channel.',
]

export const NAPOLEON_QUOTE = {
  text: 'Let us be masters of the Strait for six hours, and we shall be masters of the world.',
  attribution: 'Napoleon Bonaparte, 1804',
}

export const PREAMBLE_AFTER: readonly string[] = [
  'He never got his six hours. Vice-Admiral Villeneuve took thirty-three ships of the line to sea and met Nelson with twenty-seven off Cape Trafalgar.',
  'France and Spain lost twenty-two ships. Britain lost none. The invasion of England died that afternoon, and Napoleon blamed Villeneuve for the rest of his life.',
  'You have his fleet, his orders and his reputation. The question is whether you are the better tactician.',
]

export const FLEET_ROLL_HEADING = 'The Combined Fleet'
export const FLEET_ROLL_LEDE = 'These are your ships, Commander. Learn their names.'

interface RollEntry {
  readonly name: string
  readonly line: string
  /** Her length in cells, so the chart mark beside her is drawn to her rate. */
  readonly cells: number
}

export const FLEET_ROLL: readonly RollEntry[] = [
  {
    name: 'Santísima Trinidad',
    cells: 5,
    line: "136 guns, four decks. The largest warship in the world. Spain's pride.",
  },
  { name: 'Bucentaure', line: "80 guns. Villeneuve's flagship. Where you stand.", cells: 4 },
  { name: 'Santa Ana', line: '112 guns. Vice-Admiral Álava, second in the Spanish line.', cells: 3 },
  {
    name: 'Redoutable',
    cells: 3,
    line: '74 guns. Captain Lucas drilled her crew in musketry. Her marksman will kill Nelson.',
  },
  {
    name: 'Achille',
    cells: 2,
    line: '74 guns. She will burn to the waterline. History has already written her end. You are here to change it.',
  },
]

export const ENEMY_ROLL_HEADING = 'The Royal Navy'
export const ENEMY_ROLL_LEDE = 'And these are the five you must break. Nelson brought them himself.'

export const ENEMY_ROLL: readonly RollEntry[] = [
  {
    name: 'HMS Victory',
    cells: 5,
    line: "104 guns. Nelson's flagship. He is aboard her, and he does not intend to survive the day quietly.",
  },
  {
    name: 'HMS Royal Sovereign',
    cells: 4,
    line: "100 guns. Collingwood's flagship, and the first British ship into your line.",
  },
  {
    name: 'HMS Téméraire',
    cells: 3,
    line: '98 guns. She saves Victory from boarding. Turner will paint her being towed away to be broken up.',
  },
  {
    name: 'HMS Belleisle',
    cells: 3,
    line: '74 guns. Dismasted to a hulk, colours nailed to the stump, still firing.',
  },
  {
    name: 'HMS Mars',
    cells: 2,
    line: '74 guns. Captain Duff is killed by a roundshot at the head of his own crew. She holds her station regardless.',
  },
]

export const VICTORY_CODA: readonly string[] = [
  'The British squadron is broken and the Strait is open.',
  'No such despatch was ever written. In the world that happened, Villeneuve surrendered aboard Bucentaure, was paroled to France, and was found dead in a room at Rennes with six wounds in his chest. The Grande Armée turned east and marched to Austerlitz instead.',
  'Here, the Emperor gets his six hours. What he does with them is another game.',
]

export const DEFEAT_CODA: readonly string[] = [
  'The Combined Fleet is destroyed. The afternoon plays out as it did.',
  'Nelson dies below decks aboard Victory at half past four, told first that the day is his. Britain rules the sea for a century. The boats at Boulogne rot at their moorings.',
  'History is stubborn. Try again.',
]

export const RESIGNED_CODA: readonly string[] = [
  'The action is broken off. Your ships bear away with the wind on the quarter, still afloat, and the British are left the field.',
  'Villeneuve was blamed for less. He had written to the Emperor that summer that his fleet was not fit to fight; he sailed anyway, and the verdict of history was passed on the man rather than the fleet.',
  'Nothing is decided. Come about and engage.',
]
