import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Task } from '../db'
import TaskItem from './TaskItem'
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

  if (tasks.length === 0) {
    return (
      <div className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        <SleepingCat className="mx-auto mb-2 w-24 text-slate-300 dark:text-slate-600" />
        {empty}
      </div>
    )
  }
  return (
    <ul className="grid gap-0.5">
      {tasks.map((t) => (
        <TaskItem key={t.id} task={t} scheduledAt={scheduled?.get(t.id)} goals={goals} spaces={spaces} compact={compact} />
      ))}
    </ul>
  )
}
