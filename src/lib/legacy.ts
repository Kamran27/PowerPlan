import Dexie from 'dexie'
import { db, LEGACY_DB_NAME, type DayLog, type FocusItem, type Goal, type Habit, type Task, type TimeBlock } from '../db'
import { readStore, writeStore } from './storage'

/*
 * Übernahme von Daten aus der Zeit vor der Cloud (alte lokale Datenbank „powerplan“
 * oder alte Sicherungsdateien, Version 1–3). Dort waren IDs fortlaufende Zahlen;
 * hier bekommen alle Einträge neue Cloud-IDs, und Verknüpfungen (Aufgabe ↔ Ziel,
 * Block ↔ Aufgabe, Haken ↔ Gewohnheit, Fokus ↔ Ziel) werden umgeschrieben.
 */

type OldId = number | string
/** Alte Datensätze: wie die neuen, aber mit Zahlen-IDs. */
type Old<T> = Omit<T, 'id' | 'goalId' | 'taskId' | 'habitId'> & { id?: OldId; goalId?: OldId; taskId?: OldId; habitId?: OldId }

export interface LegacyData {
  tasks: Old<Task>[]
  timeBlocks: Old<TimeBlock>[]
  dayLogs: Old<DayLog>[]
  habits: Old<Habit>[]
  habitChecks: { habitId: OldId; date: string; doneAt: string }[]
  goals: Old<Goal>[]
  weekFocus: Old<FocusItem>[]
}

/** Kopie ohne alte ID (die Cloud vergibt eine neue). */
function withoutId<T extends { id?: unknown }>(o: T): Omit<T, 'id'> {
  const copy = { ...o }
  delete copy.id
  return copy
}

export function countLegacy(d: LegacyData): number {
  return d.tasks.length + d.habits.length + d.goals.length + d.weekFocus.length + d.dayLogs.length
}

/** Liest die alte lokale Datenbank dieses Browsers, falls vorhanden. */
export async function readLegacyDb(): Promise<LegacyData | null> {
  if (!(await Dexie.exists(LEGACY_DB_NAME))) return null
  const old = new Dexie(LEGACY_DB_NAME)
  try {
    await old.open() // ohne Versionsangabe: öffnet die vorhandene Struktur, wie sie ist
    const read = async <T,>(name: string): Promise<T[]> =>
      old.tables.some((t) => t.name === name) ? ((await old.table(name).toArray()) as T[]) : []
    return {
      tasks: await read('tasks'),
      timeBlocks: await read('timeBlocks'),
      dayLogs: await read('dayLogs'),
      habits: await read('habits'),
      habitChecks: await read('habitChecks'),
      goals: await read('goals'),
      weekFocus: await read('weekFocus'),
    }
  } finally {
    old.close()
  }
}

/** Schreibt alte Daten mit neuen IDs in die Cloud-Datenbank (alles oder nichts). Bestehendes bleibt erhalten. */
export async function importLegacyData(d: LegacyData) {
  const goalIds = new Map<OldId, string>()
  const taskIds = new Map<OldId, string>()
  const habitIds = new Map<OldId, string>()
  const map = (m: Map<OldId, string>, id?: OldId) => (id === undefined || id === null ? undefined : m.get(id))

  await db.transaction('rw', [db.goals, db.tasks, db.timeBlocks, db.habits, db.habitChecks, db.weekFocus, db.dayLogs], async () => {
    for (const { id, ...rest } of d.goals) goalIds.set(id!, await db.goals.add(rest as Goal))
    for (const { id, goalId, ...rest } of d.tasks) {
      taskIds.set(id!, await db.tasks.add({ ...rest, goalId: map(goalIds, goalId) } as Task))
    }
    for (const { taskId, ...rest } of d.timeBlocks.map(withoutId)) {
      await db.timeBlocks.add({ ...rest, taskId: map(taskIds, taskId) } as TimeBlock)
    }
    for (const { id, ...rest } of d.habits) habitIds.set(id!, await db.habits.add(rest as Habit))
    for (const c of d.habitChecks) {
      const habitId = map(habitIds, c.habitId)
      if (habitId) await db.habitChecks.put({ habitId, date: c.date, doneAt: c.doneAt })
    }
    for (const { goalId, ...rest } of d.weekFocus.map(withoutId)) {
      await db.weekFocus.add({ ...rest, goalId: map(goalIds, goalId) } as FocusItem)
    }
    for (const log of d.dayLogs.map(withoutId)) {
      const exists = await db.dayLogs.where('date').equals(log.date).count()
      if (!exists) await db.dayLogs.add(log as DayLog)
    }
  })
  markLegacyHandled('imported')
}

/* ---------- Merker pro Gerät: wurde die alte Datenbank schon übernommen oder abgelehnt? ---------- */

const KEY = 'powerplan.legacyImport'

export function legacyHandled(): boolean {
  return readStore<string | null>(KEY, null) !== null
}

export function markLegacyHandled(how: 'imported' | 'dismissed') {
  writeStore(KEY, how)
}

export function resetLegacyHandled() {
  writeStore(KEY, null)
}
