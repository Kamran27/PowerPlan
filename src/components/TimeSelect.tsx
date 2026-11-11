const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

interface Props {
  /** "HH:MM" oder '' (leer) */
  value: string
  onChange: (value: string) => void
  /** Bezeichnung für Screenreader, z. B. „Beginn“ */
  label: string
  /** Leer erlaubt (Option „--“)? Standard: ja */
  allowEmpty?: boolean
  disabled?: boolean
  title?: string
  className?: string
}

/**
 * Uhrzeit im 24-Stunden-Format – unabhängig von der Systemsprache des Geräts.
 * (Das eingebaute <input type="time"> zeigt je nach Gerät AM/PM an.)
 * Zwei Auswahllisten: Stunde 00–23 und Minute in 5er-Schritten.
 */
export default function TimeSelect({ value, onChange, label, allowEmpty = true, disabled, title, className = '' }: Props) {
  const [h, m] = value ? value.split(':') : ['', '']
  // Krumme Minuten (z. B. aus älteren Daten) trotzdem anzeigen können
  const minutes = m && !MINUTES.includes(m) ? [...MINUTES, m].sort() : MINUTES

  const select =
    'cursor-pointer appearance-none bg-transparent text-center tabular-nums outline-none disabled:cursor-default'

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-0.5 focus-within:ring-2 focus-within:ring-indigo-400 ${disabled ? 'opacity-40' : ''} ${className}`}
    >
      <select
        value={h}
        disabled={disabled}
        aria-label={`${label}: Stunde`}
        onChange={(e) => {
          const hour = e.target.value
          onChange(hour ? `${hour}:${m || '00'}` : '')
        }}
        className={`${select} w-7`}
      >
        {(allowEmpty || !h) && <option value="">--</option>}
        {HOURS.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
      <span aria-hidden className="text-slate-400">
        :
      </span>
      <select
        value={m}
        disabled={disabled || !h}
        aria-label={`${label}: Minute`}
        onChange={(e) => onChange(`${h}:${e.target.value}`)}
        className={`${select} w-7`}
      >
        {!h && <option value="">--</option>}
        {minutes.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
      <span className="ml-0.5 text-xs text-slate-400" aria-hidden>
        Uhr
      </span>
    </span>
  )
}
