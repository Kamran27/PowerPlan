import type { Task } from '../db'
import TaskItem from './TaskItem'

interface Props {
  tasks: Task[]
  empty: string
  /** Aufgaben-ID → Startzeit im heutigen Tagesplan. */
  scheduled?: Map<number, string>
}

export default function TaskList({ tasks, empty, scheduled }: Props) {
  if (tasks.length === 0) {
    return <p className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">{empty}</p>
  }
  return (
    <ul className="grid gap-0.5">
      {tasks.map((t) => (
        <TaskItem key={t.id} task={t} scheduledAt={scheduled?.get(t.id)} />
      ))}
    </ul>
  )
}
