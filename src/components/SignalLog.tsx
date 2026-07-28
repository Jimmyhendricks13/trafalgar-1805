import type { Dispatch } from '../content/dispatches'

interface Props {
  readonly log: readonly Dispatch[]
}

const SIDE_LABEL: Record<Dispatch['side'], string> = {
  player: 'Combined Fleet',
  ai: 'Royal Navy',
  system: 'Signal',
}

export const SignalLog = ({ log }: Props) => (
  <section className="log" aria-label="Signal log">
    <h2 className="panel__heading">Signal log</h2>
    <ol className="log__list" aria-live="polite">
      {log.map((entry) => (
        <li key={entry.id} className={`log__entry log__entry--${entry.tone}`}>
          <span className="log__number">{String(entry.id).padStart(3, '0')}</span>
          <span className="log__side">{SIDE_LABEL[entry.side]}</span>
          <span className="log__text">{entry.text}</span>
        </li>
      ))}
    </ol>
  </section>
)
