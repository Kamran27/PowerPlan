import Dexie, { type EntityTable, type Table } from 'dexie'

/** Eine Aufgabe (To-do). Datumsangaben als ISO-String "JJJJ-MM-TT". */
export interface Task {
  id: number
  title: string
  notes?: string
  priority: 1 | 2 | 3 // 1 = hoch, 2 = mittel, 3 = niedrig
  dueDate?: string
  done: boolean
  doneAt?: string // ISO-Zeitstempel
  createdAt: string
}

/** Ein Zeitblock im Tagesplan (ab M2). Zeiten als "HH:MM". */
export interface TimeBlock {
  id: number
  date: string
  start: string
  end: string
  title: string
  taskId?: number
}

/** Abend-Tagesbilanz: Stimmung und Reflexion. Punkte werden immer live aus den Aufgaben berechnet. */
export interface DayLog {
  date: string
  mood?: 1 | 2 | 3 | 4 | 5
  reflection?: string
  savedAt?: string
}

/** Eine Gewohnheit (ab M4). */
export interface Habit {
  id: number
  name: string
  emoji?: string
  /** Fällige Wochentage, 0 = Montag … 6 = Sonntag. Alle 7 = täglich. */
  days: number[]
  /** Ab diesem Tag zählt die Gewohnheit ("JJJJ-MM-TT"). */
  createdAt: string
}

/** Ein Haken: Gewohnheit an einem Tag erledigt. Schlüssel = [habitId + date]. */
export interface HabitCheck {
  habitId: number
  date: string
  doneAt: string
}

export const db = new Dexie('powerplan') as Dexie & {
  tasks: EntityTable<Task, 'id'>
  timeBlocks: EntityTable<TimeBlock, 'id'>
  dayLogs: EntityTable<DayLog, 'date'>
  habits: EntityTable<Habit, 'id'>
  habitChecks: Table<HabitCheck, [number, string]>
}

// Indizes: nur Felder, nach denen gesucht/sortiert wird.
db.version(1).stores({
  tasks: '++id, done, dueDate, priority, createdAt',
  timeBlocks: '++id, date, taskId',
  dayLogs: 'date',
})

// Version 2 (M4): Gewohnheiten. Bestehende Daten bleiben unverändert erhalten.
db.version(2).stores({
  habits: '++id, createdAt',
  habitChecks: '[habitId+date], habitId, date',
})
