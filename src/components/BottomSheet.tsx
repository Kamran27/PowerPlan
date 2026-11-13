import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Fenster, das von unten hereingleitet (wie in Handy-Apps).
 * Schließen: Tippen auf den dunklen Hintergrund, Escape, oder den Griff nach unten ziehen.
 */
export default function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const [dragY, setDragY] = useState(0)
  const startY = useRef<number | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    // Seite dahinter nicht mitscrollen
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="sheet-backdrop absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="sheet-panel relative max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl md:max-w-lg md:rounded-3xl dark:bg-slate-900"
        style={{ transform: dragY ? `translateY(${dragY}px)` : undefined, transition: startY.current === null ? 'transform 200ms ease-out' : 'none' }}
      >
        {/* Griff: nach unten ziehen schließt */}
        <div
          className="-mx-4 -mt-2 mb-2 flex cursor-grab justify-center py-2 md:hidden"
          onTouchStart={(e) => (startY.current = e.touches[0].clientY)}
          onTouchMove={(e) => startY.current !== null && setDragY(Math.max(0, e.touches[0].clientY - startY.current))}
          onTouchEnd={() => {
            const close = dragY > 80
            startY.current = null
            setDragY(0)
            if (close) onClose()
          }}
        >
          <span className="h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            Schließen
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
