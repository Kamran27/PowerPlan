import { useRef, useState, type TouchEvent } from 'react'
import { isTouchDragging } from './touchDrag'
import { haptic } from './useIsMobile'

/** Ab dieser Strecke (px) löst das Wischen die Aktion aus. */
export const SWIPE_THRESHOLD = 90
const MAX = 150

/**
 * Wischen auf einer Zeile (Handy): nach rechts → onRight, nach links → onLeft.
 * Erst bei klar waagerechter Bewegung aktiv – senkrecht scrollt die Seite wie gewohnt.
 */
export function useSwipe({ onRight, onLeft, enabled = true }: { onRight?: () => void; onLeft?: () => void; enabled?: boolean }) {
  const [dx, setDx] = useState(0)
  const state = useRef<{ x: number; y: number; dir: 'h' | 'v' | null; armed: boolean } | null>(null)

  const handlers = {
    onTouchStart: (e: TouchEvent) => {
      if (!enabled || e.touches.length !== 1) return
      const t = e.touches[0]
      state.current = { x: t.clientX, y: t.clientY, dir: null, armed: false }
    },
    onTouchMove: (e: TouchEvent) => {
      const s = state.current
      if (!s || isTouchDragging()) return
      const t = e.touches[0]
      const x = t.clientX - s.x
      const y = t.clientY - s.y
      if (!s.dir) {
        if (Math.abs(x) > 12 && Math.abs(x) > Math.abs(y) * 1.5) s.dir = 'h'
        else if (Math.abs(y) > 12) s.dir = 'v'
      }
      if (s.dir !== 'h') return
      // Nur in Richtungen, für die es eine Aktion gibt
      const limited = Math.max(onLeft ? -MAX : 0, Math.min(onRight ? MAX : 0, x))
      const armed = Math.abs(limited) >= SWIPE_THRESHOLD
      if (armed !== s.armed) {
        s.armed = armed
        if (armed) haptic(8) // spürbar „eingerastet“
      }
      setDx(limited)
    },
    onTouchEnd: () => {
      const s = state.current
      state.current = null
      if (s?.dir === 'h') {
        if (dx >= SWIPE_THRESHOLD) onRight?.()
        else if (dx <= -SWIPE_THRESHOLD) onLeft?.()
      }
      setDx(0)
    },
  }
  return { dx, handlers, swiping: dx !== 0 }
}
