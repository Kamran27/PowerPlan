import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { Space } from '../db'
import { ArrowUp, CalendarDays, Clock, Plus, Sparkles, X } from 'lucide-react'
import { addDays, formatDayShort, todayISO } from '../lib/date'
import { parseQuickInput } from '../lib/quickparse'
import { repeatLabel } from '../lib/repeat'
import { makeRotation, shortName } from '../lib/spaces'
import { addTask, PRIORITIES, type Priority } from '../lib/tasks'
import { useMyEmail } from '../lib/useMe'
import { useIsMobile } from '../lib/useIsMobile'
import { timeRangeError } from '../lib/time'
import type { Repeat } from '../lib/repeat'
import RepeatSelect from './RepeatSelect'
import TimeRangeInput from './TimeRangeInput'

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

  const today = todayISO()
  const tomorrow = addDays(today, 1)
  const dateMode = !dueDate ? 'none' : dueDate === today ? 'today' : dueDate === tomorrow ? 'tomorrow' : 'other'

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
        {/* Priorität */}
        <div role="radiogroup" aria-label="Priorität" className="flex rounded-full bg-slate-100 p-0.5 dark:bg-slate-800">
          {[...PRIORITIES].reverse().map((p) => (
            <button
              key={p.value}
              type="button"
              role="radio"
              aria-checked={priority === p.value}
              onClick={() => setPriority(p.value)}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                priority === p.value
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <span className={`size-2 rounded-full ${p.dot}`} />
              {p.label}
            </button>
          ))}
        </div>

        {/* Datum */}
        <div className="flex items-center gap-1">
          <DateChip active={dateMode === 'today'} onClick={() => setDueDate(today)}>Heute</DateChip>
          <DateChip active={dateMode === 'tomorrow'} onClick={() => setDueDate(tomorrow)}>Morgen</DateChip>
          <label className={`${pill} relative ${dateMode === 'other' ? pillActive : ''}`} title="Anderes Datum wählen">
            <CalendarDays aria-hidden className="size-3.5 shrink-0" />
            {dateMode === 'other' && <span>{formatDayShort(dueDate)}</span>}
            {/* Unsichtbares Datumsfeld über der Pille: Klick öffnet den Kalender */}
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker()
                } catch {
                  /* ältere Browser: Feld bekommt den Fokus */
                }
              }}
              aria-label="Fällig am"
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          {dueDate && (
            <button type="button" onClick={() => setDueDate('')} aria-label="Kein Datum" title="Kein Datum" className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Uhrzeit */}
        <span className={`${pill} ${start ? pillActive : ''}`}>
          <Clock aria-hidden className="size-3.5 shrink-0" />
          <TimeRangeInput
            start={start}
            end={end}
            onChange={(s, e) => {
              setStart(s)
              setEnd(e)
            }}
            className="rounded-md px-0.5"
          />
          {start && (
            <button
              type="button"
              onClick={() => {
                setStart('')
                setEnd('')
              }}
              aria-label="Keine Zeit"
              title="Keine Zeit"
              className="rounded-full p-0.5 text-slate-400 hover:text-slate-600"
            >
              <X className="size-3.5" />
            </button>
          )}
        </span>

        {/* Wiederholen */}
        <span className={`${pill} ${repeat ? pillActive : ''}`}>
          <RepeatSelect value={repeat} onChange={setRepeat} className="cursor-pointer appearance-none bg-transparent outline-none [field-sizing:content]" />
        </span>

        {space && (
          <span className={`${pill} ${assignee ? pillActive : ''}`}>
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Zuständig" className="cursor-pointer appearance-none bg-transparent outline-none [field-sizing:content]">
              <option value="">👥 Für alle</option>
              {people.map((p) => (
                <option key={p} value={p}>
                  👤 {p === me ? 'Ich' : shortName(p)}
                </option>
              ))}
            </select>
          </span>
        )}
        {space && people.length > 1 && (repeat || (useParsed && parsed.repeat)) && (
          <label className={`${pill} cursor-pointer`} title="Nach jedem Erledigen ist die nächste Person dran">
            <input type="checkbox" checked={rotate || (useParsed && !!parsed.rotate)} onChange={(e) => setRotate(e.target.checked)} className="size-3.5 accent-indigo-600" />
            🔄 Abwechselnd
          </label>
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

const pill =
  'inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/80'
const pillActive = '!bg-indigo-50 !text-indigo-700 ring-1 ring-indigo-200 dark:!bg-indigo-500/15 dark:!text-indigo-300 dark:ring-indigo-500/30'

function DateChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`${pill} ${active ? pillActive : ''}`}>
      {children}
    </button>
  )
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-white px-2 py-0.5 text-indigo-700 ring-1 ring-indigo-200 dark:bg-slate-900 dark:text-indigo-300 dark:ring-indigo-500/30">
      {children}
    </span>
  )
}
