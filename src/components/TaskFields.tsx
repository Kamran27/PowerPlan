import { CalendarDays, Clock, Target, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { addDays, formatDayShort, todayISO } from '../lib/date'
import { PRIORITIES, type Priority } from '../lib/tasks'
import type { Repeat } from '../lib/repeat'
import RepeatSelect from './RepeatSelect'
import TimeRangeInput from './TimeRangeInput'
import { AREAS, type Area, type AreaFilter } from '../lib/area'
import { bareSelect, pill, pillActive } from '../lib/pillStyles'

/*
 * Gemeinsame „Pillen“ für die Aufgaben-Masken (Neue Aufgabe und Bearbeiten):
 * Priorität, Datum (Heute/Morgen/Kalender), Uhrzeit, Wiederholen und Auswahllisten.
 */

export function PriorityPills({ value, onChange }: { value: Priority; onChange: (p: Priority) => void }) {
  return (
    <div role="radiogroup" aria-label="Priorität" className="flex rounded-full bg-slate-100 p-0.5 dark:bg-slate-800">
      {[...PRIORITIES].reverse().map((p) => (
        <button
          key={p.value}
          type="button"
          role="radio"
          aria-checked={value === p.value}
          onClick={() => onChange(p.value)}
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition ${
            value === p.value
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <span className={`size-2 rounded-full ${p.dot}`} />
          {p.label}
        </button>
      ))}
    </div>
  )
}

export function DatePills({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const today = todayISO()
  const tomorrow = addDays(today, 1)
  const mode = !value ? 'none' : value === today ? 'today' : value === tomorrow ? 'tomorrow' : 'other'
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => onChange(today)} aria-pressed={mode === 'today'} className={`${pill} ${mode === 'today' ? pillActive : ''}`}>
        Heute
      </button>
      <button type="button" onClick={() => onChange(tomorrow)} aria-pressed={mode === 'tomorrow'} className={`${pill} ${mode === 'tomorrow' ? pillActive : ''}`}>
        Morgen
      </button>
      <label className={`${pill} relative ${mode === 'other' ? pillActive : ''}`} title="Anderes Datum wählen">
        <CalendarDays aria-hidden className="size-3.5 shrink-0" />
        {mode === 'other' && <span>{formatDayShort(value)}</span>}
        {/* Unsichtbares Datumsfeld über der Pille: Klick öffnet den Kalender */}
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => {
            try {
              e.currentTarget.showPicker()
            } catch {
              /* ältere Browser: Feld bekommt den Fokus */
            }
          }}
          aria-label="Fällig am"
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Kein Datum"
          title="Kein Datum"
          className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

export function TimePill({
  start,
  end,
  onChange,
  clearLabel = 'Keine Zeit',
}: {
  start: string
  end: string
  onChange: (start: string, end: string) => void
  clearLabel?: string
}) {
  return (
    <span className={`${pill} ${start ? pillActive : ''}`}>
      <Clock aria-hidden className="size-3.5 shrink-0" />
      <TimeRangeInput start={start} end={end} onChange={onChange} className="rounded-md px-0.5" />
      {start && (
        <button
          type="button"
          onClick={() => onChange('', '')}
          aria-label={clearLabel}
          title={clearLabel}
          className="rounded-full p-0.5 text-slate-400 hover:text-slate-600"
        >
          <X className="size-3.5" />
        </button>
      )}
    </span>
  )
}

export function RepeatPill({ value, onChange }: { value: Repeat | ''; onChange: (r: Repeat | '') => void }) {
  return (
    <span className={`${pill} ${value ? pillActive : ''}`}>
      <RepeatSelect value={value} onChange={onChange} className={bareSelect} />
    </span>
  )
}

/** Auswahlliste als Pille (Zuständig, Monatsziel …) */
export function SelectPill({
  value,
  onChange,
  label,
  active,
  icon,
  children,
}: {
  value: string
  onChange: (v: string) => void
  label: string
  active: boolean
  icon?: 'goal'
  children: ReactNode
}) {
  return (
    <span className={`${pill} max-w-full ${active ? pillActive : ''}`}>
      {icon === 'goal' && <Target aria-hidden className="size-3.5 shrink-0" />}
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className={`${bareSelect} max-w-52 truncate`}>
        {children}
      </select>
    </span>
  )
}

export function RotatePill({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={`${pill} cursor-pointer ${checked ? pillActive : ''}`} title="Nach jedem Erledigen ist die nächste Person dran">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-3.5 accent-indigo-600" />
      🔄 Abwechselnd
    </label>
  )
}

/** Privat oder Arbeit */
export function AreaPills({ value, onChange }: { value: Area; onChange: (a: Area) => void }) {
  return (
    <div role="radiogroup" aria-label="Bereich" className="flex rounded-full bg-slate-100 p-0.5 dark:bg-slate-800">
      {AREAS.map((a) => (
        <button
          key={a.value}
          type="button"
          role="radio"
          aria-checked={value === a.value}
          onClick={() => onChange(a.value)}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${
            value === a.value
              ? a.value === 'arbeit'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <span aria-hidden>{a.emoji}</span>
          {a.label}
        </button>
      ))}
    </div>
  )
}

/** Filter: Alle · Privat · Arbeit */
export function AreaFilterPills({ value, onChange }: { value: AreaFilter; onChange: (f: AreaFilter) => void }) {
  const opts: { value: AreaFilter; label: string }[] = [{ value: 'alle', label: 'Alle' }, ...AREAS.map((a) => ({ value: a.value as AreaFilter, label: `${a.emoji} ${a.label}` }))]
  return (
    <div role="radiogroup" aria-label="Privat oder Arbeit anzeigen" className="flex rounded-full bg-slate-100 p-0.5 text-xs dark:bg-slate-800">
      {opts.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-2.5 py-1 font-medium transition ${
            value === o.value ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
