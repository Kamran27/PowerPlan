import { useEffect, useRef, useState, type DragEvent, type MouseEvent } from 'react'
import type { Task, TimeBlock } from '../db'
import { clamp, DAY_END, DAY_START, DEFAULT_DURATION, fromMinutes, GRID_HEIGHT, MAX_END, PX_PER_MIN, snap } from '../lib/time'
import { updateTask } from '../lib/tasks'
import { addBlock, layoutBlocks, TASK_DRAG_TYPE } from '../lib/timeblocks'
import { registerDropTarget } from '../lib/touchDrag'
import type { BlockDraft } from './BlockEditor'
import TimeBlockCard from './TimeBlockCard'

interface Props {
  date: string
  blocks: TimeBlock[]
  tasks: Map<string, Task>
  /** Aktuelle Uhrzeit in Minuten, nur für den heutigen Tag (sonst undefined) */
  now?: number
  /** Öffnet den Block-Dialog (neu oder bearbeiten) */
  onOpen: (draft: BlockDraft) => void
  className?: string
}

/**
 * Eine Tagesspalte im Zeitraster – gemeinsam genutzt von Tagesplan (Heute) und Wochenkalender:
 * Klick = neuer Block, Aufgabe hineinziehen = einplanen, Blöcke verschieben/verlängern, „Jetzt“-Linie.
 */
export default function DayColumn({ date, blocks, tasks, now, onOpen, className = '' }: Props) {
  const [dropAt, setDropAt] = useState<number | null>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const showNow = now !== undefined && now >= DAY_START && now < DAY_END

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
    onOpen({ date, start: fromMinutes(start), end: fromMinutes(start + DEFAULT_DURATION), title: '' })
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

  async function scheduleAt(task: Task, start: number) {
    await addBlock({ date, start: fromMinutes(start), end: fromMinutes(start + DEFAULT_DURATION), title: task.title, taskId: task.id })
    // Aufgabe ohne Fälligkeit bekommt den Tag, an dem sie eingeplant wurde
    if (!task.dueDate) await updateTask(task.id, { dueDate: date })
  }

  async function onDrop(e: DragEvent) {
    e.preventDefault()
    const start = dropAt ?? startAt(e.clientY, 15)
    setDropAt(null)
    const task = tasks.get(e.dataTransfer.getData(TASK_DRAG_TYPE))
    if (!task) return
    await scheduleAt(task, start)
  }

  // Finger-Drag (Handy): diese Spalte als Ablagefläche anmelden
  const dropRef = useRef({ scheduleAt, minutesAt })
  dropRef.current = { scheduleAt, minutesAt }
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const at = (y: number) => clamp(snap(dropRef.current.minutesAt(y) - 15), DAY_START, MAX_END - 15)
    return registerDropTarget({
      el,
      over: (y) => setDropAt(y === null ? null : at(y)),
      drop: (task, y) => void dropRef.current.scheduleAt(task, at(y)),
    })
  }, [])

  return (
    <div
      ref={areaRef}
      onClick={onAreaClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      title="Klicken für neuen Block, oder Aufgabe hierher ziehen"
      className={`cursor-cell ${className}`}
      style={{ height: GRID_HEIGHT }}
    >
      {layoutBlocks(blocks).map(({ block, lane, lanes }) => (
        <TimeBlockCard
          key={block.id}
          block={block}
          task={block.taskId ? tasks.get(block.taskId) : undefined}
          lane={lane}
          lanes={lanes}
          onOpen={() => onOpen(block)}
        />
      ))}

      {dropAt !== null && (
        <div
          className="pointer-events-none absolute inset-x-0.5 rounded-lg border-2 border-dashed border-indigo-400 bg-indigo-100/50 px-1 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
          style={{ top: (dropAt - DAY_START) * PX_PER_MIN, height: DEFAULT_DURATION * PX_PER_MIN }}
        >
          {fromMinutes(dropAt)}–{fromMinutes(dropAt + DEFAULT_DURATION)}
        </div>
      )}

      {showNow && (
        <div
          className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
          style={{ top: (now! - DAY_START) * PX_PER_MIN }}
          aria-label={`Jetzt: ${fromMinutes(now!)}`}
        >
          <span className="-ml-1.5 size-3 rounded-full bg-rose-500" />
          <div className="h-0.5 flex-1 bg-rose-500" />
        </div>
      )}
    </div>
  )
}
