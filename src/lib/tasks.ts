import { db, type Task } from '../db'

export type Priority = Task['priority']

export const PRIORITIES: { value: Priority; label: string; dot: string }[] = [
  { value: 1, label: 'Hoch', dot: 'bg-rose-500' },
  { value: 2, label: 'Mittel', dot: 'bg-amber-400' },
  { value: 3, label: 'Niedrig', dot: 'bg-slate-300 dark:bg-slate-600' },
]

export function priorityInfo(p: Priority) {
  return PRIORITIES.find((x) => x.value === p)!
}

export async function addTask(input: { title: string; priority: Priority; dueDate?: string }) {
  const title = input.title.trim()
  if (!title) return
  await db.tasks.add({
    title,
    priority: input.priority,
    dueDate: input.dueDate || undefined,
    done: false,
    createdAt: new Date().toISOString(),
  })
}

export async function toggleTask(task: Task) {
  await db.tasks.update(task.id, task.done
    ? { done: false, doneAt: undefined }
    : { done: true, doneAt: new Date().toISOString() })
}

export async function updateTask(id: number, changes: Partial<Omit<Task, 'id'>>) {
  await db.tasks.update(id, changes)
}

export async function deleteTask(id: number) {
  await db.tasks.delete(id)
}

/** Wiederherstellen nach „Rückgängig“ (gleiche ID). */
export async function restoreTask(task: Task) {
  await db.tasks.put(task)
}

/** Offene zuerst; dann Fälligkeit (ohne Datum zuletzt), Priorität, Erstellzeit. Erledigte: zuletzt erledigt oben. */
export function compareTasks(a: Task, b: Task): number {
  if (a.done !== b.done) return a.done ? 1 : -1
  if (a.done && b.done) return (b.doneAt ?? '').localeCompare(a.doneAt ?? '')
  const ad = a.dueDate ?? '9999-12-31'
  const bd = b.dueDate ?? '9999-12-31'
  if (ad !== bd) return ad.localeCompare(bd)
  if (a.priority !== b.priority) return a.priority - b.priority
  return a.createdAt.localeCompare(b.createdAt)
}
