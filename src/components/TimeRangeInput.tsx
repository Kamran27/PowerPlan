import { DEFAULT_DURATION, fromMinutes, MAX_END, toMinutes } from '../lib/time'
import TimeSelect from './TimeSelect'

interface Props {
  start: string
  end: string
  onChange: (start: string, end: string) => void
  className: string
}

/**
 * Zwei Uhrzeitfelder „Beginn – Ende“ im 24-Stunden-Format.
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
      <TimeSelect
        value={start}
        onChange={changeStart}
        label="Beginn"
        title="Beginn – mit Uhrzeit landet die Aufgabe im Tagesplan"
        className={className}
      />
      <span className="text-slate-400" aria-hidden>
        –
      </span>
      <TimeSelect
        value={end}
        onChange={(v) => onChange(start, v)}
        label="Ende"
        allowEmpty={false}
        disabled={!start}
        title={start ? 'Ende' : 'Erst einen Beginn wählen'}
        className={className}
      />
    </span>
  )
}
