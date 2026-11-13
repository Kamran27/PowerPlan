import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { Space } from '../db'
import { formatDayShort, todayISO } from '../lib/date'
import { parseQuickInput } from '../lib/quickparse'
import { repeatLabel } from '../lib/repeat'
import { makeRotation, shortName } from '../lib/spaces'
import { addTask, PRIORITIES, type Priority } from '../lib/tasks'
import { useMyEmail } from '../lib/useMe'
import { timeRangeError } from '../lib/time'
import type { Repeat } from '../lib/repeat'
import RepeatSelect from './RepeatSelect'
import TimeRangeInput from './TimeRangeInput'

const fieldClass =
  'rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'

interface Props {
  defaultDueDate?: string
  /** In einem gemeinsamen Bereich: Aufgaben landen dort (für alle Mitglieder sichtbar) */
  space?: Space
  /** Personen, denen man im Bereich zuweisen kann (E-Mails) */
  people?: string[]
}

/** Schnelleingabe für neue Aufgaben: Titel, Priorität, Datum und Uhrzeit (Beginn – Ende) – optional mit Zuständigkeit. */
export default function TaskInput({ defaultDueDate, space, people = [] }: Props) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>(2)
  const [dueDate, setDueDate] = useState(defaultDueDate ?? '')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [assignee, setAssignee] = useState('')
  const [repeat, setRepeat] = useState<Repeat | ''>('')
  const [rotate, setRotate] = useState(false)
  /** „Nicht erkennen“ gedrückt: Text bleibt wörtlich so, wie getippt */
  const [literal, setLiteral] = useState(false)
  const me = useMyEmail()

  // Schnelleingabe in normaler Sprache: „Zahnarzt morgen 15 Uhr“ → Datum + Zeit erkannt
  const parsed = useMemo(
    () => parseQuickInput(title, todayISO(), space ? { people, me } : {}),
    [title, space, people, me],
  )
  const useParsed = parsed.found && !literal

  const timeError = useParsed && parsed.start ? undefined : timeRangeError(start, end)
  const canSubmit = !!title.trim() && !timeError

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    // Erkanntes hat Vorrang vor den Feldern darunter
    const p = useParsed ? parsed : undefined
    let finalAssignee = p?.assignee !== undefined ? p.assignee : assignee
    const finalRepeat = p?.repeat ?? (repeat || undefined)
    // Abwechselnd: Reihenfolge ab der zuständigen Person (sonst ab mir)
    const wantsRotation = !!space && !!finalRepeat && people.length > 1 && (rotate || !!p?.rotate)
    const rotation = wantsRotation ? makeRotation(people, finalAssignee || me) : undefined
    if (rotation) finalAssignee = rotation[0]
    // Sofort leeren, damit schnelles Weitertippen nicht verloren geht.
    // Die Uhrzeit gilt nur für diese eine Aufgabe; Priorität und Datum bleiben für die nächste stehen.
    setTitle('')
    setStart('')
    setEnd('')
    setRepeat('')
    setRotate(false)
    setLiteral(false)
    await addTask({
      title: p ? p.title : title,
      priority: p?.priority ?? priority,
      dueDate: p?.dueDate ?? dueDate,
      start: p?.start ?? start,
      end: p?.start ? p.end : end,
      repeat: finalRepeat,
      ...(space ? { spaceId: space.id, realmId: space.realmId, assignee: finalAssignee || undefined, rotation } : {}),
    })
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
    >
      <div className="flex gap-2">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            if (!e.target.value) setLiteral(false)
          }}
          placeholder="z. B. „Zahnarzt morgen 15 Uhr“ (Enter)"
          aria-label="Neue Aufgabe"
          className="min-w-0 flex-1 bg-transparent px-2 py-1.5 outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
        >
          Hinzufügen
        </button>
      </div>
      {/* Vorschau: was aus dem Text erkannt wurde */}
      {parsed.found && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 px-2 text-xs" aria-live="polite">
          {literal ? (
            <>
              <span className="text-slate-500 dark:text-slate-400">Text wird wörtlich übernommen.</span>
              <button type="button" onClick={() => setLiteral(false)} className="text-indigo-600 hover:underline dark:text-indigo-400">
                Doch erkennen
              </button>
            </>
          ) : (
            <>
              <span className="text-slate-500 dark:text-slate-400">Erkannt:</span>
              <span className="font-medium">„{parsed.title}“</span>
              {parsed.dueDate && <Chip>📅 {formatDayShort(parsed.dueDate)}</Chip>}
              {parsed.start && <Chip>🕒 {parsed.start}{parsed.end ? `–${parsed.end}` : ''} Uhr</Chip>}
              {parsed.repeat && <Chip>🔁 {repeatLabel(parsed.repeat)}</Chip>}
              {parsed.priority && <Chip>❗ {PRIORITIES.find((p) => p.value === parsed.priority)!.label}</Chip>}
              {parsed.assignee !== undefined && (
                <Chip>{parsed.assignee ? `👤 ${parsed.assignee === me ? 'Ich' : shortName(parsed.assignee)}` : '👥 Für alle'}</Chip>
              )}
              {parsed.rotate && <Chip>🔄 Abwechselnd</Chip>}
              <button type="button" onClick={() => setLiteral(true)} className="text-slate-500 hover:underline dark:text-slate-400">
                Nicht erkennen
              </button>
            </>
          )}
        </div>
      )}
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
        <TimeRangeInput
          start={start}
          end={end}
          onChange={(s, e) => {
            setStart(s)
            setEnd(e)
          }}
          className={fieldClass}
        />
        <RepeatSelect value={repeat} onChange={setRepeat} className={fieldClass} />
        {space && (
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Zuständig" className={fieldClass}>
            <option value="">👥 Für alle</option>
            {people.map((p) => (
              <option key={p} value={p}>
                👤 {p === me ? 'Ich' : shortName(p)}
              </option>
            ))}
          </select>
        )}
        {space && people.length > 1 && (repeat || (useParsed && parsed.repeat)) && (
          <label className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200" title="Nach jedem Erledigen ist die nächste Person dran">
            <input type="checkbox" checked={rotate || (useParsed && !!parsed.rotate)} onChange={(e) => setRotate(e.target.checked)} className="size-4 accent-indigo-600" />
            🔄 Abwechselnd
          </label>
        )}
      </div>
      {(dueDate || start || repeat || timeError) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-3 px-1 text-xs">
          {dueDate && (
            <button type="button" onClick={() => setDueDate('')} className="text-slate-500 hover:underline">
              Kein Datum
            </button>
          )}
          {start && (
            <button
              type="button"
              onClick={() => {
                setStart('')
                setEnd('')
              }}
              className="text-slate-500 hover:underline"
            >
              Keine Zeit
            </button>
          )}
          {(start || repeat) && !dueDate && !timeError && <span className="text-slate-500 dark:text-slate-400">→ wird für heute geplant</span>}
          {timeError && <span className="text-rose-600 dark:text-rose-400">{timeError}</span>}
        </div>
      )}
    </form>
  )
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/30">
      {children}
    </span>
  )
}
