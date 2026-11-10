import { useRef, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { useToast } from '../components/Toast'
import { exportBackup, readBackup, restoreBackup } from '../lib/backup'

type Pending = Awaited<ReturnType<typeof readBackup>>

export default function Einstellungen() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [error, setError] = useState('')
  const toast = useToast()

  async function onFile(file: File | undefined) {
    setError('')
    setPending(null)
    if (!file) return
    try {
      setPending(await readBackup(file))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function confirmImport() {
    if (!pending) return
    try {
      await restoreBackup(pending)
      toast(`Sicherung wiederhergestellt (${pending.tasks.length} Aufgaben, ${pending.habits.length} Gewohnheiten)`)
    } catch {
      setError('Wiederherstellen fehlgeschlagen. Deine bisherigen Daten sind unverändert.')
    }
    setPending(null)
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Einstellungen" />
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <h2 className="font-semibold">Datensicherung</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Deine Daten liegen nur in diesem Browser. Exportiere regelmäßig eine Sicherung, z. B. in dein iCloud Drive.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => exportBackup()}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Sicherung exportieren
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800"
          >
            Sicherung importieren …
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>

        {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        {pending && (
          <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm ring-1 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/30">
            <p>
              Sicherung vom{' '}
              <strong>{pending.exportedAt ? new Date(pending.exportedAt).toLocaleString('de-DE') : 'unbekannten Datum'}</strong>{' '}
              mit <strong>{pending.tasks.length} Aufgaben</strong> und <strong>{pending.habits.length} Gewohnheiten</strong>.
            </p>
            <p className="mt-1">Alle aktuellen Daten in diesem Browser werden dadurch <strong>ersetzt</strong>.</p>
            <div className="mt-3 flex gap-2">
              <button onClick={confirmImport} className="rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-500">
                Ja, ersetzen
              </button>
              <button onClick={() => setPending(null)} className="rounded-lg px-3 py-1.5 hover:bg-amber-100 dark:hover:bg-amber-500/20">
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
