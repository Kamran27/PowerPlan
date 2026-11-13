/*
 * Tagesringe: drei Ringe, die sich im Laufe des Tages schließen (Aufgaben, Routinen, Fokus).
 * Reines SVG, Füllstand animiert. Ein voller Ring ist das Tagesziel.
 */

export interface Ring {
  label: string
  /** Erreichter Anteil 0…1 (darf > 1 sein, wird gekappt) */
  value: number
  /** Text daneben, z. B. „3 / 5“ */
  detail: string
  /** Tailwind-Farbklassen für Ring (stroke) und Hintergrundspur */
  color: string
  track: string
  dot: string
}

const SIZE = 128
const WIDTH = 11
const GAP = 3

export default function DayRings({ rings }: { rings: Ring[] }) {
  return (
    <div className="flex items-center gap-5">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={rings.map((r) => `${r.label}: ${r.detail}`).join(', ')}
        className="shrink-0 -rotate-90"
      >
        {rings.map((r, i) => {
          const radius = SIZE / 2 - WIDTH / 2 - i * (WIDTH + GAP)
          const c = 2 * Math.PI * radius
          const pct = Math.min(1, Math.max(0, r.value))
          return (
            <g key={r.label}>
              <circle cx={SIZE / 2} cy={SIZE / 2} r={radius} fill="none" strokeWidth={WIDTH} className={r.track} />
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={radius}
                fill="none"
                strokeWidth={WIDTH}
                strokeLinecap="round"
                strokeDasharray={c}
                // ganz leer: kein Punkt sichtbar lassen
                strokeDashoffset={pct === 0 ? c : c * (1 - pct)}
                className={`${r.color} transition-[stroke-dashoffset] duration-700 ease-out`}
              />
            </g>
          )
        })}
      </svg>
      <ul className="grid gap-1.5 text-sm">
        {rings.map((r) => (
          <li key={r.label} className="flex items-center gap-2">
            <span className={`size-2.5 rounded-full ${r.dot}`} aria-hidden />
            <span className="text-slate-600 dark:text-slate-300">{r.label}</span>
            <strong className="font-semibold tabular-nums">{r.detail}</strong>
            {r.value >= 1 && <span aria-label="geschafft">✓</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
