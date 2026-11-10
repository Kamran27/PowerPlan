import { useEffect, useRef, useState } from 'react'
import { db } from '../db'
import { todayISO } from '../lib/date'
import { getReminderSettings, showNotification } from '../lib/reminders'
import { nowMinutes, toMinutes } from '../lib/time'
import { useToast } from './Toast'

const CHECK_EVERY_MS = 20_000

/**
 * Läuft unsichtbar im Hintergrund, solange die App geöffnet ist:
 * erinnert X Minuten vor Beginn eines Zeitblocks (System-Benachrichtigung + Meldung in der App).
 */
export default function ReminderService() {
  const [settings, setSettings] = useState(getReminderSettings)
  const notified = useRef(new Set<string>())
  const toast = useToast()

  useEffect(() => {
    const onChange = () => setSettings(getReminderSettings())
    window.addEventListener('powerplan-reminders-changed', onChange)
    return () => window.removeEventListener('powerplan-reminders-changed', onChange)
  }, [])

  useEffect(() => {
    if (!settings.blocks) return

    async function check() {
      const today = todayISO()
      const now = nowMinutes()
      const blocks = await db.timeBlocks.where('date').equals(today).toArray()
      for (const b of blocks) {
        const start = toMinutes(b.start)
        const key = `${today}|${b.id}|${b.start}`
        // Fenster: ab „lead“ Minuten vorher bis zum Beginn (verpasste Prüfungen werden nachgeholt)
        if (now < start - settings.leadMinutes || now > start || notified.current.has(key)) continue
        const task = b.taskId ? await db.tasks.get(b.taskId) : undefined
        if (task?.done) continue
        notified.current.add(key)
        const title = task?.title ?? b.title
        const inMin = start - now
        const when = inMin <= 0 ? 'Jetzt' : `In ${inMin} Min.`
        await showNotification(`${when}: ${title}`, `${b.start}–${b.end} Uhr`, key)
        toast(`⏰ ${when}: ${title} (${b.start} Uhr)`)
      }
    }

    check()
    const id = window.setInterval(check, CHECK_EVERY_MS)
    return () => window.clearInterval(id)
  }, [settings, toast])

  return null
}
