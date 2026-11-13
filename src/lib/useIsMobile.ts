import { useSyncExternalStore } from 'react'

const QUERY = '(max-width: 767px)'

/** true auf schmalen Bildschirmen (Handy) – passt sich beim Drehen/Verkleinern an. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(QUERY)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia(QUERY).matches,
    () => false,
  )
}

/** Kurzes Vibrieren als Rückmeldung (nur wo unterstützt, z. B. Android; iPhone ignoriert es). */
export function haptic(ms = 12) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* nicht unterstützt */
  }
}
