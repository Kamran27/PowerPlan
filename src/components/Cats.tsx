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

/** Sitzende Katze von vorn – der Schwanz wedelt sanft. */
export function SittingCat({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 52" aria-hidden className={className}>
      {/* Schwanz (bewegt sich) */}
      <path {...line} className="cat-tail" d="M28.5 47.5 C37 47.5 40.5 40 37.5 33.5 C36 30.5 32.5 31 33.2 34" />
      {/* Körper */}
      <path {...line} d="M13.5 26.5 C8.5 33.5 9 45.5 12.2 49.5 L28.8 49.5 C32 45.5 32.5 33.5 27.5 26.5" />
      {/* Kopf mit Ohren */}
      <path {...line} d="M11.2 19 L10.2 6.5 L16.6 11.6 Q20.5 10.6 24.4 11.6 L30.8 6.5 L29.8 19 Q31.2 27.2 20.5 27.6 Q9.8 27.2 11.2 19 Z" />
      {/* fröhliche Augen, Nase */}
      <g className="cat-blink">
        <path {...line} strokeWidth={1.3} d="M15.4 18.6 q1.5 -1.6 3 0 M22.6 18.6 q1.5 -1.6 3 0" />
      </g>
      <path {...line} strokeWidth={1.2} d="M19.5 21.6 l1 0.8 l1 -0.8" />
      {/* Vorderpfoten */}
      <path {...line} d="M14 49.5 q2.6 -3.2 5.2 0 M21.8 49.5 q2.6 -3.2 5.2 0" />
    </svg>
  )
}

/** Nur ein Katzenschwanz, der unter einer Karte heraushängt und pendelt – die Katze versteckt sich. */
export function HangingTail({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 42" aria-hidden className={className}>
      <path {...line} strokeWidth={2.2} className="cat-tail-hang" d="M9 0 C9 9 4.5 15 6 23 C7.6 31.5 15 32 14.2 26.4 C13.8 23.8 11 24.6 11.6 26.6" />
    </svg>
  )
}

/** Laufende Katze im Profil – die Beine bewegen sich abwechselnd. */
export function WalkingCat({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 34" aria-hidden className={className}>
      {/* Schwanz nach oben */}
      <path {...line} className="cat-tail" d="M14.5 14.5 C8 13.5 5 8 8.2 3" />
      {/* Rücken, Hinterteil, Bauch */}
      <path {...line} d="M14.5 14.5 C19 10.5 33 10 41 13 M14.5 14.5 C11.5 17.5 12.5 23 16.5 24.2 C24 26 33 26 40.5 23" />
      {/* Kopf mit Ohren */}
      <path {...line} d="M40.5 13 C40.2 8.4 43.2 6 46.4 6.2 L48.6 1.8 L50.6 6.8 C53.6 7.8 55.2 10.6 54.4 13.8 C53.6 17.4 49.6 19 45.8 18.6 C42.8 18.3 40.9 16 40.5 13 Z M44 6.8 L44.6 2.6 L46.4 6.2" />
      <circle cx="49.4" cy="11.6" r="0.9" fill="currentColor" />
      <path {...line} strokeWidth={1} d="M54 14 l4 -0.6 M54 15.4 l4 0.6" />
      {/* Beine (zwei Gruppen im Wechsel) */}
      <g className="cat-legs-a">
        <path {...line} d="M38 22.5 L39.5 31 M18.5 24 L17 31" />
      </g>
      <g className="cat-legs-b">
        <path {...line} d="M34 24 L32.5 31 M22.5 25 L24 31" />
      </g>
    </svg>
  )
}
