import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import DayReview from '../components/DayReview'
import DayTimeline from '../components/DayTimeline'
import HabitsToday from '../components/HabitsToday'
import PageHeader from '../components/PageHeader'
import TaskInput from '../components/TaskInput'
import TaskList from '../components/TaskList'
import WeekFocus from '../components/WeekFocus'
import { db, type Task } from '../db'
import { localDateOf, todayISO } from '../lib/date'
import { REVIEW_POINTS, reviewWeekFor, streaks, weekStart } from '../lib/points'
import { useGame } from '../lib/gameContext'
import { compareTasks } from '../lib/tasks'
import { useDayBlocks, useScheduledTimes } from '../lib/useDayBlocks'
import { useHabits } from '../lib/useHabits'
import { visibleForMe } from '../lib/spaces'
import { useMyEmail } from '../lib/useMe'

function greeting(hour: number) {
  if (hour < 11) return 'Guten Morgen'
  if (hour < 18) return 'Guten Tag'
  return 'Guten Abend'
}

/** Heute relevant: offen und heute/früher fällig, oder heute erledigt. */
function isRelevantToday(t: Task, today: string) {
  if (t.done) return !!t.doneAt && localDateOf(t.doneAt) === today
  return !!t.dueDate && t.dueDate <= today
}

export default function Heute() {
  const now = new Date()
  const today = todayISO()
  const dateLabel = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })

  const allTasks = useLiveQuery(() => db.tasks.toArray(), [])
  // Heute geplantes Essen (Essensplan der gemeinsamen Bereiche)
  // Wochenrückblick fällig? (Freitag bis Montag, solange noch nicht gemacht)
  const reviewWeek = reviewWeekFor(today)
  const reviewDone = useLiveQuery(() => db.weekReviews.where('week').equals(reviewWeek).count(), [reviewWeek])
  const weekday = (now.getDay() + 6) % 7
  const showReviewNudge = reviewDone === 0 && (weekday >= 4 || weekday === 0)
  const todaysMeals = useLiveQuery(() => db.meals.where('date').equals(today).toArray(), [today])
  const me = useMyEmail()
  const { habits, doneByHabit, loaded: habitsLoaded } = useHabits()
  const blocks = useDayBlocks(today)
  const scheduled = useScheduledTimes(today)
  const tasksById = useMemo(() => new Map((allTasks ?? []).map((t) => [t.id, t])), [allTasks])

  // Meine Sicht: private + gemeinsame Aufgaben, die mir oder allen zugewiesen sind
  const myTasks = useMemo(() => (allTasks ?? []).filter((t) => visibleForMe(t, me)), [allTasks, me])
  const list = myTasks.filter((t) => isRelevantToday(t, today)).sort(compareTasks)
  const doneTasks = list.filter((t) => t.done)
  const openTasks = list.filter((t) => !t.done)
  const total = list.length
  const pct = total ? Math.round((doneTasks.length / total) * 100) : 0

  const game = useGame()
  const pointsToday = game.byDay.get(today) ?? 0
  const streak = useMemo(() => streaks(myTasks, today), [myTasks, today])
  const allDoneToday = total > 0 && openTasks.length === 0

  return (
    <>
      <PageHeader title={greeting(now.getHours())} subtitle={dateLabel} />

      {showReviewNudge && (
        <Link
          to="/wochenrueckblick"
          className="mb-4 flex items-center gap-3 rounded-2xl bg-indigo-50 p-4 text-sm ring-1 ring-indigo-200 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:ring-indigo-500/30 dark:hover:bg-indigo-500/20"
        >
          <span className="text-2xl" aria-hidden>
            🗓️
          </span>
          <span className="flex-1">
            <strong>Zeit für deinen Wochenrückblick</strong>
            <span className="block text-slate-600 dark:text-slate-300">5 Minuten: zurückschauen, Fokus setzen, Woche planen (+{REVIEW_POINTS} Punkte)</span>
          </span>
          <span aria-hidden>→</span>
        </Link>
      )}

      <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Tagesfortschritt</h2>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {total ? `${doneTasks.length} von ${total} erledigt` : 'Noch nichts geplant'}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${allDoneToday ? 'bg-emerald-500' : 'bg-indigo-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span>
            <span aria-hidden>🏆</span> <strong className="tabular-nums">{pointsToday}</strong> Punkte heute
          </span>
          <span title={`Bester Streak: ${streak.best} ${streak.best === 1 ? 'Tag' : 'Tage'}`}>
            <span aria-hidden>🔥</span> <strong className="tabular-nums">{streak.current}</strong>{' '}
            {streak.current === 1 ? 'Tag' : 'Tage'} Streak
          </span>
          <span title={`Noch ${game.level.needed - game.level.into} Punkte bis Level ${game.level.level + 1}`}>
            <span aria-hidden>⭐</span> Level <strong className="tabular-nums">{game.level.level}</strong>{' '}
            <span className="text-slate-500 dark:text-slate-400">({game.level.pct} %)</span>
          </span>
          {todaysMeals && todaysMeals.length > 0 && (
            <span title="Aus dem Essensplan eurer gemeinsamen Bereiche">
              <span aria-hidden>🍽️</span> {todaysMeals.map((m) => m.title).join(', ')}
            </span>
          )}
          {allDoneToday && (
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              Alles erledigt – der Tag zählt für deinen Streak! 🎉
            </span>
          )}
        </div>
      </section>

      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <section>
          <h2 className="mb-2 font-semibold">Wochenfokus</h2>
          <WeekFocus week={weekStart(today)} compact />
        </section>
        {habitsLoaded && (
          <section>
            <HabitsToday habits={habits!} doneByHabit={doneByHabit} today={today} />
          </section>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <section>
          <h2 className="mb-2 font-semibold">Heute zu tun</h2>
          <TaskInput defaultDueDate={today} />
          <p className="mt-2 px-1 text-xs text-slate-500 dark:text-slate-400">
            Tipp: Aufgabe in den Tagesplan ziehen oder auf 🕒 klicken.
          </p>
          <div className="mt-1">
            {allTasks && (
              <TaskList
                tasks={list}
                scheduled={scheduled}
                empty="Nichts fällig. Füge oben eine Aufgabe für heute hinzu."
              />
            )}
          </div>
          <div className="mt-6">
            {allTasks && <DayReview date={today} points={pointsToday} doneTasks={doneTasks} openTasks={openTasks} />}
          </div>
        </section>

        <section className="lg:sticky lg:top-6">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-semibold">Tagesplan</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">Klicken = neuer Block</span>
          </div>
          {blocks && <DayTimeline date={today} blocks={blocks} tasks={tasksById} />}
        </section>
      </div>
    </>
  )
}
