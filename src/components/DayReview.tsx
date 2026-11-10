import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db, type DayLog, type Task } from '../db'
import { MOODS } from '../lib/moods'

/** Ab dieser Stunde wird die Tagesbilanz automatisch angezeigt. */
const REVIEW_HOUR = 18

interface Props {
  date: string
  points: number
  doneTasks: Task[]
  openTasks: Task[]
}

/** Abend-Tagesbilanz: Zahlen des Tages, Stimmung (1–5) und kurze Reflexion. */
export default function DayReview({ date, points, doneTasks, openTasks }: Props) {
  const log = useLiveQuery(() => db.dayLogs.get(date), [date])
  const [expanded, setExpanded] = useState(false)
  const [mood, setMood] = useState<DayLog['mood']>()
  const [reflection, setReflection] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)

  // Gespeicherte Bilanz in die Felder übernehmen, sobald sie geladen ist.
  useEffect(() => {
    if (!log) return
    setMood(log.mood)
    setReflection(log.reflection ?? '')
  }, [log])

  const isEvening = new Date().getHours() >= REVIEW_HOUR
  if (log === undefined && !isEvening && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 hover:bg-slate-100/60 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/40"
      >
        🌙 Tagesbilanz – erscheint ab {REVIEW_HOUR} Uhr, oder jetzt öffnen
      </button>
    )
  }

  async function save() {
    await db.dayLogs.put({ date, mood, reflection: reflection.trim() || undefined, savedAt: new Date().toISOString() })
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 2000)
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <h2 className="font-semibold">🌙 Tagesbilanz</h2>

      <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
          <dt className="text-xs text-slate-500 dark:text-slate-400">Punkte</dt>
          <dd className="text-xl font-bold tabular-nums">{points}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
          <dt className="text-xs text-slate-500 dark:text-slate-400">Erledigt</dt>
          <dd className="text-xl font-bold tabular-nums">{doneTasks.length}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
          <dt className="text-xs text-slate-500 dark:text-slate-400">Offen</dt>
          <dd className="text-xl font-bold tabular-nums">{openTasks.length}</dd>
        </div>
      </dl>

      {openTasks.length > 0 && (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          <span className="text-slate-500 dark:text-slate-400">Offen geblieben: </span>
          {openTasks.map((t) => t.title).join(', ')}
        </p>
      )}

      <fieldset className="mt-4">
        <legend className="text-sm font-medium">Wie war dein Tag?</legend>
        <div className="mt-2 flex gap-1">
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMood(m.value)}
              aria-pressed={mood === m.value}
              aria-label={m.label}
              title={m.label}
              className={`flex-1 rounded-xl py-2 text-2xl transition ${
                mood === m.value
                  ? 'bg-indigo-100 ring-2 ring-indigo-500 dark:bg-indigo-500/20'
                  : 'bg-slate-50 opacity-60 hover:opacity-100 dark:bg-slate-800/60'
              }`}
            >
              {m.emoji}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="mt-4 block text-sm font-medium" htmlFor="reflection">
        Was lief gut – und was nehme ich mit für morgen?
      </label>
      <textarea
        id="reflection"
        value={reflection}
        onChange={(e) => setReflection(e.target.value)}
        rows={3}
        placeholder="Ein, zwei Sätze reichen."
        className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
      />

      <div className="mt-3 flex items-center justify-end gap-3">
        {savedFlash && <span className="text-sm text-emerald-600 dark:text-emerald-400">Gespeichert ✓</span>}
        <button
          onClick={save}
          disabled={!mood && !reflection.trim()}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
        >
          {log ? 'Bilanz aktualisieren' : 'Bilanz speichern'}
        </button>
      </div>
    </section>
  )
}
