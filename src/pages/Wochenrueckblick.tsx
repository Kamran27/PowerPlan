import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { useToast } from '../components/Toast'
import WeekFocus from '../components/WeekFocus'
import { db, type Task, type WeekReview } from '../db'
import { addDays, formatDayShort, isoWeekNumber, localDateOf, todayISO } from '../lib/date'
import { useGame } from '../lib/gameContext'
import { isDueOn } from '../lib/habits'
import { dayStatus, REVIEW_POINTS, reviewWeekFor } from '../lib/points'
import { visibleForMe } from '../lib/spaces'
import { postponeTasks } from '../lib/tasks'

const card = 'rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'
const STEPS = ['Rückblick', 'Reflexion', 'Wochenfokus', 'Verteilen'] as const

/**
 * Geführter Wochenrückblick in 4 Schritten: Zahlen der Woche + Liegengebliebenes,
 * kurze Reflexion, Wochenfokus für die neue Woche, Aufgaben ohne Datum auf die Tage verteilen.
 */
export default function Wochenrueckblick() {
  const today = todayISO()
  const week = reviewWeekFor(today)
  const weekEnd = addDays(week, 6)
  const planWeek = addDays(week, 7)
  const planDays = Array.from({ length: 7 }, (_, i) => addDays(planWeek, i))

  const { data, byDay, me } = useGame()
  const review = useLiveQuery(() => db.weekReviews.where('week').equals(week).first(), [week])
  const sessions = useLiveQuery(() => db.focusSessions.where('date').between(week, weekEnd, true, true).count(), [week, weekEnd])
  const [step, setStep] = useState(0)
  const [wentWell, setWentWell] = useState('')
  const [improve, setImprove] = useState('')
  const toast = useToast()

  useEffect(() => {
    if (!review) return
    setWentWell(review.wentWell ?? '')
    setImprove(review.improve ?? '')
  }, [review])

  const mine = useMemo(() => data.tasks.filter((t) => visibleForMe(t, me)), [data.tasks, me])
  const inWeek = (d?: string) => !!d && d >= week && d <= weekEnd

  // Zahlen der Woche
  const stats = useMemo(() => {
    const done = mine.filter((t) => t.done && t.doneAt && inWeek(localDateOf(t.doneAt))).length
    let points = 0
    for (let d = week; d <= weekEnd; d = addDays(d, 1)) points += byDay.get(d) ?? 0
    let due = 0
    let checked = 0
    for (const h of data.habits) {
      for (let d = week; d <= weekEnd && d <= today; d = addDays(d, 1)) {
        if (d < h.createdAt.slice(0, 10) || !isDueOn(h, d)) continue
        due++
        if (data.habitChecks.some((c) => c.habitId === h.id && c.date === d)) checked++
      }
    }
    const fulfilled = Array.from({ length: 7 }, (_, i) => addDays(week, i)).filter((d) => d <= today && dayStatus(mine, d, today) === 'fulfilled').length
    const focusDone = data.focus.filter((f) => f.week === week && f.doneAt).length
    return { done, points, habitPct: due ? Math.round((checked / due) * 100) : null, fulfilled, focusDone }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine, byDay, data, week, weekEnd, today])

  // Liegengebliebenes: in der Woche (oder davor) fällig und noch offen
  const leftOver = mine.filter((t) => !t.done && t.dueDate && t.dueDate <= weekEnd).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
  // Ohne Datum: auf die neue Woche verteilen
  const undated = mine.filter((t) => !t.done && !t.dueDate)
  const perDay = (d: string) => mine.filter((t) => !t.done && t.dueDate === d).length

  async function moveTo(tasks: Task[], date: string, label: string) {
    const undo = await postponeTasks(tasks, date)
    toast(`${tasks.length === 1 ? `„${tasks[0].title}“` : `${tasks.length} Aufgaben`} → ${label}`, { label: 'Rückgängig', onClick: undo })
  }

  async function finish() {
    const data: Omit<WeekReview, 'id'> = { week, wentWell: wentWell.trim() || undefined, improve: improve.trim() || undefined, savedAt: new Date().toISOString() }
    if (review) {
      // Aktualisieren behält das ursprüngliche Datum (die Punkte gab es schon)
      await db.weekReviews.update(review.id, { wentWell: data.wentWell, improve: data.improve })
      toast('Wochenrückblick aktualisiert ✓')
    } else {
      await db.weekReviews.add(data as WeekReview)
      toast(`🗓️ Wochenrückblick geschafft – +${REVIEW_POINTS} Punkte! Gute neue Woche.`)
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Wochenrückblick"
        subtitle={`KW ${isoWeekNumber(week)} (${formatDayShort(week)} – ${formatDayShort(weekEnd)}) · Planung für KW ${isoWeekNumber(planWeek)}`} cat="sleeping" />
      {review && (
        <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/30">
          ✅ Für diese Woche schon erledigt am {formatDayShort(localDateOf(review.savedAt))}. Du kannst alles noch anpassen.
        </p>
      )}

      {/* Schritte */}
      <ol className="mb-4 flex flex-wrap gap-1 text-sm" aria-label="Schritte">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              onClick={() => setStep(i)}
              aria-current={step === i ? 'step' : undefined}
              className={`rounded-full px-3 py-1 font-medium ${
                step === i ? 'bg-indigo-600 text-white' : i < step ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' : 'text-slate-500 ring-1 ring-slate-200 dark:ring-slate-700'
              }`}
            >
              {i + 1}. {s}
            </button>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section className={card}>
          <h2 className="font-semibold">Deine Woche in Zahlen</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-center sm:grid-cols-3">
            <Stat label="Aufgaben erledigt" value={stats.done} />
            <Stat label="Punkte" value={stats.points} />
            <Stat label="Tage mit Plan erfüllt" value={`${stats.fulfilled}/7`} />
            <Stat label="Gewohnheiten" value={stats.habitPct === null ? '–' : `${stats.habitPct} %`} />
            <Stat label="Wochenfokus" value={`${stats.focusDone}/3`} />
            <Stat label="Fokus-Sitzungen" value={sessions ?? 0} />
          </dl>

          <h3 className="mt-6 font-semibold">Liegengeblieben ({leftOver.length})</h3>
          {leftOver.length === 0 ? (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Nichts offen – stark! 🎉</p>
          ) : (
            <>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Entscheide für jede Aufgabe: in die neue Woche mitnehmen oder streichen.</p>
              <ul className="mt-2 grid gap-1">
                {leftOver.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{t.title}</span>
                    <span className="text-xs text-rose-600 dark:text-rose-400">{formatDayShort(t.dueDate!)}</span>
                    <button onClick={() => moveTo([t], planWeek, `${formatDayShort(planWeek)}`)} className="rounded-md px-2 py-0.5 text-indigo-600 ring-1 ring-indigo-200 hover:bg-indigo-50 dark:text-indigo-300 dark:ring-indigo-500/40">
                      ⏭️ Mo
                    </button>
                    <button
                      onClick={async () => {
                        await db.tasks.delete(t.id)
                        toast(`„${t.title}“ gestrichen`, { label: 'Rückgängig', onClick: () => db.tasks.put(t) })
                      }}
                      className="rounded-md px-2 py-0.5 text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50 dark:ring-slate-700 dark:hover:bg-slate-800"
                    >
                      Streichen
                    </button>
                  </li>
                ))}
              </ul>
              {leftOver.length > 1 && (
                <button onClick={() => moveTo(leftOver, planWeek, formatDayShort(planWeek))} className="mt-3 text-sm text-indigo-600 hover:underline dark:text-indigo-400">
                  Alle {leftOver.length} auf {formatDayShort(planWeek)} verschieben
                </button>
              )}
            </>
          )}
          <Next onClick={() => setStep(1)} />
        </section>
      )}

      {step === 1 && (
        <section className={card}>
          <label className="block font-semibold" htmlFor="well">
            Was lief diese Woche gut?
          </label>
          <textarea id="well" value={wentWell} onChange={(e) => setWentWell(e.target.value)} rows={3} className={textarea} placeholder="Ein, zwei Sätze reichen." />
          <label className="mt-4 block font-semibold" htmlFor="improve">
            Was mache ich nächste Woche anders?
          </label>
          <textarea id="improve" value={improve} onChange={(e) => setImprove(e.target.value)} rows={3} className={textarea} placeholder="z. B. Sport schon morgens einplanen" />
          <Next onClick={() => setStep(2)} />
        </section>
      )}

      {step === 2 && (
        <section>
          <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">Die 3 wichtigsten Dinge für KW {isoWeekNumber(planWeek)}:</p>
          <WeekFocus week={planWeek} />
          <div className={`${card} mt-4`}>
            <Next onClick={() => setStep(3)} />
          </div>
        </section>
      )}

      {step === 3 && (
        <section className={card}>
          <h2 className="font-semibold">Aufgaben ohne Datum verteilen ({undated.length})</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Tippe auf einen Tag. Die Zahl zeigt, wie viel dort schon geplant ist.</p>
          {undated.length === 0 && <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Alles hat schon einen Termin. 👍</p>}
          <ul className="mt-3 grid gap-3">
            {undated.map((t) => (
              <li key={t.id}>
                <p className="text-sm font-medium">{t.title}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {planDays.map((d) => (
                    <button
                      key={d}
                      onClick={() => moveTo([t], d, formatDayShort(d))}
                      className="rounded-lg px-2 py-1 text-xs ring-1 ring-slate-200 hover:bg-indigo-50 hover:ring-indigo-300 dark:ring-slate-700 dark:hover:bg-indigo-500/10"
                    >
                      {formatDayShort(d).split(',')[0]} <span className="text-slate-400">{perDay(d)}</span>
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex justify-end">
            <button onClick={finish} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
              {review ? 'Rückblick aktualisieren' : `✅ Rückblick abschließen (+${REVIEW_POINTS})`}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

const textarea = 'mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800'

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-xl font-bold tabular-nums">{value}</dd>
    </div>
  )
}

function Next({ onClick }: { onClick: () => void }) {
  return (
    <div className="mt-6 flex justify-end">
      <button onClick={onClick} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
        Weiter →
      </button>
    </div>
  )
}
