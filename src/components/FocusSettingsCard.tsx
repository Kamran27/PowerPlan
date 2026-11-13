import { useState } from 'react'
import { clampMinutes, defaultMinutes, FOCUS_MAX, FOCUS_MIN, FOCUS_PRESETS, setDefaultMinutes } from '../lib/focus'
import { sessionPoints } from '../lib/points'

/** Einstellungen → Fokus-Timer: Standard-Dauer (Schnellauswahl oder eigene Minuten). */
export default function FocusSettingsCard() {
  const [minutes, setMinutes] = useState(defaultMinutes)
  const [draft, setDraft] = useState(String(defaultMinutes()))

  function choose(m: number) {
    const v = clampMinutes(m)
    setDefaultMinutes(v)
    setMinutes(v)
    setDraft(String(v))
  }

  return (
    <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <h2 className="font-semibold">⏱️ Fokus-Timer</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Standard-Dauer beim Start mit ⏱️ – während des Timers jederzeit mit −5 / +5 oder eigener Zeit änderbar.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {FOCUS_PRESETS.map((m) => (
          <button
            key={m}
            onClick={() => choose(m)}
            aria-pressed={minutes === m}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ${
              minutes === m ? 'bg-amber-500 text-white ring-amber-500' : 'text-slate-700 ring-slate-300 hover:bg-slate-50 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800'
            }`}
          >
            {m} Min.
          </button>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            choose(Number(draft))
          }}
          className="flex items-center gap-1 text-sm"
        >
          <input
            type="number"
            inputMode="numeric"
            min={FOCUS_MIN}
            max={FOCUS_MAX}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => choose(Number(draft))}
            aria-label="Eigene Standard-Dauer in Minuten"
            className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800"
          />
          Min.
        </form>
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Punkte je Sitzung wachsen mit der Dauer: {minutes} Min. = {sessionPoints(minutes)} Punkte (25 Min. = 10, max. 40).
      </p>
    </section>
  )
}
