/*
 * Kleine Feiern ohne React: „+20“ steigt vom Häkchen auf, Pfotenabdrücke regnen bei großen Momenten
 * (alle Ringe geschlossen, neues Level). Mit „Bewegung reduzieren“ passiert nichts.
 */

const PAW_SVG =
  '<svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><ellipse cx="12" cy="16" rx="5.2" ry="4.4"/><ellipse cx="5.2" cy="10.2" rx="2.1" ry="2.7" transform="rotate(-18 5.2 10.2)"/><ellipse cx="9.4" cy="6.2" rx="2.1" ry="2.8" transform="rotate(-6 9.4 6.2)"/><ellipse cx="14.6" cy="6.2" rx="2.1" ry="2.8" transform="rotate(6 14.6 6.2)"/><ellipse cx="18.8" cy="10.2" rx="2.1" ry="2.7" transform="rotate(18 18.8 10.2)"/></svg>'

// Violett, Smaragd, Bernstein – die Farben der Tagesringe
const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#a78bfa', '#34d399']

function reducedMotion() {
  return typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** „+20“ steigt an der Stelle (z. B. über dem Häkchen) auf. */
export function floatPoints(x: number, y: number, text: string) {
  if (reducedMotion()) return
  const el = document.createElement('div')
  el.className = 'float-points text-indigo-600 dark:text-indigo-300'
  el.textContent = text
  el.style.left = `${x}px`
  el.style.top = `${y - 8}px`
  document.body.appendChild(el)
  window.setTimeout(() => el.remove(), 1200)
}

/** Pfotenabdrücke regnen von oben (ca. 1,5–2,5 s). */
export function pawConfetti(count = 28) {
  if (reducedMotion()) return
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div')
    const size = 12 + Math.random() * 14
    el.className = 'paw-confetti'
    el.innerHTML = PAW_SVG
    el.style.left = `${Math.random() * 100}vw`
    el.style.width = `${size}px`
    el.style.height = `${size}px`
    el.style.color = COLORS[i % COLORS.length]
    el.style.setProperty('--dx', `${(Math.random() - 0.5) * 120}px`)
    el.style.setProperty('--rot', `${(Math.random() - 0.5) * 540}deg`)
    el.style.setProperty('--dur', `${1.5 + Math.random()}s`)
    el.style.animationDelay = `${Math.random() * 0.4}s`
    document.body.appendChild(el)
    window.setTimeout(() => el.remove(), 3200)
  }
}

/** Nur einmal pro Tag und Anlass feiern (z. B. „alle Ringe geschlossen“). */
export function celebrateOnce(key: string, today: string, fn: () => void) {
  try {
    const k = `powerplan-celebrated-${key}`
    if (localStorage.getItem(k) === today) return
    localStorage.setItem(k, today)
  } catch {
    /* ohne Speicher: trotzdem feiern */
  }
  fn()
}

/** Katzenparade: lässt sofort `count` Katzen über den Bildschirm laufen (siehe CatWalker). */
export function triggerCatParade(count = 3) {
  window.dispatchEvent(new CustomEvent('powerplan-cats', { detail: count }))
}
