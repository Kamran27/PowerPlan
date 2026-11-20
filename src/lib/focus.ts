import { useSyncExternalStore } from 'react'
import { db, type FocusSession, type Task, type TimeBlock } from '../db'
import { localDateOf } from './date'
import { focusRange, minutesOfDay } from './focusRange'
import { fromMinutes, toMinutes } from './time'

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
  /** Pausiert seit (ms); fehlt = läuft */
  pausedAt?: number
  /** Summe aller bisherigen Pausen in ms */
  pausedMs?: number
  /**
   * Zeitblock der Aufgabe im Tagesplan, der mit dem Fokus mitwächst.
   * `start`/`end` = ursprünglich geplante Zeit (fehlt bei `created`: Block entstand erst durch den Fokus).
   */
  block?: { id: string; date: string; start?: string; end?: string; created: boolean }
}

const KEY = 'powerplan-focus'
const MINUTES_KEY = 'powerplan-focus-minutes'
/** Schnellauswahl; frei wählbar ist alles von MIN bis MAX Minuten */
export const FOCUS_PRESETS = [15, 25, 45, 60, 90]
export const FOCUS_MIN = 1
export const FOCUS_MAX = 240
/** Tagesziel Fokuszeit: mindestens 4 Stunden */
export const DAILY_FOCUS_GOAL = 240
/** Abgebrochene Sitzungen zählen erst ab dieser Dauer (Gesamtzeit und Punkte) */
export const MIN_SAVED_MINUTES = 5

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
  const f: RunningFocus = { taskId: task.id, title: task.title, startedAt: Date.now(), minutes: clampMinutes(minutes) }
  write(f)
  void attachBlock(f)
}

/* ---------- Fokus ↔ Tagesplan: die geplante Dauer wächst mit ---------- */

/**
 * Beim Start: geplanten Block der Aufgabe für heute übernehmen und so erweitern, dass er die ganze
 * Fokuszeit abdeckt. Wurde dieser Block schon für eine frühere Fokus-Sitzung genutzt, entsteht ein
 * neuer Block im aktuellen Zeitfenster – so zeigt der Kalender, wann, wie oft und wie lange.
 */
async function attachBlock(f: RunningFocus) {
  if (!f.taskId) return
  try {
    const date = localDateOf(new Date(f.startedAt).toISOString())
    const existing = await db.timeBlocks.where('taskId').equals(f.taskId).filter((b) => b.date === date && !b.focused).first()
    const r = focusRange(existing && { start: toMinutes(existing.start), end: toMinutes(existing.end) }, focusStartMin(f), focusEndMin(f))
    let block: RunningFocus['block']
    if (existing) {
      await db.timeBlocks.update(existing.id, { start: fromMinutes(r.start), end: fromMinutes(r.end), focused: true })
      block = { id: existing.id, date, start: existing.start, end: existing.end, created: false }
    } else {
      const id = await db.timeBlocks.add({ date, start: fromMinutes(r.start), end: fromMinutes(r.end), title: f.title, taskId: f.taskId, focused: true } as TimeBlock)
      block = { id, date, created: true }
    }
    // Timer könnte inzwischen beendet/geändert sein → nur die Block-Info ergänzen
    const now = read()
    if (now?.startedAt === f.startedAt) write({ ...now, block })
  } catch {
    /* Tagesplan nicht erreichbar – der Timer läuft trotzdem */
  }
}

function focusStartMin(f: RunningFocus) {
  return minutesOfDay(f.startedAt)
}

/** Pausen in ms bis jetzt (laufende Pause eingeschlossen) */
export function pausedMsOf(f: RunningFocus, now = Date.now()): number {
  return (f.pausedMs ?? 0) + (f.pausedAt ? Math.max(0, now - f.pausedAt) : 0)
}

/** Gearbeitete Zeit in ms (ohne Pausen) */
export function workedMs(f: RunningFocus, now = Date.now()): number {
  return Math.max(0, now - f.startedAt - pausedMsOf(f, now))
}

