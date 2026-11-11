import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import BlockEditor, { type BlockDraft } from '../components/BlockEditor'
import DayColumn from '../components/DayColumn'
import PageHeader from '../components/PageHeader'
import TaskList from '../components/TaskList'
import { useToggleTask } from '../components/useToggleTask'
import { db, type Task } from '../db'
import { addDays, isoWeekNumber, todayISO } from '../lib/date'
import { weekStart } from '../lib/points'
import { compareTasks } from '../lib/tasks'
import { DAY_START, GRID_HEIGHT, GRID_HOURS, PX_PER_MIN } from '../lib/time'
import { TASK_DRAG_TYPE } from '../lib/timeblocks'
import { useNowMinutes } from '../lib/useNow'

function dayLabel(iso: string, opts: Intl.DateTimeFormatOptions) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('de-DE', opts)
}

/** Raster: Zeitspalte (3 rem) + 7 gleich breite Tage */
const COLS = 'grid grid-cols-[3rem_repeat(7,minmax(0,1fr))]'

const navBtn =
  'rounded-lg px-2 py-1 text-slate-600 hover:bg-slate-200/70 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800'

/** Wochenkalender: 7 Tagesspalten mit denselben Funktionen wie der Tagesplan auf „Heute“. */
export default function Woche() {
  const today = todayISO()
  const now = useNowMinutes()
  const [weekOffset, setWeekOffset] = useState(0)
  const [draft, setDraft] = useState<BlockDraft | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const toggle = useToggleTask()

  const monday = addDays(weekStart(today), weekOffset * 7)
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const sunday = days[6]

  const blocks = useLiveQuery(() => db.timeBlocks.where('date').between(monday, sunday, true, true).toArray(), [monday, sunday])
  const allTasks = useLiveQuery(() => db.tasks.toArray(), [])
  const tasksById = useMemo(() => new Map((allTasks ?? []).map((t) => [t.id, t])), [allTasks])

  // Beim Öffnen zur aktuellen Uhrzeit scrollen (eine Stunde Vorlauf).
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = Math.max(0, (now - DAY_START - 60) * PX_PER_MIN)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { blocksByDay, dueByDay, unplanned } = useMemo(() => {
    const blocksByDay = new Map(days.map((d) => [d, (blocks ?? []).filter((b) => b.date === d)]))
    const plannedThisWeek = new Set((blocks ?? []).map((b) => b.taskId).filter(Boolean))
    const dueByDay = new Map<string, Task[]>(days.map((d) => [d, []]))
    const unplanned: Task[] = []

    for (const t of allTasks ?? []) {
      const plannedOnDue = (blocks ?? []).some((b) => b.taskId === t.id && b.date === t.dueDate)
      // „Fällig“-Zeile: Aufgaben mit Fälligkeit in dieser Woche, die an dem Tag (noch) keinen Zeitblock haben.
      // Überfälliges Offenes erscheint am heutigen Tag.
      if (t.dueDate && !plannedOnDue) {
        const day = !t.done && t.dueDate < today && days.includes(today) ? today : t.dueDate
        if (dueByDay.has(day) && (!t.done || t.dueDate === day)) dueByDay.get(day)!.push(t)
      }
      // „Noch nicht eingeplant“: offen, diese Woche ohne Block, fällig bis Wochenende oder ohne Datum
      if (!t.done && !plannedThisWeek.has(t.id) && (!t.dueDate || t.dueDate <= sunday)) unplanned.push(t)
    }
    for (const list of dueByDay.values()) list.sort(compareTasks)
    unplanned.sort(compareTasks)
    return { blocksByDay, dueByDay, unplanned }
    // days hängt nur von monday ab
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, allTasks, monday, today])

  const loaded = blocks !== undefined && allTasks !== undefined
  const weekTitle = `KW ${isoWeekNumber(monday)} · ${dayLabel(monday, { day: 'numeric', month: 'short' })} – ${dayLabel(sunday, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}`

  return (
    <>
      <PageHeader title="Woche" subtitle="Alle Termine und Aufgaben der Woche auf einen Blick." />

      {/* Wochen-Navigation */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button onClick={() => setWeekOffset((w) => w - 1)} aria-label="Vorherige Woche" className={navBtn}>
          ‹
        </button>
        <span className="min-w-56 text-center text-sm font-medium">{weekTitle}</span>
        <button onClick={() => setWeekOffset((w) => w + 1)} aria-label="Nächste Woche" className={navBtn}>
          ›
        </button>
        {weekOffset !== 0 && (
          <button
            onClick={() => setWeekOffset(0)}
            className="rounded-lg px-3 py-1 text-sm font-medium text-indigo-600 ring-1 ring-indigo-200 hover:bg-indigo-50 dark:text-indigo-300 dark:ring-indigo-500/40 dark:hover:bg-indigo-500/10"
          >
            Diese Woche
          </button>
        )}
        <span className="ml-auto hidden text-xs text-slate-500 lg:inline dark:text-slate-400">
          Klicken = neuer Block · Aufgabe in einen Tag ziehen = einplanen
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
        {/* Noch nicht eingeplante Aufgaben (zum Hineinziehen) */}
        <section className="lg:sticky lg:top-6">
          <h2 className="mb-1 font-semibold">
            Noch nicht eingeplant{' '}
            <span className="text-sm font-normal text-slate-500 dark:text-slate-400">{loaded ? unplanned.length : ''}</span>
          </h2>
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">In einen Tag ziehen, um einen Zeitblock anzulegen.</p>
          <div className="max-h-[30vh] overflow-y-auto lg:max-h-[70vh]">
            {loaded && <TaskList tasks={unplanned} empty="Alles für diese Woche ist eingeplant. 🎉" />}
          </div>
        </section>

        {/* Kalender */}
        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <div className="min-w-[44rem]">
            {/* Kopfzeile: Wochentage */}
            <div className={`${COLS} border-b border-slate-200 dark:border-slate-800`}>
              <div />
              {days.map((d) => {
                const isToday = d === today
                return (
                  <div key={d} className="border-l border-slate-100 px-1 py-2 text-center dark:border-slate-800">
                    <div className={`text-xs ${isToday ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      {dayLabel(d, { weekday: 'short' })}
                    </div>
                    <div
                      className={`mx-auto mt-0.5 flex size-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${
                        isToday ? 'bg-indigo-600 text-white' : ''
                      }`}
                    >
                      {dayLabel(d, { day: 'numeric' })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Fällig-Zeile: Aufgaben ohne Uhrzeit */}
            <div className={`${COLS} border-b border-slate-200 dark:border-slate-800`}>
              <div className="pt-1.5 pr-1 text-right text-[10px] leading-tight text-slate-400">Fällig</div>
              {days.map((d) => (
                <ul key={d} className="grid min-h-8 content-start gap-0.5 border-l border-slate-100 p-1 dark:border-slate-800">
                  {(dueByDay.get(d) ?? []).map((t) => (
                    <li
                      key={t.id}
                      draggable={!t.done}
                      onDragStart={(e) => {
                        e.dataTransfer.setData(TASK_DRAG_TYPE, t.id)
                        e.dataTransfer.effectAllowed = 'copy'
                      }}
                      title={t.done ? t.title : `${t.title} – in den Tag ziehen, um eine Uhrzeit festzulegen`}
                      className={`flex min-w-0 items-center gap-1 overflow-hidden rounded-md px-1 py-0.5 text-xs ${
                        t.done
                          ? 'text-slate-400 line-through'
                          : t.dueDate! < today
                            ? 'cursor-grab bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200'
                            : 'cursor-grab bg-slate-100 dark:bg-slate-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={t.done}
                        onChange={() => toggle(t)}
                        aria-label={t.done ? `${t.title} als offen markieren` : `${t.title} erledigen`}
                        className="size-3 shrink-0 cursor-pointer accent-indigo-600"
                      />
                      <span className="truncate">{t.title}</span>
                    </li>
                  ))}
                </ul>
              ))}
            </div>

            {/* Zeitraster */}
            <div ref={scrollRef} className="max-h-[65vh] overflow-y-auto">
              <div className={`${COLS} relative my-3`} style={{ height: GRID_HEIGHT }}>
                {/* Stundenlinien über alle Tage */}
                {GRID_HOURS.map((h) => (
                  <div
                    key={h}
                    className="pointer-events-none absolute inset-x-0 flex items-center"
                    style={{ top: (h * 60 - DAY_START) * PX_PER_MIN }}
                  >
                    <span className="w-12 -translate-y-1/2 pr-1.5 text-right text-[11px] text-slate-400 tabular-nums">
                      {String(h).padStart(2, '0')}:00
                    </span>
                    <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                  </div>
                ))}
                <div />
                {days.map((d) => (
                  <DayColumn
                    key={d}
                    date={d}
                    blocks={blocksByDay.get(d) ?? []}
                    tasks={tasksById}
                    now={d === today ? now : undefined}
                    onOpen={setDraft}
                    className={`relative border-l border-slate-100 dark:border-slate-800 ${d === today ? 'bg-indigo-50/40 dark:bg-indigo-500/5' : ''}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {draft && <BlockEditor draft={draft} task={draft.taskId ? tasksById.get(draft.taskId) : undefined} onClose={() => setDraft(null)} />}
    </>
  )
}
