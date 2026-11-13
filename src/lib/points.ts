import type { FocusItem, FocusSession, Goal, HabitCheck, Task, WeekReview } from '../db'
import { addDays, localDateOf, todayISO } from './date'
import { FOCUS_POINTS, GOAL_POINTS } from './goals'
import { HABIT_POINTS } from './habits'
import { pointsForMe } from './spaces'

/** Punkte pro erledigter Aufgabe, nach Priorität. */
/** Punkte für eine abgeschlossene Fokus-Sitzung: je länger, desto mehr (25 Min. = 10, 60 Min. = 24, max. 40). */
export function sessionPoints(minutes: number): number {
  return Math.min(40, Math.max(1, Math.round(minutes * 0.4)))
}
/** Punkte für einen abgeschlossenen Wochenrückblick. */
export const REVIEW_POINTS = 25

/** Punkte pro erledigter Aufgabe, nach Priorität. */
export const POINTS_BY_PRIORITY: Record<Task['priority'], number> = { 1: 30, 2: 20, 3: 10 }

export function taskPoints(task: Task): number {
  return POINTS_BY_PRIORITY[task.priority]
}

/** Lokales Erledigt-Datum einer Aufgabe, oder undefined. */
function doneDate(t: Task): string | undefined {
  return t.done && t.doneAt ? localDateOf(t.doneAt) : undefined
}

/** Alles, was Punkte bringt. */
export interface PointSources {
  tasks: Task[]
  /** Angemeldete Person: gemeinsame Aufgaben zählen nur, wenn sie von ihr erledigt wurden */
  me?: string
  habitChecks?: HabitCheck[]
  focus?: FocusItem[]
  goals?: Goal[]
  sessions?: FocusSession[]
  reviews?: WeekReview[]
}

/**
 * Punkte pro Tag (Datum → Summe):
 * Aufgaben 30/20/10 · Gewohnheit 10 · Wochenfokus 25 · Monatsziel erreicht 100 · Fokus-Sitzung 25 Min. = 10 · Wochenrückblick 25.
 */
export function pointsByDay({ tasks, me, habitChecks = [], focus = [], goals = [], sessions = [], reviews = [] }: PointSources): Map<string, number> {
  const map = new Map<string, number>()
  const add = (date: string, pts: number) => map.set(date, (map.get(date) ?? 0) + pts)
  for (const t of tasks) {
    const d = doneDate(t)
    if (d && pointsForMe(t, me)) add(d, taskPoints(t))
  }
  for (const c of habitChecks) add(c.date, HABIT_POINTS)
  for (const f of focus) if (f.doneAt) add(localDateOf(f.doneAt), FOCUS_POINTS)
  for (const g of goals) if (g.achievedAt) add(localDateOf(g.achievedAt), GOAL_POINTS)
  for (const s of sessions) add(s.date, sessionPoints(s.minutes))
  for (const r of reviews) add(localDateOf(r.savedAt), REVIEW_POINTS)
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

/**
 * Aktueller und bester Streak (Anzahl erfüllter Tage in Folge; neutrale Tage werden übersprungen).
 * 🛡️ Streak-Schutz: Pro Kalenderwoche darf ein Tag ausfallen, ohne dass der Streak reißt –
 * er zählt dann wie ein neutraler Tag (nicht mit, bricht aber nichts).
 */
export function streaks(
  tasks: Task[],
  today = todayISO(),
): { current: number; best: number; protectedDays: string[]; shieldLeftThisWeek: boolean } {
  const dates = tasks.map((t) => t.dueDate).filter((d): d is string => !!d && d <= today)
  if (dates.length === 0) return { current: 0, best: 0, protectedDays: [], shieldLeftThisWeek: true }
  const earliest = dates.reduce((a, b) => (a < b ? a : b))

  let current = 0
  let best = 0
  let run = 0
  let currentDone = false
  const usedWeeks = new Set<string>()
  const protectedDays: string[] = []
  // Rückwärts von heute bis zum ersten Fälligkeitstag.
  for (let d = today; d >= earliest; d = addDays(d, -1)) {
    const s = dayStatus(tasks, d, today)
    if (s === 'fulfilled') {
      run++
    } else if (s === 'missed') {
      const week = weekStart(d)
      if (!usedWeeks.has(week)) {
        // Schutz dieser Woche verbrauchen – Streak läuft weiter
        usedWeeks.add(week)
        protectedDays.push(d)
        continue
      }
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
  return { current, best, protectedDays, shieldLeftThisWeek: !usedWeeks.has(weekStart(today)) }
}

/** Montag der Woche eines Datums (ISO-Woche). */
export function weekStart(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const weekday = (new Date(y, m - 1, d).getDay() + 6) % 7 // Mo = 0
  return addDays(date, -weekday)
}

/** Welche Woche wird zurückgeblickt? Ab Freitag die laufende, Mo–Do die vergangene (Montag als Datum). */
export function reviewWeekFor(today: string): string {
  const monday = weekStart(today)
  const [y, m, d] = today.split('-').map(Number)
  const wd = (new Date(y, m - 1, d).getDay() + 6) % 7 // Mo = 0 … So = 6
  return wd >= 4 ? monday : addDays(monday, -7)
}

export interface SourceTotals {
  tasks: number
  habits: number
  focus: number
  goals: number
  sessions: number
  reviews: number
}

/** Punkte je Quelle im Zeitraum [from, to] (lokale Daten, inklusive). */
export function pointsBySource(
  { tasks, me, habitChecks = [], focus = [], goals = [], sessions = [], reviews = [] }: PointSources,
  from: string,
  to: string,
): SourceTotals {
  const inRange = (d?: string) => !!d && d >= from && d <= to
  const sum: SourceTotals = { tasks: 0, habits: 0, focus: 0, goals: 0, sessions: 0, reviews: 0 }
  for (const t of tasks) if (inRange(doneDate(t)) && pointsForMe(t, me)) sum.tasks += taskPoints(t)
  for (const c of habitChecks) if (inRange(c.date)) sum.habits += HABIT_POINTS
  for (const f of focus) if (f.doneAt && inRange(localDateOf(f.doneAt))) sum.focus += FOCUS_POINTS
  for (const g of goals) if (g.achievedAt && inRange(localDateOf(g.achievedAt))) sum.goals += GOAL_POINTS
  for (const s of sessions) if (inRange(s.date)) sum.sessions += sessionPoints(s.minutes)
  for (const r of reviews) if (inRange(localDateOf(r.savedAt))) sum.reviews += REVIEW_POINTS
  return sum
}
