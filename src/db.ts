import Dexie, { type EntityTable, type Table } from 'dexie'
import dexieCloud, { type DBRealm, type DBRealmMember, type DBRealmRole } from 'dexie-cloud-addon'
import type { Repeat } from './lib/repeat'

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
  /** Gemeinsamer Bereich, zu dem die Aufgabe gehört (sonst privat). */
  spaceId?: string
  /** Dexie Cloud: Bereich (Realm) = wer die Aufgabe sehen darf. Fehlt = privat. */
  realmId?: string
  /** Zugewiesen an (E-Mail). Fehlt = für alle im Bereich. */
  assignee?: string
  /** Erledigt von (E-Mail) – wichtig für Punkte bei gemeinsamen Aufgaben. */
  doneBy?: string
  /** Wiederholung – beim Erledigen entsteht automatisch die nächste Aufgabe. */
  repeat?: Repeat
  /** Bei einer automatisch angelegten Wiederholung: ID der Vorgänger-Aufgabe (für „Rückgängig“). */
  repeatFromId?: string
  /**
   * Haushalts-Rotation (nur gemeinsam + wiederkehrend): Reihenfolge der E-Mails. Beim Erledigen
   * bekommt die nächste Aufgabe automatisch die nächste Person als Zuständige.
   */
  rotation?: string[]
  /** Checkliste innerhalb der Aufgabe */
  subtasks?: Subtask[]
}

/** Ein Punkt der Checkliste in einer Aufgabe. */
export interface Subtask {
  id: string
  title: string
  done: boolean
}

/** Ein gemeinsamer Bereich, z. B. „Haushalt“ – geteilt über einen eigenen Realm. */
export interface Space {
  id: string
  title: string
  emoji?: string
  realmId: string
  createdByEmail?: string
  createdAt: string
}

/** Eine Einkaufsliste in einem Bereich. */
export interface ShoppingList {
  id: string
  spaceId: string
  realmId: string
  title: string
  createdAt: string
}

/** Ein Artikel auf einer Einkaufsliste. */
export interface ShoppingItem {
  id: string
  listId: string
  spaceId: string
  realmId: string
  name: string
  /** Menge als Freitext, z. B. „2“, „500 g“, „1 Pack“ */
  qty?: string
  /** Abteilung im Laden (siehe lib/shopping.ts), z. B. "obst", "kuehl" */
  category?: string
  done: boolean
  /** Nach „Erledigte entfernen“ ausgeblendet, bleibt aber für Vorschläge („schon mal gekauft“) erhalten. */
  cleared?: boolean
  doneAt?: string
  createdAt: string
}

/** Eine Zutat eines Rezepts, z. B. { qty: "500 g", name: "Hackfleisch" } */
export interface Ingredient {
  name: string
  qty?: string
  category?: string
}

/** Ein gespeichertes Rezept in einem Bereich – Zutaten mit einem Tipp auf die Einkaufsliste. */
export interface Recipe {
  id: string
  spaceId: string
  realmId: string
  title: string
  /** Für wie viele Personen die Mengen gelten */
  servings: number
  ingredients: Ingredient[]
  createdAt: string
}

/** Ein geplantes Essen im Wochen-Essensplan eines Bereichs (aus einem Rezept oder frei eingetragen). */
export interface Meal {
  id: string
  spaceId: string
  realmId: string
  /** Tag "JJJJ-MM-TT" */
  date: string
  title: string
  recipeId?: string
  /** Für wie viele Personen (für die Mengen auf der Einkaufsliste) */
  servings: number
  createdAt: string
}

/** Eine abgeschlossene Fokus-Sitzung (Fokus-Timer, ab Datenbank Version 5). */
export interface FocusSession {
  id: string
  taskId?: string
  title: string
  /** Tag "JJJJ-MM-TT" (lokal) */
  date: string
  minutes: number
  doneAt: string
}

/** Ein geführter Wochenrückblick (ab Datenbank Version 5). */
export interface WeekReview {
  id: string
  /** Montag der zurückblickenden Woche "JJJJ-MM-TT" */
  week: string
  wentWell?: string
  improve?: string
  savedAt: string
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
  // Teilen (Dexie Cloud Zugriffskontrolle)
  realms: Table<DBRealm, string>
  members: Table<DBRealmMember, string>
  roles: Table<DBRealmRole, [string, string]>
  spaces: EntityTable<Space, 'id'>
  shoppingLists: EntityTable<ShoppingList, 'id'>
  shoppingItems: EntityTable<ShoppingItem, 'id'>
  recipes: EntityTable<Recipe, 'id'>
  meals: EntityTable<Meal, 'id'>
  focusSessions: EntityTable<FocusSession, 'id'>
  weekReviews: EntityTable<WeekReview, 'id'>
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

// Version 2: Teilen – gemeinsame Bereiche, Mitglieder, Einkaufslisten; Aufgaben mit Bereich
db.version(2).stores({
  tasks: '@id, done, dueDate, priority, createdAt, goalId, spaceId',
  realms: '@realmId',
  members: '@id, realmId, [email+realmId]',
  roles: '[realmId+name]',
  spaces: '@id',
  shoppingLists: '@id, spaceId',
  shoppingItems: '@id, listId, spaceId',
})

// Version 3: Rezepte (pro Bereich, geteilt wie die Einkaufslisten)
db.version(3).stores({
  recipes: '@id, spaceId',
})

// Version 4: Essensplan (pro Bereich und Tag)
db.version(4).stores({
  meals: '@id, spaceId, date, [spaceId+date]',
})

// Version 5: Fokus-Timer-Sitzungen und Wochenrückblicke
db.version(5).stores({
  focusSessions: '@id, date, taskId',
  weekReviews: '@id, week',
})

db.cloud.configure({
  databaseUrl: CLOUD_DB_URL,
  requireAuth: true, // erst anmelden (E-Mail + Einmal-Code), danach auch offline nutzbar
  customLoginGui: true, // eigener, deutscher Anmelde-Dialog (components/LoginDialog.tsx)
  socialAuth: false, // nur E-Mail-Code, kein Google/Apple
})

/** Die frühere, rein lokale Datenbank (vor der Cloud). Nur noch zum Übernehmen alter Daten. */
export const LEGACY_DB_NAME = 'powerplan'
