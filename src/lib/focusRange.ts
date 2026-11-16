import { MAX_END } from './time'

/*
 * Fokus-Timer und Tagesplan: Der Block einer Aufgabe soll die ganze Fokuszeit abdecken.
 * Reine Rechenfunktionen (ohne Datenbank) – getestet in logic.test.ts.
 */

const STEP = 5

/** Minuten seit Mitternacht (Ortszeit) für einen Zeitpunkt in ms */
export function minutesOfDay(ms: number): number {
  const d = new Date(ms)
  return d.getHours() * 60 + d.getMinutes()
}

/**
 * Neue Zeitspanne des Blocks (auf 5 Minuten gerundet, höchstens bis 23:59):
 * - Fokus beginnt im geplanten Block → Beginn bleibt, Ende wächst mit, falls der Fokus länger dauert
 * - Fokus beginnt außerhalb (früher/später als geplant) → der Block wandert zum Fokusbeginn,
 *   behält mindestens die geplante Dauer und wächst ebenfalls mit
 * - kein geplanter Block → genau die Fokuszeit (mindestens 5 Minuten)
 */
export function focusRange(planned: { start: number; end: number } | undefined, focusStart: number, focusEnd: number) {
  const fs = Math.floor(focusStart / STEP) * STEP
  const fe = Math.min(MAX_END, Math.max(Math.ceil(focusEnd / STEP) * STEP, fs + STEP))
  if (!planned) return { start: fs, end: fe }
  if (fs >= Math.floor(planned.start / STEP) * STEP && fs < planned.end) {
    return { start: planned.start, end: Math.min(MAX_END, Math.max(planned.end, fe)) }
  }
  return { start: fs, end: Math.min(MAX_END, Math.max(fs + (planned.end - planned.start), fe)) }
}
