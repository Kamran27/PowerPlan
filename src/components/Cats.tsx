/*
 * Katzen – minimal und elegant: feine Linien in der aktuellen Textfarbe (currentColor),
 * damit sie hell/dunkel automatisch passen. Rein dekorativ (aria-hidden).
 */

const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

/** Katze, die über eine Kante schaut (Kopf, Ohren, zwei Pfoten). Blinzelt ab und zu. */
export function PeekingCat({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 26" aria-hidden className={className}>
      {/* Kopf mit Ohren */}
      <path {...line} d="M9.5 25 L10 13 L12 4 L18.5 9.5 Q24 8 29.5 9.5 L36 4 L38 13 L38.5 25" />
      {/* Augen (blinzeln) */}
      <g className="cat-blink">
        <path {...line} d="M18 16.2 q1.6 -1.6 3.2 0" />
        <path {...line} d="M26.8 16.2 q1.6 -1.6 3.2 0" />
      </g>
      {/* Nase und Mund */}
      <path {...line} strokeWidth={1.3} d="M23 19.2 l1 0.9 l1 -0.9 M24 20.1 v1 q-1.2 1 -2.4 0.2 M24 21.1 q1.2 1 2.4 0.2" />
      {/* Schnurrhaare */}
      <path {...line} strokeWidth={1} d="M16 20 l-6 -1 M16 21.6 l-6 0.8 M32 20 l6 -1 M32 21.6 l6 0.8" />
      {/* Pfoten über der Kante */}
      <path {...line} d="M11.5 25.5 q3.5 -4.2 7 0 M29.5 25.5 q3.5 -4.2 7 0" />
    </svg>
  )
}

/** Eingerollte, schlafende Katze – für leere Listen („Nichts zu tun – Zeit für ein Nickerchen“). */
export function SleepingCat({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 72 40" aria-hidden className={className}>
      {/* Körper, eingerollt */}
      <path {...line} d="M22 21.5 C30 13 50 13 58 22 C62.5 27 61 35 52 35.5 L20 35.5" />
      {/* Kopf, auf den Pfoten liegend */}
      <path {...line} d="M10.5 31 C9 24.5 12.5 20.5 18 20.3 C23.5 20.1 27 24 26.2 29.5 C25.6 33.5 22.5 35.6 18 35.6 C14.2 35.6 11.4 34 10.5 31 Z" />
      {/* Ohren */}
      <path {...line} d="M12.2 23.2 L11.6 16.8 L16.4 20.4 M20.4 20.4 L24.6 16.6 L25 23" />
      {/* geschlossene Augen */}
      <path {...line} strokeWidth={1.3} d="M14.2 27.6 q1.5 1.3 3 0 M19.6 27.6 q1.5 1.3 3 0" />
      {/* Schwanz um den Körper gelegt */}
      <path {...line} d="M52 35.5 C60 35.5 66 31 63.5 25.5 C62.5 23.5 60 23.8 60.3 26" />
      {/* Zzz */}
      <path {...line} strokeWidth={1.2} className="cat-zzz" d="M31 9 h4 l-4 4.5 h4 M38 4 h3 l-3 3.5 h3" />
    </svg>
  )
}

/** Pfotenabdruck (gefüllt) – für Konfetti und kleine Akzente. */
export function PawPrint({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <ellipse cx="12" cy="16" rx="5.2" ry="4.4" />
      <ellipse cx="5.2" cy="10.2" rx="2.1" ry="2.7" transform="rotate(-18 5.2 10.2)" />
      <ellipse cx="9.4" cy="6.2" rx="2.1" ry="2.8" transform="rotate(-6 9.4 6.2)" />
      <ellipse cx="14.6" cy="6.2" rx="2.1" ry="2.8" transform="rotate(6 14.6 6.2)" />
      <ellipse cx="18.8" cy="10.2" rx="2.1" ry="2.7" transform="rotate(18 18.8 10.2)" />
    </svg>
  )
}
