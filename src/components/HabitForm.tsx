import { useState, type FormEvent } from 'react'
import type { Habit } from '../db'
import { addHabit, ALL_DAYS, describeDays, updateHabit, WEEKDAY_SHORT } from '../lib/habits'
import { useToast } from './Toast'

const fieldClass =
  'rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800'

const PRESETS: { label: string; days: number[] }[] = [
  { label: 'Täglich', days: ALL_DAYS },
  { label: 'Werktags', days: [0, 1, 2, 3, 4] },
  { label: 'Wochenende', days: [5, 6] },
]

/** Formular zum Anlegen (ohne `habit`) oder Bearbeiten einer Gewohnheit. */
export default function HabitForm({ habit, onDone }: { habit?: Habit; onDone?: () => void }) {
  const [name, setName] = useState(habit?.name ?? '')
  const [emoji, setEmoji] = useState(habit?.emoji ?? '')
  const [days, setDays] = useState<number[]>(habit?.days ?? ALL_DAYS)
  const toast = useToast()

  const canSave = !!name.trim() && days.length > 0

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!canSave) return
    try {
      if (habit) {
        await updateHabit(habit.id, { name: name.trim(), emoji: emoji.trim() || undefined, days })
      } else {
        await addHabit({ name, emoji, days })
        setName('')
        setEmoji('')
      }
      onDone?.()
    } catch (err) {
      console.error(err)
      toast('Speichern fehlgeschlagen – bitte noch einmal versuchen.')
    }
  }

  return (
    <form
      onSubmit={submit}
      onKeyDown={(e) => e.key === 'Escape' && onDone?.()}
      className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
    >
      <div className="flex gap-2">
        <input
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          placeholder="🏃"
          aria-label="Symbol (Emoji, optional)"
          title="Symbol (Emoji, optional)"
          maxLength={8}
          className={`${fieldClass} w-12 text-center`}
        />
        <input
          autoFocus={!!habit}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={habit ? 'Name' : 'Neue Gewohnheit, z. B. 10 Min. lesen'}
          aria-label="Name der Gewohnheit"
          className={`${fieldClass} min-w-0 flex-1`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((p) => {
          const active = [...days].sort().join() === p.days.join()
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => setDays(p.days)}
              aria-pressed={active}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                active
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800'
              }`}
            >
              {p.label}
            </button>
          )
        })}
        <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" aria-hidden />
        {WEEKDAY_SHORT.map((label, d) => (
          <button
            key={label}
            type="button"
            onClick={() => toggleDay(d)}
            aria-pressed={days.includes(d)}
            aria-label={`${label} ${days.includes(d) ? 'aktiv' : 'inaktiv'}`}
            className={`size-8 rounded-full text-xs font-semibold ${
              days.includes(d)
                ? 'bg-indigo-600 text-white'
                : 'text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100 dark:text-slate-400 dark:ring-slate-700 dark:hover:bg-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {days.length ? `Rhythmus: ${describeDays(days)}` : 'Mindestens einen Tag wählen'}
        </span>
        <div className="ml-auto flex gap-2">
          {onDone && habit && (
            <button type="button" onClick={onDone} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
              Abbrechen
            </button>
          )}
          <button
            type="submit"
            disabled={!canSave}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
          >
            {habit ? 'Speichern' : 'Hinzufügen'}
          </button>
        </div>
      </div>
    </form>
  )
}
