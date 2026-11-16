import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import BudgetPanel, { Stat } from '../components/BudgetPanel'
import CategoryBars from '../components/CategoryBars'
import ExpensesPanel from '../components/ExpensesPanel'
import PageHeader from '../components/PageHeader'
import { useToast } from '../components/Toast'
import { db } from '../db'
import { fixTotals, perPersonMonth, PERSONAL_SPACE_ID } from '../lib/budget'
import { todayISO } from '../lib/date'
import { centsToInput, formatEuro, parseEuro } from '../lib/expenses'
import { addBudgetItem, assignableEmails, deleteBudgetItem, migratePersonalBudget, PERSONAL_SPACE, updateBudgetItem } from '../lib/spaces'
import { useMyEmail } from '../lib/useMe'

const card = 'rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * „Mein Budget“ – nur für mich sichtbar (Einträge ohne Realm bleiben privat).
 * Persönliche Fixkosten und Ausgaben, dazu automatisch mein Anteil an den gemeinsamen Budget-Bereichen,
 * und ein Monatsbudget mit Balken.
 */
export default function MeinBudget() {
  const me = useMyEmail()
  const toast = useToast()
  const [month, setMonth] = useState(todayISO().slice(0, 7))
  const items = useLiveQuery(() => db.budgetItems.where('spaceId').equals(PERSONAL_SPACE_ID).toArray(), [])
  const expenses = useLiveQuery(() => db.expenses.where('spaceId').equals(PERSONAL_SPACE_ID).toArray(), [])

  // Gemeinsame Budget-Bereiche: mein Anteil (Fixkosten + Ausgaben des Monats)
  const shared = useLiveQuery(async () => {
    const spaces = (await db.spaces.toArray()).filter((s) => s.kind === 'budget')
    return Promise.all(
      spaces.map(async (s) => ({
        space: s,
        members: (await db.members.where('realmId').equals(s.realmId).toArray()).map((m) => m.email),
        items: await db.budgetItems.where('spaceId').equals(s.id).toArray(),
        expenses: await db.expenses.where('spaceId').equals(s.id).toArray(),
      })),
    )
  }, [])

  // Umzug alter „nur ich“-Einträge aus dem Gemeinsamen
  useEffect(() => {
    if (!me) return
    migratePersonalBudget(me).then((n) => n && toast(`👤 ${n} persönliche ${n === 1 ? 'Position' : 'Positionen'} hierher verschoben`))
  }, [me, toast])

  const fixes = (items ?? []).filter((i) => i.kind === 'fix')
  const limit = (items ?? []).find((i) => i.kind === 'limit')
  const fixMonth = fixTotals(fixes).month
  const spentMonth = (expenses ?? []).filter((e) => !e.to && e.date.startsWith(month)).reduce((s, e) => s + e.amount, 0)

  const sharedShares = useMemo(
    () =>
      (shared ?? []).map((x) => {
        const people = assignableEmails(x.space, x.members)
        const row = me ? perPersonMonth(people, x.items.filter((i) => i.kind === 'fix' && !i.forPerson), x.expenses, month).find((r) => r.person === me) : undefined
        return { space: x.space, amount: row?.total ?? 0 }
      }),
    [shared, me, month],
  )
  const sharedTotal = sharedShares.reduce((s, x) => s + x.amount, 0)
  const total = fixMonth + spentMonth + sharedTotal
  const [y, m] = month.split('-').map(Number)
  const isNow = month === todayISO().slice(0, 7)

  return (
    <div className="max-w-3xl">
      <PageHeader title="Mein Budget" subtitle="Deine persönlichen Fixkosten und Ausgaben – nur für dich sichtbar." cat="loaf" />

      <div className="grid gap-4">
        {/* Monat */}
        <section className={card}>
          <div className="flex items-center justify-between gap-2">
            <button onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Vorheriger Monat" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              <ChevronLeft className="size-5" />
            </button>
            <h2 className="font-semibold">
              {MONTHS[m - 1]} {y}
            </h2>
            <button
              onClick={() => setMonth(shiftMonth(month, 1))}
              disabled={isNow}
              aria-label="Nächster Monat"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Meine Fixkosten" value={formatEuro(fixMonth)} />
            <Stat label="Meine Ausgaben" value={formatEuro(spentMonth)} />
            <Stat label="Anteil Gemeinsam" value={formatEuro(sharedTotal)} hint={sharedShares.length ? sharedShares.map((x) => x.space.title).join(', ') : 'kein Budget-Bereich'} />
            <Stat label="Gesamt" value={formatEuro(total)} />
          </div>
          <LimitBar limit={limit} total={total} />
          {sharedShares.length > 0 && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Anteil Gemeinsam = deine Hälfte der gemeinsamen Fixkosten und Ausgaben in{' '}
              {sharedShares.map((x, i) => (
                <span key={x.space.id}>
                  {i > 0 && ', '}
                  <Link to={`/gemeinsam/${encodeURIComponent(x.space.id)}`} className="text-indigo-600 hover:underline dark:text-indigo-400">
                    {x.space.emoji ?? '💶'} {x.space.title}
                  </Link>
                </span>
              ))}
              .
            </p>
          )}
        </section>

        <CategoryBars expenses={expenses ?? []} month={month} title="Meine Ausgaben nach Kategorie" />

        <ExpensesPanel space={{ ...PERSONAL_SPACE, title: 'Mein Budget' }} people={[]} me={me} showStand={false} />

        <BudgetPanel space={PERSONAL_SPACE} people={[]} me={me} />

        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <Lock aria-hidden className="size-3.5" /> Diese Seite ist privat – deine Partnerin sieht hier nichts.
        </p>
      </div>
    </div>
  )
}

