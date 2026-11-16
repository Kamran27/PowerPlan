import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarClock, Pencil, PiggyBank, Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { db, type BudgetItem, type Space } from '../db'
import { goalPct, INTERVALS, monthlyToReach, nextDue, perMonth, type BudgetInterval } from '../lib/budget'
import { formatDayShort, todayISO } from '../lib/date'
import { centsToInput, formatEuro, parseEuro } from '../lib/expenses'
import { softField } from '../lib/pillStyles'
import { addBudgetItem, deleteBudgetItem, moveFixToShared, PERSONAL_SPACE, updateBudgetItem } from '../lib/spaces'
import { SittingCat } from './Cats'
import { OwnerBadge, PayerBadge, PayerSelect } from './OwnerSelect'
import { useToast } from './Toast'
import { confirmDialog } from '../lib/confirm'

const card = 'rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'
const SUGGESTIONS = ['Miete', 'Strom', 'Internet', 'Handy', 'Versicherungen', 'Streaming', 'Fitnessstudio', 'Auto', 'Rundfunkbeitrag']

/**
 * Budget-Bereich: Fixkosten (was jeden Monat sicher weggeht) und Sparziele mit Fortschritt.
 * Oben die Monatsübersicht: Fixkosten + Ausgaben dieses Monats (aus „Kosten teilen“).
 */
export default function BudgetPanel({ space, people, me }: { space: Pick<Space, 'id' | 'realmId'>; people: string[]; me?: string }) {
  const items = useLiveQuery(() => db.budgetItems.where('spaceId').equals(space.id).toArray(), [space.id])
  const today = todayISO()
  const fixes = (items ?? []).filter((i) => i.kind === 'fix').sort((a, b) => perMonth(b) - perMonth(a))
  const goals = (items ?? []).filter((i) => i.kind === 'goal').sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  return (
    <div className="grid gap-4">
      <FixCosts space={space} fixes={fixes} today={today} people={people} me={me} />
      <Goals space={space} goals={goals} today={today} />
    </div>
  )
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

/* ---------- Fixkosten ---------- */

function FixCosts({ space, fixes, today, people, me }: { space: Pick<Space, 'id' | 'realmId'>; fixes: BudgetItem[]; today: string; people: string[]; me?: string }) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [interval, setInterval] = useState<BudgetInterval>('monthly')
  const [day, setDay] = useState('')
  const [payer, setPayer] = useState('')
  const [editId, setEditId] = useState<string>()
  // Im persönlichen Budget: gemeinsame Budget-Bereiche als Ziel für „ins Gemeinsame“
  const sharedBudgets = useLiveQuery(
    async () => (space.id === PERSONAL_SPACE.id ? (await db.spaces.toArray()).filter((s) => s.kind === 'budget') : []),
    [space.id],
  )
  const toast = useToast()
  const cents = parseEuro(amount)
  const dayNum = Number(day)

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !cents) return
    await addBudgetItem(space, { kind: 'fix', title, amount: cents, interval, ...(dayNum >= 1 && dayNum <= 31 ? { day: dayNum } : {}), ...(payer ? { paidBy: payer } : {}) })
    setTitle('')
    setAmount('')
    setDay('')
  }

  const missing = SUGGESTIONS.filter((s) => !fixes.some((f) => f.title.toLowerCase() === s.toLowerCase()))

  return (
    <section className={card}>
      <h2 className="flex items-center gap-2 font-semibold">
        <CalendarClock aria-hidden className="size-5 text-indigo-500" /> Fixkosten & Abos
      </h2>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        {people.length > 1
          ? 'Was regelmäßig abgeht. „Zahlt“ = wer es per Dauerauftrag bezahlt – die Hälfte zählt dann im „Wer schuldet wem“.'
          : 'Was regelmäßig abgeht – so siehst du, wie viel jeden Monat schon verplant ist.'}
      </p>

      {fixes.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {fixes.map((f) => (
            editId === f.id ? (
              <li key={f.id} className="py-2">
                <FixEditor item={f} people={people} me={me} onClose={() => setEditId(undefined)} />
              </li>
            ) : (
            <li key={f.id} className="group flex items-center gap-3 py-2 text-sm">
              <button onClick={() => setEditId(f.id)} className="min-w-0 flex-1 text-left" title="Bearbeiten">
                <p className="truncate font-medium">
                  {f.title}
                  {people.length > 1 && <PayerBadge payer={f.paidBy} me={me} />}
                  <OwnerBadge owner={f.forPerson} me={me} />
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatEuro(f.amount)} {INTERVALS.find((i) => i.value === (f.interval ?? 'monthly'))!.label}
                  {f.day ? ` · nächstes Mal ${formatDayShort(nextDue(f.day, today))}` : ''}
                </p>
              </button>
              {me && sharedBudgets?.[0] && (
                <button
                  onClick={async () => {
                    await moveFixToShared(f, sharedBudgets[0], me)
                    toast(`„${f.title}“ ist jetzt im gemeinsamen Budget „${sharedBudgets[0].title}“ (zahlt ich)`)
                  }}
                  title={`Ins gemeinsame Budget „${sharedBudgets[0].title}“ verschieben – du zahlst es`}
                  className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-100 hover:text-indigo-600 focus:opacity-100 max-md:opacity-100 dark:hover:bg-slate-800"
                >
                  ↗ Gemeinsam
                </button>
              )}
              <button
                onClick={() => setEditId(f.id)}
                aria-label={`${f.title} bearbeiten`}
                className="rounded-md p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-indigo-600 focus:opacity-100 max-md:opacity-100"
              >
                <Pencil className="size-3.5" />
              </button>
              <span className="font-semibold tabular-nums">
                {formatEuro(perMonth(f))}
                <span className="text-xs font-normal text-slate-400"> /Mon.</span>
              </span>
              <button
                onClick={async () => {
                  await deleteBudgetItem(f.id)
                  toast(`„${f.title}“ entfernt`, { label: 'Rückgängig', onClick: () => db.budgetItems.put(f).then(() => {}) })
                }}
                aria-label={`${f.title} entfernen`}
                className="rounded-md p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-rose-600 focus:opacity-100 max-md:opacity-100"
              >
                <X className="size-4" />
              </button>
            </li>
            )
          ))}
        </ul>
      )}

      <form onSubmit={add} className="mt-3 grid gap-2">
        <div className="flex flex-wrap gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Miete" aria-label="Fixkosten: wofür" className={`${softField} min-w-0 flex-[2_1_9rem]`} />
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00 €"
            inputMode="decimal"
            aria-label="Betrag"
            className={`${softField} flex-[1_1_5rem] text-right tabular-nums ${amount && !cents ? '!ring-rose-400' : ''}`}
          />
          <select value={interval} onChange={(e) => setInterval(e.target.value as BudgetInterval)} aria-label="Wie oft" className={`${softField} !w-auto`}>
            {INTERVALS.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </select>
          <input
            value={day}
            onChange={(e) => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
            placeholder="am … (Tag)"
            inputMode="numeric"
            aria-label="Fällig am Tag des Monats (optional)"
            className={`${softField} !w-28`}
          />
          {people.length > 1 && <PayerSelect value={payer} onChange={setPayer} people={people} me={me} />}
          <button
            type="submit"
            disabled={!title.trim() || !cents}
            className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 hover:bg-indigo-500 active:scale-95 disabled:opacity-40"
          >
            <Plus aria-hidden className="size-4" /> Hinzufügen
          </button>
        </div>
        {missing.length > 0 && !title && (
          <div className="flex flex-wrap gap-1.5">
            {missing.slice(0, 7).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setTitle(s)}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                + {s}
              </button>
            ))}
          </div>
        )}
      </form>
    </section>
  )
}

