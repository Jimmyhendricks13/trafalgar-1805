import { useEffect, useRef } from 'react'

export const MARSEILLAISE = '/audio/la-marseillaise.mp3'
export const GOD_SAVE_THE_KING = '/audio/god-save-the-king.mp3'

const FADE_MS = 1000
const FADE_STEP_MS = 40
/** Band at a distance, not a parade ground. The tail fade is cut into the file. */
const FULL_VOLUME = 0.7

/** Brings an anthem up from silence over the first second, and stops it on the way out. */
export const useAnthem = (src: string, muted: boolean): void => {
  const track = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const anthem = new Audio(src)
    anthem.volume = 0
    track.current = anthem
    // Blocked before the player has touched the page, which is a reasonable refusal.
    void anthem.play().catch(() => undefined)

    const opened = performance.now()
    const fade = window.setInterval(() => {
      const through = Math.min(1, (performance.now() - opened) / FADE_MS)
      anthem.volume = through * FULL_VOLUME
      if (through === 1) window.clearInterval(fade)
    }, FADE_STEP_MS)

    return () => {
      window.clearInterval(fade)
      anthem.pause()
      track.current = null
    }
  }, [src])

  useEffect(() => {
    if (track.current) track.current.muted = muted
  }, [muted])
}
