import { useLiveQuery } from 'dexie-react-hooks'
import { Pencil, Plus, X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { db, type Expense, type Space } from '../db'
import { formatDayShort, todayISO } from '../lib/date'
import { centsToInput, formatEuro, parseEuro } from '../lib/expenses'
import { categoryOf, EXPENSE_CATEGORIES, expenseCategory, guessExpenseCategory } from '../lib/budget'
import BudgetStand from './BudgetStand'
import { softField } from '../lib/pillStyles'
import { addExpense, deleteExpense, shortName, updateExpense } from '../lib/spaces'
import { EditButtons } from './BudgetPanel'
import { OwnerBadge } from './OwnerSelect'
import Avatar from './Avatar'
import { SittingCat } from './Cats'
import { useToast } from './Toast'

const card = 'rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'

/**
 * Kosten teilen: Ausgaben eintragen (wer hat bezahlt), gleichmäßig auf alle verteilt.
 * Oben steht, wer wem wie viel schuldet – mit „Ausgleichen“-Knopf.
 */
export default function ExpensesPanel({
  space,
  people,
  me,
  showStand = true,
}: {
  space: Pick<Space, 'id' | 'realmId' | 'title'> & Partial<Space>
  people: string[]
  me?: string
  /** „Wer schuldet wem“ oben anzeigen (im Budget steht er in der Übersicht) */
  showStand?: boolean
}) {
  const expenses = useLiveQuery(() => db.expenses.where('spaceId').equals(space.id).toArray(), [space.id])
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(me ?? people[0] ?? '')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState(todayISO())
  const [filter, setFilter] = useState('alle')
  const [editId, setEditId] = useState<string>()
  const toast = useToast()
  const name = (p: string) => (p === me ? 'Ich' : shortName(p))

  const sorted = useMemo(
    () => [...(expenses ?? [])].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [expenses],
  )
  // Filter im Verlauf: alle oder eine Kategorie
  const shown = filter === 'alle' ? sorted : sorted.filter((e) => !e.to && categoryOf(e).id === filter)
  const usedCats = EXPENSE_CATEGORIES.filter((c) => sorted.some((e) => !e.to && categoryOf(e).id === c.id))
  // Ohne eigene Wahl: Kategorie aus dem Text raten
  const effectiveCat = category || (title.trim() ? guessExpenseCategory(title) : 'sonstiges')
  const month = todayISO().slice(0, 7)
  const spent = (expenses ?? []).filter((e) => !e.to)
  const total = spent.reduce((s, e) => s + e.amount, 0)
  const thisMonth = spent.filter((e) => e.date.startsWith(month)).reduce((s, e) => s + e.amount, 0)
  const cents = parseEuro(amount)

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !cents) return
    await addExpense(space, { title, amount: cents, paidBy: paidBy || me || people[0] || '', category: effectiveCat, date })
    setTitle('')
    setAmount('')
    setCategory('')
  }

  return (
    <div className="grid gap-4">
      {showStand && space.createdAt && <BudgetStand space={space as Space} people={people} me={me} expenses={expenses ?? []} />}

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
        <div className="flex flex-wrap items-center gap-2">
          <CategorySelect value={effectiveCat} onChange={setCategory} />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Datum" className={`${softField} !w-auto`} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {people.length > 1 && <span className="mr-1 text-xs text-slate-500 dark:text-slate-400">Bezahlt von</span>}
          {people.length > 1 && people.map((p) => (
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">
            Verlauf{' '}
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              diesen Monat {formatEuro(thisMonth)} · insgesamt {formatEuro(total)}
            </span>
          </h2>
          {usedCats.length > 1 && (
            <div className="flex flex-wrap gap-1 text-xs">
              {[['alle', 'Alle'] as const, ...usedCats.map((c) => [c.id, `${c.emoji} ${c.label}`] as const)].map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setFilter(v)}
                  aria-pressed={filter === v}
                  className={`rounded-full px-2.5 py-1 font-medium ${
                    filter === v ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        {filter !== 'alle' && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {expenseCategory(filter).emoji} {expenseCategory(filter).label}: {formatEuro(shown.reduce((s, e) => s + e.amount, 0))}
          </p>
        )}
        {expenses && sorted.length === 0 && (
          <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            <SittingCat className="mx-auto mb-2 w-12 text-slate-300 dark:text-slate-600" />
            Noch keine Ausgaben.
          </div>
        )}
        <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
          {shown.map((e) => (
            editId === e.id ? (
              <li key={e.id} className="py-2">
                <ExpenseEditor expense={e} people={people} me={me} onClose={() => setEditId(undefined)} />
              </li>
            ) : (
            <li key={e.id} className="group flex items-center gap-3 py-2 text-sm">
              <Avatar email={e.paidBy} me={me} size="sm" />
              <button onClick={() => setEditId(e.id)} className="min-w-0 flex-1 text-left" title="Bearbeiten">
                <p className="truncate font-medium">
                  {e.to ? `💸 Ausgleich an ${name(e.to)}` : `${categoryOf(e).emoji} ${e.title}`}
                  <OwnerBadge owner={e.forPerson} me={me} />
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatDayShort(e.date)}
                  {people.length > 1 && ` · ${name(e.paidBy)} hat bezahlt`}
                </p>
              </button>
              <button
                onClick={() => setEditId(e.id)}
                aria-label="Eintrag bearbeiten"
                className="rounded-md p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-indigo-600 focus:opacity-100 max-md:opacity-100"
              >
                <Pencil className="size-3.5" />
              </button>
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
            )
          ))}
        </ul>
      </section>
    </div>
  )
}

/** Eintrag bearbeiten: Wofür, Betrag, wer bezahlt hat, Datum (bei Ausgleich: an wen) */
function ExpenseEditor({ expense, people, me, onClose }: { expense: Expense; people: string[]; me?: string; onClose: () => void }) {
  const [title, setTitle] = useState(expense.title)
  const [amount, setAmount] = useState(centsToInput(expense.amount))
  const [paidBy, setPaidBy] = useState(expense.paidBy)
  const [to, setTo] = useState(expense.to ?? '')
  const [date, setDate] = useState(expense.date)
  const [category, setCategory] = useState(categoryOf(expense).id)
  const cents = parseEuro(amount)
  const everyone = Array.from(new Set([...people, expense.paidBy, ...(expense.to ? [expense.to] : [])]))
  const name = (p: string) => (p === me ? 'Ich' : shortName(p))
  const transfer = !!expense.to
  const valid = !!cents && !!date && (transfer ? !!to && to !== paidBy : !!title.trim())

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!valid) return
    await updateExpense(expense.id, { amount: cents, paidBy, date, ...(transfer ? { to } : { title: title.trim(), category }) })
    onClose()
  }

  return (
    <form onSubmit={save} onKeyDown={(e) => e.key === 'Escape' && onClose()} className="grid gap-2 rounded-xl bg-indigo-50/50 p-2 ring-1 ring-indigo-200 dark:bg-indigo-500/10 dark:ring-indigo-500/30">
      <div className="flex flex-wrap gap-2">
        {!transfer && <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Wofür" className={`${softField} min-w-0 flex-[2_1_9rem]`} />}
        <input
          autoFocus={transfer}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          aria-label="Betrag in Euro"
          className={`${softField} flex-[1_1_5rem] text-right tabular-nums ${amount && !cents ? '!ring-rose-400' : ''}`}
        />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Datum" className={`${softField} !w-auto`} />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        {(transfer || people.length > 1) && (transfer ? 'Von' : 'Bezahlt von')}
        {(transfer || people.length > 1) && <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} aria-label={transfer ? 'Von' : 'Bezahlt von'} className={`${softField} !w-auto`}>
          {everyone.map((p) => (
            <option key={p} value={p}>
              {name(p)}
            </option>
          ))}
        </select>}
        {!transfer && <CategorySelect value={category} onChange={setCategory} />}
        {transfer && (
          <>
            an
            <select value={to} onChange={(e) => setTo(e.target.value)} aria-label="An" className={`${softField} !w-auto`}>
              {everyone.map((p) => (
                <option key={p} value={p}>
                  {name(p)}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
      <EditButtons onClose={onClose} disabled={!valid} />
    </form>
  )
}

/** Kategorie einer Ausgabe */
export function CategorySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Kategorie" className={`${softField} !w-auto`}>
      {EXPENSE_CATEGORIES.map((c) => (
        <option key={c.id} value={c.id}>
          {c.emoji} {c.label}
        </option>
      ))}
    </select>
  )
}
