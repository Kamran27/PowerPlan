import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo } from 'react'
import { PeekingCat } from '../components/Cats'
import { celebrateOnce, pawConfetti } from '../lib/celebrate'
import { Flame, Shield, ShieldCheck, Star, Trophy, UtensilsCrossed } from 'lucide-react'
import { Link } from 'react-router-dom'
import DayRings, { type Ring } from '../components/DayRings'
import NextUp from '../components/NextUp'
import MorningBrief from '../components/MorningBrief'
import { defaultMinutes } from '../lib/focus'
import { isDueOn } from '../lib/habits'
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
import Skeleton from '../components/Skeleton'

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

  const game = useGame()
  const pointsToday = game.byDay.get(today) ?? 0
  const streak = useMemo(() => streaks(myTasks, today), [myTasks, today])
  const allDoneToday = total > 0 && openTasks.length === 0

  // Tagesringe: Aufgaben, Routinen (heute fällige Gewohnheiten), Fokus-Minuten (Ziel = 2 Sitzungen)
  const focusMinutes = useLiveQuery(async () => (await db.focusSessions.where('date').equals(today).toArray()).reduce((n, s) => n + s.minutes, 0), [today]) ?? 0
  const focusGoal = defaultMinutes() * 2
  const habitsDue = (habits ?? []).filter((h) => isDueOn(h, today))
  const habitsDone = habitsDue.filter((h) => doneByHabit.get(h.id)?.has(today)).length
  const rings: Ring[] = [
    { label: 'Aufgaben', value: total ? doneTasks.length / total : 0, detail: `${doneTasks.length} / ${total}`, color: 'stroke-indigo-500', track: 'stroke-indigo-100 dark:stroke-indigo-500/20', dot: 'bg-indigo-500' },
    { label: 'Routinen', value: habitsDue.length ? habitsDone / habitsDue.length : 0, detail: `${habitsDone} / ${habitsDue.length}`, color: 'stroke-emerald-500', track: 'stroke-emerald-100 dark:stroke-emerald-500/20', dot: 'bg-emerald-500' },
    { label: 'Fokus', value: focusMinutes / focusGoal, detail: `${focusMinutes} / ${focusGoal} Min.`, color: 'stroke-amber-500', track: 'stroke-amber-100 dark:stroke-amber-500/20', dot: 'bg-amber-500' },
  ]
  const allRingsClosed = total > 0 && rings.every((r) => r.value >= 1)
  // Einmal am Tag feiern, wenn alle Ringe zu sind
  useEffect(() => {
    if (allRingsClosed) celebrateOnce('rings', today, () => pawConfetti(36))
  }, [allRingsClosed, today])

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

      <MorningBrief today={today} open={openTasks} blocks={blocks ?? []} habitsDue={habitsDue.length} meals={todaysMeals ?? []} />
      {blocks && <NextUp blocks={blocks} tasks={tasksById} />}

      <section className="relative mt-8 mb-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:p-6 dark:bg-slate-900 dark:ring-slate-800">
        {/* Katze schaut über den Rand */}
        <PeekingCat className="absolute -top-[25px] right-8 w-12 text-slate-400 dark:text-slate-500" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <DayRings rings={rings} />
          {allRingsClosed && (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              Alle Ringe geschlossen – starker Tag! 🐾
            </p>
          )}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
          <span className="flex items-center gap-1.5">
            <Trophy aria-hidden className="size-4 text-amber-500" /> <strong className="tabular-nums">{pointsToday}</strong> Punkte heute
          </span>
          <span className="flex items-center gap-1.5" title={`Bester Streak: ${streak.best} ${streak.best === 1 ? 'Tag' : 'Tage'}`}>
            {/* Flamme wächst mit dem Streak */}
            <Flame
              aria-hidden
              className={`text-orange-500 transition-transform ${streak.current >= 7 ? 'fill-orange-400/40' : ''}`}
              style={{ width: 16, height: 16, transform: `scale(${Math.min(1.6, 1 + streak.current * 0.06)})` }}
            />{' '}
            <strong className="tabular-nums">{streak.current}</strong> {streak.current === 1 ? 'Tag' : 'Tage'} Streak
          </span>
          <span
            className={`flex items-center gap-1 text-xs ${streak.shieldLeftThisWeek ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`}
            title="Streak-Schutz: Pro Woche darf ein Tag ausfallen, ohne dass dein Streak reißt."
          >
            {streak.shieldLeftThisWeek ? <Shield aria-hidden className="size-3.5" /> : <ShieldCheck aria-hidden className="size-3.5" />}
            {streak.shieldLeftThisWeek ? 'Schutz bereit' : 'Schutz genutzt'}
          </span>
          <span className="flex items-center gap-1.5" title={`Noch ${game.level.needed - game.level.into} Punkte bis Level ${game.level.level + 1}`}>
            <Star aria-hidden className="size-4 text-indigo-500" /> Level <strong className="tabular-nums">{game.level.level}</strong>{' '}
            <span className="text-slate-500 dark:text-slate-400">({game.level.pct} %)</span>
          </span>
          {todaysMeals && todaysMeals.length > 0 && (
            <span className="flex items-center gap-1.5" title="Aus dem Essensplan eurer gemeinsamen Bereiche">
              <UtensilsCrossed aria-hidden className="size-4 text-slate-500" /> {todaysMeals.map((m) => m.title).join(', ')}
            </span>
          )}
          {allDoneToday && (
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              Alles erledigt – der Tag zählt für deinen Streak!
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
            Tipp: Aufgabe in den Tagesplan ziehen (am Handy: lange drücken) oder auf den Kalender-Knopf tippen.
          </p>
          <div className="mt-1">
            {allTasks ? (
              <TaskList
                tasks={list}
                scheduled={scheduled}
                empty="Nichts fällig. Füge oben eine Aufgabe für heute hinzu."
              />
            ) : (
              <Skeleton rows={4} />
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
