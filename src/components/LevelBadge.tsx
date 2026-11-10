import { Link } from 'react-router-dom'
import { useGame } from '../lib/gameContext'

/** Kompakte Level-Anzeige mit Mini-Balken; Klick führt zur Statistik. */
export default function LevelBadge({ className = '' }: { className?: string }) {
  const { level, loaded } = useGame()
  if (!loaded) return null
  return (
    <Link
      to="/statistik"
      title={`Noch ${level.needed - level.into} Punkte bis Level ${level.level + 1}`}
      className={`block rounded-xl px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 ${className}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">
          <span aria-hidden>⭐</span> Level {level.level}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">{level.title}</span>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={level.needed}
        aria-valuenow={level.into}
        aria-label={`Fortschritt zu Level ${level.level + 1}`}
      >
        <div className="h-full rounded-full bg-amber-400 transition-all duration-700" style={{ width: `${level.pct}%` }} />
      </div>
      <div className="mt-1 text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
        {level.into} / {level.needed} Punkte
      </div>
    </Link>
  )
}