/** Fixkosten bearbeiten: Name, Betrag, wie oft, Tag der Fälligkeit */
function FixEditor({ item, people, me, onClose }: { item: BudgetItem; people: string[]; me?: string; onClose: () => void }) {
  const [title, setTitle] = useState(item.title)
  const [amount, setAmount] = useState(centsToInput(item.amount))
  const [interval, setInterval] = useState<BudgetInterval>(item.interval ?? 'monthly')
  const [day, setDay] = useState(item.day ? String(item.day) : '')
  const [payer, setPayer] = useState(item.paidBy ?? '')
  const cents = parseEuro(amount)
  const dayNum = Number(day)

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !cents) return
    await updateBudgetItem(item.id, { title: title.trim(), amount: cents, interval, day: dayNum >= 1 && dayNum <= 31 ? dayNum : undefined, paidBy: payer || undefined })
    onClose()
  }

  return (
    <form onSubmit={save} onKeyDown={(e) => e.key === 'Escape' && onClose()} className="grid gap-2 rounded-xl bg-indigo-50/50 p-2 ring-1 ring-indigo-200 dark:bg-indigo-500/10 dark:ring-indigo-500/30">
      <div className="flex flex-wrap gap-2">
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Name" className={`${softField} min-w-0 flex-[2_1_9rem]`} />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          aria-label="Betrag in Euro"
          className={`${softField} flex-[1_1_5rem] text-right tabular-nums ${amount && !cents ? '!ring-rose-400' : ''}`}
        />
        <select value={interval} onChange={(e) => setInterval(e.target.value as BudgetInterval)} aria-label="Wie oft" className={`${softField} !w-auto`}>
          {INTERVALS.map((i) => (
            <option key={i.value} value={i.value}>
              {i.label}
            </option>
          ))}
        </select>
        <input
          value={day}
          onChange={(e) => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
          placeholder="am … (Tag)"
          inputMode="numeric"
          aria-label="Fällig am Tag des Monats (optional)"
          className={`${softField} !w-28`}
        />
        {people.length > 1 && <PayerSelect value={payer} onChange={setPayer} people={people} me={me} />}
      </div>
      <EditButtons onClose={onClose} disabled={!title.trim() || !cents} />
    </form>
  )
}

