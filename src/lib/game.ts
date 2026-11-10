import type { DayLog, FocusItem, Goal, Habit, HabitCheck, Task, TimeBlock } from '../db'
import { checksByHabit, habitStreaks } from './habits'
import { streaks } from './points'

/* ---------- Level ---------- */

/**
 * Punkte, ab denen ein Level beginnt. Jeder Aufstieg braucht 50 Punkte mehr als der vorige:
 * Level 2 = 100, 3 = 250, 4 = 450, 5 = 700, 6 = 1000 …
 */
export function levelThreshold(level: number): number {
  const n = level - 1
  return 100 * n + 25 * n * (n - 1)
}

const LEVEL_TITLES: [number, string][] = [
  [1, 'Starter'],
  [2, 'Entdecker'],
  [3, 'Macher'],
  [5, 'Profi'],
  [8, 'Meister'],
  [12, 'Legende'],
]

export function levelTitle(level: number): string {
  const reached = LEVEL_TITLES.filter(([min]) => level >= min)
  return reached[reached.length - 1][1]
}

export interface LevelInfo {
  level: number
  title: string
  /** Punkte innerhalb des aktuellen Levels */
  into: number
  /** Punkte, die dieses Level insgesamt braucht */
  needed: number
  /** Gesamtpunkte, ab denen das nächste Level beginnt */
  next: number
  pct: number
}

export function levelInfo(total: number): LevelInfo {
  let level = 1
  while (total >= levelThreshold(level + 1)) level++
  const start = levelThreshold(level)
  const next = levelThreshold(level + 1)
  const into = total - start
  const needed = next - start
  return { level, title: levelTitle(level), into, needed, next, pct: Math.floor((into / needed) * 100) }
}

/* ---------- Abzeichen ---------- */

export interface GameData {
  tasks: Task[]
  habits: Habit[]
  habitChecks: HabitCheck[]
  focus: FocusItem[]
  goals: Goal[]
  dayLogs: DayLog[]
  timeBlocks: TimeBlock[]
}

export interface Badge {
  id: string
  emoji: string
  title: string
  description: string
  current: number
  target: number
  unlocked: boolean
}

/** Alle Abzeichen mit Fortschritt – immer frisch aus den Daten berechnet. */
export function computeBadges(d: GameData, totalPoints: number, today: string): Badge[] {
  const doneTasks = d.tasks.filter((t) => t.done).length
  const dayStreak = streaks(d.tasks, today).best
  const doneByHabit = checksByHabit(d.habitChecks)
  const habitStreak = Math.max(0, ...d.habits.map((h) => habitStreaks(h, doneByHabit.get(h.id) ?? new Set(), today).best))

  // Wochen, in denen alle drei Fokus-Punkte erledigt wurden
  const focusWeeks = new Map<string, FocusItem[]>()
  for (const f of d.focus) focusWeeks.set(f.week, [...(focusWeeks.get(f.week) ?? []), f])
  const perfectWeeks = [...focusWeeks.values()].filter((items) => items.length === 3 && items.every((f) => f.doneAt)).length

  const level = levelInfo(totalPoints).level
  const achievedGoals = d.goals.filter((g) => g.achievedAt).length

  const defs: Omit<Badge, 'unlocked'>[] = [
    { id: 'task-1', emoji: '✅', title: 'Erster Haken', description: 'Erste Aufgabe erledigt', current: doneTasks, target: 1 },
    { id: 'task-10', emoji: '📋', title: 'In Fahrt', description: '10 Aufgaben erledigt', current: doneTasks, target: 10 },
    { id: 'task-50', emoji: '🚀', title: 'Durchstarter', description: '50 Aufgaben erledigt', current: doneTasks, target: 50 },
    { id: 'task-100', emoji: '💯', title: 'Hundert', description: '100 Aufgaben erledigt', current: doneTasks, target: 100 },
    { id: 'streak-3', emoji: '🔥', title: 'Warmgelaufen', description: '3 Tage in Folge alles Fällige erledigt', current: dayStreak, target: 3 },
    { id: 'streak-7', emoji: '🌟', title: 'Eine Woche stark', description: '7-Tage-Streak', current: dayStreak, target: 7 },
    { id: 'streak-30', emoji: '👑', title: 'Unaufhaltsam', description: '30-Tage-Streak', current: dayStreak, target: 30 },
    { id: 'habit-1', emoji: '🌱', title: 'Neue Routine', description: 'Erste Gewohnheit abgehakt', current: d.habitChecks.length, target: 1 },
    { id: 'habit-streak-7', emoji: '🔁', title: 'Drangeblieben', description: 'Eine Gewohnheit 7-mal in Folge', current: habitStreak, target: 7 },
    { id: 'habit-100', emoji: '🌳', title: 'Gewohnheitstier', description: '100 Gewohnheiten abgehakt', current: d.habitChecks.length, target: 100 },
    { id: 'planner-10', emoji: '🗓️', title: 'Planer', description: '10 Zeitblöcke geplant', current: d.timeBlocks.length, target: 10 },
    { id: 'focus-week', emoji: '🎯', title: 'Volltreffer', description: 'Alle 3 Wochenfokus-Punkte einer Woche erledigt', current: perfectWeeks, target: 1 },
    { id: 'goal-1', emoji: '🏆', title: 'Ziel erreicht', description: 'Erstes Monatsziel erreicht', current: achievedGoals, target: 1 },
    { id: 'review-7', emoji: '🌙', title: 'Reflektiert', description: '7 Tagesbilanzen geschrieben', current: d.dayLogs.length, target: 7 },
    { id: 'level-5', emoji: '⭐', title: 'Profi', description: 'Level 5 erreicht', current: level, target: 5 },
    { id: 'level-10', emoji: '💎', title: 'Meisterhaft', description: 'Level 10 erreicht', current: level, target: 10 },
  ]
  return defs.map((b) => ({ ...b, current: Math.min(b.current, b.target), unlocked: b.current >= b.target }))
}
