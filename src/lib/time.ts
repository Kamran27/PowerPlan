/** Sichtbarer Bereich der Zeitleiste und Raster (alles in Minuten seit Mitternacht). */
export const DAY_START = 6 * 60 // 06:00
export const DAY_END = 24 * 60 // 24:00 (Ende des Rasters)
export const MAX_END = DAY_END - 1 // 23:59 – spätestes Blockende
export const SNAP = 15 // Blöcke rasten auf 15 Minuten ein
export const PX_PER_MIN = 1 // 1 Pixel pro Minute = 60 px pro Stunde
export const DEFAULT_DURATION = 60

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function fromMinutes(min: number): string {
  const m = Math.max(0, Math.min(MAX_END, Math.round(min)))
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export function snap(min: number, step = SNAP): number {
  return Math.round(min / step) * step
}

export function nowMinutes(): number {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

/** Ende einer Zeitspanne; ohne Ende: Beginn + Standarddauer (max. 23:59). */
export function resolveEnd(start: string, end?: string): string {
  return end || fromMinutes(Math.min(toMinutes(start) + DEFAULT_DURATION, MAX_END))
}

/** Fehlermeldung für eine Zeitspanne, oder '' wenn alles passt. */
export function timeRangeError(start: string, end: string): string {
  if (start && end && toMinutes(end) <= toMinutes(start)) return 'Das Ende muss nach dem Beginn liegen.'
  return ''
}