export function EditButtons({ onClose, disabled }: { onClose: () => void; disabled: boolean }) {
  return (
    <div className="flex justify-end gap-2">
      <button type="button" onClick={onClose} className="rounded-xl px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
        Abbrechen
      </button>
      <button type="submit" disabled={disabled} className="rounded-xl bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-40">
        Speichern
      </button>
    </div>
  )
}

/* ---------- Sparziele ---------- */

function Goals({ space, goals, today }: { space: Pick<Space, 'id' | 'realmId'>; goals: BudgetItem[]; today: string }) {
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('')
  const [by, setBy] = useState('')
  const cents = parseEuro(target)

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !cents) return
    await addBudgetItem(space, { kind: 'goal', title, amount: cents, saved: 0, ...(by ? { by } : {}) })
    setTitle('')
    setTarget('')
    setBy('')
  }

  return (
    <section className={card}>
      <h2 className="flex items-center gap-2 font-semibold">
        <PiggyBank aria-hidden className="size-5 text-emerald-500" /> Sparziele
      </h2>
      {goals.length === 0 && (
        <div className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
          <SittingCat className="mx-auto mb-2 w-10 text-slate-300 dark:text-slate-600" />
          Noch kein Sparziel – z. B. Urlaub, Notgroschen, neues Sofa.
        </div>
      )}
      <ul className="mt-3 grid gap-3">
        {goals.map((g) => (
          <GoalRow key={g.id} goal={g} today={today} />
        ))}
      </ul>

      <form onSubmit={add} className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Neues Ziel, z. B. Urlaub" aria-label="Sparziel" className={`${softField} min-w-0 flex-[2_1_9rem]`} />
        <input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="Ziel in €"
          inputMode="decimal"
          aria-label="Zielbetrag"
          className={`${softField} flex-[1_1_5rem] text-right tabular-nums ${target && !cents ? '!ring-rose-400' : ''}`}
        />
        <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          bis
          <input type="date" value={by} onChange={(e) => setBy(e.target.value)} aria-label="Erreichen bis (optional)" className={`${softField} !w-auto`} />
        </label>
        <button
          type="submit"
          disabled={!title.trim() || !cents}
          className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 active:scale-95 disabled:opacity-40"
        >
          <Plus aria-hidden className="size-4" /> Ziel
        </button>
      </form>
    </section>
  )
}

function GoalRow({ goal, today }: { goal: BudgetItem; today: string }) {
  const [deposit, setDeposit] = useState('')
  const toast = useToast()
  const saved = goal.saved ?? 0
  const pct = goalPct(saved, goal.amount)
  const need = monthlyToReach(saved, goal.amount, goal.by, today)
  const cents = parseEuro(deposit.replace(/^[+-]/, ''))
  const minus = deposit.trim().startsWith('-')

  async function book(e: FormEvent) {
    e.preventDefault()
    if (!cents) return
    const next = Math.max(0, saved + (minus ? -cents : cents))
    await updateBudgetItem(goal.id, { saved: next })
    setDeposit('')
    if (saved < goal.amount && next >= goal.amount) toast(`🎉 Sparziel „${goal.title}“ erreicht!`)
    else toast(`${minus ? '−' : '+'}${formatEuro(cents)} bei „${goal.title}“`, { label: 'Rückgängig', onClick: () => updateBudgetItem(goal.id, { saved }) })
  }

  return (
    <li className="group rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
      <div className="flex items-baseline justify-between gap-2">
        <p className="min-w-0 truncate font-medium">
          {pct >= 100 ? '🎉 ' : ''}
          {goal.title}
        </p>
        <span className="shrink-0 text-sm tabular-nums">
          <strong>{formatEuro(saved)}</strong> <span className="text-slate-400">/ {formatEuro(goal.amount)}</span>
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${goal.title}: ${pct} %`}>
        <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>{pct} %</span>
        {goal.by && <span>· bis {formatDayShort(goal.by)}</span>}
        {need !== undefined && <span>· {formatEuro(need)} pro Monat nötig</span>}
        <form onSubmit={book} className="ml-auto flex items-center gap-1">
          <input
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
            placeholder="+ Betrag"
            inputMode="decimal"
            aria-label={`Einzahlen bei ${goal.title} (mit Minus: abheben)`}
            title="Einzahlen – mit Minus davor abheben"
            className="w-24 rounded-lg bg-white px-2 py-1 text-right text-xs tabular-nums ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/50 dark:bg-slate-900 dark:ring-slate-700"
          />
          <button type="submit" disabled={!cents} className="rounded-lg bg-emerald-600 px-2 py-1 font-semibold text-white hover:bg-emerald-500 disabled:opacity-40">
            {minus ? 'Abheben' : 'Einzahlen'}
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!(await confirmDialog(`Sparziel „${goal.title}“ löschen?`))) return
              await deleteBudgetItem(goal.id)
              toast('Sparziel gelöscht', { label: 'Rückgängig', onClick: () => db.budgetItems.put(goal).then(() => {}) })
            }}
            aria-label={`${goal.title} löschen`}
            className="rounded-md p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-rose-600 focus:opacity-100 max-md:opacity-100"
          >
            <X className="size-3.5" />
          </button>
        </form>
      </div>
    </li>
  )
}
