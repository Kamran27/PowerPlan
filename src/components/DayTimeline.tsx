import { useEffect, useRef, useState } from 'react'
import type { Task, TimeBlock } from '../db'
import { todayISO } from '../lib/date'
import { DAY_START, GRID_HEIGHT, GRID_HOURS, PX_PER_MIN } from '../lib/time'
import { useNowMinutes } from '../lib/useNow'
import BlockEditor, { type BlockDraft } from './BlockEditor'
import DayColumn from './DayColumn'

/** Zeitleiste eines Tages (Heute-Seite): Stundenraster + eine Tagesspalte. */
export default function DayTimeline({ date, blocks, tasks }: { date: string; blocks: TimeBlock[]; tasks: Map<string, Task> }) {
  const [draft, setDraft] = useState<BlockDraft | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const now = useNowMinutes()
  const isToday = date === todayISO()

  // Beim Öffnen zur aktuellen Uhrzeit scrollen (eine Stunde Vorlauf).
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const target = isToday ? now : 8 * 60
    el.scrollTop = Math.max(0, (target - DAY_START - 60) * PX_PER_MIN)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <div
        ref={scrollRef}
        className="max-h-[70vh] overflow-y-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
      >
        <div className="relative my-3 mr-2" style={{ height: GRID_HEIGHT }}>
          {/* Stundenraster */}
          {GRID_HOURS.map((h) => (
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

          <DayColumn
            date={date}
            blocks={blocks}
            tasks={tasks}
            now={isToday ? now : undefined}
            onOpen={setDraft}
            className="absolute inset-y-0 right-0 left-12"
          />
        </div>
      </div>

      {draft && <BlockEditor draft={draft} task={draft.taskId ? tasks.get(draft.taskId) : undefined} onClose={() => setDraft(null)} />}
    </>
  )
}
