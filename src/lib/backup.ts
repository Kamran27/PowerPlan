import { db, type DayLog, type FocusItem, type Goal, type Habit, type HabitCheck, type Task, type TimeBlock } from '../db'
import { importLegacyData, type LegacyData } from './legacy'

const FORMAT = 'powerplan-backup'
/**
 * 1 = Aufgaben, Zeitblöcke, Tagesbilanzen · 2 = + Gewohnheiten · 3 = + Ziele und Wochenfokus
 * 4 = Cloud-Version: IDs sind Texte
 */
const VERSION = 4

interface Backup {
  format: typeof FORMAT
  version: number
  exportedAt: string
  tasks: Task[]
  timeBlocks: TimeBlock[]
  dayLogs: DayLog[]
  habits: Habit[]
  habitChecks: HabitCheck[]
  goals: Goal[]
  weekFocus: FocusItem[]
}

/** Alle Daten als JSON-Datei herunterladen. */
export async function exportBackup() {
  const data: Backup = {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    tasks: await db.tasks.toArray(),
    timeBlocks: await db.timeBlocks.toArray(),
    dayLogs: await db.dayLogs.toArray(),
    habits: await db.habits.toArray(),
    habitChecks: await db.habitChecks.toArray(),
    goals: await db.goals.toArray(),
    weekFocus: await db.weekFocus.toArray(),
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `powerplan-backup-${data.exportedAt.slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** Liest und prüft eine Backup-Datei (Version 1–4). Wirft einen Fehler mit deutscher Meldung, wenn ungültig. */
export async function readBackup(file: File): Promise<Backup> {
  let data: unknown
  try {
    data = JSON.parse(await file.text())
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.')
  }
  const b = data as Partial<Backup>
  if (b?.format !== FORMAT || !Array.isArray(b.tasks)) {
    throw new Error('Das ist keine PowerPlan-Sicherung.')
  }
  if ((b.version ?? 0) > VERSION) {
    throw new Error('Die Sicherung stammt aus einer neueren PowerPlan-Version.')
  }
  const list = <T,>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : [])
  return {
    format: FORMAT,
    version: b.version ?? 1,
    exportedAt: b.exportedAt ?? '',
    tasks: b.tasks,
    timeBlocks: list(b.timeBlocks),
    dayLogs: list(b.dayLogs),
    habits: list(b.habits),
    habitChecks: list(b.habitChecks),
    goals: list(b.goals),
    weekFocus: list(b.weekFocus),
  }
}

/**
 * Übernimmt eine Sicherung in die (Cloud-)Datenbank. Es wird nichts gelöscht:
 * - Version 4: Einträge werden mit ihren IDs zurückgeschrieben (gleiche ID = aktualisieren)
 * - Version 1–3 (vor der Cloud): Einträge bekommen neue IDs, Verknüpfungen werden umgeschrieben
 */
export async function restoreBackup(b: Backup) {
  if (b.version < 4) return importLegacyData(b as unknown as LegacyData)
  await db.transaction('rw', [db.tasks, db.timeBlocks, db.dayLogs, db.habits, db.habitChecks, db.goals, db.weekFocus], async () => {
    await db.tasks.bulkPut(b.tasks)
    await db.timeBlocks.bulkPut(b.timeBlocks)
    await db.dayLogs.bulkPut(b.dayLogs)
    await db.habits.bulkPut(b.habits)
    await db.habitChecks.bulkPut(b.habitChecks)
    await db.goals.bulkPut(b.goals)
    await db.weekFocus.bulkPut(b.weekFocus)
  })
}
