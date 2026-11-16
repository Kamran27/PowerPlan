import { useLiveQuery } from 'dexie-react-hooks'
import { Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { db, type Space } from '../db'
import { fixTotals, goalPct } from '../lib/budget'
import { todayISO } from '../lib/date'
import { formatEuro } from '../lib/expenses'
import BudgetStand from './BudgetStand'
import { Stat } from './BudgetPanel'
import CategoryBars from './CategoryBars'

const card = 'rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'

/**
 * Übersicht im gemeinsamen Budget: dieser Monat auf einen Blick, wer wem was schuldet,
 * wofür das Geld ging (Kategorien) und die gemeinsamen Sparziele.
 */
export default function BudgetOverview({ space, people, me }: { space: Space; people: string[]; me?: string }) {
  const expenses = useLiveQuery(() => db.expenses.where('spaceId').equals(space.id).toArray(), [space.id]) ?? []
  const items = useLiveQuery(() => db.budgetItems.where('spaceId').equals(space.id).toArray(), [space.id]) ?? []
  const month = todayISO().slice(0, 7)
  // Gemeinsam = ohne Person (ältere „nur …“-Einträge zählen hier nicht mit)
  const fixes = items.filter((i) => i.kind === 'fix' && !i.forPerson)
  const goals = items.filter((i) => i.kind === 'goal')
  const shared = expenses.filter((e) => !e.forPerson)
  const fixMonth = fixTotals(fixes).month
  const spentMonth = shared.filter((e) => !e.to && e.date.startsWith(month)).reduce((s, e) => s + e.amount, 0)
  const n = Math.max(1, people.length)

  return (
    <div className="grid gap-4">
      <section className={`${card} grid grid-cols-2 gap-3 sm:grid-cols-4`}>
        <Stat label="Fixkosten / Monat" value={formatEuro(fixMonth)} />
        <Stat label="Ausgaben diesen Monat" value={formatEuro(spentMonth)} />
        <Stat label="Gesamt diesen Monat" value={formatEuro(fixMonth + spentMonth)} />
        <Stat label="Je Person" value={formatEuro(Math.round((fixMonth + spentMonth) / n))} hint={n > 1 ? `bei ${n} Personen` : undefined} />
      </section>

      <BudgetStand space={space} people={people} me={me} expenses={expenses} />

      <CategoryBars expenses={shared} month={month} />

      {goals.length > 0 && (
        <section className={card}>
          <h2 className="font-semibold">Sparziele</h2>
          <ul className="mt-3 grid gap-2">
            {goals.map((g) => {
              const pct = goalPct(g.saved ?? 0, g.amount)
              return (
                <li key={g.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-sm">
                  <span className="truncate font-medium">{g.title}</span>
                  <span className="tabular-nums text-slate-500 dark:text-slate-400">
                    {formatEuro(g.saved ?? 0)} / {formatEuro(g.amount)}
                  </span>
                  <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <span className={`block h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <Link
        to="/mein-budget"
        className="flex items-center gap-3 rounded-2xl bg-sky-50 p-4 text-sm ring-1 ring-sky-200 hover:bg-sky-100 dark:bg-sky-500/10 dark:ring-sky-500/30 dark:hover:bg-sky-500/20"
      >
        <Wallet aria-hidden className="size-5 shrink-0 text-sky-600 dark:text-sky-300" />
        <span>
          <strong>Persönliche Ausgaben?</strong> Die gehören in <strong>„Mein Budget“</strong> – nur für dich sichtbar, mit deinem Anteil von hier automatisch dabei. →
        </span>
      </Link>
    </div>
  )
}
