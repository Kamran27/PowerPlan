import { db, type Subtask, type Task } from '../db'

/*
 * Unteraufgaben: eine kleine Checkliste in einer Aufgabe („Urlaub vorbereiten“ → Pass, Koffer, Katzen).
 * Sie liegen direkt in der Aufgabe (kein eigener Tisch) und werden mit ihr geteilt und synchronisiert.
 */

/** Fortschritt einer Checkliste, oder null ohne Unteraufgaben. */
export function subtaskProgress(list: Subtask[] | undefined): { done: number; total: number; pct: number } | null {
  if (!list?.length) return null
  const done = list.filter((s) => s.done).length
  return { done, total: list.length, pct: Math.round((done / list.length) * 100) }
}

function newId() {
  return Math.random().toString(36).slice(2, 10)
}

export async function addSubtask(task: Task, title: string) {
  const t = title.trim()
  if (!t) return
  await db.tasks.update(task.id, { subtasks: [...(task.subtasks ?? []), { id: newId(), title: t, done: false }] })
}

export async function toggleSubtask(task: Task, id: string) {
  await db.tasks.update(task.id, { subtasks: (task.subtasks ?? []).map((s) => (s.id === id ? { ...s, done: !s.done } : s)) })
}

export async function deleteSubtask(task: Task, id: string) {
  const rest = (task.subtasks ?? []).filter((s) => s.id !== id)
  await db.tasks.update(task.id, { subtasks: rest.length ? rest : undefined })
}
