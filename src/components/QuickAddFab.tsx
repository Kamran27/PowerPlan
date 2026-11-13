import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { todayISO } from '../lib/date'
import { useFocus } from '../lib/focus'
import BottomSheet from './BottomSheet'
import TaskInput from './TaskInput'
import { useToast } from './Toast'

/**
 * Runder Plus-Knopf (Handy, unten rechts): öffnet überall die Schnelleingabe in normaler Sprache
 * („Zahnarzt morgen 15 Uhr“). Am Computer gibt es die Eingabe direkt auf den Seiten.
 */
export default function QuickAddFab() {
  const [open, setOpen] = useState(false)
  const focus = useFocus()
  const toast = useToast()
  const { pathname } = useLocation()
  // Auf der Suche (eigenes Eingabefeld) nicht nötig
  if (pathname.startsWith('/suche')) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Neue Aufgabe"
        className={`fixed right-4 z-20 flex size-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition-[bottom,transform] active:scale-95 md:hidden ${
          focus ? 'bottom-44' : 'bottom-24'
        }`}
      >
        <Plus aria-hidden className="size-7" strokeWidth={2.25} />
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Neue Aufgabe">
        <TaskInput
          defaultDueDate={todayISO()}
          autoFocus
          onAdded={(title) => {
            setOpen(false)
            toast(`✅ „${title}“ angelegt`)
          }}
        />
        <p className="mt-3 px-1 text-xs text-slate-500 dark:text-slate-400">
          Tipp: „morgen 15 Uhr“, „jeden Dienstag“, „!hoch“ werden automatisch erkannt.
        </p>
      </BottomSheet>
    </>
  )
}
