import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db, type DayLog, type Task } from '../db'
import { addDays, todayISO } from '../lib/date'
import { MOODS } from '../lib/moods'
import { postponeTasks } from '../lib/tasks'
import { useToast } from './Toast'
import { HangingTail } from './Cats'

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
  // Bilanz des Tages (Suche über das Datum; die ID vergibt die Cloud)
  const log = useLiveQuery(() => db.dayLogs.where('date').equals(date).first(), [date])
  const [expanded, setExpanded] = useState(false)
  const [mood, setMood] = useState<DayLog['mood']>()
  const [reflection, setReflection] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)
  const toast = useToast()

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
    const data = { date, mood, reflection: reflection.trim() || undefined, savedAt: new Date().toISOString() }
    if (log) await db.dayLogs.update(log.id, data)
    else await db.dayLogs.add(data as DayLog)
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 2000)
  }

  return (
    <section className="relative rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      {/* Versteckt: Hier hängt ein Katzenschwanz unter der Karte hervor */}
      <HangingTail className="absolute -bottom-[46px] left-[38%] w-[22px] text-slate-400 dark:text-slate-500" />

      {/* Kopfzeile: Titel + Zahlen des Tages kompakt in einer Zeile */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">🌙 Tagesbilanz</h2>
        <dl className="flex gap-1.5 text-xs">
          {[
            ['Punkte', points],
            ['Erledigt', doneTasks.length],
            ['Offen', openTasks.length],
          ].map(([label, value]) => (
            <div key={label} className="flex items-baseline gap-1 rounded-lg bg-slate-50 px-2 py-1 dark:bg-slate-800/60">
              <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
              <dd className="font-bold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {openTasks.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm ring-1 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/30">
          <p className="min-w-0 flex-1 text-slate-700 dark:text-slate-200">
            <span className="text-slate-500 dark:text-slate-400">Offen geblieben: </span>
            {openTasks.map((t) => t.title).join(', ')}
          </p>
          <button
            onClick={async () => {
              const n = openTasks.length
              const undo = await postponeTasks(openTasks, addDays(todayISO(), 1))
              toast(`${n} ${n === 1 ? 'Aufgabe' : 'Aufgaben'} auf morgen verschoben`, { label: 'Rückgängig', onClick: undo })
            }}
            className="shrink-0 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-400"
          >
            ⏭️ Alles Offene auf morgen
          </button>
        </div>
      )}

      <fieldset className="mt-3">
        <legend className="text-sm font-medium">Wie war dein Tag?</legend>
        <div className="mt-1.5 flex gap-1">
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMood(m.value)}
              aria-pressed={mood === m.value}
              aria-label={m.label}
              title={m.label}
              className={`flex-1 rounded-lg py-1 text-xl transition ${
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

      <label className="mt-3 block text-sm font-medium" htmlFor="reflection">
        Was lief gut – und was nehme ich mit für morgen?
      </label>
      <textarea
        id="reflection"
        value={reflection}
        onChange={(e) => setReflection(e.target.value)}
        rows={2}
        placeholder="Ein, zwei Sätze reichen."
        className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
      />

      <div className="mt-2 flex items-center justify-end gap-3">
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
