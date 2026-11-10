import { useState, type FormEvent } from 'react'
import type { Goal, Task } from '../db'
import { deleteGoal, GOAL_POINTS, goalProgress, toggleGoalAchieved, updateGoal } from '../lib/goals'
import { addTask } from '../lib/tasks'
import { useToast } from './Toast'
import { useToggleTask } from './useToggleTask'

/** Ein Monatsziel mit Fortschritt aus verknüpften Aufgaben. */
export default function GoalCard({ goal, tasks }: { goal: Goal; tasks: Task[] }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(goal.title)
  const [newTask, setNewTask] = useState('')
  const toast = useToast()
  const toggleTask = useToggleTask()
  const { linked, done, total, pct } = goalProgress(goal.id, tasks)
  const achieved = !!goal.achievedAt
  const open = linked.filter((t) => !t.done)

  async function toggleAchieved() {
    if (await toggleGoalAchieved(goal)) toast(`+${GOAL_POINTS} Punkte – Ziel erreicht! 🏆`)
  }

  async function remove() {
    const undo = await deleteGoal(goal)
    toast(`Ziel „${goal.title}“ gelöscht`, { label: 'Rückgängig', onClick: undo })
  }

  async function saveTitle(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    await updateGoal(goal.id, { title: title.trim() })
    setEditing(false)
  }

  async function addLinkedTask(e: FormEvent) {
    e.preventDefault()
    if (!newTask.trim()) return
    const t = newTask
    setNewTask('')
    await addTask({ title: t, priority: 2, goalId: goal.id })
  }

  return (
    <li
      className={`group rounded-2xl p-4 shadow-sm ring-1 ${
        achieved
          ? 'bg-emerald-50 ring-emerald-200 dark:bg-emerald-500/10 dark:ring-emerald-500/30'
          : 'bg-white ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none" aria-hidden>
          {achieved ? '🏆' : '🎯'}
        </span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <form onSubmit={saveTitle} className="flex gap-2">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
                aria-label="Titel des Ziels"
                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
              <button className="rounded-lg bg-indigo-600 px-3 py-1 text-sm font-semibold text-white hover:bg-indigo-500">Speichern</button>
            </form>
          ) : (
            <div className="font-medium">{goal.title}</div>
          )}
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {achieved
              ? `Erreicht am ${new Date(goal.achievedAt!).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}`
              : total
                ? `${done} von ${total} Aufgaben erledigt`
                : 'Noch keine Aufgaben verknüpft'}
          </div>
        </div>
        <button
          onClick={toggleAchieved}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${
            achieved
              ? 'text-emerald-700 ring-1 ring-emerald-300 hover:bg-emerald-100 dark:text-emerald-300 dark:ring-emerald-500/40 dark:hover:bg-emerald-500/10'
              : 'bg-emerald-600 text-white hover:bg-emerald-500'
          }`}
        >
          {achieved ? 'Wieder öffnen' : 'Erreicht ✓'}
        </button>
      </div>

      {total > 0 && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-label={`Fortschritt ${pct} %`}>
          <div
            className={`h-full rounded-full transition-all duration-500 ${achieved || pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {!achieved && pct === 100 && total > 0 && (
        <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">Alle Aufgaben erledigt – Ziel als erreicht markieren? 🎉</p>
      )}

      {!achieved && open.length > 0 && (
        <ul className="mt-3 grid gap-1">
          {open.map((t) => (
            <li key={t.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={false}
                onChange={() => toggleTask(t)}
                aria-label={`${t.title} erledigen`}
                className="size-4 cursor-pointer accent-indigo-600"
              />
              {t.title}
            </li>
          ))}
        </ul>
      )}

      {!achieved && (
        <form onSubmit={addLinkedTask} className="mt-3 flex gap-2">
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="+ Aufgabe für dieses Ziel"
            aria-label={`Aufgabe für Ziel ${goal.title} hinzufügen`}
            className="min-w-0 flex-1 rounded-lg bg-slate-50 px-2 py-1.5 text-sm outline-none placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-400 dark:bg-slate-800/60"
          />
        </form>
      )}

      <div className="mt-2 flex justify-end gap-3 text-xs opacity-0 transition group-hover:opacity-100 focus-within:opacity-100 max-md:opacity-100">
        <button onClick={() => setEditing(true)} className="text-slate-500 hover:underline">
          Umbenennen
        </button>
        <button onClick={remove} className="text-rose-600 hover:underline dark:text-rose-400">
          Löschen
        </button>
      </div>
    </li>
  )
}
