import { byCategory } from '../lib/budget'
import { formatEuro } from '../lib/expenses'

const card = 'rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'

/** Ausgaben des Monats nach Kategorie – waagerechte Balken, größte zuerst */
export default function CategoryBars({
  expenses,
  month,
  title = 'Wofür diesen Monat?',
}: {
  expenses: { amount: number; date: string; to?: string; category?: string; title?: string }[]
  month: string
  title?: string
}) {
  const rows = byCategory(expenses, month)
  const max = rows[0]?.amount ?? 0
  return (
    <section className={card}>
      <h2 className="font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Noch keine Ausgaben in diesem Monat.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {rows.map((r) => (
            <li key={r.category.id} className="grid grid-cols-[8.5rem_1fr_auto] items-center gap-2 text-sm">
              <span className="truncate">
                {r.category.emoji} {r.category.label}
              </span>
              <span className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <span className="block h-full rounded-full bg-indigo-500" style={{ width: `${Math.max(3, (r.amount / max) * 100)}%` }} />
              </span>
              <span className="font-semibold tabular-nums">{formatEuro(r.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
