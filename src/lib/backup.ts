import { db, type DayLog, type Habit, type HabitCheck, type Task, type TimeBlock } from '../db'

const FORMAT = 'powerplan-backup'
/** 1 = Aufgaben, Zeitblöcke, Tagesbilanzen · 2 = zusätzlich Gewohnheiten (M4) */
const VERSION = 2

interface Backup {
  format: typeof FORMAT
  version: number
  exportedAt: string
  tasks: Task[]
  timeBlocks: TimeBlock[]
  dayLogs: DayLog[]
  habits: Habit[]
  habitChecks: HabitCheck[]
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
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `powerplan-backup-${data.exportedAt.slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** Liest und prüft eine Backup-Datei (Version 1 oder 2). Wirft einen Fehler mit deutscher Meldung, wenn ungültig. */
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
    version: b.version ?? VERSION,
    exportedAt: b.exportedAt ?? '',
    tasks: b.tasks,
    timeBlocks: list(b.timeBlocks),
    dayLogs: list(b.dayLogs),
    habits: list(b.habits), // fehlt in Version-1-Sicherungen
    habitChecks: list(b.habitChecks),
  }
}

/** Ersetzt alle vorhandenen Daten durch die Sicherung (alles oder nichts). */
export async function restoreBackup(b: Backup) {
  const tables = [db.tasks, db.timeBlocks, db.dayLogs, db.habits, db.habitChecks]
  await db.transaction('rw', tables, async () => {
    await Promise.all(tables.map((t) => t.clear()))
    await db.tasks.bulkAdd(b.tasks)
    await db.timeBlocks.bulkAdd(b.timeBlocks)
    await db.dayLogs.bulkAdd(b.dayLogs)
    await db.habits.bulkAdd(b.habits)
    await db.habitChecks.bulkAdd(b.habitChecks)
  })
}
