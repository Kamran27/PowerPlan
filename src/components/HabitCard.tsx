import { useState } from 'react'
import type { Habit } from '../db'
import { deleteHabit, describeDays, habitStreaks, isDueOn, WEEKDAY_SHORT } from '../lib/habits'
import HabitForm from './HabitForm'
import { useToast } from './Toast'
import { useToggleHabit } from './useToggleHabit'

interface Props {
  habit: Habit
  done: Set<string>
  /** Die 7 Tage (Mo–So) der angezeigten Woche. */
  week: string[]
  today: string
}

/** Eine Gewohnheit mit Streak und Wochenraster zum Abhaken. */
export default function HabitCard({ habit, done, week, today }: Props) {
  const [editing, setEditing] = useState(false)
  const toggle = useToggleHabit()
  const toast = useToast()
  const streak = habitStreaks(habit, done, today)

  async function remove() {
    const undo = await deleteHabit(habit)
    toast(`„${habit.name}“ gelöscht`, { label: 'Rückgängig', onClick: undo })
  }

  if (editing) return <HabitForm habit={habit} onDone={() => setEditing(false)} />

  return (
    <li className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none" aria-hidden>
          {habit.emoji || '✨'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-medium">{habit.name}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{describeDays(habit.days)}</div>
        </div>
        <div className="text-right text-sm" title={`Bester Streak: ${streak.best}`}>
          <span aria-hidden>🔥</span> <strong className="tabular-nums">{streak.current}</strong>
          <div className="text-xs text-slate-500 dark:text-slate-400">Best: {streak.best}</div>
        </div>
      </div>

      {/* Wochenraster */}
      <div className="mt-3 grid grid-cols-7 gap-1">
        {week.map((date, i) => {
          const due = isDueOn(habit, date)
          const isDone = done.has(date)
          const future = date > today
          const missed = due && !isDone && date < today
          const label = `${WEEKDAY_SHORT[i]}: ${!due ? 'nicht fällig' : isDone ? 'erledigt' : future ? 'kommt noch' : missed ? 'verpasst' : 'offen'}`
          return (
            <div key={date} className="flex flex-col items-center gap-1">
              <span className={`text-[10px] ${date === today ? 'font-bold text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>
                {WEEKDAY_SHORT[i]}
              </span>
              <button
                type="button"
                disabled={!due || future}
                onClick={() => toggle(habit.id, date)}
                aria-label={label}
                aria-pressed={isDone}
                title={label}
                className={`flex size-8 items-center justify-center rounded-full text-sm transition ${
                  isDone
                    ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                    : !due
                      ? 'text-slate-300 dark:text-slate-700'
                      : future
                        ? 'border border-dashed border-slate-300 dark:border-slate-700'
                        : missed
                          ? 'text-rose-400 ring-1 ring-rose-200 hover:bg-rose-50 dark:ring-rose-500/30 dark:hover:bg-rose-500/10'
                          : 'ring-2 ring-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10'
                }`}
              >
                {isDone ? '✓' : !due ? '–' : missed ? '✗' : ''}
              </button>
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex justify-end gap-3 text-xs opacity-0 transition group-hover:opacity-100 focus-within:opacity-100 max-md:opacity-100">
        <button onClick={() => setEditing(true)} className="text-slate-500 hover:underline">
          Bearbeiten
        </button>
        <button onClick={remove} className="text-rose-600 hover:underline dark:text-rose-400">
          Löschen
        </button>
      </div>
    </li>
  )
}
