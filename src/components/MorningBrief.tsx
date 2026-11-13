import { Sun, X } from 'lucide-react'
import { useState } from 'react'
import type { Meal, Task, TimeBlock } from '../db'
import { PeekingCat } from './Cats'

const KEY = 'powerplan-morning-dismissed'

/**
 * „Dein Tag“ – kurzes Morgen-Briefing (5–11 Uhr): wie viel ansteht, erster Termin, Routinen, Essen.
 * Einmal weggeklickt, bleibt es für den Tag verborgen.
 */
export default function MorningBrief({
  today,
  open,
  blocks,
  habitsDue,
  meals,
}: {
  today: string
  open: Task[]
  blocks: TimeBlock[]
  habitsDue: number
  meals: Meal[]
}) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(KEY) === today
    } catch {
      return false
    }
  })
  const hour = new Date().getHours()
  if (dismissed || hour < 5 || hour >= 11) return null

  const high = open.filter((t) => t.priority === 1).length
  const first = [...blocks].sort((a, b) => a.start.localeCompare(b.start))[0]
  const parts = [
    open.length ? `${open.length} ${open.length === 1 ? 'Aufgabe' : 'Aufgaben'}${high ? ` (${high} wichtig)` : ''}` : 'keine fälligen Aufgaben',
    habitsDue ? `${habitsDue} ${habitsDue === 1 ? 'Routine' : 'Routinen'}` : null,
  ].filter(Boolean)

  function close() {
    try {
      localStorage.setItem(KEY, today)
    } catch {
      /* egal */
    }
    setDismissed(true)
  }

  return (
    <section className="relative mt-6 mb-6 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/25">
      <PeekingCat className="absolute -top-[19px] left-6 w-9 text-amber-400 dark:text-amber-500/70" />
      <button onClick={close} aria-label="Briefing ausblenden" className="absolute top-2 right-2 rounded-lg p-1.5 text-amber-700/70 hover:bg-amber-100 dark:text-amber-300/70 dark:hover:bg-amber-500/20">
        <X aria-hidden className="size-4" />
      </button>
      <h2 className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-100">
        <Sun aria-hidden className="size-5" /> Dein Tag
      </h2>
      <ul className="mt-2 grid gap-1 text-sm text-amber-900/90 dark:text-amber-100/90">
        <li>Heute: {parts.join(' · ')}</li>
        {first && (
          <li>
            Erster Termin: <strong>{first.start} Uhr</strong> – {first.title}
          </li>
        )}
        {meals.length > 0 && <li>Essen: {meals.map((m) => m.title).join(', ')}</li>}
        {high > 0 && <li className="text-amber-800 dark:text-amber-200">Tipp: Fang mit dem Wichtigsten an – am besten mit einem Fokus-Timer.</li>}
      </ul>
      <button onClick={close} className="mt-3 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-400">
        Los geht's
      </button>
    </section>
  )
}
