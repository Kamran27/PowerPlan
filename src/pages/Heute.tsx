import { useLiveQuery } from 'dexie-react-hooks'
import PageHeader from '../components/PageHeader'
import Placeholder from '../components/Placeholder'
import TaskInput from '../components/TaskInput'
import TaskList from '../components/TaskList'
import { db } from '../db'
import { todayISO } from '../lib/date'
import { compareTasks } from '../lib/tasks'

function greeting(hour: number) {
  if (hour < 11) return 'Guten Morgen'
  if (hour < 18) return 'Guten Tag'
  return 'Guten Abend'
}

export default function Heute() {
  const now = new Date()
  const today = todayISO()
  const dateLabel = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })

  // Heute relevant: offen und heute/früher fällig, oder heute erledigt.
  const tasks = useLiveQuery(
    () =>
      db.tasks
        .filter((t) => (!t.done && !!t.dueDate && t.dueDate <= today) || (t.done && !!t.doneAt && t.doneAt.startsWith(today)))
        .toArray(),
    [today],
  )

  const list = (tasks ?? []).sort(compareTasks)
  const done = list.filter((t) => t.done).length
  const total = list.length
  const pct = total ? Math.round((done / total) * 100) : 0

  return (
    <>
      <PageHeader title={greeting(now.getHours())} subtitle={dateLabel} />
      <div className="grid gap-6">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
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

        <section>
          <h2 className="mb-2 font-semibold">Heute zu tun</h2>
          <TaskInput defaultDueDate={today} />
          <div className="mt-2">
            {tasks && <TaskList tasks={list} empty="Nichts fällig. Füge oben eine Aufgabe für heute hinzu." />}
          </div>
        </section>

        <Placeholder milestone="M2" text="Hier erscheint dein Tagesplan mit Zeitblöcken." />
      </div>
    </>
  )
}
