import { Link } from 'react-router-dom'
import type { Habit } from '../db'
import { habitStreaks, isDueOn } from '../lib/habits'
import { useToggleHabit } from './useToggleHabit'

interface Props {
  habits: Habit[]
  doneByHabit: Map<string, Set<string>>
  today: string
}

/** Die heute fälligen Gewohnheiten als kompakte Abhak-Liste für die Heute-Seite. */
export default function HabitsToday({ habits, doneByHabit, today }: Props) {
  const toggle = useToggleHabit()
  const dueToday = habits.filter((h) => isDueOn(h, today))
  const doneCount = dueToday.filter((h) => doneByHabit.get(h.id)?.has(today)).length

  if (habits.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        <span className="mb-2 block text-base font-semibold text-slate-900 dark:text-slate-100">Gewohnheiten</span>
        Noch keine Gewohnheiten.{' '}
        <Link to="/gewohnheiten" className="text-indigo-600 hover:underline dark:text-indigo-400">
          Jetzt anlegen →
        </Link>
      </p>
    )
  }
  if (dueToday.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        <span className="mb-2 block text-base font-semibold text-slate-900 dark:text-slate-100">Gewohnheiten</span>
        Heute ist keine Gewohnheit fällig. 🌿
      </p>
    )
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-semibold">Gewohnheiten</h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {doneCount} von {dueToday.length}
        </span>
      </div>
      <ul className="flex flex-wrap gap-2">
        {dueToday.map((h) => {
          const done = doneByHabit.get(h.id) ?? new Set<string>()
          const isDone = done.has(today)
          const streak = habitStreaks(h, done, today).current
          return (
            <li key={h.id}>
              <button
                onClick={() => toggle(h.id, today)}
                aria-pressed={isDone}
                className={`flex items-center gap-2 rounded-full py-1.5 pr-3 pl-2 text-sm transition ${
                  isDone
                    ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                    : 'bg-white ring-1 ring-slate-200 hover:ring-indigo-400 dark:bg-slate-900 dark:ring-slate-700'
                }`}
              >
                <span aria-hidden>{isDone ? '✓' : h.emoji || '✨'}</span>
                <span className={isDone ? 'line-through decoration-white/50' : ''}>{h.name}</span>
                {streak > 0 && (
                  <span className={`text-xs tabular-nums ${isDone ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                    🔥{streak}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
