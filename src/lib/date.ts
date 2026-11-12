/** Heutiges Datum (lokale Zeit) als "JJJJ-MM-TT". */
export function todayISO(): string {
  return toISODate(new Date())
}

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return toISODate(new Date(y, m - 1, d + days))
}

export type DueState = 'overdue' | 'today' | 'soon' | 'later'

/** Lesbare Beschriftung und Zustand eines Fälligkeitsdatums. */
export function describeDue(iso: string): { label: string; state: DueState } {
  const today = todayISO()
  if (iso < today) {
    return { label: `Überfällig · ${formatShort(iso)}`, state: 'overdue' }
  }
  if (iso === today) return { label: 'Heute', state: 'today' }
  if (iso === addDays(today, 1)) return { label: 'Morgen', state: 'soon' }
  if (iso <= addDays(today, 6)) {
    const [y, m, d] = iso.split('-').map(Number)
    return { label: new Date(y, m - 1, d).toLocaleDateString('de-DE', { weekday: 'long' }), state: 'soon' }
  }
  return { label: formatShort(iso), state: 'later' }
}

function formatShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}

/** „Di, 17. Nov.“ */
export function formatDayShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })
}

/** Lokales Datum ("JJJJ-MM-TT") eines ISO-Zeitstempels – wichtig rund um Mitternacht (UTC ≠ Ortszeit). */
export function localDateOf(isoTimestamp: string): string {
  return toISODate(new Date(isoTimestamp))
}

/** Kalenderwoche nach ISO 8601 (Woche mit dem ersten Donnerstag = KW 1). */
export function isoWeekNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}
