import { db, type Task, type TimeBlock } from '../db'
import { todayISO } from './date'
import { nextDueDate, type Repeat } from './repeat'
import { nextInRotation } from './spaces'
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
export async function addTask(input: {
  title: string
  priority: Priority
  dueDate?: string
  start?: string
  end?: string
  goalId?: string
  /** Für gemeinsame Bereiche: Bereich, dessen Realm und optional Zuweisung (E-Mail) */
  spaceId?: string
  realmId?: string
  assignee?: string
  repeat?: Repeat
  /** Haushalts-Rotation: Reihenfolge der E-Mails (nur gemeinsam + wiederkehrend) */
  rotation?: string[]
}) {
  const title = input.title.trim()
  if (!title) return
  // Wiederkehrende Aufgaben brauchen einen ersten Termin (ohne Angabe: heute)
  const dueDate = input.dueDate || (input.start || input.repeat ? todayISO() : undefined)

  await db.transaction('rw', db.tasks, db.timeBlocks, async () => {
    const taskId = await db.tasks.add({
      title,
      priority: input.priority,
      dueDate,
      done: false,
      createdAt: new Date().toISOString(),
      goalId: input.goalId,
      // Nur setzen, wenn vorhanden – ohne realmId landet die Aufgabe automatisch im privaten Bereich
      ...(input.spaceId ? { spaceId: input.spaceId, realmId: input.realmId } : {}),
      ...(input.assignee ? { assignee: input.assignee } : {}),
      ...(input.repeat ? { repeat: input.repeat } : {}),
      ...(input.repeat && input.spaceId && input.rotation?.length ? { rotation: input.rotation } : {}),
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

/**
 * Abhaken/wieder öffnen. Merkt sich, wer erledigt hat (für Punkte bei gemeinsamen Aufgaben).
 * Wiederkehrende Aufgabe erledigt → nächste Aufgabe wird angelegt (samt Uhrzeit im Tagesplan).
 * Wieder geöffnet → die automatisch angelegte, noch offene Nachfolgerin wird entfernt.
 * Gibt den nächsten Termin zurück, falls eine Wiederholung angelegt wurde.
 */
export async function toggleTask(task: Task): Promise<{ nextDue?: string; nextAssignee?: string }> {
  return db.transaction('rw', db.tasks, db.timeBlocks, async () => {
    if (task.done) {
      await db.tasks.update(task.id, { done: false, doneAt: undefined, doneBy: undefined })
      if (task.repeat) {
        const followers = await db.tasks.filter((t) => t.repeatFromId === task.id && !t.done).toArray()
        for (const f of followers) {
          await db.timeBlocks.where('taskId').equals(f.id).delete()
          await db.tasks.delete(f.id)
        }
      }
      return {}
    }

    await db.tasks.update(task.id, { done: true, doneAt: new Date().toISOString(), doneBy: db.cloud.currentUser.value?.email })
    if (!task.repeat) return {}

    // Schon eine Nachfolgerin da (z. B. abgehakt, zurückgenommen, erneut abgehakt)? Dann keine zweite.
    const existing = await db.tasks.filter((t) => t.repeatFromId === task.id).count()
    if (existing) return {}

    const today = todayISO()
    const due = task.dueDate ?? today
    const nextDue = nextDueDate(due, task.repeat, today)
    // Rotation: die nächste Person ist dran
    const nextAssignee = task.rotation?.length ? nextInRotation(task.rotation, task.assignee) : task.assignee
    const nextId = await db.tasks.add({
      title: task.title,
      notes: task.notes,
      priority: task.priority,
      dueDate: nextDue,
      done: false,
      createdAt: new Date().toISOString(),
      goalId: task.goalId,
      repeat: task.repeat,
      repeatFromId: task.id,
      ...(task.spaceId ? { spaceId: task.spaceId, realmId: task.realmId } : {}),
      ...(nextAssignee ? { assignee: nextAssignee } : {}),
      ...(task.rotation?.length ? { rotation: task.rotation } : {}),
    } as Task)
    // Uhrzeit mitnehmen: Block am Fälligkeitstag → gleicher Block am neuen Termin
    const block = (await db.timeBlocks.where('taskId').equals(task.id).toArray()).find((b) => b.date === due)
    if (block) {
      await db.timeBlocks.add({ date: nextDue, start: block.start, end: block.end, title: task.title, taskId: nextId } as TimeBlock)
    }
    return { nextDue, nextAssignee: task.rotation?.length ? nextAssignee : undefined }
  })
}

/**
 * Verschiebt offene Aufgaben auf einen anderen Tag („auf morgen“). Zeitblöcke der Aufgaben,
 * die an ihrem alten Termin oder heute im Tagesplan stehen, wandern mit (gleiche Uhrzeit).
 * Gibt eine Funktion für „Rückgängig“ zurück.
 */
export async function postponeTasks(tasks: Task[], toDate: string): Promise<() => Promise<void>> {
  const today = todayISO()
  const before: { id: string; dueDate?: string }[] = []
  const movedBlocks: { id: string; date: string }[] = []
  await db.transaction('rw', db.tasks, db.timeBlocks, async () => {
    for (const t of tasks) {
      before.push({ id: t.id, dueDate: t.dueDate })
      await db.tasks.update(t.id, { dueDate: toDate })
      const blocks = await db.timeBlocks.where('taskId').equals(t.id).toArray()
      for (const b of blocks.filter((b) => b.date === t.dueDate || b.date === today)) {
        movedBlocks.push({ id: b.id, date: b.date })
        await db.timeBlocks.update(b.id, { date: toDate })
      }
    }
  })
  return async () => {
    await db.transaction('rw', db.tasks, db.timeBlocks, async () => {
      for (const b of before) await db.tasks.update(b.id, { dueDate: b.dueDate })
      for (const b of movedBlocks) await db.timeBlocks.update(b.id, { date: b.date })
    })
  }
}

export async function updateTask(id: string, changes: Partial<Omit<Task, 'id'>>) {
  await db.tasks.update(id, changes)
}

export async function deleteTask(id: string) {
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
  changes: { title: string; notes?: string; priority: Priority; dueDate?: string; goalId?: string; assignee?: string; repeat?: Repeat; rotation?: string[] },
  time: { start: string; end: string },
  block?: TimeBlock,
) {
  const dueDate = changes.dueDate || (time.start || changes.repeat ? todayISO() : undefined)
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
