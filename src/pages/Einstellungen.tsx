import { useRef, useState } from 'react'
import InstallAppCard from '../components/InstallAppCard'
import PageHeader from '../components/PageHeader'
import ReminderSettingsCard from '../components/ReminderSettingsCard'
import AccountCard from '../components/AccountCard'
import { useToast } from '../components/Toast'
import { exportBackup, readBackup, restoreBackup } from '../lib/backup'

type Pending = Awaited<ReturnType<typeof readBackup>>

export default function Einstellungen() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const toast = useToast()

  async function onFile(file: File | undefined) {
    setError('')
    setInfo('')
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
      const r = await restoreBackup(pending)
      toast(`Sicherung wiederhergestellt (${pending.tasks.length} Aufgaben, ${pending.habits.length} Gewohnheiten, ${pending.spaces.length} Bereiche)`)
      const notes: string[] = []
      if (r.recreatedSpaces.length)
        notes.push(
          `Neu angelegt, weil gelöscht: ${r.recreatedSpaces.map((t) => `„${t}“`).join(', ')}. Mitglieder bitte unter Gemeinsam → Mitglieder neu einladen.`,
        )
      if (r.madePrivate) notes.push(`${r.madePrivate} gemeinsame Aufgaben ohne ihren Bereich wurden als private Aufgaben übernommen.`)
      setInfo(notes.join(' '))
    } catch (e) {
      console.error(e)
      setError('Wiederherstellen fehlgeschlagen. Deine bisherigen Daten sind unverändert.')
    }
    setPending(null)
  }

  // Kurze Übersicht der Sicherung: „12 Aufgaben, 3 Gewohnheiten, 2 Bereiche, 40 Artikel, 5 Rezepte“
  function summary(p: Pending) {
    const parts: [number, string, string][] = [
      [p.tasks.length, 'Aufgabe', 'Aufgaben'],
      [p.habits.length, 'Gewohnheit', 'Gewohnheiten'],
      [p.goals.length, 'Ziel', 'Ziele'],
      [p.spaces.length, 'gemeinsamer Bereich', 'gemeinsame Bereiche'],
      [p.shoppingItems.filter((i) => !i.cleared).length, 'Einkaufsartikel', 'Einkaufsartikel'],
      [p.recipes.length, 'Rezept', 'Rezepte'],
    ]
    return parts
      .filter(([n], i) => n > 0 || i < 2)
      .map(([n, one, many]) => `${n} ${n === 1 ? one : many}`)
      .join(', ')
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Einstellungen" />
      <AccountCard />
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <h2 className="font-semibold">Datensicherung</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Deine Daten werden automatisch mit der Cloud abgeglichen. Eine Sicherungsdatei ist trotzdem ein gutes Extra-Backup, z. B. in deinem iCloud Drive.
          Sie enthält alles: deine privaten Daten und die gemeinsamen Bereiche mit Aufgaben, Einkaufslisten und Rezepten.
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
        {info && <p className="mt-3 rounded-lg bg-sky-50 p-3 text-sm text-sky-800 ring-1 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/30">ℹ️ {info}</p>}

        {pending && (
          <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm ring-1 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/30">
            <p>
              Sicherung vom{' '}
              <strong>{pending.exportedAt ? new Date(pending.exportedAt).toLocaleString('de-DE') : 'unbekannten Datum'}</strong>{' '}
              mit <strong>{summary(pending)}</strong>.
            </p>
            <p className="mt-1">Die Einträge werden <strong>hinzugefügt</strong> (bzw. gleiche Einträge aktualisiert) – es wird nichts gelöscht. Sie erscheinen danach auf allen deinen Geräten.</p>
            {pending.spaces.length > 0 && (
              <p className="mt-1">
                Gemeinsame Bereiche, die es noch gibt, werden ergänzt – für alle Mitglieder. Gelöschte Bereiche werden neu angelegt; die Mitglieder lädst du dann neu ein.
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <button onClick={confirmImport} className="rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-500">
                Ja, übernehmen
              </button>
              <button onClick={() => setPending(null)} className="rounded-lg px-3 py-1.5 hover:bg-amber-100 dark:hover:bg-amber-500/20">
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </section>
      <ReminderSettingsCard />
      <InstallAppCard />
    </div>
  )
}
