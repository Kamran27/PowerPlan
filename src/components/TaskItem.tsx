import { useState, type FormEvent } from 'react'
import type { Task } from '../db'
import { describeDue } from '../lib/date'
import { deleteTask, priorityInfo, PRIORITIES, restoreTask, toggleTask, updateTask, type Priority } from '../lib/tasks'
import { scheduleTaskToday, TASK_DRAG_TYPE } from '../lib/timeblocks'
import { useToast } from './Toast'

const dueColors = {
  overdue: 'text-rose-600 dark:text-rose-400',
  today: 'text-indigo-600 dark:text-indigo-400',
  soon: 'text-slate-600 dark:text-slate-300',
  later: 'text-slate-500 dark:text-slate-400',
}

const fieldClass =
  'rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800'

interface Props {
  task: Task
  /** Startzeit, falls die Aufgabe heute schon im Tagesplan steht. */
  scheduledAt?: string
}

export default function TaskItem({ task, scheduledAt }: Props) {
  const [editing, setEditing] = useState(false)
  const toast = useToast()

  async function remove() {
    await deleteTask(task.id)
    toast('Aufgabe gelöscht', { label: 'Rückgängig', onClick: () => restoreTask(task) })
  }

  async function schedule() {
    const result = await scheduleTaskToday(task)
    if (!result) toast('Heute ist keine freie Stunde mehr im Tagesplan.')
    else toast(`Eingeplant um ${result.start} Uhr`, { label: 'Rückgängig', onClick: result.undo })
  }

  if (editing) return <TaskEditor task={task} onClose={() => setEditing(false)} />

  const prio = priorityInfo(task.priority)
  const due = task.dueDate ? describeDue(task.dueDate) : null

  return (
    <li
      draggable={!task.done}
      onDragStart={(e) => {
        e.dataTransfer.setData(TASK_DRAG_TYPE, String(task.id))
        e.dataTransfer.effectAllowed = 'copy'
      }}
      className={`group flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 ${
        task.done ? '' : 'cursor-grab active:cursor-grabbing'
      }`}
    >
      <input
        type="checkbox"
        checked={task.done}
        onChange={() => toggleTask(task)}
        aria-label={task.done ? 'Als offen markieren' : 'Als erledigt markieren'}
        className="mt-0.5 size-5 shrink-0 cursor-pointer accent-indigo-600"
      />
      <button onClick={() => setEditing(true)} className="min-w-0 flex-1 text-left" title="Bearbeiten">
        <span className={task.done ? 'text-slate-400 line-through dark:text-slate-500' : ''}>{task.title}</span>
        {task.notes && !task.done && (
          <span className="mt-0.5 block truncate text-sm text-slate-500 dark:text-slate-400">{task.notes}</span>
        )}
        {(due || task.priority !== 3 || scheduledAt) && !task.done && (
          <span className="mt-1 flex items-center gap-3 text-xs">
            {task.priority !== 3 && (
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <span className={`size-2 rounded-full ${prio.dot}`} />
                {prio.label}
              </span>
            )}
            {due && <span className={`font-medium ${dueColors[due.state]}`}>{due.label}</span>}
            {scheduledAt && <span className="text-emerald-600 dark:text-emerald-400">🕒 {scheduledAt} Uhr</span>}
          </span>
        )}
      </button>
      {!task.done && !scheduledAt && (
        <button
          onClick={schedule}
          aria-label="In den Tagesplan einplanen"
          title="In die nächste freie Stunde einplanen"
          className="rounded-md px-1.5 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-indigo-600 focus:opacity-100 max-md:opacity-100"
        >
          🕒
        </button>
      )}
      <button
        onClick={remove}
        aria-label="Aufgabe löschen"
        className="rounded-md px-1.5 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-rose-600 focus:opacity-100 max-md:opacity-100"
      >
        ✕
      </button>
    </li>
  )
}

function TaskEditor({ task, onClose }: { task: Task; onClose: () => void }) {
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes ?? '')
  const [priority, setPriority] = useState<Priority>(task.priority)
  const [dueDate, setDueDate] = useState(task.dueDate ?? '')

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    await updateTask(task.id, {
      title: title.trim(),
      notes: notes.trim() || undefined,
      priority,
      dueDate: dueDate || undefined,
    })
    onClose()
  }

  return (
    <li className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-indigo-300 dark:bg-slate-900 dark:ring-indigo-500/50">
      <form onSubmit={save} onKeyDown={(e) => e.key === 'Escape' && onClose()} className="grid gap-2">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Titel"
          className="bg-transparent px-1 py-1 font-medium outline-none"
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notizen (optional)"
          aria-label="Notizen"
          rows={2}
          className={`${fieldClass} resize-y`}
        />
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value) as Priority)}
            aria-label="Priorität"
            className={fieldClass}
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                Priorität: {p.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            aria-label="Fällig am"
            className={fieldClass}
          />
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
              Abbrechen
            </button>
            <button type="submit" disabled={!title.trim()} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40">
              Speichern
            </button>
          </div>
        </div>
      </form>
    </li>
  )
}
