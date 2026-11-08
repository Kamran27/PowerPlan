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
