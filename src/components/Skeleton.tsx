/** Lade-Platzhalter: graue, sanft pulsierende Zeilen in der Form der kommenden Liste. */
export default function Skeleton({ rows = 3, className = '' }: { rows?: number; className?: string }) {
  return (
    <div role="status" aria-label="Wird geladen" className={`grid gap-2 py-2 ${className}`}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton flex items-center gap-3 rounded-xl px-3 py-2.5">
          <span className="size-5 shrink-0 rounded-md bg-slate-200 dark:bg-slate-800" />
          <span className="h-3.5 rounded-full bg-slate-200 dark:bg-slate-800" style={{ width: `${70 - i * 12}%` }} />
        </div>
      ))}
    </div>
  )
}
