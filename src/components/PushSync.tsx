import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from '../db'
import { addDays, todayISO } from '../lib/date'
import { pushConfigured, pushEnabled, syncPush } from '../lib/push'

/**
 * Unsichtbar: Sobald sich Zeitblöcke (nächste 7 Tage), erledigte Aufgaben oder die Erinnerungs-Einstellung
 * ändern, werden die geplanten Push-Erinnerungen dieses Geräts neu an den Push-Dienst gemeldet (gebündelt).
 */
export default function PushSync() {
  const [enabled, setEnabled] = useState(pushEnabled)
  const [settingsVersion, setSettingsVersion] = useState(0)
  const today = todayISO()

  useEffect(() => {
    const onChange = () => {
      setEnabled(pushEnabled())
      setSettingsVersion((v) => v + 1)
    }
    window.addEventListener('powerplan-reminders-changed', onChange)
    return () => window.removeEventListener('powerplan-reminders-changed', onChange)
  }, [])

  // Kurzer „Fingerabdruck“ von allem, was die Erinnerungen beeinflusst
  const fingerprint = useLiveQuery(async () => {
    if (!enabled || !pushConfigured()) return ''
    const blocks = await db.timeBlocks.where('date').between(today, addDays(today, 7), true, true).toArray()
    const ids = blocks.map((b) => b.taskId).filter((x): x is string => !!x)
    const tasks = await db.tasks.bulkGet(ids)
    return JSON.stringify([blocks.map((b) => [b.id, b.date, b.start, b.end, b.title]), tasks.map((t) => [t?.id, t?.done, t?.title])])
  }, [enabled, today])

  useEffect(() => {
    if (!fingerprint) return
    const id = window.setTimeout(() => {
      syncPush().catch((e) => console.warn('Push-Abgleich fehlgeschlagen', e))
    }, 3000)
    return () => window.clearTimeout(id)
  }, [fingerprint, settingsVersion])

  return null
}
