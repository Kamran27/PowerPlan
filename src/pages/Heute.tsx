import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo } from 'react'
import TapCat from '../components/TapCat'
import { celebrateOnce, pawConfetti } from '../lib/celebrate'
import { Flame, Shield, Star, Trophy, UtensilsCrossed } from 'lucide-react'
import { Link } from 'react-router-dom'
import DayRings, { type Ring } from '../components/DayRings'
import NextUp from '../components/NextUp'
import MorningBrief from '../components/MorningBrief'
import { DAILY_FOCUS_GOAL, formatDuration } from '../lib/focus'
import { isDueOn } from '../lib/habits'
import DayReview from '../components/DayReview'
import DayTimeline from '../components/DayTimeline'
import HabitsToday from '../components/HabitsToday'
import { AreaFilterPills } from '../components/TaskFields'
import { BlockLegend } from '../components/TimeBlockCard'
import { matchesArea, useAreaFilter } from '../lib/area'
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
  const [area, setArea] = useAreaFilter('heute')
  const doneTasks = list.filter((t) => t.done)
  const openTasks = list.filter((t) => !t.done)
  const total = list.length

  const game = useGame()
  const pointsToday = game.byDay.get(today) ?? 0
  const streak = useMemo(() => streaks(myTasks, today), [myTasks, today])
  const allDoneToday = total > 0 && openTasks.length === 0

  // Tagesringe: Aufgaben, Routinen (heute fällige Gewohnheiten), Fokus-Minuten (Ziel = 2 Sitzungen)
  const focusMinutes = useLiveQuery(async () => (await db.focusSessions.where('date').equals(today).toArray()).reduce((n, s) => n + s.minutes, 0), [today]) ?? 0
  const focusGoal = DAILY_FOCUS_GOAL // mindestens 4 Stunden Fokus am Tag
  const habitsDue = (habits ?? []).filter((h) => isDueOn(h, today))
  const habitsDone = habitsDue.filter((h) => doneByHabit.get(h.id)?.has(today)).length
  const rings: Ring[] = [
    { label: 'Aufgaben', value: total ? doneTasks.length / total : 0, detail: `${doneTasks.length} / ${total}`, color: 'stroke-indigo-500', track: 'stroke-indigo-100 dark:stroke-indigo-500/20', dot: 'bg-indigo-500' },
    { label: 'Routinen', value: habitsDue.length ? habitsDone / habitsDue.length : 0, detail: `${habitsDone} / ${habitsDue.length}`, color: 'stroke-emerald-500', track: 'stroke-emerald-100 dark:stroke-emerald-500/20', dot: 'bg-emerald-500' },
    { label: 'Fokus', value: focusMinutes / focusGoal, detail: `${formatDuration(focusMinutes)} / ${formatDuration(focusGoal)}`, color: 'stroke-amber-500', track: 'stroke-amber-100 dark:stroke-amber-500/20', dot: 'bg-amber-500' },
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

      {/* Dein Tag: Stand, Wochenfokus und Routinen in einer schlanken Karte */}
      <section className="relative mt-8 mb-6 grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        {/* Katze schaut über den Rand */}
        <TapCat className="absolute -top-[25px] right-8 text-slate-400 dark:text-slate-500" />
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <DayRings rings={rings} small />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1" title="Punkte heute">
              <Trophy aria-hidden className="size-3.5 text-amber-500" /> <strong className="tabular-nums">{pointsToday}</strong> Pkt.
            </span>
            <span
              className="flex items-center gap-1"
              title={`Streak · Bester: ${streak.best} ${streak.best === 1 ? 'Tag' : 'Tage'} · ${
                streak.shieldLeftThisWeek ? 'Schutz bereit (1 Tag pro Woche darf ausfallen)' : 'Schutz diese Woche genutzt'
              }`}
            >
              <Flame aria-hidden className="size-3.5 text-orange-500" /> <strong className="tabular-nums">{streak.current}</strong>
              {streak.shieldLeftThisWeek && <Shield aria-label="Schutz bereit" className="size-3 text-sky-500" />}
            </span>
            <span className="flex items-center gap-1" title={`Noch ${game.level.needed - game.level.into} Punkte bis Level ${game.level.level + 1}`}>
              <Star aria-hidden className="size-3.5 text-indigo-500" /> Lvl <strong className="tabular-nums">{game.level.level}</strong>
            </span>
            {todaysMeals && todaysMeals.length > 0 && (
              <span className="flex items-center gap-1" title="Aus dem Essensplan eurer gemeinsamen Bereiche">
                <UtensilsCrossed aria-hidden className="size-3.5 text-slate-500" /> {todaysMeals.map((m) => m.title).join(', ')}
              </span>
            )}
          </div>
        </div>
        {(allRingsClosed || allDoneToday) && (
          <p className="rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            {allRingsClosed ? 'Alle Ringe geschlossen – starker Tag! 🐾' : 'Alles erledigt – der Tag zählt für deinen Streak!'}
          </p>
        )}
        <div className="grid gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <WeekFocus week={weekStart(today)} inline />
          {habitsLoaded && <HabitsToday habits={habits!} doneByHabit={doneByHabit} today={today} inline />}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <section>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Heute zu tun</h2>
            <AreaFilterPills value={area} onChange={setArea} />
          </div>
          <TaskInput defaultDueDate={today} defaultArea={area === 'alle' ? undefined : area} />
          <div className="mt-1">
            {allTasks ? (
              <TaskList
                tasks={list.filter((t) => matchesArea(t, area))}
                scheduled={scheduled}
                empty="Nichts fällig. Füge oben eine Aufgabe für heute hinzu."
              />
            ) : (
              <Skeleton rows={4} />
            )}
          </div>
          <div className="mt-4 mb-10">
            {allTasks && <DayReview date={today} points={pointsToday} doneTasks={doneTasks} openTasks={openTasks} />}
          </div>
        </section>

        <section className="lg:sticky lg:top-6">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-semibold">Tagesplan</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400" title="Aufgaben hierher ziehen (am Handy: lange drücken) oder auf den Kalender-Knopf einer Aufgabe tippen">
              Klicken = neuer Block · Aufgaben hierher ziehen
            </span>
          </div>
          <BlockLegend className="mb-2" />
          {blocks && <DayTimeline date={today} blocks={blocks} tasks={tasksById} />}
        </section>
      </div>
    </>
  )
}
