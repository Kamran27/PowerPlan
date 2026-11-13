import { addDays } from '../lib/date'
import { levelThreshold } from '../lib/game'
import { useGame } from '../lib/gameContext'
import { isDueOn } from '../lib/habits'
import { pointsBySource } from '../lib/points'

const card = 'rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'

/** Große Level-Karte für die Statistik-Seite. */
export function LevelCard() {
  const { level, total } = useGame()
  return (
    <section className={`${card} mb-6`}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-3xl font-bold text-amber-700 tabular-nums dark:bg-amber-500/15 dark:text-amber-300">
          {level.level}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-semibold">
            Level {level.level} · {level.title}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {total} Punkte gesamt · noch <strong className="text-slate-900 dark:text-slate-100">{level.needed - level.into}</strong> bis Level{' '}
            {level.level + 1}
          </div>
          <div
            className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={level.needed}
            aria-valuenow={level.into}
            aria-label={`Fortschritt zu Level ${level.level + 1}`}
          >
            <div className="h-full rounded-full bg-amber-400 transition-all duration-700" style={{ width: `${level.pct}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
            <span>{levelThreshold(level.level)}</span>
            <span>{level.next}</span>
          </div>
        </div>
      </div>
    </section>
  )
}

/** Abzeichen: freigeschaltete farbig, gesperrte blass mit Fortschritt. */
export function BadgeGrid() {
  const { badges } = useGame()
  const unlocked = badges.filter((b) => b.unlocked).length
  return (
    <section className="mt-6">
      <h2 className="mb-2 font-semibold">
        Abzeichen{' '}
        <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
          {unlocked} von {badges.length}
        </span>
      </h2>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {badges.map((b) => (
          <li
            key={b.id}
            title={b.description}
            className={`rounded-xl p-3 ring-1 ${
              b.unlocked
                ? 'bg-amber-50 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/30'
                : 'bg-white ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'
            }`}
          >
            <div className={`text-2xl ${b.unlocked ? '' : 'opacity-30 grayscale'}`} aria-hidden>
              {b.emoji}
            </div>
            <div className="mt-1 text-sm font-medium">
              {b.title}
              <span className="sr-only">{b.unlocked ? ' (freigeschaltet)' : ' (gesperrt)'}</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{b.description}</div>
            {!b.unlocked && b.target > 1 && (
              <div className="mt-2">
                <div className="h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-slate-400" style={{ width: `${(b.current / b.target) * 100}%` }} />
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500 tabular-nums dark:text-slate-400">
                  {b.current} / {b.target}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Woher kommen die Punkte (letzte 30 Tage)? Eine Zeile pro Quelle, direkt beschriftet. */
export function PointsBySource({ today }: { today: string }) {
  const { data, me } = useGame()
  const s = pointsBySource({ tasks: data.tasks, me, habitChecks: data.habitChecks, focus: data.focus, goals: data.goals, sessions: data.sessions, reviews: data.reviews }, addDays(today, -29), today)
  const rows = [
    { label: 'Aufgaben', icon: '✅', value: s.tasks },
    { label: 'Gewohnheiten', icon: '🔁', value: s.habits },
    { label: 'Wochenfokus', icon: '🎯', value: s.focus },
    { label: 'Monatsziele', icon: '🏆', value: s.goals },
    { label: 'Fokus-Timer', icon: '⏱️', value: s.sessions },
    { label: 'Rückblicke', icon: '🗓️', value: s.reviews },
  ]
  const max = Math.max(1, ...rows.map((r) => r.value))
  const total = rows.reduce((a, r) => a + r.value, 0)
  return (
    <section className={card}>
      <h2 className="font-semibold">Punkte nach Quelle</h2>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Letzte 30 Tage · {total} Punkte</p>
      <dl className="mt-4 grid gap-3">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-3 text-sm">
            <dt className="truncate">
              <span aria-hidden>{r.icon}</span> {r.label}
            </dt>
            <div className="h-3 overflow-hidden rounded-r bg-slate-100 dark:bg-slate-800" aria-hidden>
              <div className="h-full rounded-r bg-indigo-500" style={{ width: `${(r.value / max) * 100}%` }} />
            </div>
            <dd className="text-right font-medium tabular-nums">{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/** Erfüllungsquote je Gewohnheit (letzte 28 Tage, nur fällige Tage bis heute). */
export function HabitRates({ today }: { today: string }) {
  const { data } = useGame()
  if (data.habits.length === 0) return null
  const from = addDays(today, -27)
  const rows = data.habits.map((h) => {
    let due = 0
    let done = 0
    for (let d = from; d <= today; d = addDays(d, 1)) {
      if (!isDueOn(h, d)) continue
      due++
      if (data.habitChecks.some((c) => c.habitId === h.id && c.date === d)) done++
    }
    return { habit: h, due, done, pct: due ? Math.round((done / due) * 100) : 0 }
  })
  return (
    <section className={card}>
      <h2 className="font-semibold">Gewohnheiten-Quote</h2>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Letzte 4 Wochen · erledigt von fälligen Tagen</p>
      <dl className="mt-4 grid gap-3">
        {rows.map(({ habit, due, done, pct }) => (
          <div key={habit.id} className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-3 text-sm" title={`${done} von ${due} Tagen`}>
            <dt className="truncate">
              <span aria-hidden>{habit.emoji || '✨'}</span> {habit.name}
            </dt>
            <div className="h-3 overflow-hidden rounded-r bg-slate-100 dark:bg-slate-800" aria-hidden>
              <div className="h-full rounded-r bg-indigo-500" style={{ width: `${pct}%` }} />
            </div>
            <dd className="text-right font-medium tabular-nums">{due ? `${pct} %` : '–'}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
