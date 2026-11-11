import { db, type Habit, type HabitCheck } from '../db'
import { addDays, todayISO } from './date'

export const HABIT_POINTS = 10
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]
export const WEEKDAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

/** Wochentag eines Datums, 0 = Montag … 6 = Sonntag. */
export function weekdayIndex(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return (new Date(y, m - 1, d).getDay() + 6) % 7
}

export function isDaily(habit: Pick<Habit, 'days'>): boolean {
  return habit.days.length === 7
}

/** Ist die Gewohnheit an diesem Tag fällig? (erst ab dem Anlegetag) */
export function isDueOn(habit: Habit, date: string): boolean {
  return date >= habit.createdAt && habit.days.includes(weekdayIndex(date))
}

/** Lesbarer Rhythmus: „Täglich“, „Werktags“, „Mo, Mi, Fr“. */
export function describeDays(days: number[]): string {
  if (days.length === 7) return 'Täglich'
  const sorted = [...days].sort()
  if (sorted.join() === '0,1,2,3,4') return 'Werktags'
  if (sorted.join() === '5,6') return 'Am Wochenende'
  return sorted.map((d) => WEEKDAY_SHORT[d]).join(', ')
}

export async function addHabit(input: { name: string; emoji?: string; days: number[] }) {
  const name = input.name.trim()
  if (!name || input.days.length === 0) return
  await db.habits.add({ name, emoji: input.emoji?.trim() || undefined, days: [...input.days].sort(), createdAt: todayISO() } as Habit)
}

export async function updateHabit(id: string, changes: Partial<Omit<Habit, 'id'>>) {
  await db.habits.update(id, changes)
}

/** Löscht eine Gewohnheit samt Haken; gibt eine „Rückgängig“-Funktion zurück. */
export async function deleteHabit(habit: Habit) {
  const checks = await db.habitChecks.where('habitId').equals(habit.id).toArray()
  await db.transaction('rw', db.habits, db.habitChecks, async () => {
    await db.habitChecks.where('habitId').equals(habit.id).delete()
    await db.habits.delete(habit.id)
  })
  return async () => {
    await db.transaction('rw', db.habits, db.habitChecks, async () => {
      await db.habits.put(habit)
      await db.habitChecks.bulkPut(checks)
    })
  }
}

/** Haken setzen oder entfernen. Gibt true zurück, wenn jetzt erledigt. */
export async function toggleHabit(habitId: string, date: string): Promise<boolean> {
  const existing = await db.habitChecks.get([habitId, date])
  if (existing) {
    await db.habitChecks.delete([habitId, date])
    return false
  }
  await db.habitChecks.put({ habitId, date, doneAt: new Date().toISOString() })
  return true
}

/** Gewohnheit → Menge der erledigten Tage. */
export function checksByHabit(checks: HabitCheck[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const c of checks) {
    if (!map.has(c.habitId)) map.set(c.habitId, new Set())
    map.get(c.habitId)!.add(c.date)
  }
  return map
}

/**
 * Streak einer Gewohnheit: fällige Tage in Folge erledigt.
 * Nicht fällige Tage werden übersprungen; heute bricht den Streak nicht, solange noch offen.
 */
export function habitStreaks(habit: Habit, done: Set<string>, today = todayISO()): { current: number; best: number } {
  let current = 0
  let best = 0
  let run = 0
  let currentDone = false
  for (let d = today; d >= habit.createdAt; d = addDays(d, -1)) {
    if (!isDueOn(habit, d)) continue
    if (done.has(d)) {
      run++
    } else if (d !== today) {
      if (!currentDone) {
        current = run
        currentDone = true
      }
      best = Math.max(best, run)
      run = 0
    }
  }
  if (!currentDone) current = run
  return { current, best: Math.max(best, run) }
}
