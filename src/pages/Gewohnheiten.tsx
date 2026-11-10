import { useState } from 'react'
import HabitCard from '../components/HabitCard'
import HabitForm from '../components/HabitForm'
import PageHeader from '../components/PageHeader'
import { addDays, todayISO } from '../lib/date'
import { isDueOn } from '../lib/habits'
import { weekStart } from '../lib/points'
import { useHabits } from '../lib/useHabits'

function formatShort(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}

export default function Gewohnheiten() {
  const today = todayISO()
  const [weekOffset, setWeekOffset] = useState(0)
  const { habits, doneByHabit, loaded } = useHabits()

  const monday = addDays(weekStart(today), weekOffset * 7)
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i))

  // Wochenbilanz: fällige Tage bis heute vs. erledigt
  let due = 0
  let done = 0
  for (const h of habits ?? []) {
    for (const d of week) {
      if (d > today || !isDueOn(h, d)) continue
      due++
      if (doneByHabit.get(h.id)?.has(d)) done++
    }
  }
  const pct = due ? Math.round((done / due) * 100) : 0

  return (
    <div className="max-w-3xl">
      <PageHeader title="Gewohnheiten" subtitle="Kleine Routinen, jeden Tag ein Haken." />
      <HabitForm />

      {/* Wochen-Navigation + Wochenbilanz */}
      <div className="mt-6 mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            aria-label="Vorherige Woche"
            className="rounded-lg px-2 py-1 text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            ‹
          </button>
          <span className="min-w-36 text-center text-sm font-medium">
            {weekOffset === 0 ? 'Diese Woche' : `${formatShort(week[0])} – ${formatShort(week[6])}`}
          </span>
          <button
            onClick={() => setWeekOffset((w) => Math.min(0, w + 1))}
            disabled={weekOffset === 0}
            aria-label="Nächste Woche"
            className="rounded-lg px-2 py-1 text-slate-600 hover:bg-slate-200/70 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            ›
          </button>
        </div>
        {due > 0 && (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            <strong className="text-slate-900 tabular-nums dark:text-slate-100">{done}</strong> von {due} erledigt ({pct} %)
          </span>
        )}
      </div>

      {loaded && habits!.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Noch keine Gewohnheiten. Leg oben deine erste an – z. B. „💧 2 Liter trinken“.
        </p>
      )}

      <ul className="grid gap-3">
        {(habits ?? []).map((h) => (
          <HabitCard key={h.id} habit={h} done={doneByHabit.get(h.id) ?? new Set()} week={week} today={today} />
        ))}
      </ul>
    </div>
  )
}
