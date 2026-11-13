import { useEffect, useRef, useState } from 'react'
import { addDays, formatDayShort } from '../lib/date'
import { weekStart } from '../lib/points'
import { SittingCat } from './Cats'

/*
 * Jahres-Heatmap: jedes Kästchen ein Tag, je dunkler, desto mehr Punkte.
 * 53 Wochen-Spalten (Mo oben … So unten), endet mit der laufenden Woche.
 * Eine Farbe (Violett), hell → dunkel; im Dunkel-Modus umgekehrt dunkel → hell.
 */

const LEVELS = [
  'bg-slate-100 dark:bg-slate-800/70',
  'bg-violet-200 dark:bg-violet-900',
  'bg-violet-300 dark:bg-violet-700',
  'bg-violet-500 dark:bg-violet-500',
  'bg-violet-700 dark:bg-violet-300',
]
const STEPS = [1, 20, 50, 100] // ab so vielen Punkten: Stufe 1, 2, 3, 4

function level(points: number) {
  let l = 0
  STEPS.forEach((s, i) => {
    if (points >= s) l = i + 1
  })
  return l
}

const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

export default function YearHeatmap({ byDay, today, protectedDays = [] }: { byDay: Map<string, number>; today: string; protectedDays?: string[] }) {
  const scroller = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<string | null>(null)
  const shielded = new Set(protectedDays)

  const lastMonday = weekStart(today)
  const firstMonday = addDays(lastMonday, -52 * 7)
  const weeks = Array.from({ length: 53 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(firstMonday, w * 7 + d)))

  let activeDays = 0
  for (const week of weeks) for (const d of week) if (d <= today && (byDay.get(d) ?? 0) > 0) activeDays++

  // Auf dem Handy ans Ende (heute) scrollen
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth
  }, [])

  const hoverPts = hover ? (byDay.get(hover) ?? 0) : 0

  return (
    <section className="relative mt-10 mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      {/* Katze sitzt oben auf der Karte und wedelt */}
      <SittingCat className="absolute -top-[46px] right-6 w-10 text-slate-400 dark:text-slate-500" />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Dein Jahr</h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">{activeDays} aktive Tage in den letzten 12 Monaten</span>
      </div>

      <div ref={scroller} className="mt-4 overflow-x-auto pb-1">
        <div className="inline-grid grid-flow-col gap-[3px]" style={{ gridTemplateRows: 'auto repeat(7, 11px)' }}>
          {/* Wochentage links */}
          <span />
          {['Mo', '', 'Mi', '', 'Fr', '', ''].map((l, i) => (
            <span key={i} className="pr-1 text-[9px] leading-[11px] text-slate-400">
              {l}
            </span>
          ))}
          {weeks.map((week, w) => {
            const first = week[0]
            const showMonth = w === 0 || first.slice(5, 7) !== weeks[w - 1][0].slice(5, 7)
            return [
              <span key={`m${w}`} className="h-3 text-[9px] leading-3 whitespace-nowrap text-slate-400">
                {showMonth ? MONTHS[Number(first.slice(5, 7)) - 1] : ''}
              </span>,
              ...week.map((d) => {
                const future = d > today
                const pts = byDay.get(d) ?? 0
                return (
                  <span
                    key={d}
                    title={future ? undefined : `${formatDayShort(d)}: ${pts} Punkte${shielded.has(d) ? ' · 🛡️ Streak-Schutz' : ''}`}
                    onMouseEnter={() => !future && setHover(d)}
                    onClick={() => !future && setHover(d)}
                    className={`size-[11px] rounded-[3px] ${future ? 'opacity-0' : LEVELS[level(pts)]} ${
                      shielded.has(d) ? 'ring-1 ring-sky-400' : ''
                    } ${d === today ? 'ring-1 ring-slate-900 dark:ring-white' : ''}`}
                  />
                )
              }),
            ]
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="min-h-4">{hover ? `${formatDayShort(hover)}: ${hoverPts} Punkte${shielded.has(hover) ? ' · 🛡️ Streak-Schutz genutzt' : ''}` : 'Tippe auf einen Tag für Details.'}</span>
        <span className="flex items-center gap-1" aria-label="Legende: weniger bis mehr Punkte">
          weniger
          {LEVELS.map((c) => (
            <span key={c} className={`size-[11px] rounded-[3px] ${c}`} />
          ))}
          mehr
        </span>
      </div>
    </section>
  )
}
