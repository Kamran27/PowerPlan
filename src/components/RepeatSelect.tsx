import { REPEAT_OPTIONS, type Repeat } from '../lib/repeat'

/** Auswahl „Wiederholen“: einmalig, täglich, werktags, wöchentlich … */
export default function RepeatSelect({
  value,
  onChange,
  className,
}: {
  value: Repeat | ''
  onChange: (r: Repeat | '') => void
  className?: string
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as Repeat | '')} aria-label="Wiederholen" className={className}>
      <option value="">🔁 Einmalig</option>
      {REPEAT_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          🔁 {o.label}
        </option>
      ))}
    </select>
  )
}
