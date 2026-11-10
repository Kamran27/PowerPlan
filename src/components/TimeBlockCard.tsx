import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { Task, TimeBlock } from '../db'
import { clamp, DAY_START, fromMinutes, MAX_END, PX_PER_MIN, SNAP, snap, toMinutes } from '../lib/time'
import { updateBlock } from '../lib/timeblocks'
import { useToggleTask } from './useToggleTask'

interface Props {
  block: TimeBlock
  task?: Task
  lane: number
  lanes: number
  onOpen: () => void
}

interface DragState {
  mode: 'move' | 'resize'
  y: number
  start: number
  end: number
  moved: boolean
}

/** Ein Zeitblock: Ziehen verschiebt, unterer Rand ändert die Länge, Klick öffnet den Editor. */
export default function TimeBlockCard({ block, task, lane, lanes, onOpen }: Props) {
  const [preview, setPreview] = useState<{ start: number; end: number } | null>(null)
  const toggle = useToggleTask()
  const drag = useRef<DragState | null>(null)

  // Sobald die gespeicherte Zeit ankommt, Vorschau verwerfen (kein Zurückspringen).
  useEffect(() => setPreview(null), [block.start, block.end])

  const start = preview?.start ?? toMinutes(block.start)
  const end = preview?.end ?? toMinutes(block.end)
  const title = task?.title ?? block.title
  const done = task?.done ?? false
  const compact = end - start < 40

  function onPointerDown(e: PointerEvent, mode: DragState['mode']) {
    if (e.button !== 0) return
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { mode, y: e.clientY, start: toMinutes(block.start), end: toMinutes(block.end), moved: false }
  }

  function onPointerMove(e: PointerEvent) {
    const d = drag.current
    if (!d) return
    const dy = e.clientY - d.y
    if (!d.moved && Math.abs(dy) < 4) return
    d.moved = true
    const delta = snap(dy / PX_PER_MIN)
    if (d.mode === 'move') {
      const len = d.end - d.start
      const s = clamp(d.start + delta, DAY_START, MAX_END - len)
      setPreview({ start: s, end: s + len })
    } else {
      setPreview({ start: d.start, end: clamp(d.end + delta, d.start + SNAP, MAX_END) })
    }
  }

  async function onPointerUp() {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (!d.moved) {
      if (d.mode === 'move') onOpen()
      return
    }
    if (preview) await updateBlock(block.id, { start: fromMinutes(preview.start), end: fromMinutes(preview.end) })
  }

  const color = block.taskId
    ? 'bg-indigo-50 border-indigo-500 text-indigo-950 dark:bg-indigo-500/15 dark:text-indigo-100'
    : 'bg-emerald-50 border-emerald-500 text-emerald-950 dark:bg-emerald-500/15 dark:text-emerald-100'

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${title}, ${fromMinutes(start)} bis ${fromMinutes(end)}`}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      onPointerDown={(e) => onPointerDown(e, 'move')}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        drag.current = null
        setPreview(null)
      }}
      className={`absolute touch-none cursor-grab overflow-hidden rounded-lg border-l-4 px-2 text-sm select-none active:cursor-grabbing ${color} ${
        preview ? 'z-10 shadow-lg ring-2 ring-indigo-400' : 'shadow-sm'
      } ${done ? 'opacity-60' : ''}`}
      style={{
        top: (start - DAY_START) * PX_PER_MIN + 1,
        height: (end - start) * PX_PER_MIN - 2,
        left: `calc(${(lane / lanes) * 100}% + 2px)`,
        width: `calc(${100 / lanes}% - 4px)`,
      }}
    >
      <div className={`flex gap-1.5 ${compact ? 'items-center py-0.5' : 'items-start py-1'}`}>
        {task && (
          <input
            type="checkbox"
            checked={task.done}
            onChange={() => toggle(task)}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={task.done ? 'Als offen markieren' : 'Als erledigt markieren'}
            className="mt-0.5 size-4 shrink-0 cursor-pointer accent-indigo-600"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className={`truncate font-medium ${done ? 'line-through' : ''}`}>{title}</div>
          {!compact && (
            <div className="text-xs opacity-70">
              {fromMinutes(start)}–{fromMinutes(end)}
            </div>
          )}
        </div>
        {compact && <span className="shrink-0 text-xs opacity-70">{fromMinutes(start)}</span>}
      </div>
      {/* Griff zum Verlängern/Verkürzen */}
      <div
        onPointerDown={(e) => onPointerDown(e, 'resize')}
        className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
        aria-hidden
      />
    </div>
  )
}
