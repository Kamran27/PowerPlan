import { db, type FocusItem, type Goal, type Task } from '../db'
import { todayISO } from './date'

export const FOCUS_POINTS = 25
export const GOAL_POINTS = 100
export const FOCUS_SLOTS = [0, 1, 2]

/* ---------- Monate ---------- */

/** Monat "JJJJ-MM" eines Datums. */
export function monthOf(date: string): string {
  return date.slice(0, 7)
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** „November 2026“ */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

/* ---------- Monatsziele ---------- */

export async function addGoal(title: string, month: string) {
  const t = title.trim()
  if (!t) return
  await db.goals.add({ title: t, month, createdAt: new Date().toISOString() } as Goal)
}

export async function updateGoal(id: string, changes: Partial<Omit<Goal, 'id'>>) {
  await db.goals.update(id, changes)
}

/** Erreicht-Status umschalten. Gibt true zurück, wenn jetzt erreicht. */
export async function toggleGoalAchieved(goal: Goal): Promise<boolean> {
  await db.goals.update(goal.id, { achievedAt: goal.achievedAt ? undefined : new Date().toISOString() })
  return !goal.achievedAt
}

/**
 * Löscht ein Ziel. Verknüpfte Aufgaben und Fokus-Punkte bleiben bestehen, verlieren aber die Verknüpfung.
 * Gibt eine „Rückgängig“-Funktion zurück, die Ziel und Verknüpfungen wiederherstellt.
 */
export async function deleteGoal(goal: Goal) {
  const taskIds = (await db.tasks.where('goalId').equals(goal.id).toArray()).map((t) => t.id)
  const focusIds = (await db.weekFocus.where('goalId').equals(goal.id).toArray()).map((f) => f.id)
  await db.transaction('rw', db.goals, db.tasks, db.weekFocus, async () => {
    await db.goals.delete(goal.id)
    for (const id of taskIds) await db.tasks.update(id, { goalId: undefined })
    for (const id of focusIds) await db.weekFocus.update(id, { goalId: undefined })
  })
  return async () => {
    await db.transaction('rw', db.goals, db.tasks, db.weekFocus, async () => {
      await db.goals.put(goal)
      for (const id of taskIds) await db.tasks.update(id, { goalId: goal.id })
      for (const id of focusIds) await db.weekFocus.update(id, { goalId: goal.id })
    })
  }
}

/** Fortschritt eines Ziels aus seinen verknüpften Aufgaben. */
export function goalProgress(goalId: string, tasks: Task[]) {
  const linked = tasks.filter((t) => t.goalId === goalId)
  const done = linked.filter((t) => t.done).length
  return { linked, done, total: linked.length, pct: linked.length ? Math.round((done / linked.length) * 100) : 0 }
}

/* ---------- Wochenfokus ---------- */

/** Fokus-Punkt auf einem Platz setzen, ändern oder (leerer Titel) entfernen. */
export async function saveFocus(week: string, slot: number, title: string, existing?: FocusItem) {
  const t = title.trim()
  if (existing && !t) return db.weekFocus.delete(existing.id)
  if (existing) return db.weekFocus.update(existing.id, { title: t })
  if (t) await db.weekFocus.add({ week, slot, title: t } as FocusItem)
}

export async function setFocusGoal(item: FocusItem, goalId?: string) {
  await db.weekFocus.update(item.id, { goalId })
}

/** Erledigt-Status umschalten. Gibt true zurück, wenn jetzt erledigt. */
export async function toggleFocus(item: FocusItem): Promise<boolean> {
  await db.weekFocus.update(item.id, { doneAt: item.doneAt ? undefined : new Date().toISOString() })
  return !item.doneAt
}

/** Ziele, die zur Auswahl stehen: aktueller und kommender Monat sowie das bereits verknüpfte. */
export function selectableGoals(goals: Goal[], currentId?: string, month = monthOf(todayISO())) {
  return goals
    .filter((g) => g.id === currentId || (!g.achievedAt && g.month >= addMonths(month, -1) && g.month <= addMonths(month, 1)))
    .sort((a, b) => a.month.localeCompare(b.month) || a.title.localeCompare(b.title))
}
