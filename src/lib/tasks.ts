import { db, type Task, type TimeBlock } from '../db'
import { todayISO } from './date'
import { resolveEnd } from './time'

export type Priority = Task['priority']

export const PRIORITIES: { value: Priority; label: string; dot: string }[] = [
  { value: 1, label: 'Hoch', dot: 'bg-rose-500' },
  { value: 2, label: 'Mittel', dot: 'bg-amber-400' },
  { value: 3, label: 'Niedrig', dot: 'bg-slate-300 dark:bg-slate-600' },
]

export function priorityInfo(p: Priority) {
  return PRIORITIES.find((x) => x.value === p)!
}

/**
 * Legt eine Aufgabe an. Mit Uhrzeit (`start`, optional `end`, "HH:MM") wird sie zusätzlich als
 * Block (ohne Ende: 1 Stunde) in den Tagesplan des Fälligkeitstags eingetragen (ohne Datum: heute).
 */
export async function addTask(input: { title: string; priority: Priority; dueDate?: string; start?: string; end?: string }) {
  const title = input.title.trim()
  if (!title) return
  const dueDate = input.dueDate || (input.start ? todayISO() : undefined)

  await db.transaction('rw', db.tasks, db.timeBlocks, async () => {
    const taskId = await db.tasks.add({
      title,
      priority: input.priority,
      dueDate,
      done: false,
      createdAt: new Date().toISOString(),
    } as Task)
    if (input.start && dueDate) {
      await db.timeBlocks.add({
        date: dueDate,
        start: input.start,
        end: resolveEnd(input.start, input.end),
        title,
        taskId,
      } as TimeBlock)
    }
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

/**
 * Der Tagesplan-Block, der zu einer Aufgabe gehört: bevorzugt der am Fälligkeitstag,
 * sonst der früheste ab heute.
 */
export async function findTaskBlock(task: Task): Promise<TimeBlock | undefined> {
  const blocks = await db.timeBlocks.where('taskId').equals(task.id).toArray()
  const onDue = blocks.find((b) => b.date === task.dueDate)
  if (onDue) return onDue
  const today = todayISO()
  return blocks
    .filter((b) => b.date >= today)
    .sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`))[0]
}

/**
 * Speichert eine bearbeitete Aufgabe samt Uhrzeit (alles oder nichts):
 * - mit Beginn: vorhandenen Block anpassen (Datum, Zeit, Titel) oder neu anlegen; ohne Datum gilt heute
 * - ohne Beginn: vorhandenen Block aus dem Tagesplan entfernen
 */
export async function saveTaskWithTime(
  task: Task,
  changes: { title: string; notes?: string; priority: Priority; dueDate?: string },
  time: { start: string; end: string },
  block?: TimeBlock,
) {
  const dueDate = changes.dueDate || (time.start ? todayISO() : undefined)
  await db.transaction('rw', db.tasks, db.timeBlocks, async () => {
    await db.tasks.update(task.id, { ...changes, dueDate })
    if (time.start && dueDate) {
      const data = { date: dueDate, start: time.start, end: resolveEnd(time.start, time.end), title: changes.title, taskId: task.id }
      if (block) await db.timeBlocks.update(block.id, data)
      else await db.timeBlocks.add(data as TimeBlock)
    } else if (block) {
      await db.timeBlocks.delete(block.id)
    }
  })
}
