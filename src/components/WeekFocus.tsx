import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, type FocusItem, type Goal } from '../db'
import { FOCUS_POINTS, FOCUS_SLOTS, monthLabel, saveFocus, selectableGoals, setFocusGoal, toggleFocus } from '../lib/goals'
import { useToast } from './Toast'

interface Props {
  /** Montag der Woche */
  week: string
  /** compact = nur anzeigen und abhaken (Heute-Seite), sonst bearbeitbar (Ziele-Seite) */
  compact?: boolean
}

/** Wochenfokus: drei Prioritäten der Woche, abhakbar und optional mit einem Monatsziel verknüpft. */
export default function WeekFocus({ week, compact }: Props) {
  const items = useLiveQuery(() => db.weekFocus.where('week').equals(week).toArray(), [week])
  const goals = useLiveQuery(() => db.goals.toArray(), [])
  const toast = useToast()

  if (!items || !goals) return null
  const bySlot = new Map(items.map((f) => [f.slot, f]))
  const goalById = new Map(goals.map((g) => [g.id, g]))

  async function toggle(item: FocusItem) {
    if (await toggleFocus(item)) toast(`+${FOCUS_POINTS} Punkte – Fokus erledigt! 🎯`)
  }

  if (compact) {
    if (items.length === 0) {
      return (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Kein Wochenfokus gesetzt.{' '}
          <Link to="/ziele" className="text-indigo-600 hover:underline dark:text-indigo-400">
            Top 3 der Woche festlegen →
          </Link>
        </p>
      )
    }
    return (
      <ol className="grid gap-1">
        {[...items].sort((a, b) => a.slot - b.slot).map((f) => (
          <li key={f.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!f.doneAt}
              onChange={() => toggle(f)}
              aria-label={f.doneAt ? 'Als offen markieren' : 'Als erledigt markieren'}
              className="size-4 shrink-0 cursor-pointer accent-indigo-600"
            />
            <span className={f.doneAt ? 'text-slate-400 line-through dark:text-slate-500' : ''}>{f.title}</span>
            {f.goalId && goalById.get(f.goalId) && (
              <span className="truncate text-xs text-slate-500 dark:text-slate-400">🎯 {goalById.get(f.goalId)!.title}</span>
            )}
          </li>
        ))}
      </ol>
    )
  }

  return (
    <ol className="grid gap-2">
      {FOCUS_SLOTS.map((slot) => (
        <FocusSlot key={slot} week={week} slot={slot} item={bySlot.get(slot)} goals={goals} onToggle={toggle} />
      ))}
    </ol>
  )
}

function FocusSlot({
  week,
  slot,
  item,
  goals,
  onToggle,
}: {
  week: string
  slot: number
  item?: FocusItem
  goals: Goal[]
  onToggle: (f: FocusItem) => void
}) {
  const [title, setTitle] = useState(item?.title ?? '')
  // Wenn sich der gespeicherte Titel ändert (z. B. Woche gewechselt), Feld nachziehen.
  useEffect(() => setTitle(item?.title ?? ''), [item?.title, week])

  const save = () => {
    if (title.trim() !== (item?.title ?? '')) saveFocus(week, slot, title, item)
  }

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-2 pl-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <span className="w-4 text-sm font-bold text-indigo-500 tabular-nums">{slot + 1}</span>
      <input
        type="checkbox"
        disabled={!item}
        checked={!!item?.doneAt}
        onChange={() => item && onToggle(item)}
        aria-label={`Fokus ${slot + 1} erledigt`}
        className="size-5 shrink-0 cursor-pointer accent-indigo-600 disabled:cursor-default disabled:opacity-30"
      />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
        placeholder={`Priorität ${slot + 1} dieser Woche …`}
        aria-label={`Fokus ${slot + 1}`}
        className={`min-w-40 flex-1 bg-transparent px-1 py-1 outline-none placeholder:text-slate-400 ${
          item?.doneAt ? 'text-slate-400 line-through dark:text-slate-500' : ''
        }`}
      />
      {item && (
        <select
          value={item.goalId ?? ''}
          onChange={(e) => setFocusGoal(item, e.target.value || undefined)}
          aria-label="Mit Monatsziel verknüpfen"
          className="max-w-48 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">Kein Ziel</option>
          {selectableGoals(goals, item.goalId).map((g) => (
            <option key={g.id} value={g.id}>
              🎯 {g.title} ({monthLabel(g.month).split(' ')[0]})
            </option>
          ))}
        </select>
      )}
    </li>
  )
}
