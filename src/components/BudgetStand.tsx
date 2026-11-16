import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight } from 'lucide-react'
import { useMemo } from 'react'
import { db, type Expense, type Space } from '../db'
import { occurrences } from '../lib/budget'
import { todayISO } from '../lib/date'
import { balances, formatEuro, settle } from '../lib/expenses'
import { addExpense, shortName } from '../lib/spaces'
import Avatar from './Avatar'
import { useToast } from './Toast'

const card = 'rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'

/**
 * „Wer schuldet wem“ im gemeinsamen Bereich: gemeinsame Ausgaben (halb-halb) plus gemeinsame Fixkosten,
 * die eine Person per Dauerauftrag zahlt (seit sie eingetragen sind, jeweils wenn fällig). Mit „Ausgleichen“.
 */
export default function BudgetStand({ space, people, me, expenses }: { space: Space; people: string[]; me?: string; expenses: Expense[] }) {
  const fixesRaw = useLiveQuery(() => db.budgetItems.where('spaceId').equals(space.id).filter((i) => i.kind === 'fix').toArray(), [space.id])
  const toast = useToast()
  const today = todayISO()
  const name = (p: string) => (p === me ? 'Ich' : shortName(p))

  // Fixkosten, die jemand privat bezahlt, wie Ausgaben behandeln (Anzahl der Fälligkeiten × Betrag)
  const fixPaid = useMemo(
    () =>
      (fixesRaw ?? [])
        .filter((f) => f.paidBy && !f.forPerson)
        .map((f) => ({ amount: f.amount * occurrences(f.createdAt.slice(0, 7), f.interval, today, f.day), paidBy: f.paidBy! }))
        .filter((f) => f.amount > 0),
    [fixesRaw, today],
  )
  const bal = useMemo(() => balances([...expenses, ...fixPaid], people), [expenses, fixPaid, people])
  const transfers = settle(bal)

  return (
    <section className={card}>
      <h2 className="font-semibold">Wer schuldet wem?</h2>
      {fixPaid.length > 0 && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">inkl. gemeinsamer Fixkosten, die eine Person per Dauerauftrag zahlt</p>}
      {people.length < 2 ? (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Lade jemanden ein (Reiter „Mitglieder“), dann teilt die App die Kosten automatisch.</p>
      ) : transfers.length === 0 ? (
        <p className="mt-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">✓ Alles ausgeglichen – niemand schuldet etwas.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {transfers.map((t) => (
            <li key={t.from + t.to} className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60">
              <Avatar email={t.from} me={me} size="sm" />
              <span className="font-medium">{name(t.from)}</span>
              <ArrowRight aria-hidden className="size-4 text-slate-400" />
              <Avatar email={t.to} me={me} size="sm" />
              <span className="font-medium">{name(t.to)}</span>
              <span className="ml-auto font-bold tabular-nums">{formatEuro(t.amount)}</span>
              <button
                onClick={async () => {
                  await addExpense(space, { title: 'Ausgleich', amount: t.amount, paidBy: t.from, to: t.to })
                  toast(`💸 ${name(t.from)} → ${name(t.to)}: ${formatEuro(t.amount)} ausgeglichen`)
                }}
                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                Ausgleichen
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
