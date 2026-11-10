import type { Task } from '../db'
import { addDays, localDateOf, todayISO } from './date'

/** Punkte pro erledigter Aufgabe, nach Priorität. */
export const POINTS_BY_PRIORITY: Record<Task['priority'], number> = { 1: 30, 2: 20, 3: 10 }

export function taskPoints(task: Task): number {
  return POINTS_BY_PRIORITY[task.priority]
}

/** Lokales Erledigt-Datum einer Aufgabe, oder undefined. */
function doneDate(t: Task): string | undefined {
  return t.done && t.doneAt ? localDateOf(t.doneAt) : undefined
}

/** Punkte pro Tag (Datum → Summe) aus allen erledigten Aufgaben. */
export function pointsByDay(tasks: Task[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const t of tasks) {
    const d = doneDate(t)
    if (d) map.set(d, (map.get(d) ?? 0) + taskPoints(t))
  }
  return map
}

export type DayStatus = 'fulfilled' | 'missed' | 'open' | 'neutral'

/**
 * Status eines Tages für den Streak:
 * - fulfilled: mind. 1 Aufgabe war fällig und alle wurden spätestens an dem Tag erledigt
 * - missed: etwas Fälliges blieb liegen (vergangener Tag)
 * - open: heute, noch nicht alles erledigt (bricht den Streak noch nicht)
 * - neutral: nichts fällig – zählt weder mit noch bricht es den Streak
 */
export function dayStatus(tasks: Task[], date: string, today = todayISO()): DayStatus {
  const due = tasks.filter((t) => t.dueDate === date)
  if (due.length === 0) return 'neutral'
  const allDone = due.every((t) => {
    const d = doneDate(t)
    return d !== undefined && d <= date
  })
  if (allDone) return 'fulfilled'
  return date >= today ? 'open' : 'missed'
}

/** Aktueller und bester Streak (Anzahl erfüllter Tage in Folge; neutrale Tage werden übersprungen). */
export function streaks(tasks: Task[], today = todayISO()): { current: number; best: number } {
  const dates = tasks.map((t) => t.dueDate).filter((d): d is string => !!d && d <= today)
  if (dates.length === 0) return { current: 0, best: 0 }
  const earliest = dates.reduce((a, b) => (a < b ? a : b))

  let current = 0
  let best = 0
  let run = 0
  let currentDone = false
  // Rückwärts von heute bis zum ersten Fälligkeitstag.
  for (let d = today; d >= earliest; d = addDays(d, -1)) {
    const s = dayStatus(tasks, d, today)
    if (s === 'fulfilled') {
      run++
    } else if (s === 'missed') {
      if (!currentDone) {
        current = run
        currentDone = true
      }
      best = Math.max(best, run)
      run = 0
    }
    // 'open' (heute) und 'neutral' überspringen
  }
  if (!currentDone) current = run
  best = Math.max(best, run)
  return { current, best }
}

/** Montag der Woche eines Datums (ISO-Woche). */
export function weekStart(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const weekday = (new Date(y, m - 1, d).getDay() + 6) % 7 // Mo = 0
  return addDays(date, -weekday)
}
