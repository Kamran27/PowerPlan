import Dexie, { type EntityTable } from 'dexie'

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

/** Tagesbilanz (ab M3). */
export interface DayLog {
  date: string
  points: number
  reflection?: string
}

export const db = new Dexie('powerplan') as Dexie & {
  tasks: EntityTable<Task, 'id'>
  timeBlocks: EntityTable<TimeBlock, 'id'>
  dayLogs: EntityTable<DayLog, 'date'>
}

// Indizes: nur Felder, nach denen gesucht/sortiert wird.
db.version(1).stores({
  tasks: '++id, done, dueDate, priority, createdAt',
  timeBlocks: '++id, date, taskId',
  dayLogs: 'date',
})
