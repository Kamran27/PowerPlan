import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Goal, type Space, type Task, type TimeBlock } from '../db'
import { monthLabel, selectableGoals } from '../lib/goals'
import { describeDue } from '../lib/date'
import {
  deleteTask,
  findTaskBlock,
  priorityInfo,
  PRIORITIES,
  restoreTask,
  saveTaskWithTime,
  type Priority,
} from '../lib/tasks'
import { timeRangeError } from '../lib/time'
import { assignableEmails, shortName } from '../lib/spaces'
import { useMyEmail } from '../lib/useMe'
import { scheduleTaskToday, TASK_DRAG_TYPE } from '../lib/timeblocks'
import TimeRangeInput from './TimeRangeInput'
import { useToggleTask } from './useToggleTask'
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
  /** Geplante Zeitspanne („14:00–15:00“), falls die Aufgabe im Tagesplan steht. */
  scheduledAt?: string
  /** Alle Ziele (für 🎯-Hinweis und Auswahl beim Bearbeiten). */
  goals?: Goal[]
  /** Gemeinsame Bereiche (für 👥-Hinweis und Zuweisung) */
  spaces?: Space[]
}

export default function TaskItem({ task, scheduledAt, goals = [], spaces = [] }: Props) {
  const [editing, setEditing] = useState(false)
  const [editBlock, setEditBlock] = useState<TimeBlock | undefined>()
  const toggle = useToggleTask()
  const toast = useToast()

  // Vor dem Öffnen den zugehörigen Tagesplan-Block laden, damit Beginn/Ende vorausgefüllt sind.
  async function openEditor() {
    setEditBlock(await findTaskBlock(task))
    setEditing(true)
  }

  async function remove() {
    await deleteTask(task.id)
    toast('Aufgabe gelöscht', { label: 'Rückgängig', onClick: () => restoreTask(task) })
  }

  async function schedule() {
    const result = await scheduleTaskToday(task)
    if (!result) toast('Heute ist keine freie Stunde mehr im Tagesplan.')
    else toast(`Eingeplant um ${result.start} Uhr`, { label: 'Rückgängig', onClick: result.undo })
  }

  const space = task.spaceId ? spaces.find((s) => s.id === task.spaceId) : undefined
  if (editing) return <TaskEditor task={task} block={editBlock} goals={goals} space={space} onClose={() => setEditing(false)} />

  const prio = priorityInfo(task.priority)
  const due = task.dueDate ? describeDue(task.dueDate) : null
  const goal = task.goalId ? goals.find((g) => g.id === task.goalId) : undefined

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
        onChange={() => toggle(task)}
        aria-label={task.done ? 'Als offen markieren' : 'Als erledigt markieren'}
        className="mt-0.5 size-5 shrink-0 cursor-pointer accent-indigo-600"
      />
      <button onClick={openEditor} className="min-w-0 flex-1 text-left" title="Bearbeiten">
        <span className={task.done ? 'text-slate-400 line-through dark:text-slate-500' : ''}>{task.title}</span>
        {task.notes && !task.done && (
          <span className="mt-0.5 block truncate text-sm text-slate-500 dark:text-slate-400">{task.notes}</span>
        )}
        {(due || task.priority !== 3 || scheduledAt || goal || space) && !task.done && (
          <span className="mt-1 flex items-center gap-3 text-xs">
            {task.priority !== 3 && (
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <span className={`size-2 rounded-full ${prio.dot}`} />
                {prio.label}
              </span>
            )}
            {due && <span className={`font-medium ${dueColors[due.state]}`}>{due.label}</span>}
            {scheduledAt && <span className="text-emerald-600 dark:text-emerald-400">🕒 {scheduledAt} Uhr</span>}
            {goal && <span className="truncate text-slate-500 dark:text-slate-400">🎯 {goal.title}</span>}
            {space && (
              <span className="truncate text-sky-700 dark:text-sky-300">
                👥 {space.emoji ? `${space.emoji} ` : ''}
                {space.title}
                {task.assignee ? ` → ${shortName(task.assignee)}` : ' · alle'}
              </span>
            )}
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

function TaskEditor({
  task,
  block,
  goals,
  space,
  onClose,
}: {
  task: Task
  block?: TimeBlock
  goals: Goal[]
  space?: Space
  onClose: () => void
}) {
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes ?? '')
  const [priority, setPriority] = useState<Priority>(task.priority)
  const [dueDate, setDueDate] = useState(task.dueDate ?? '')
  const [start, setStart] = useState(block?.start ?? '')
  const [end, setEnd] = useState(block?.end ?? '')
  const [goalId, setGoalId] = useState<string | undefined>(task.goalId)
  const [assignee, setAssignee] = useState(task.assignee ?? '')
  const me = useMyEmail()
  // Mitglieder des Bereichs (nur bei gemeinsamen Aufgaben)
  const members = useLiveQuery(() => (space ? db.members.where('realmId').equals(space.realmId).toArray() : []), [space?.realmId]) ?? []
  const people = space ? assignableEmails(space, members.map((m) => m.email)) : []

  const timeError = timeRangeError(start, end)
  const canSave = !!title.trim() && !timeError

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!canSave) return
    await saveTaskWithTime(
      task,
      {
        title: title.trim(),
        notes: notes.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
        goalId,
        ...(space ? { assignee: assignee || undefined } : {}),
      },
      { start, end },
      block,
    )
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
          <TimeRangeInput
            start={start}
            end={end}
            onChange={(s, e) => {
              setStart(s)
              setEnd(e)
            }}
            className={fieldClass}
          />
          <select
            value={goalId ?? ''}
            onChange={(e) => setGoalId(e.target.value || undefined)}
            aria-label="Monatsziel"
            className={`${fieldClass} max-w-56`}
          >
            <option value="">🎯 Kein Ziel</option>
            {selectableGoals(goals, task.goalId).map((g) => (
              <option key={g.id} value={g.id}>
                🎯 {g.title} ({monthLabel(g.month).split(' ')[0]})
              </option>
            ))}
          </select>
          {space && (
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              aria-label="Zuständig"
              className={`${fieldClass} max-w-56`}
            >
              <option value="">👥 Für alle</option>
              {people.map((p) => (
                <option key={p} value={p}>
                  👤 {p === me ? 'Ich' : shortName(p)}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {start && (
            <button
              type="button"
              onClick={() => {
                setStart('')
                setEnd('')
              }}
              className="text-slate-500 hover:underline"
            >
              {block ? 'Aus dem Tagesplan entfernen' : 'Keine Zeit'}
            </button>
          )}
          {start && !dueDate && !timeError && <span className="text-slate-500 dark:text-slate-400">→ wird für heute geplant</span>}
          {timeError && <span className="text-rose-600 dark:text-rose-400">{timeError}</span>}
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
              Abbrechen
            </button>
            <button type="submit" disabled={!canSave} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40">
              Speichern
            </button>
          </div>
        </div>
      </form>
    </li>
  )
}
