import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { db, type Calendar } from '../db'
import { parseIcs, type CalEvent } from './calendar'
import { PUSH_URL } from './push'

/*
 * Externe Kalender laden: Die App holt die .ics-Datei über den eigenen Cloudflare-Dienst
 * (Browser dürfen iCloud/Google nicht direkt abfragen) und hält sie im Speicher.
 * Neu geladen wird beim Start, alle 15 Minuten und wenn die App wieder sichtbar wird.
 */

export const CAL_COLORS: Record<string, { label: string; card: string; dot: string }> = {
  sky: { label: 'Blau', card: 'bg-sky-50 border-sky-400 text-sky-950 dark:bg-sky-500/15 dark:text-sky-100', dot: 'bg-sky-500' },
  violet: { label: 'Lila', card: 'bg-violet-50 border-violet-400 text-violet-950 dark:bg-violet-500/15 dark:text-violet-100', dot: 'bg-violet-500' },
  teal: { label: 'Türkis', card: 'bg-teal-50 border-teal-400 text-teal-950 dark:bg-teal-500/15 dark:text-teal-100', dot: 'bg-teal-500' },
  orange: { label: 'Orange', card: 'bg-orange-50 border-orange-400 text-orange-950 dark:bg-orange-500/15 dark:text-orange-100', dot: 'bg-orange-500' },
  pink: { label: 'Rosa', card: 'bg-pink-50 border-pink-400 text-pink-950 dark:bg-pink-500/15 dark:text-pink-100', dot: 'bg-pink-500' },
}

export function calColor(c?: string) {
  return CAL_COLORS[c ?? ''] ?? CAL_COLORS.sky
}

const REFRESH_MS = 15 * 60_000

interface Loaded {
  text?: string
  at?: number
  error?: string
}

const store = new Map<string, Loaded>()
const listeners = new Set<() => void>()
let version = 0

function emit() {
  version++
  listeners.forEach((l) => l())
}

/** .ics über den Cloudflare-Dienst holen */
export async function fetchIcs(url: string): Promise<string> {
  const res = await fetch(`${PUSH_URL}/ics`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })
  const text = await res.text()
  if (!res.ok) throw new Error(text || `Fehler ${res.status}`)
  return text
}

async function load(cal: Calendar, force = false) {
  const cur = store.get(cal.id)
  if (!force && cur?.at && Date.now() - cur.at < REFRESH_MS) return
  try {
    const text = await fetchIcs(cal.url)
    store.set(cal.id, { text, at: Date.now() })
  } catch (e) {
    // Alte Termine behalten, Fehler merken
    store.set(cal.id, { ...cur, at: Date.now(), error: e instanceof Error ? e.message : 'Fehler' })
  }
  emit()
}

export function refreshCalendars(cals: Calendar[], force = false) {
  for (const c of cals) if (!c.hidden) void load(c, force)
}

export function calendarStatus(id: string): Loaded | undefined {
  return store.get(id)
}

function useStoreVersion() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => version,
  )
}

/** Alle eingetragenen Kalender (privat) + Ladestand */
export function useCalendars() {
  const cals = useLiveQuery(() => db.calendars.toArray(), [])
  const v = useStoreVersion()
  useEffect(() => {
    if (!cals?.length) return
    refreshCalendars(cals)
    const id = window.setInterval(() => refreshCalendars(cals), REFRESH_MS)
    const onVis = () => document.visibilityState === 'visible' && refreshCalendars(cals)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [cals])
  return { calendars: cals ?? [], version: v }
}

/** Termine aller sichtbaren Kalender von `from` bis `to`, nach Tag gruppiert */
export function useCalendarEvents(from: string, to: string): Map<string, CalEvent[]> {
  const { calendars, version: v } = useCalendars()
  const [events, setEvents] = useState<CalEvent[]>([])
  useEffect(() => {
    let cancelled = false
    const visible = calendars.filter((c) => !c.hidden && store.get(c.id)?.text)
    Promise.all(visible.map((c) => parseIcs(store.get(c.id)!.text!, c.id, from, to).catch(() => [] as CalEvent[]))).then((lists) => {
      if (!cancelled) setEvents(lists.flat())
    })
    return () => {
      cancelled = true
    }
  }, [calendars, v, from, to])
  return useMemo(() => {
    const map = new Map<string, CalEvent[]>()
    for (const e of events) map.set(e.date, [...(map.get(e.date) ?? []), e])
    return map
  }, [events])
}

/** Kalender-ID → Farbe/Name (für die Anzeige) */
export function useCalendarMap(): Map<string, Calendar> {
  const { calendars } = useCalendars()
  return useMemo(() => new Map(calendars.map((c) => [c.id, c])), [calendars])
}
