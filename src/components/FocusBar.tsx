import { useEffect, useState } from 'react'
import { completeFocus, FOCUS_MAX, FOCUS_PRESETS, formatClock, remainingMs, setDefaultMinutes, setFocusMinutes, stopFocus, useFocus } from '../lib/focus'
import { sessionPoints } from '../lib/points'
import { useToast } from './Toast'

const btn = 'rounded-md px-2 py-1 text-sm font-semibold hover:bg-amber-600 disabled:opacity-40'

/**
 * Leiste für den laufenden Fokus-Timer – auf jeder Seite sichtbar (über der Handy-Navigation).
 * Dauer frei änderbar, ohne neu zu starten: −5 / +5, eigene Minuten oder Schnellauswahl.
 * Ist die Zeit um: Sitzung speichern, Punkte melden, Benachrichtigung (falls erlaubt).
 */
export default function FocusBar() {
  const focus = useFocus()
  const [now, setNow] = useState(() => Date.now())
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
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
      toast(`⏱️ ${focus.minutes} Minuten Fokus geschafft – +${sessionPoints(focus.minutes)} Punkte! Kurz Pause machen.`)
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
  // Kürzer als die schon vergangene Zeit geht nicht
  const minAllowed = Math.ceil((now - focus.startedAt) / 60_000) + 1

  function change(minutes: number) {
    setFocusMinutes(minutes)
    setDefaultMinutes(Math.max(minutes, 1)) // nächstes Mal wieder diese Dauer
  }

  function saveDraft() {
    const m = Number(draft)
    if (m > 0) change(m)
    setEditing(false)
  }

  return (
    <div
      role="status"
      aria-label="Fokus-Timer"
      className="fixed inset-x-2 bottom-20 z-20 mx-auto max-w-md overflow-hidden rounded-2xl bg-amber-500 text-white shadow-xl md:right-6 md:bottom-6 md:left-auto md:w-[26rem]"
    >
      <div className="flex items-center gap-2 px-4 py-2.5">
        <span className="text-2xl font-bold tabular-nums">{formatClock(left)}</span>
        <span className="min-w-0 flex-1 truncate text-sm">
          <span className="block text-xs opacity-80">Fokus auf</span>
          {focus.title}
        </span>
        <button onClick={() => change(focus.minutes - 5)} disabled={focus.minutes - 5 < minAllowed} aria-label="5 Minuten kürzer" className={btn}>
          −5
        </button>
        <button
          onClick={() => {
            setDraft(String(focus.minutes))
            setEditing((e) => !e)
          }}
          aria-expanded={editing}
          aria-label={`Dauer: ${focus.minutes} Minuten – ändern`}
          className="rounded-md bg-amber-600 px-2 py-1 text-sm tabular-nums hover:bg-amber-700"
        >
          {focus.minutes} Min.
        </button>
        <button onClick={() => change(focus.minutes + 5)} disabled={focus.minutes + 5 > FOCUS_MAX} aria-label="5 Minuten länger" className={btn}>
          +5
        </button>
        <button onClick={stopFocus} aria-label="Fokus abbrechen" className={btn}>
          ✕
        </button>
      </div>

      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveDraft()
          }}
          className="flex flex-wrap items-center gap-1.5 border-t border-amber-400/60 px-4 py-2 text-sm"
        >
          {FOCUS_PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              disabled={m < minAllowed}
              onClick={() => {
                change(m)
                setEditing(false)
              }}
              className={`rounded-full px-2.5 py-0.5 ring-1 ring-white/60 disabled:opacity-40 ${m === focus.minutes ? 'bg-white text-amber-700' : 'hover:bg-amber-600'}`}
            >
              {m}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-1">
            <input
              autoFocus
              type="number"
              inputMode="numeric"
              min={minAllowed}
              max={FOCUS_MAX}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Eigene Dauer in Minuten"
              className="w-16 rounded-md bg-white px-2 py-0.5 text-slate-900"
            />
            Min.
          </label>
          <button type="submit" className="rounded-md bg-white px-2 py-0.5 font-semibold text-amber-700">
            OK
          </button>
        </form>
      )}

      <div className="h-1 bg-amber-600">
        <div className="h-full bg-white/80 transition-all duration-1000" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
