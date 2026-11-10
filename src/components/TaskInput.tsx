import { useState, type FormEvent } from 'react'
import { addTask, PRIORITIES, type Priority } from '../lib/tasks'

const fieldClass =
  'rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'

/** Schnelleingabe für neue Aufgaben. */
export default function TaskInput({ defaultDueDate }: { defaultDueDate?: string }) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>(2)
  const [dueDate, setDueDate] = useState(defaultDueDate ?? '')
  const [time, setTime] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    // Sofort leeren, damit schnelles Weitertippen nicht verloren geht.
    // Die Uhrzeit gilt nur für diese eine Aufgabe; Priorität und Datum bleiben für die nächste stehen.
    setTitle('')
    setTime('')
    await addTask({ title, priority, dueDate, time })
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
    >
      <div className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Neue Aufgabe … (Enter zum Speichern)"
          aria-label="Neue Aufgabe"
          className="min-w-0 flex-1 bg-transparent px-2 py-1.5 outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={!title.trim()}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
        >
          Hinzufügen
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 px-1 pt-2 dark:border-slate-800">
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
        <input
          type="time"
          step={900}
          value={time}
          onChange={(e) => setTime(e.target.value)}
          aria-label="Uhrzeit"
          title="Mit Uhrzeit wird die Aufgabe direkt in den Tagesplan eingetragen (1 Stunde)"
          className={fieldClass}
        />
        {dueDate && (
          <button type="button" onClick={() => setDueDate('')} className="text-xs text-slate-500 hover:underline">
            Kein Datum
          </button>
        )}
        {time && (
          <button type="button" onClick={() => setTime('')} className="text-xs text-slate-500 hover:underline">
            Keine Zeit
          </button>
        )}
        {time && !dueDate && <span className="text-xs text-slate-500 dark:text-slate-400">→ heute</span>}
      </div>
    </form>
  )
}
