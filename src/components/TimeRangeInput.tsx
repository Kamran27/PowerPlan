import { DEFAULT_DURATION, fromMinutes, MAX_END, toMinutes } from '../lib/time'

interface Props {
  start: string
  end: string
  onChange: (start: string, end: string) => void
  className: string
}

/**
 * Zwei Uhrzeitfelder „Beginn – Ende“ (15-Minuten-Raster).
 * - Beginn setzen: Ende folgt automatisch (gleiche Dauer wie bisher, sonst 1 Stunde)
 * - Beginn leeren: Ende wird ebenfalls geleert
 * - Ende ist erst wählbar, wenn ein Beginn gesetzt ist
 */
export default function TimeRangeInput({ start, end, onChange, className }: Props) {
  function changeStart(value: string) {
    if (!value) return onChange('', '')
    const oldDuration = start && end ? toMinutes(end) - toMinutes(start) : 0
    const duration = oldDuration > 0 ? oldDuration : DEFAULT_DURATION
    onChange(value, fromMinutes(Math.min(toMinutes(value) + duration, MAX_END)))
  }

  return (
    <span className="flex items-center gap-1">
      <input
        type="time"
        step={900}
        value={start}
        onChange={(e) => changeStart(e.target.value)}
        aria-label="Beginn"
        title="Beginn – mit Uhrzeit landet die Aufgabe im Tagesplan"
        className={className}
      />
      <span className="text-slate-400" aria-hidden>
        –
      </span>
      <input
        type="time"
        step={900}
        value={end}
        onChange={(e) => onChange(start, e.target.value)}
        disabled={!start}
        aria-label="Ende"
        title={start ? 'Ende' : 'Erst einen Beginn wählen'}
        className={`${className} disabled:opacity-40`}
      />
    </span>
  )
}
