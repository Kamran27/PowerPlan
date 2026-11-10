import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import DayTimeline from '../components/DayTimeline'
import PageHeader from '../components/PageHeader'
import TaskInput from '../components/TaskInput'
import TaskList from '../components/TaskList'
import { db, type Task } from '../db'
import { todayISO } from '../lib/date'
import { compareTasks } from '../lib/tasks'
import { useDayBlocks } from '../lib/useDayBlocks'

function greeting(hour: number) {
  if (hour < 11) return 'Guten Morgen'
  if (hour < 18) return 'Guten Tag'
  return 'Guten Abend'
}

/** Heute relevant: offen und heute/früher fällig, oder heute erledigt. */
function isRelevantToday(t: Task, today: string) {
  if (t.done) return !!t.doneAt && t.doneAt.startsWith(today)
  return !!t.dueDate && t.dueDate <= today
}

export default function Heute() {
  const now = new Date()
  const today = todayISO()
  const dateLabel = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })

  const allTasks = useLiveQuery(() => db.tasks.toArray(), [])
  const { blocks, scheduled } = useDayBlocks(today)
  const tasksById = useMemo(() => new Map((allTasks ?? []).map((t) => [t.id, t])), [allTasks])

  const list = (allTasks ?? []).filter((t) => isRelevantToday(t, today)).sort(compareTasks)
  const done = list.filter((t) => t.done).length
  const total = list.length
  const pct = total ? Math.round((done / total) * 100) : 0

  return (
    <>
      <PageHeader title={greeting(now.getHours())} subtitle={dateLabel} />

      <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Tagesfortschritt</h2>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {total ? `${done} von ${total} erledigt` : 'Noch nichts geplant'}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${pct}%` }} />
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
