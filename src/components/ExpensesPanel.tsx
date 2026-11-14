import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight, Plus, X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { db, type Space } from '../db'
import { formatDayShort, todayISO } from '../lib/date'
import { balances, formatEuro, parseEuro, settle } from '../lib/expenses'
import { softField } from '../lib/pillStyles'
import { addExpense, deleteExpense, shortName } from '../lib/spaces'
import Avatar from './Avatar'
import { SittingCat } from './Cats'
import { useToast } from './Toast'

const card = 'rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'

/**
 * Kosten teilen: Ausgaben eintragen (wer hat bezahlt), gleichmäßig auf alle verteilt.
 * Oben steht, wer wem wie viel schuldet – mit „Ausgleichen“-Knopf.
 */
export default function ExpensesPanel({ space, people, me }: { space: Space; people: string[]; me?: string }) {
  const expenses = useLiveQuery(() => db.expenses.where('spaceId').equals(space.id).toArray(), [space.id])
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(me ?? people[0] ?? '')
  const toast = useToast()
  const name = (p: string) => (p === me ? 'Ich' : shortName(p))

  const sorted = useMemo(
    () => [...(expenses ?? [])].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [expenses],
  )
  const bal = useMemo(() => balances(expenses ?? [], people), [expenses, people])
  const transfers = settle(bal)
  const month = todayISO().slice(0, 7)
  const spent = (expenses ?? []).filter((e) => !e.to)
  const total = spent.reduce((s, e) => s + e.amount, 0)
  const thisMonth = spent.filter((e) => e.date.startsWith(month)).reduce((s, e) => s + e.amount, 0)
  const cents = parseEuro(amount)

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !cents) return
    await addExpense(space, { title, amount: cents, paidBy: paidBy || me || people[0] })
    setTitle('')
    setAmount('')
  }

  return (
    <div className="grid gap-4">
      {/* Stand: wer schuldet wem */}
      <section className={card}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Stand</h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Diesen Monat {formatEuro(thisMonth)} · insgesamt {formatEuro(total)}
          </span>
        </div>
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

      {/* Neue Ausgabe */}
      <form onSubmit={add} className={`${card} grid gap-2`}>
        <h2 className="font-semibold">Neue Ausgabe</h2>
        <div className="flex flex-wrap gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Wofür? z. B. Supermarkt" aria-label="Wofür" className={`${softField} min-w-0 flex-[2_1_10rem]`} />
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00 €"
            inputMode="decimal"
            aria-label="Betrag in Euro"
            className={`${softField} flex-[1_1_6rem] text-right tabular-nums ${amount && !cents ? '!ring-rose-400' : ''}`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-slate-500 dark:text-slate-400">Bezahlt von</span>
          {people.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPaidBy(p)}
              aria-pressed={paidBy === p}
              className={`flex items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-0.5 text-xs font-medium transition ${
                paidBy === p ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <Avatar email={p} me={me} size="sm" />
              {name(p)}
            </button>
          ))}
          <button
            type="submit"
            disabled={!title.trim() || !cents}
            className="ml-auto flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 hover:bg-indigo-500 active:scale-95 disabled:opacity-40"
          >
            <Plus aria-hidden className="size-4" /> Eintragen
          </button>
        </div>
        {people.length > 1 && cents && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Wird aufgeteilt: je {formatEuro(Math.round(cents / people.length))} pro Person
          </p>
        )}
      </form>

      {/* Verlauf */}
      <section className={card}>
        <h2 className="font-semibold">Verlauf</h2>
        {expenses && sorted.length === 0 && (
          <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            <SittingCat className="mx-auto mb-2 w-12 text-slate-300 dark:text-slate-600" />
            Noch keine Ausgaben.
          </div>
        )}
        <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
          {sorted.map((e) => (
            <li key={e.id} className="group flex items-center gap-3 py-2 text-sm">
              <Avatar email={e.paidBy} me={me} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{e.to ? `💸 Ausgleich an ${name(e.to)}` : e.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatDayShort(e.date)} · {name(e.paidBy)} hat bezahlt
                </p>
              </div>
              <span className={`font-semibold tabular-nums ${e.to ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>{formatEuro(e.amount)}</span>
              <button
                onClick={async () => {
                  await deleteExpense(e.id)
                  toast('Eintrag gelöscht', { label: 'Rückgängig', onClick: () => db.expenses.put(e).then(() => {}) })
                }}
                aria-label="Eintrag löschen"
                className="rounded-md p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-rose-600 focus:opacity-100 max-md:opacity-100"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
