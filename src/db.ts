import Dexie, { type EntityTable, type Table } from 'dexie'
import dexieCloud from 'dexie-cloud-addon'

/*
 * Datenbank mit Dexie Cloud: Alles wird lokal gespeichert (offline nutzbar) und automatisch
 * mit der Cloud abgeglichen, sobald man angemeldet und online ist.
 *
 * Wichtig für die Cloud: IDs sind Texte (z. B. "tsk0Abc…") statt fortlaufender Zahlen,
 * damit Geräte offline Einträge anlegen können, ohne sich in die Quere zu kommen.
 */

/** Adresse der Cloud-Datenbank (öffentlich – kein Geheimnis). */
export const CLOUD_DB_URL = 'https://zgoilsjd8.dexie.cloud'

/** Eine Aufgabe (To-do). Datumsangaben als ISO-String "JJJJ-MM-TT". */
export interface Task {
  id: string
  title: string
  notes?: string
  priority: 1 | 2 | 3 // 1 = hoch, 2 = mittel, 3 = niedrig
  dueDate?: string
  done: boolean
  doneAt?: string // ISO-Zeitstempel
  createdAt: string
  /** Verknüpftes Monatsziel (ab M5). */
  goalId?: string
}

/** Ein Zeitblock im Tagesplan (ab M2). Zeiten als "HH:MM". */
export interface TimeBlock {
  id: string
  date: string
  start: string
  end: string
  title: string
  taskId?: string
}

/** Abend-Tagesbilanz: Stimmung und Reflexion. Punkte werden immer live aus den Aufgaben berechnet. */
export interface DayLog {
  id: string
  date: string
  mood?: 1 | 2 | 3 | 4 | 5
  reflection?: string
  savedAt?: string
}

/** Eine Gewohnheit (ab M4). */
export interface Habit {
  id: string
  name: string
  emoji?: string
  /** Fällige Wochentage, 0 = Montag … 6 = Sonntag. Alle 7 = täglich. */
  days: number[]
  /** Ab diesem Tag zählt die Gewohnheit ("JJJJ-MM-TT"). */
  createdAt: string
}

/** Ein Haken: Gewohnheit an einem Tag erledigt. Schlüssel = [habitId + date]. */
export interface HabitCheck {
  habitId: string
  date: string
  doneAt: string
}

/** Ein Monatsziel (ab M5). Fortschritt = erledigte / verknüpfte Aufgaben. */
export interface Goal {
  id: string
  title: string
  /** Monat "JJJJ-MM" */
  month: string
  /** ISO-Zeitstempel, wenn als erreicht markiert */
  achievedAt?: string
  createdAt: string
}

/** Eine der drei Wochenprioritäten (ab M5). */
export interface FocusItem {
  id: string
  /** Montag der Woche "JJJJ-MM-TT" */
  week: string
  /** Platz 0, 1 oder 2 */
  slot: number
  title: string
  goalId?: string
  /** ISO-Zeitstempel, wenn erledigt */
  doneAt?: string
}

export const db = new Dexie('powerplan-cloud', { addons: [dexieCloud] }) as Dexie & {
  tasks: EntityTable<Task, 'id'>
  timeBlocks: EntityTable<TimeBlock, 'id'>
  dayLogs: EntityTable<DayLog, 'id'>
  habits: EntityTable<Habit, 'id'>
  habitChecks: Table<HabitCheck, [string, string]>
  goals: EntityTable<Goal, 'id'>
  weekFocus: EntityTable<FocusItem, 'id'>
}

// „@id“ = Dexie Cloud vergibt eine weltweit eindeutige Text-ID. Danach: Felder, nach denen gesucht wird.
db.version(1).stores({
  tasks: '@id, done, dueDate, priority, createdAt, goalId',
  timeBlocks: '@id, date, taskId',
  dayLogs: '@id, date',
  habits: '@id, createdAt',
  habitChecks: '[habitId+date], habitId, date',
  goals: '@id, month',
  weekFocus: '@id, week, goalId',
})

db.cloud.configure({
  databaseUrl: CLOUD_DB_URL,
  requireAuth: true, // erst anmelden (E-Mail + Einmal-Code), danach auch offline nutzbar
  customLoginGui: true, // eigener, deutscher Anmelde-Dialog (components/LoginDialog.tsx)
  socialAuth: false, // nur E-Mail-Code, kein Google/Apple
})

/** Die frühere, rein lokale Datenbank (vor der Cloud). Nur noch zum Übernehmen alter Daten. */
export const LEGACY_DB_NAME = 'powerplan'
