import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import TaskInput from '../components/TaskInput'
import TaskList from '../components/TaskList'
import { db, type Task } from '../db'
import { todayISO } from '../lib/date'
import { compareTasks } from '../lib/tasks'
import { visibleForMe } from '../lib/spaces'
import { useMyEmail } from '../lib/useMe'
import { useScheduledTimes } from '../lib/useDayBlocks'
import Skeleton from '../components/Skeleton'

type Filter = 'offen' | 'heute' | 'erledigt' | 'alle'

const FILTERS: { value: Filter; label: string; empty: string; test: (t: Task, today: string) => boolean }[] = [
  { value: 'offen', label: 'Offen', empty: 'Keine offenen Aufgaben. Stark! 🎉', test: (t) => !t.done },
  { value: 'heute', label: 'Heute & überfällig', empty: 'Für heute ist nichts fällig.', test: (t, today) => !t.done && !!t.dueDate && t.dueDate <= today },
  { value: 'erledigt', label: 'Erledigt', empty: 'Noch nichts erledigt.', test: (t) => t.done },
  { value: 'alle', label: 'Alle', empty: 'Noch keine Aufgaben. Leg oben los!', test: () => true },
]

export default function Aufgaben() {
  const [filter, setFilter] = useState<Filter>('offen')
  const me = useMyEmail()
  const allTasks = useLiveQuery(() => db.tasks.toArray(), [])
  const tasks = useMemo(() => allTasks?.filter((t) => visibleForMe(t, me)), [allTasks, me])
  const today = todayISO()
  const scheduled = useScheduledTimes(today)

  const active = FILTERS.find((f) => f.value === filter)!
  const visible = (tasks ?? []).filter((t) => active.test(t, today)).sort(compareTasks)
  const openCount = (tasks ?? []).filter((t) => !t.done).length

  return (
    <div className="max-w-3xl">
      <PageHeader title="Aufgaben" subtitle={tasks ? `${openCount} offen` : ' '} />
      <TaskInput />
      <div role="tablist" className="mt-6 mb-2 flex gap-1 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            role="tab"
            aria-selected={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${
              filter === f.value
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {tasks ? <TaskList tasks={visible} scheduled={scheduled} empty={active.empty} /> : <Skeleton rows={5} />}
    </div>
  )
}
