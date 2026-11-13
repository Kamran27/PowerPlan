import type { TouchEvent as ReactTouchEvent } from 'react'
import type { Task } from '../db'

/*
 * Drag & Drop mit dem Finger (Handy/Tablet). HTML-Drag & Drop funktioniert auf Touch-Geräten nicht,
 * deshalb: lange auf eine Aufgabe drücken (≈ 0,35 s) → ein „Geist“ folgt dem Finger →
 * über einer Tagesspalte (Tagesplan oder Woche) loslassen = einplanen. Am Bildschirmrand wird gescrollt.
 */

export interface DropTarget {
  el: HTMLElement
  /** Finger über der Spalte (clientY) oder null = verlassen */
  over: (clientY: number | null) => void
  drop: (task: Task, clientY: number) => void
}

const targets = new Set<DropTarget>()

/** Eine Tagesspalte meldet sich als Ablagefläche an; gibt die Abmeldung zurück. */
export function registerDropTarget(t: DropTarget): () => void {
  targets.add(t)
  return () => targets.delete(t)
}

const LONG_PRESS_MS = 350
const MOVE_TOLERANCE = 10
const EDGE = 70

interface DragState {
  task: Task
  ghost: HTMLElement
  x: number
  y: number
  current?: DropTarget
  scrollTimer: number
}

let pending: { task: Task; x: number; y: number; timer: number } | null = null
let drag: DragState | null = null

function targetAt(x: number, y: number): DropTarget | undefined {
  for (const t of targets) {
    const r = t.el.getBoundingClientRect()
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return t
  }
  return undefined
}

function update(x: number, y: number) {
  if (!drag) return
  drag.x = x
  drag.y = y
  drag.ghost.style.transform = `translate(${x - 20}px, ${y - 24}px)`
  const t = targetAt(x, y)
  if (t !== drag.current) drag.current?.over(null)
  drag.current = t
  t?.over(y)
}

function onMove(e: TouchEvent) {
  const p = e.touches[0]
  if (!p) return
  if (pending && !drag) {
    // Bewegt, bevor das lange Drücken erkannt wurde → normales Scrollen
    if (Math.hypot(p.clientX - pending.x, p.clientY - pending.y) > MOVE_TOLERANCE) cancel()
    return
  }
  if (drag) {
    e.preventDefault() // Seite nicht scrollen, solange gezogen wird
    update(p.clientX, p.clientY)
  }
}

function onEnd(e: TouchEvent) {
  if (drag) {
    e.preventDefault()
    const { task, current, y } = drag
    current?.over(null)
    if (current) current.drop(task, y)
    // Den Klick, den der Browser nach dem Loslassen auslöst, verschlucken (sonst öffnet sich „Bearbeiten“)
    window.addEventListener('click', swallow, { capture: true, once: true })
    window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 400)
  }
  cancel()
}

function swallow(e: Event) {
  e.stopPropagation()
  e.preventDefault()
}

function cancel() {
  if (pending) window.clearTimeout(pending.timer)
  pending = null
  if (drag) {
    drag.ghost.remove()
    window.clearInterval(drag.scrollTimer)
    drag.current?.over(null)
    drag = null
  }
  document.removeEventListener('touchmove', onMove)
  document.removeEventListener('touchend', onEnd)
  document.removeEventListener('touchcancel', cancel)
}

function begin() {
  if (!pending) return
  const { task, x, y } = pending
  pending = null
  const ghost = document.createElement('div')
  ghost.textContent = `🕒 ${task.title}`
  ghost.setAttribute('aria-hidden', 'true')
  ghost.className =
    'pointer-events-none fixed top-0 left-0 z-50 max-w-60 truncate rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-2xl'
  document.body.appendChild(ghost)
  // Am oberen/unteren Rand automatisch scrollen, damit man zur Zeitleiste kommt
  const scrollTimer = window.setInterval(() => {
    if (!drag) return
    if (drag.y < EDGE) window.scrollBy(0, -14)
    else if (drag.y > window.innerHeight - EDGE) window.scrollBy(0, 14)
    else return
    update(drag.x, drag.y)
  }, 30)
  drag = { task, ghost, x, y, scrollTimer }
  navigator.vibrate?.(15)
  update(x, y)
}

/** Touch-Handler für eine ziehbare Aufgabe (zusätzlich zum Maus-Drag). */
export function touchDragProps(task: Task) {
  if (task.done) return {}
  return {
    onTouchStart: (e: ReactTouchEvent) => {
      if (e.touches.length !== 1) return
      // Nicht aus Knöpfen/Häkchen/Eingabefeldern heraus starten
      if ((e.target as HTMLElement).closest('input, select, textarea, [data-no-drag]')) return
      cancel()
      const p = e.touches[0]
      pending = { task, x: p.clientX, y: p.clientY, timer: window.setTimeout(begin, LONG_PRESS_MS) }
      document.addEventListener('touchmove', onMove, { passive: false })
      document.addEventListener('touchend', onEnd, { passive: false })
      document.addEventListener('touchcancel', cancel)
    },
    // Kein Kontextmenü / Textauswahl beim langen Drücken
    onContextMenu: (e: { preventDefault: () => void }) => {
      if (drag || pending) e.preventDefault()
    },
    style: { WebkitTouchCallout: 'none' as const },
  }
}
