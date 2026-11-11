import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Task } from '../db'
import TaskItem from './TaskItem'

interface Props {
  tasks: Task[]
  empty: string
  /** Aufgaben-ID → geplante Zeitspanne im Tagesplan. */
  scheduled?: Map<string, string>
}

export default function TaskList({ tasks, empty, scheduled }: Props) {
  // Ziele einmal pro Liste laden (für 🎯-Hinweis und Auswahl im Bearbeiten-Dialog).
  const goals = useLiveQuery(() => db.goals.toArray(), []) ?? []

  if (tasks.length === 0) {
    return <p className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">{empty}</p>
  }
  return (
    <ul className="grid gap-0.5">
      {tasks.map((t) => (
        <TaskItem key={t.id} task={t} scheduledAt={scheduled?.get(t.id)} goals={goals} />
      ))}
    </ul>
  )
}
