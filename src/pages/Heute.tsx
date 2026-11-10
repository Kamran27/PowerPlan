import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import DayReview from '../components/DayReview'
import DayTimeline from '../components/DayTimeline'
import PageHeader from '../components/PageHeader'
import TaskInput from '../components/TaskInput'
import TaskList from '../components/TaskList'
import { db, type Task } from '../db'
import { localDateOf, todayISO } from '../lib/date'
import { pointsByDay, streaks } from '../lib/points'
import { compareTasks } from '../lib/tasks'
import { useDayBlocks, useScheduledTimes } from '../lib/useDayBlocks'

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
  const blocks = useDayBlocks(today)
  const scheduled = useScheduledTimes(today)
  const tasksById = useMemo(() => new Map((allTasks ?? []).map((t) => [t.id, t])), [allTasks])

  const list = (allTasks ?? []).filter((t) => isRelevantToday(t, today)).sort(compareTasks)
  const doneTasks = list.filter((t) => t.done)
  const openTasks = list.filter((t) => !t.done)
  const total = list.length
  const pct = total ? Math.round((doneTasks.length / total) * 100) : 0

  const pointsToday = useMemo(() => pointsByDay(allTasks ?? []).get(today) ?? 0, [allTasks, today])
  const streak = useMemo(() => streaks(allTasks ?? [], today), [allTasks, today])
  const allDoneToday = total > 0 && openTasks.length === 0

  return (
    <>
      <PageHeader title={greeting(now.getHours())} subtitle={dateLabel} />

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
          {allDoneToday && (
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              Alles erledigt – der Tag zählt für deinen Streak! 🎉
            </span>
          )}
        </div>
      </section>

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
