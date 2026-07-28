import { useEffect, useRef } from 'react'
import type { Dispatch } from '../content/dispatches'

interface Props {
  readonly log: readonly Dispatch[]
}

const SIDE_LABEL: Record<Dispatch['side'], string> = {
  player: 'Combined Fleet',
  ai: 'Royal Navy',
  system: 'Signal',
}

/** Sets a struck ship's name apart from the sentence it opens. */
const body = (entry: Dispatch) => {
  if (!entry.ship || !entry.text.startsWith(entry.ship)) return entry.text
  return (
    <>
      <span className="log__ship">{entry.ship}</span>
      {entry.text.slice(entry.ship.length)}
    </>
  )
}

export const SignalLog = ({ log }: Props) => {
  const scroller = useRef<HTMLElement>(null)
  const newest = log[0]?.id ?? 0

  // Newest first, so the latest dispatch is at the top of the roll.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [newest])

  return (
    <section className="log" aria-label="Signal log" ref={scroller}>
      <h2 className="panel__heading">Signal log</h2>
      <ol className="log__list" aria-live="polite">
        {log.map((entry) => (
          <li key={entry.id} className={`log__entry log__entry--${entry.tone}`}>
            <span className="log__number">{String(entry.id).padStart(3, '0')}</span>
            <span className="log__side">{SIDE_LABEL[entry.side]}</span>
            <span className="log__text">{body(entry)}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
