import { useEffect, useRef, useState, type DragEvent, type MouseEvent } from 'react'
import type { Task, TimeBlock } from '../db'
import { todayISO } from '../lib/date'
import { clamp, DAY_END, DAY_START, DEFAULT_DURATION, fromMinutes, MAX_END, PX_PER_MIN, snap } from '../lib/time'
import { addBlock, layoutBlocks, TASK_DRAG_TYPE } from '../lib/timeblocks'
import { useNowMinutes } from '../lib/useNow'
import BlockEditor, { type BlockDraft } from './BlockEditor'
import TimeBlockCard from './TimeBlockCard'

const HOURS = Array.from({ length: (DAY_END - DAY_START) / 60 }, (_, i) => DAY_START / 60 + i)
const HEIGHT = (DAY_END - DAY_START) * PX_PER_MIN

/** Zeitleiste eines Tages mit Zeitblöcken, „Jetzt“-Linie und Drop-Ziel für Aufgaben. */
export default function DayTimeline({ date, blocks, tasks }: { date: string; blocks: TimeBlock[]; tasks: Map<string, Task> }) {
  const [draft, setDraft] = useState<BlockDraft | null>(null)
  const [dropAt, setDropAt] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const now = useNowMinutes()
  const isToday = date === todayISO()
  const showNow = isToday && now >= DAY_START && now < DAY_END

  // Beim Öffnen zur aktuellen Uhrzeit scrollen (eine Stunde Vorlauf).
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const target = isToday ? now : 8 * 60
    el.scrollTop = Math.max(0, (target - DAY_START - 60) * PX_PER_MIN)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function minutesAt(clientY: number) {
    const rect = areaRef.current!.getBoundingClientRect()
    return DAY_START + (clientY - rect.top) / PX_PER_MIN
  }

  function startAt(clientY: number, step: number) {
    return clamp(Math.floor(minutesAt(clientY) / step) * step, DAY_START, MAX_END - step)
  }

  // Klick auf freie Fläche: neuen Block zur angeklickten halben Stunde anlegen.
  function onAreaClick(e: MouseEvent) {
    if (e.target !== e.currentTarget) return
    const start = startAt(e.clientY, 30)
    setDraft({ date, start: fromMinutes(start), end: fromMinutes(start + DEFAULT_DURATION), title: '' })
  }

  function onDragOver(e: DragEvent) {
    if (!e.dataTransfer.types.includes(TASK_DRAG_TYPE)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDropAt(clamp(snap(minutesAt(e.clientY) - 15), DAY_START, MAX_END - 15))
  }

  function onDragLeave(e: DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropAt(null)
  }

  async function onDrop(e: DragEvent) {
    e.preventDefault()
    const start = dropAt ?? startAt(e.clientY, 15)
    setDropAt(null)
    const task = tasks.get(e.dataTransfer.getData(TASK_DRAG_TYPE))
    if (!task) return
    await addBlock({ date, start: fromMinutes(start), end: fromMinutes(start + DEFAULT_DURATION), title: task.title, taskId: task.id })
  }

  return (
    <>
      <div
        ref={scrollRef}
        className="max-h-[70vh] overflow-y-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
      >
        <div className="relative my-3 mr-2" style={{ height: HEIGHT }}>
          {/* Stundenraster */}
          {HOURS.map((h) => (
            <div
              key={h}
              className="pointer-events-none absolute inset-x-0 flex items-center"
              style={{ top: (h * 60 - DAY_START) * PX_PER_MIN }}
            >
              <span className="w-12 -translate-y-1/2 pr-2 text-right text-xs text-slate-400 tabular-nums">
                {String(h).padStart(2, '0')}:00
              </span>
              <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
            </div>
          ))}

          {/* Fläche für Blöcke */}
          <div
            ref={areaRef}
            onClick={onAreaClick}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            title="Klicken für neuen Block, oder Aufgabe hierher ziehen"
            className="absolute inset-y-0 right-0 left-12 cursor-cell"
          >
            {layoutBlocks(blocks).map(({ block, lane, lanes }) => (
              <TimeBlockCard
                key={block.id}
                block={block}
                task={block.taskId ? tasks.get(block.taskId) : undefined}
                lane={lane}
                lanes={lanes}
                onOpen={() => setDraft(block)}
              />
            ))}

            {dropAt !== null && (
              <div
                className="pointer-events-none absolute inset-x-0.5 rounded-lg border-2 border-dashed border-indigo-400 bg-indigo-100/50 px-2 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                style={{ top: (dropAt - DAY_START) * PX_PER_MIN, height: DEFAULT_DURATION * PX_PER_MIN }}
              >
                {fromMinutes(dropAt)}–{fromMinutes(dropAt + DEFAULT_DURATION)}
              </div>
            )}

            {showNow && (
              <div
                className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                style={{ top: (now - DAY_START) * PX_PER_MIN }}
                aria-label={`Jetzt: ${fromMinutes(now)}`}
              >
                <span className="-ml-1.5 size-3 rounded-full bg-rose-500" />
                <div className="h-0.5 flex-1 bg-rose-500" />
              </div>
            )}
          </div>
        </div>
      </div>

      {draft && (
        <BlockEditor
          draft={draft}
          task={draft.taskId ? tasks.get(draft.taskId) : undefined}
          onClose={() => setDraft(null)}
        />
      )}
    </>
  )
}
