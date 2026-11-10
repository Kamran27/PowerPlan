import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { db } from '../db'
import { addDays, todayISO } from '../lib/date'
import { moodInfo } from '../lib/moods'
import { dayStatus, streaks, weekStart, type DayStatus } from '../lib/points'
import { usePointsByDay } from '../lib/usePoints'

const DAYS_IN_CHART = 14
const CHART_HEIGHT = 160 // px

const STATUS_TEXT: Record<DayStatus, { icon: string; label: string }> = {
  fulfilled: { icon: '🔥', label: 'Alles Fällige erledigt' },
  missed: { icon: '✗', label: 'Etwas blieb liegen' },
  open: { icon: '…', label: 'Läuft noch' },
  neutral: { icon: '', label: 'Nichts fällig' },
}

function formatDay(iso: string, opts: Intl.DateTimeFormatOptions) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('de-DE', opts)
}

export default function Statistik() {
  const tasks = useLiveQuery(() => db.tasks.toArray(), [])
  const byDay = usePointsByDay()
  const logs = useLiveQuery(() => db.dayLogs.orderBy('date').reverse().limit(10).toArray(), [])
  const [hovered, setHovered] = useState<number | null>(null)
  const today = todayISO()

  const stats = useMemo(() => {
    const all = tasks ?? []
    const monday = weekStart(today)
    let total = 0
    let week = 0
    for (const [date, pts] of byDay) {
      total += pts
      if (date >= monday && date <= today) week += pts
    }
    const days = Array.from({ length: DAYS_IN_CHART }, (_, i) => {
      const date = addDays(today, i - (DAYS_IN_CHART - 1))
      return { date, points: byDay.get(date) ?? 0, status: dayStatus(all, date, today) }
    })
    return { total, week, days, streak: streaks(all, today), byDay }
  }, [tasks, byDay, today])

  if (!tasks) return null

  const max = Math.max(50, ...stats.days.map((d) => d.points))
  const logByDate = new Map((logs ?? []).map((l) => [l.date, l]))

  return (
    <div className="max-w-3xl">
      <PageHeader title="Statistik" subtitle="Dein Fortschritt über die Zeit." />

      {/* Kennzahlen */}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Punkte gesamt', value: stats.total, icon: '🏆' },
          { label: 'Diese Woche', value: stats.week, icon: '📅' },
          { label: 'Aktueller Streak', value: stats.streak.current, icon: '🔥', unit: stats.streak.current === 1 ? 'Tag' : 'Tage' },
          { label: 'Bester Streak', value: stats.streak.best, icon: '⭐', unit: stats.streak.best === 1 ? 'Tag' : 'Tage' },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <dt className="text-xs text-slate-500 dark:text-slate-400">
              <span aria-hidden>{k.icon}</span> {k.label}
            </dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">
              {k.value}
              {k.unit && <span className="ml-1 text-sm font-normal text-slate-500 dark:text-slate-400">{k.unit}</span>}
            </dd>
          </div>
        ))}
      </dl>

      {/* Punkte der letzten 14 Tage */}
      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <h2 className="font-semibold">Punkte der letzten {DAYS_IN_CHART} Tage</h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">🔥 = alles Fällige erledigt · ✗ = etwas blieb liegen</p>

        <div className="relative mt-6" style={{ height: CHART_HEIGHT }}>
          {/* Hilfslinien: oben = Maximum, Mitte, Grundlinie */}
          {[1, 0.5, 0].map((f) => (
            <div key={f} className="pointer-events-none absolute inset-x-0 flex items-center gap-2" style={{ bottom: f * CHART_HEIGHT }}>
              <span className="w-8 translate-y-1/2 text-right text-[10px] text-slate-400 tabular-nums">{Math.round(max * f)}</span>
              <div className={`h-px flex-1 ${f === 0 ? 'bg-slate-300 dark:bg-slate-600' : 'bg-slate-100 dark:bg-slate-800'}`} />
            </div>
          ))}

          <div className="absolute inset-y-0 right-0 left-10 flex items-end gap-0.5">
            {stats.days.map((d, i) => {
              const h = d.points ? Math.max(4, (d.points / max) * CHART_HEIGHT) : 0
              const isToday = d.date === today
              return (
                <div
                  key={d.date}
                  className="relative flex h-full flex-1 items-end justify-center"
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setHovered(hovered === i ? null : i)}
                >
                  <div
                    className={`w-full max-w-7 rounded-t transition-[height] duration-500 ${
                      hovered === i ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-indigo-500 dark:bg-indigo-500'
                    } ${isToday ? '' : 'opacity-85'}`}
                    style={{ height: h }}
                  />
                  {isToday && d.points > 0 && (
                    <span className="absolute text-xs font-semibold tabular-nums" style={{ bottom: h + 4 }}>
                      {d.points}
                    </span>
                  )}
                  {hovered === i && (
                    <div
                      role="tooltip"
                      className={`pointer-events-none absolute z-10 w-max rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg dark:bg-slate-100 dark:text-slate-900 ${
                        // Am Rand bündig ausrichten, damit der Tooltip nicht aus der Karte ragt
                        i < 3 ? 'left-0' : i >= DAYS_IN_CHART - 3 ? 'right-0' : 'left-1/2 -translate-x-1/2'
                      }`}
                      style={{ bottom: h + 8 }}
                    >
                      <div className="font-semibold">{formatDay(d.date, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                      <div className="tabular-nums">{d.points} Punkte</div>
                      <div>
                        {STATUS_TEXT[d.status].icon} {STATUS_TEXT[d.status].label}
                      </div>
                      {logByDate.get(d.date)?.mood && <div>Stimmung: {moodInfo(logByDate.get(d.date)!.mood)?.emoji}</div>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Tage-Beschriftung + Status */}
        <div className="mt-1 ml-10 flex gap-0.5">
          {stats.days.map((d) => (
            <div key={d.date} className="flex-1 text-center text-[10px] leading-tight text-slate-500 dark:text-slate-400">
              <div className={d.date === today ? 'font-bold text-slate-900 dark:text-slate-100' : ''}>
                {formatDay(d.date, { weekday: 'narrow' })}
              </div>
              <div className="tabular-nums">{formatDay(d.date, { day: 'numeric' })}</div>
              <div className="h-4" aria-label={STATUS_TEXT[d.status].label}>
                {STATUS_TEXT[d.status].icon}
              </div>
            </div>
          ))}
        </div>

        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            Als Tabelle anzeigen
          </summary>
          <table className="mt-2 w-full text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-1 font-medium">Tag</th>
                <th className="py-1 text-right font-medium">Punkte</th>
                <th className="py-1 pl-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {[...stats.days].reverse().map((d) => (
                <tr key={d.date} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1">{formatDay(d.date, { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                  <td className="py-1 text-right tabular-nums">{d.points}</td>
                  <td className="py-1 pl-4">
                    {STATUS_TEXT[d.status].icon} {STATUS_TEXT[d.status].label}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      {/* Tagesbilanzen */}
      <section className="mt-6">
        <h2 className="mb-2 font-semibold">Letzte Tagesbilanzen</h2>
        {logs && logs.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Noch keine Bilanz. Ab 18 Uhr erscheint sie auf der Heute-Seite.
          </p>
        )}
        <ul className="grid gap-2">
          {(logs ?? []).map((l) => (
            <li key={l.date} className="flex gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
              <span className="text-2xl" aria-label={moodInfo(l.mood)?.label ?? 'Keine Stimmung'}>
                {moodInfo(l.mood)?.emoji ?? '·'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">{formatDay(l.date, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                  <span className="text-slate-500 tabular-nums dark:text-slate-400">{stats.byDay.get(l.date) ?? 0} Punkte</span>
                </div>
                {l.reflection && <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{l.reflection}</p>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
