import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Task } from '../db'
import TaskItem from './TaskItem'
import { useFocusTotals } from '../lib/focusTotals'
import { compareTasks } from '../lib/tasks'
import { SleepingCat } from './Cats'

interface Props {
  tasks: Task[]
  empty: string
  /** Aufgaben-ID → geplante Zeitspanne im Tagesplan. */
  scheduled?: Map<string, string>
  /** Schmale Spalte: Knöpfe nur beim Darüberfahren */
  compact?: boolean
}

export default function TaskList({ tasks, empty, scheduled, compact }: Props) {
  // Ziele einmal pro Liste laden (für 🎯-Hinweis und Auswahl im Bearbeiten-Dialog).
  const goals = useLiveQuery(() => db.goals.toArray(), []) ?? []
  // Gemeinsame Bereiche (für 👥-Hinweis und Zuweisung)
  const spaces = useLiveQuery(() => db.spaces.toArray(), []) ?? []
  const focusTotals = useFocusTotals()

  if (tasks.length === 0) {
    if (!empty) return null
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 px-3 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <SleepingCat className="mx-auto mb-2 w-24 text-slate-300 dark:text-slate-600" />
        {empty}
      </div>
    )
  }
  return (
    // Hübsch im Rahmen: eine Karte, Aufgaben mit feinen Trennlinien
    <ul className="divide-y divide-slate-100 overflow-visible rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200 dark:divide-slate-800/70 dark:bg-slate-900 dark:ring-slate-800">
      {/* Immer nach Datum (und Uhrzeit im Tagesplan) sortiert */}
      {[...tasks].sort((a, b) => compareTasks(a, b, scheduled)).map((t) => (
        <TaskItem key={t.id} task={t} scheduledAt={scheduled?.get(t.id)} goals={goals} spaces={spaces} compact={compact} focusMinutes={focusTotals.get(t.id)} />
      ))}
    </ul>
  )
}
