import type { DispatchTone } from './content/dispatches'

let context: AudioContext | null = null

const audio = (): AudioContext | null => {
  if (typeof window === 'undefined') return null
  if (!context) context = new AudioContext()
  if (context.state === 'suspended') void context.resume()
  return context
}

/** Filtered noise: a cannon at a distance is a thud with a long tail, not a beep. */
const boom = (
  ctx: AudioContext,
  { duration, cutoff, gain }: { duration: number; cutoff: number; gain: number },
) => {
  const frames = Math.floor(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate)
  const channel = buffer.getChannelData(0)
  for (let i = 0; i < frames; i += 1) {
    const decay = (1 - i / frames) ** 2.2
    channel[i] = (Math.random() * 2 - 1) * decay
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = cutoff

  const volume = ctx.createGain()
  volume.gain.value = gain

  source.connect(filter).connect(volume).connect(ctx.destination)
  source.start()
}

export const playTone = (tone: DispatchTone): void => {
  const ctx = audio()
  if (!ctx) return
  if (tone === 'hit') boom(ctx, { duration: 0.7, cutoff: 420, gain: 0.35 })
  else if (tone === 'sunk') boom(ctx, { duration: 1.6, cutoff: 260, gain: 0.45 })
  else if (tone === 'grave') boom(ctx, { duration: 2.6, cutoff: 180, gain: 0.5 })
  else boom(ctx, { duration: 0.45, cutoff: 900, gain: 0.14 })
}
