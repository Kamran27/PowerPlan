import { Clock, Play } from 'lucide-react'
import type { Task, TimeBlock } from '../db'
import { startFocus, useFocus } from '../lib/focus'
import { toMinutes } from '../lib/time'
import { useNowMinutes } from '../lib/useNow'

/**
 * „Als Nächstes“: der laufende oder nächste Zeitblock von heute mit Countdown –
 * ein Tipp startet den Fokus-Timer dafür.
 */
export default function NextUp({ blocks, tasks }: { blocks: TimeBlock[]; tasks: Map<string, Task> }) {
  const now = useNowMinutes()
  const focus = useFocus()

  const next = blocks
    .filter((b) => toMinutes(b.end) > now && !(b.taskId && tasks.get(b.taskId)?.done))
    .sort((a, b) => a.start.localeCompare(b.start))[0]
  if (!next) return null

  const task = next.taskId ? tasks.get(next.taskId) : undefined
  const title = task?.title ?? next.title
  const start = toMinutes(next.start)
  const running = start <= now
  const label = running
    ? `Läuft gerade · noch ${toMinutes(next.end) - now} Min.`
    : start - now <= 90
      ? `Als Nächstes · in ${start - now} Min.`
      : `Als Nächstes · um ${next.start} Uhr`
  const focusing = !!focus && focus.title === title

  return (
    <section className="mb-6 flex items-center gap-3 rounded-2xl bg-indigo-600 p-4 text-white shadow-sm dark:bg-indigo-500/20 dark:ring-1 dark:ring-indigo-400/30">
      <Clock aria-hidden className="size-6 shrink-0 opacity-90" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium opacity-80">{label}</p>
        <p className="truncate text-base font-semibold">{title}</p>
        <p className="text-xs opacity-80">
          {next.start}–{next.end} Uhr
        </p>
      </div>
      {!focusing && (
        <button
          onClick={() => startFocus({ id: task?.id ?? next.id, title })}
          className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-sm font-semibold ring-1 ring-white/30 hover:bg-white/25"
        >
          <Play aria-hidden className="size-4" /> Fokus
        </button>
      )}
    </section>
  )
}
