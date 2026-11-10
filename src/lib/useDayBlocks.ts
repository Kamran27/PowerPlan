import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

/** Zeitblöcke eines Tages plus Zuordnung Aufgabe → früheste Startzeit. */
export function useDayBlocks(date: string) {
  const blocks = useLiveQuery(() => db.timeBlocks.where('date').equals(date).toArray(), [date])
  const scheduled = new Map<number, string>()
  for (const b of blocks ?? []) {
    if (b.taskId === undefined) continue
    const prev = scheduled.get(b.taskId)
    if (!prev || b.start < prev) scheduled.set(b.taskId, b.start)
  }
  return { blocks, scheduled }
}
