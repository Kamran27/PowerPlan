import { useObservable } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from '../db'
import { countLegacy, importLegacyData, legacyHandled, markLegacyHandled, readLegacyDb, type LegacyData } from '../lib/legacy'
import { useToast } from './Toast'

/**
 * Nach dem Anmelden: Gibt es auf diesem Gerät noch Daten aus der Zeit vor der Cloud,
 * fragt dieser Hinweis, ob sie übernommen werden sollen (einmal pro Gerät).
 */
export default function LegacyImportBanner() {
  const user = useObservable(db.cloud.currentUser)
  const [data, setData] = useState<LegacyData | null>(null)
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (!user?.isLoggedIn || legacyHandled()) return
    readLegacyDb()
      .then((d) => {
        if (d && countLegacy(d) > 0) setData(d)
        else markLegacyHandled('dismissed') // nichts zu übernehmen
      })
      .catch(() => {})
  }, [user?.isLoggedIn])

  if (!data) return null

  async function accept() {
    setBusy(true)
    try {
      await importLegacyData(data!)
      toast(`✅ ${countLegacy(data!)} Einträge übernommen – sie erscheinen jetzt auf allen Geräten.`)
      setData(null)
    } catch (e) {
      console.error(e)
      toast('Übernahme fehlgeschlagen – bitte später erneut versuchen.')
    } finally {
      setBusy(false)
    }
  }

  function dismiss() {
    markLegacyHandled('dismissed')
    setData(null)
  }

  const parts = [
    [data.tasks.length, 'Aufgaben'],
    [data.habits.length, 'Gewohnheiten'],
    [data.goals.length, 'Ziele'],
    [data.weekFocus.length, 'Fokus-Punkte'],
    [data.dayLogs.length, 'Tagesbilanzen'],
  ].filter(([n]) => (n as number) > 0)

  return (
    <div className="mb-6 rounded-2xl bg-amber-50 p-4 text-sm ring-1 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/30">
      <p className="font-semibold">📦 Daten von vor der Cloud gefunden</p>
      <p className="mt-1">
        Auf diesem Gerät liegen noch {parts.map(([n, label]) => `${n} ${label}`).join(', ')}. Sollen sie in dein Cloud-Konto übernommen
        werden?
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={accept}
          disabled={busy}
          className="rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
        >
          {busy ? 'Übernehme …' : 'Ja, übernehmen'}
        </button>
        <button onClick={dismiss} className="rounded-lg px-3 py-1.5 hover:bg-amber-100 dark:hover:bg-amber-500/20">
          Nein, nicht übernehmen
        </button>
      </div>
    </div>
  )
}
