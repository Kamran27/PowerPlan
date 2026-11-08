import type { Task } from '../db'
import TaskItem from './TaskItem'

export default function TaskList({ tasks, empty }: { tasks: Task[]; empty: string }) {
  if (tasks.length === 0) {
    return <p className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">{empty}</p>
  }
  return (
    <ul className="grid gap-0.5">
      {tasks.map((t) => (
        <TaskItem key={t.id} task={t} />
      ))}
    </ul>
  )
}
