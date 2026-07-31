/**
 * Three sounds and no more: our guns, theirs across the water, and a ship
 * going down. The silence between them is the atmosphere.
 */
export type Combat = 'ours' | 'theirs' | 'sinking'

const CANNON = '/audio/cannon.mp3'
const SINKING = '/audio/sinking.mp3'

/** Their guns are heard from a distance, and a beat late. */
const DISTANT_GAIN = 0.4
const DISTANT_DELAY_MS = 100

interface Clip {
  readonly src: string
  readonly gain: number
  readonly delay: number
}

const CLIPS: Record<Combat, Clip> = {
  ours: { src: CANNON, gain: 1, delay: 0 },
  theirs: { src: CANNON, gain: DISTANT_GAIN, delay: DISTANT_DELAY_MS },
  sinking: { src: SINKING, gain: 0.85, delay: 0 },
}

/** Two of each, so a shot never cuts off the one before it. */
const VOICES = 2

const pool = new Map<string, HTMLAudioElement[]>()
let next = 0

const voices = (src: string): HTMLAudioElement[] => {
  const existing = pool.get(src)
  if (existing) return existing
  const made = Array.from({ length: VOICES }, () => {
    const element = new Audio(src)
    element.preload = 'auto'
    return element
  })
  pool.set(src, made)
  return made
}

/** Called when the guns come within reach, so the first shot is not late. */
export const preloadCombatSounds = (): void => {
  if (typeof window === 'undefined') return
  for (const clip of Object.values(CLIPS)) voices(clip.src).forEach((voice) => voice.load())
}

export const playCombat = (sound: Combat): void => {
  if (typeof window === 'undefined') return
  const clip = CLIPS[sound]
  const available = voices(clip.src)
  next = (next + 1) % available.length
  const voice = available[next]

  const fire = () => {
    voice.currentTime = 0
    voice.volume = clip.gain
    void voice.play().catch(() => undefined)
  }

  if (clip.delay === 0) fire()
  else window.setTimeout(fire, clip.delay)
}
