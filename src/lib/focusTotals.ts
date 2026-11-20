import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

/*
 * Gesamte Fokuszeit pro Aufgabe (Summe aller gespeicherten Sitzungen, in Minuten).
 */

/** Minuten insgesamt für eine Aufgabe */
export function useTaskFocusTotal(taskId: string | undefined): number {
  return (
    useLiveQuery(async () => (taskId ? (await db.focusSessions.where('taskId').equals(taskId).toArray()).reduce((n, s) => n + s.minutes, 0) : 0), [taskId]) ?? 0
  )
}

/** Aufgabe → Minuten insgesamt (für ganze Listen, eine Abfrage) */
export function useFocusTotals(): Map<string, number> {
  const sessions = useLiveQuery(() => db.focusSessions.toArray(), [])
  const map = new Map<string, number>()
  for (const s of sessions ?? []) if (s.taskId) map.set(s.taskId, (map.get(s.taskId) ?? 0) + s.minutes)
  return map
}
