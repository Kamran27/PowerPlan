import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { Space } from '../db'
import { ArrowUp, Plus, Sparkles } from 'lucide-react'
import { formatDayShort, todayISO } from '../lib/date'
import { parseQuickInput } from '../lib/quickparse'
import { repeatLabel } from '../lib/repeat'
import { makeRotation, shortName } from '../lib/spaces'
import { addTask, PRIORITIES, type Priority } from '../lib/tasks'
import { useMyEmail } from '../lib/useMe'
import { useIsMobile } from '../lib/useIsMobile'
import { timeRangeError } from '../lib/time'
import type { Repeat } from '../lib/repeat'
import { DatePills, PriorityPills, RepeatPill, RotatePill, SelectPill, TimePill } from './TaskFields'

interface Props {
  defaultDueDate?: string
  /** In einem gemeinsamen Bereich: Aufgaben landen dort (für alle Mitglieder sichtbar) */
  space?: Space
  /** Personen, denen man im Bereich zuweisen kann (E-Mails) */
  people?: string[]
  /** Eingabefeld sofort aktiv (z. B. im Plus-Fenster) */
  autoFocus?: boolean
  /** Nach dem Anlegen (z. B. Fenster schließen) */
  onAdded?: (title: string) => void
}

/** Schnelleingabe für neue Aufgaben: Titel, Priorität, Datum und Uhrzeit (Beginn – Ende) – optional mit Zuständigkeit. */
export default function TaskInput({ defaultDueDate, space, people = [], autoFocus, onAdded }: Props) {
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
  const isMobile = useIsMobile()

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
    onAdded?.(p ? p.title : title.trim())
  }

  return (
    <form
      onSubmit={submit}
      className="group/ti rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200 transition-shadow focus-within:shadow-md focus-within:ring-2 focus-within:ring-indigo-500/50 dark:bg-slate-900 dark:ring-slate-800 dark:focus-within:ring-indigo-400/50"
    >
      {/* Eingabezeile */}
      <div className="flex items-center gap-2">
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
          <Plus className="size-5" strokeWidth={2.25} />
        </span>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            if (!e.target.value) setLiteral(false)
          }}
          placeholder={isMobile ? 'Was steht an?' : 'Was steht an? z. B. „Zahnarzt morgen 15 Uhr“'}
          aria-label="Neue Aufgabe"
          autoFocus={autoFocus}
          enterKeyHint="done"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-base outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          aria-label="Hinzufügen"
          title="Hinzufügen (Enter)"
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-500 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
        >
          <ArrowUp aria-hidden className="size-4" strokeWidth={2.5} />
          <span className="hidden sm:inline">Hinzufügen</span>
        </button>
      </div>

      {/* Vorschau: was aus dem Text erkannt wurde */}
      {parsed.found && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-xl bg-indigo-50/60 px-3 py-1.5 text-xs dark:bg-indigo-500/10" aria-live="polite">
          {literal ? (
            <>
              <span className="text-slate-500 dark:text-slate-400">Text wird wörtlich übernommen.</span>
              <button type="button" onClick={() => setLiteral(false)} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                Doch erkennen
              </button>
            </>
          ) : (
            <>
              <Sparkles aria-hidden className="size-3.5 text-indigo-500" />
              <span className="font-medium">„{parsed.title}“</span>
              {parsed.dueDate && <Chip>📅 {formatDayShort(parsed.dueDate)}</Chip>}
              {parsed.start && <Chip>🕒 {parsed.start}{parsed.end ? `–${parsed.end}` : ''} Uhr</Chip>}
              {parsed.repeat && <Chip>🔁 {repeatLabel(parsed.repeat)}</Chip>}
              {parsed.priority && <Chip>❗ {PRIORITIES.find((p) => p.value === parsed.priority)!.label}</Chip>}
              {parsed.assignee !== undefined && (
                <Chip>{parsed.assignee ? `👤 ${parsed.assignee === me ? 'Ich' : shortName(parsed.assignee)}` : '👥 Für alle'}</Chip>
              )}
              {parsed.rotate && <Chip>🔄 Abwechselnd</Chip>}
              <button type="button" onClick={() => setLiteral(true)} className="ml-auto text-slate-500 hover:underline dark:text-slate-400">
                Nicht erkennen
              </button>
            </>
          )}
        </div>
      )}

      {/* Optionen als Pillen */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-100 px-1 pt-2 dark:border-slate-800">
        <PriorityPills value={priority} onChange={setPriority} />
        <DatePills value={dueDate} onChange={setDueDate} />
        <TimePill
          start={start}
          end={end}
          onChange={(s, e) => {
            setStart(s)
            setEnd(e)
          }}
        />
        <RepeatPill value={repeat} onChange={setRepeat} />
        {space && (
          <SelectPill value={assignee} onChange={setAssignee} label="Zuständig" active={!!assignee}>
            <option value="">👥 Für alle</option>
            {people.map((p) => (
              <option key={p} value={p}>
                👤 {p === me ? 'Ich' : shortName(p)}
              </option>
            ))}
          </SelectPill>
        )}
        {space && people.length > 1 && (repeat || (useParsed && parsed.repeat)) && (
          <RotatePill checked={rotate || (useParsed && !!parsed.rotate)} onChange={setRotate} />
        )}
      </div>

      {((start || repeat) && !dueDate && !timeError) || timeError ? (
        <div className="mt-1.5 px-2 text-xs">
          {timeError ? (
            <span className="text-rose-600 dark:text-rose-400">{timeError}</span>
          ) : (
            <span className="text-slate-500 dark:text-slate-400">→ wird für heute geplant</span>
          )}
        </div>
      ) : null}
    </form>
  )
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-white px-2 py-0.5 text-indigo-700 ring-1 ring-indigo-200 dark:bg-slate-900 dark:text-indigo-300 dark:ring-indigo-500/30">
      {children}
    </span>
  )
}
