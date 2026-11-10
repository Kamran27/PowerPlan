import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

/** Alle Zeitblöcke eines Tages (aktualisiert sich automatisch). */
export function useDayBlocks(date: string) {
  return useLiveQuery(() => db.timeBlocks.where('date').equals(date).toArray(), [date])
}

/**
 * Aufgabe → geplante Startzeit, für alle Blöcke ab `fromDate` (heute und später).
 * Hat eine Aufgabe mehrere Blöcke, zählt der früheste.
 */
export function useScheduledTimes(fromDate: string) {
  const blocks = useLiveQuery(() => db.timeBlocks.where('date').aboveOrEqual(fromDate).toArray(), [fromDate])
  const scheduled = new Map<number, string>()
  const firstKey = new Map<number, string>()
  for (const b of blocks ?? []) {
    if (b.taskId === undefined) continue
    const key = `${b.date} ${b.start}`
    const prev = firstKey.get(b.taskId)
    if (!prev || key < prev) {
      firstKey.set(b.taskId, key)
      scheduled.set(b.taskId, b.start)
    }
  }
  return scheduled
}
