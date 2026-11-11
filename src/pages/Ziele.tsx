import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import GoalCard from '../components/GoalCard'
import PageHeader from '../components/PageHeader'
import WeekFocus from '../components/WeekFocus'
import { db } from '../db'
import { addDays, todayISO } from '../lib/date'
import { addGoal, addMonths, monthLabel, monthOf } from '../lib/goals'
import { weekStart } from '../lib/points'

function formatShort(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}

const navBtn =
  'rounded-lg px-2 py-1 text-slate-600 hover:bg-slate-200/70 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800'

export default function Ziele() {
  const today = todayISO()
  const [weekOffset, setWeekOffset] = useState(0)
  const [month, setMonth] = useState(monthOf(today))
  const [newGoal, setNewGoal] = useState('')

  const week = addDays(weekStart(today), weekOffset * 7)
  const goals = useLiveQuery(() => db.goals.where('month').equals(month).toArray(), [month])
  const tasks = useLiveQuery(() => db.tasks.filter((t) => !!t.goalId).toArray(), [])

  async function submitGoal(e: FormEvent) {
    e.preventDefault()
    if (!newGoal.trim()) return
    const t = newGoal
    setNewGoal('')
    await addGoal(t, month)
  }

  const sorted = [...(goals ?? [])].sort((a, b) => Number(!!a.achievedAt) - Number(!!b.achievedAt) || a.createdAt.localeCompare(b.createdAt))
  const achievedCount = sorted.filter((g) => g.achievedAt).length

  return (
    <div className="max-w-3xl">
      <PageHeader title="Ziele" subtitle="Was diese Woche und diesen Monat wirklich zählt." />

      {/* Wochenfokus */}
      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Wochenfokus – Top 3</h2>
          <div className="flex items-center gap-1 text-sm">
            <button onClick={() => setWeekOffset((w) => w - 1)} aria-label="Vorherige Woche" className={navBtn}>
              ‹
            </button>
            <span className="min-w-36 text-center font-medium">
              {weekOffset === 0 ? 'Diese Woche' : weekOffset === 1 ? 'Nächste Woche' : `${formatShort(week)} – ${formatShort(addDays(week, 6))}`}
            </span>
            <button onClick={() => setWeekOffset((w) => Math.min(1, w + 1))} disabled={weekOffset >= 1} aria-label="Nächste Woche" className={navBtn}>
              ›
            </button>
          </div>
        </div>
        <WeekFocus week={week} />
        <p className="mt-2 px-1 text-xs text-slate-500 dark:text-slate-400">
          Tipp: Text eintippen und Enter drücken. Jeder erledigte Fokus bringt 25 Punkte.
        </p>
      </section>

      {/* Monatsziele */}
      <section className="mt-8">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">
            Monatsziele
            {sorted.length > 0 && (
              <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
                {achievedCount} von {sorted.length} erreicht
              </span>
            )}
          </h2>
          <div className="flex items-center gap-1 text-sm">
            <button onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Vorheriger Monat" className={navBtn}>
              ‹
            </button>
            <span className="min-w-36 text-center font-medium">{monthLabel(month)}</span>
            <button onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Nächster Monat" className={navBtn}>
              ›
            </button>
          </div>
        </div>

        <form
          onSubmit={submitGoal}
          className="flex gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
        >
          <input
            value={newGoal}
            onChange={(e) => setNewGoal(e.target.value)}
            placeholder={`Neues Ziel für ${monthLabel(month).split(' ')[0]}, z. B. „SAP-Präsentation halten“`}
            aria-label="Neues Monatsziel"
            className="min-w-0 flex-1 bg-transparent px-2 py-1.5 outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!newGoal.trim()}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
          >
            Hinzufügen
          </button>
        </form>

        {goals && sorted.length === 0 && (
          <p className="mt-3 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Noch keine Ziele für {monthLabel(month)}.
          </p>
        )}
        <ul className="mt-3 grid gap-3">
          {sorted.map((g) => (
            <GoalCard key={g.id} goal={g} tasks={tasks ?? []} />
          ))}
        </ul>
      </section>
    </div>
  )
}
