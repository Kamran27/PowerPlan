/*
 * Externe Kalender (Apple iCloud, Google) – nur lesen.
 * Liest eine iCalendar-Datei (.ics) und liefert die Termine eines Zeitraums, inkl. Serienterminen,
 * Ausnahmen und Zeitzonen (Bibliothek ical.js, wird erst bei Bedarf geladen).
 */

export interface CalEvent {
  /** eindeutig pro Vorkommen und Tag */
  id: string
  calId: string
  title: string
  /** Tag "JJJJ-MM-TT" (Ortszeit) */
  date: string
  allDay: boolean
  /** "HH:MM" (nur bei Terminen mit Uhrzeit) */
  start?: string
  end?: string
  location?: string
}

const MAX_OCCURRENCES = 2000

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function nextDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return iso(new Date(y, m - 1, d + 1))
}

/** Ein Vorkommen in Tagesstücke zerlegen (mehrtägige Termine erscheinen an jedem Tag). */
export function splitIntoDays(
  base: Omit<CalEvent, 'id' | 'date' | 'start' | 'end' | 'allDay'>,
  key: string,
  start: Date,
  end: Date,
  allDay: boolean,
  from: string,
  to: string,
): CalEvent[] {
  const out: CalEvent[] = []
  if (allDay) {
    // Ende ist exklusiv (DTEND = Tag danach)
    const last = end > start ? iso(new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1)) : iso(start)
    for (let d = iso(start), i = 0; d <= last && i < 60; d = nextDay(d), i++) {
      if (d >= from && d <= to) out.push({ ...base, id: `${key}|${d}`, date: d, allDay: true })
    }
    return out
  }
  const endMs = Math.max(end.getTime(), start.getTime() + 15 * 60_000)
  for (let d = iso(start), i = 0; i < 60; d = nextDay(d), i++) {
    const [y, m, dd] = d.split('-').map(Number)
    const dayStart = new Date(y, m - 1, dd).getTime()
    const dayEnd = new Date(y, m - 1, dd + 1).getTime()
    if (dayStart >= endMs) break
    const s = Math.max(start.getTime(), dayStart)
    const e = Math.min(endMs, dayEnd)
    if (d >= from && d <= to && e > s) {
      out.push({ ...base, id: `${key}|${d}`, date: d, allDay: false, start: hhmm(new Date(s)), end: e >= dayEnd ? '23:59' : hhmm(new Date(e)) })
    }
  }
  return out
}

/** Termine zwischen `from` und `to` (je einschließlich, "JJJJ-MM-TT") aus einer .ics-Datei. */
export async function parseIcs(text: string, calId: string, from: string, to: string): Promise<CalEvent[]> {
  const ICAL = (await import('ical.js')).default
  const root = new ICAL.Component(ICAL.parse(text))
  for (const tz of root.getAllSubcomponents('vtimezone')) {
    try {
      ICAL.TimezoneService.register(tz)
    } catch {
      /* unbekannte Zeitzone – Zeiten gelten dann als Ortszeit */
    }
  }
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  const rangeStart = new Date(fy, fm - 1, fd).getTime()
  const rangeEnd = new Date(ty, tm - 1, td + 1).getTime()

  const vevents = root.getAllSubcomponents('vevent')
  const exceptions = vevents.filter((v) => v.hasProperty('recurrence-id'))
  const out: CalEvent[] = []

  for (const comp of vevents) {
    if (comp.hasProperty('recurrence-id')) continue
    const ev = new ICAL.Event(comp)
    if (String(comp.getFirstPropertyValue('status') ?? '').toUpperCase() === 'CANCELLED') continue
    for (const ex of exceptions) if (ex.getFirstPropertyValue('uid') === ev.uid) ev.relateException(ex)

    const add = (startT: InstanceType<typeof ICAL.Time>, endT: InstanceType<typeof ICAL.Time>, item: InstanceType<typeof ICAL.Event>) => {
      const allDay = startT.isDate
      const start = allDay ? new Date(startT.year, startT.month - 1, startT.day) : startT.toJSDate()
      const end = endT ? (endT.isDate ? new Date(endT.year, endT.month - 1, endT.day) : endT.toJSDate()) : start
      if (start.getTime() >= rangeEnd || Math.max(end.getTime(), start.getTime() + 1) <= rangeStart) return
      const base = { calId, title: item.summary || '(ohne Titel)', ...(item.location ? { location: item.location } : {}) }
      out.push(...splitIntoDays(base, `${calId}|${ev.uid}|${startT.toString()}`, start, end, allDay, from, to))
    }

    if (ev.isRecurring()) {
      const it = ev.iterator()
      for (let i = 0, next = it.next(); next && i < MAX_OCCURRENCES; i++, next = it.next()) {
        const det = ev.getOccurrenceDetails(next)
        if (det.startDate.toJSDate().getTime() >= rangeEnd) break
        add(det.startDate, det.endDate, det.item)
      }
    } else {
      add(ev.startDate, ev.endDate, ev)
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? '').localeCompare(b.start ?? ''))
}
