import { haptic } from './useIsMobile'
import { pawConfetti } from './celebrate'

/*
 * Alle Katzen sind antippbar – auf jeder Seite. Statt jede Katze einzeln zu verdrahten,
 * hört ein einziger Klick-Lauscher auf Elemente mit `data-cat` (siehe components/Cats.tsx).
 * Jede Pose reagiert anders; die Sprechblase erscheint über der Katze.
 * Jede 10. Streicheleinheit: kleiner Pfotenregen.
 */

const SAYINGS: Record<string, string[]> = {
  peeking: ['Miau!', 'Mrrr…', 'Miau? 🐾', 'Prrr ♥', 'Kuckuck!'],
  sitting: ['Miau!', 'Prrr ♥', 'Mrrr…', 'Streicheln? 😺', 'Weiter so! 🐾'],
  sleeping: ['Zzz… 😴', 'Psst, ich schlafe', '*schnarch*', 'Noch 5 Minuten…', 'Mrrmpf…'],
  loaf: ['Ich bin ein Brot 🍞', 'Prrr…', 'Gemütlich hier', 'Mrrr ♥'],
  tail: ['Erwischt! 🙈', 'Hihi 🐾', 'Psst… versteckt!', 'Miau?'],
  walking: ['Bin unterwegs! 🐾', 'Miau!', 'Tschüss! 👋', 'Hab’s eilig'],
}

/** Animation pro Pose (Klassen in index.css) */
const MOVES: Record<string, string> = {
  peeking: 'cat-duck',
  sitting: 'cat-hop',
  sleeping: 'cat-stretch',
  loaf: 'cat-wiggle',
  tail: 'cat-swish',
  walking: 'cat-hop',
}

let count = 0

function reducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function bubble(target: Element, text: string) {
  const r = target.getBoundingClientRect()
  const el = document.createElement('div')
  el.className =
    'cat-bubble pointer-events-none fixed z-[60] -translate-x-1/2 rounded-full bg-white px-2 py-0.5 text-xs font-medium whitespace-nowrap text-slate-700 shadow ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700'
  el.textContent = text
  el.style.left = `${Math.min(window.innerWidth - 50, Math.max(50, r.left + r.width / 2))}px`
  el.style.top = `${Math.max(4, r.top - 26)}px`
  document.body.appendChild(el)
  window.setTimeout(() => el.remove(), 1700)
}

function move(target: Element, cls: string) {
  if (reducedMotion()) return
  target.classList.remove(cls)
  // Neu starten, auch bei schnellem Doppeltippen
  void (target as HTMLElement).getBoundingClientRect()
  target.classList.add(cls)
  target.addEventListener('animationend', () => target.classList.remove(cls), { once: true })
}

export function petCat(target: Element) {
  const pose = target.getAttribute('data-cat') ?? 'sitting'
  const lines = SAYINGS[pose] ?? SAYINGS.sitting
  haptic(8)
  count++
  bubble(target, count % 10 === 0 ? `${count}× gestreichelt ♥` : lines[Math.floor(Math.random() * lines.length)])
  move(target, MOVES[pose] ?? 'cat-hop')
  if (count % 10 === 0) pawConfetti(14)
}

/** Einmal beim Start aufrufen (main.tsx) */
export function installCatPetting() {
  document.addEventListener('click', (e) => {
    const cat = (e.target as Element | null)?.closest?.('[data-cat]')
    if (cat) petCat(cat)
  })
}
