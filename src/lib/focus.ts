import { useSyncExternalStore } from 'react'
import { db, type FocusSession, type Task } from '../db'
import { localDateOf } from './date'

/*
 * Fokus-Timer („Pomodoro“): konzentriert X Minuten an einer Aufgabe arbeiten.
 * Der laufende Timer liegt im Browser-Speicher (übersteht Neuladen und Seitenwechsel);
 * eine abgeschlossene Sitzung wird in der Datenbank gespeichert und bringt Punkte.
 */

export interface RunningFocus {
  taskId?: string
  title: string
  /** Startzeit in ms */
  startedAt: number
  minutes: number
}

const KEY = 'powerplan-focus'
const MINUTES_KEY = 'powerplan-focus-minutes'
/** Schnellauswahl; frei wählbar ist alles von MIN bis MAX Minuten */
export const FOCUS_PRESETS = [15, 25, 45, 60, 90]
export const FOCUS_MIN = 1
export const FOCUS_MAX = 240

/** Auf erlaubte Minuten begrenzen (ganze Minuten, 1–240). */
export function clampMinutes(m: number): number {
  if (!Number.isFinite(m)) return 25
  return Math.min(FOCUS_MAX, Math.max(FOCUS_MIN, Math.round(m)))
}

const listeners = new Set<() => void>()
let cache: RunningFocus | null | undefined

function read(): RunningFocus | null {
  if (cache !== undefined) return cache
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? 'null')
  } catch {
    cache = null
  }
  return cache ?? null
}

function write(v: RunningFocus | null) {
  cache = v
  try {
    if (v) localStorage.setItem(KEY, JSON.stringify(v))
    else localStorage.removeItem(KEY)
  } catch {
    /* ohne Speicher läuft der Timer nur bis zum Neuladen */
  }
  listeners.forEach((l) => l())
}

/** Der laufende Fokus (oder null) – aktualisiert sich in allen Komponenten. */
export function useFocus(): RunningFocus | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    read,
  )
}

export function defaultMinutes(): number {
  try {
    const raw = localStorage.getItem(MINUTES_KEY)
    return raw ? clampMinutes(Number(raw)) : 25
  } catch {
    return 25
  }
}

export function setDefaultMinutes(m: number) {
  try {
    localStorage.setItem(MINUTES_KEY, String(clampMinutes(m)))
  } catch {
    /* egal */
  }
}

export function startFocus(task: Pick<Task, 'id' | 'title'>, minutes = defaultMinutes()) {
  write({ taskId: task.id, title: task.title, startedAt: Date.now(), minutes: clampMinutes(minutes) })
}

/**
 * Dauer des laufenden Timers ändern, ohne neu zu starten – die schon vergangene Zeit bleibt.
 * Nie kürzer als die bereits vergangene Zeit + 1 Minute.
 */
export function setFocusMinutes(minutes: number, now = Date.now()) {
  const f = read()
  if (!f) return
  const elapsedMin = Math.ceil((now - f.startedAt) / 60_000)
  write({ ...f, minutes: clampMinutes(Math.max(minutes, elapsedMin + 1)) })
}

/** Abbrechen – ohne Punkte. */
export function stopFocus() {
  write(null)
}

export function remainingMs(f: RunningFocus, now = Date.now()): number {
  return f.startedAt + f.minutes * 60_000 - now
}

/** Zeit ist um: Sitzung speichern (bringt Punkte) und Timer beenden. Nur einmal pro Sitzung. */
export async function completeFocus(f: RunningFocus): Promise<void> {
  if (read()?.startedAt !== f.startedAt) return // schon gespeichert (z. B. in einem anderen Tab)
  write(null)
  const end = new Date(f.startedAt + f.minutes * 60_000).toISOString()
  await db.focusSessions.add({
    ...(f.taskId ? { taskId: f.taskId } : {}),
    title: f.title,
    date: localDateOf(end),
    minutes: f.minutes,
    doneAt: end,
  } as FocusSession)
}

/** „24:59“ */
export function formatClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

// Anderer Tab hat den Timer geändert → hier übernehmen
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      cache = undefined
      listeners.forEach((l) => l())
    }
  })
}
