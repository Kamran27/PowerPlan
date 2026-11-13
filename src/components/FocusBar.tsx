import { useEffect, useState } from 'react'
import { completeFocus, FOCUS_DURATIONS, formatClock, remainingMs, setDefaultMinutes, startFocus, stopFocus, useFocus } from '../lib/focus'
import { SESSION_POINTS } from '../lib/points'
import { useToast } from './Toast'

/**
 * Leiste für den laufenden Fokus-Timer – auf jeder Seite sichtbar (über der Handy-Navigation).
 * Ist die Zeit um: Sitzung speichern, Punkte melden, Benachrichtigung (falls erlaubt).
 */
export default function FocusBar() {
  const focus = useFocus()
  const [now, setNow] = useState(() => Date.now())
  const toast = useToast()

  useEffect(() => {
    if (!focus) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [focus])

  const left = focus ? remainingMs(focus, now) : 0

  // Zeit abgelaufen (auch wenn die App zwischendurch zu war)
  useEffect(() => {
    if (!focus || left > 0) return
    completeFocus(focus).then(() => {
      toast(`⏱️ ${focus.minutes} Minuten Fokus geschafft – +${SESSION_POINTS} Punkte! Kurz Pause machen.`)
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('⏱️ Fokus geschafft', { body: `${focus.title} – Zeit für eine kurze Pause.`, tag: 'powerplan-focus' })
        }
      } catch {
        /* Benachrichtigungen nicht möglich */
      }
    })
  }, [focus, left, toast])

  if (!focus || left <= 0) return null
  const pct = Math.min(100, Math.max(0, 100 - (left / (focus.minutes * 60_000)) * 100))

  return (
    <div
      role="status"
      aria-label="Fokus-Timer"
      className="fixed inset-x-2 bottom-20 z-20 mx-auto max-w-md overflow-hidden rounded-2xl bg-amber-500 text-white shadow-xl md:right-6 md:bottom-6 md:left-auto md:w-96"
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className="text-2xl font-bold tabular-nums">{formatClock(left)}</span>
        <span className="min-w-0 flex-1 truncate text-sm">
          <span className="block text-xs opacity-80">Fokus auf</span>
          {focus.title}
        </span>
        <select
          value={focus.minutes}
          onChange={(e) => {
            const m = Number(e.target.value)
            setDefaultMinutes(m)
            startFocus({ id: focus.taskId ?? '', title: focus.title }, m)
          }}
          aria-label="Dauer (startet neu)"
          title="Dauer ändern (startet neu)"
          className="rounded-md bg-amber-600 px-1 py-0.5 text-sm"
        >
          {FOCUS_DURATIONS.map((m) => (
            <option key={m} value={m}>
              {m} Min.
            </option>
          ))}
        </select>
        <button onClick={stopFocus} aria-label="Fokus abbrechen" className="rounded-md px-2 py-1 text-sm font-semibold hover:bg-amber-600">
          ✕
        </button>
      </div>
      <div className="h-1 bg-amber-600">
        <div className="h-full bg-white/80 transition-all duration-1000" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