/** Monatsbudget: Balken grün → gelb ab 80 % → rot drüber; festlegen/ändern/entfernen */
function LimitBar({ limit, total }: { limit?: { id: string; amount: number }; total: number }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const cents = parseEuro(value)
  const pct = limit ? Math.round((total / limit.amount) * 100) : 0
  const left = limit ? limit.amount - total : 0
  const bar = pct > 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!cents) {
      if (limit && !value.trim()) await deleteBudgetItem(limit.id)
    } else if (limit) await updateBudgetItem(limit.id, { amount: cents })
    else await addBudgetItem(PERSONAL_SPACE, { kind: 'limit', title: 'Monatsbudget', amount: cents })
    setEditing(false)
  }

  return (
    <div className="mt-4">
      {limit && !editing && (
        <>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" role="progressbar" aria-valuenow={Math.min(pct, 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${pct} % vom Monatsbudget`}>
            <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <p className={`mt-1 text-sm ${left < 0 ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'}`}>
            {left >= 0 ? `Noch ${formatEuro(left)} von ${formatEuro(limit.amount)} übrig` : `${formatEuro(-left)} über deinem Budget von ${formatEuro(limit.amount)}`}
          </p>
        </>
      )}
      {editing ? (
        <form onSubmit={save} onKeyDown={(e) => e.key === 'Escape' && setEditing(false)} className="flex items-center gap-1.5">
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="z. B. 1.500"
            inputMode="decimal"
            aria-label="Monatsbudget in Euro (leer = entfernen)"
            className="w-32 rounded-lg bg-white px-2 py-1 text-right text-sm tabular-nums ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50 dark:bg-slate-900 dark:ring-slate-700"
          />
          <button type="submit" className="rounded-lg bg-indigo-600 px-2.5 py-1 text-sm font-semibold text-white hover:bg-indigo-500">
            OK
          </button>
          <button type="button" onClick={() => setEditing(false)} className="px-1 text-sm text-slate-500 hover:underline">
            Abbrechen
          </button>
        </form>
      ) : (
        <button
          onClick={() => {
            setValue(limit ? centsToInput(limit.amount) : '')
            setEditing(true)
          }}
          className="mt-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          {limit ? 'Monatsbudget ändern' : '+ Monatsbudget festlegen'}
        </button>
      )}
    </div>
  )
}