/** Geplantes Ende (ms) inklusive Pausen */
function endMsOf(f: RunningFocus, now = Date.now()) {
  return f.startedAt + f.minutes * 60_000 + pausedMsOf(f, now)
}

function focusEndMin(f: RunningFocus, endMs = endMsOf(f)) {
  // Über Mitternacht hinaus zählt bis Tagesende
  return minutesOfDay(f.startedAt) + Math.round((endMs - f.startedAt) / 60_000)
}

async function resizeBlock(f: RunningFocus, endMs?: number) {
  const b = f.block
  if (!b) return
  const orig = b.start && b.end ? { start: toMinutes(b.start), end: toMinutes(b.end) } : undefined
  const r = focusRange(orig, focusStartMin(f), focusEndMin(f, endMs))
  try {
    await db.timeBlocks.update(b.id, { start: fromMinutes(r.start), end: fromMinutes(r.end) })
  } catch {
    /* egal */
  }
}

/**
 * Dauer des laufenden Timers ändern, ohne neu zu starten – die schon vergangene Zeit bleibt.
 * Nie kürzer als die bereits vergangene Zeit + 1 Minute.
 */
export function setFocusMinutes(minutes: number, now = Date.now()) {
  const f = read()
  if (!f) return
  const elapsedMin = Math.ceil(workedMs(f, now) / 60_000)
  const next = { ...f, minutes: clampMinutes(Math.max(minutes, elapsedMin + 1)) }
  write(next)
  void resizeBlock(next)
}

/**
 * Vorzeitig beenden. Ab 5 gearbeiteten Minuten wird die Sitzung gespeichert (zählt zur Gesamtzeit
 * der Aufgabe und bringt Punkte), darunter nicht. Der Block im Tagesplan zeigt danach die tatsächliche
 * Zeit (ein geplanter Block nie kürzer als geplant); ein nur für den Fokus angelegter Block
 * verschwindet bei < 2 Minuten wieder.
 */
export function stopFocus(now = Date.now()) {
  const f = read()
  write(null)
  if (!f) return
  const worked = Math.round(workedMs(f, now) / 60_000)
  const endAt = f.pausedAt ?? now
  if (worked >= MIN_SAVED_MINUTES) void saveSession(f, worked, endAt)
  if (!f.block) return
  if (f.block.created && worked < 2) {
    void db.timeBlocks.delete(f.block.id).catch(() => {})
    return
  }
  void resizeBlock(f, endAt)
}

/** Pausieren / fortsetzen */
export function togglePause(now = Date.now()) {
  const f = read()
  if (!f) return
  if (f.pausedAt) write({ ...f, pausedAt: undefined, pausedMs: (f.pausedMs ?? 0) + Math.max(0, now - f.pausedAt) })
  else write({ ...f, pausedAt: now })
}

export function remainingMs(f: RunningFocus, now = Date.now()): number {
  // Vor dem Start nie mehr als die volle Dauer (verhindert kurz eine riesige Zahl)
  return Math.min(f.minutes * 60_000, f.minutes * 60_000 - workedMs(f, now))
}

async function saveSession(f: RunningFocus, minutes: number, endMs: number) {
  const end = new Date(endMs).toISOString()
  await db.focusSessions.add({
    ...(f.taskId ? { taskId: f.taskId } : {}),
    title: f.title,
    date: localDateOf(end),
    minutes,
    doneAt: end,
  } as FocusSession)
}

/** Zeit ist um: Sitzung speichern (bringt Punkte) und Timer beenden. Nur einmal pro Sitzung. */
export async function completeFocus(f: RunningFocus): Promise<void> {
  if (read()?.startedAt !== f.startedAt) return // schon gespeichert (z. B. in einem anderen Tab)
  write(null)
  const endMs = endMsOf(f)
  await saveSession(f, f.minutes, endMs)
  if (f.block) await resizeBlock(f, endMs)
}

/** „2 Std. 15 Min.“ / „45 Min.“ */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (!h) return `${m} Min.`
  return m ? `${h} Std. ${m} Min.` : `${h} Std.`
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
