import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState, type FormEvent } from 'react'
import { db, type ShoppingItem, type ShoppingList } from '../db'
import {
  buildHistory,
  categoryFor,
  categoryInfo,
  categoryOrder,
  CATEGORIES,
  itemCategory,
  normalizeName,
  suggest,
  type Suggestion,
} from '../lib/shopping'
import { SleepingCat } from './Cats'
import { addShoppingItem, clearDoneItems, deleteShoppingItem, toggleShoppingItem, updateShoppingItem } from '../lib/spaces'

const field = 'rounded-lg border border-slate-200 bg-white text-sm dark:border-slate-700 dark:bg-slate-800'

/**
 * Eine Einkaufsliste: Artikel mit Menge hinzufügen (mit Vorschlägen aus früheren Einkäufen),
 * nach Abteilungen in Laden-Reihenfolge sortiert, abhaken, bearbeiten, Erledigtes wegräumen.
 */
export default function ShoppingListView({ list, random }: { list: ShoppingList; random?: boolean }) {
  const plain = !!list.plain
  const items = useLiveQuery(() => db.shoppingItems.where('listId').equals(list.id).toArray(), [list.id])
  // Vorschläge aus allen Listen des Bereichs (auch aus weggeräumten Artikeln)
  const spaceItems = useLiveQuery(() => db.shoppingItems.where('spaceId').equals(list.spaceId).toArray(), [list.spaceId])
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')

  const history = useMemo(() => buildHistory(spaceItems ?? []), [spaceItems])
  const visible = (items ?? []).filter((i) => !i.cleared)
  const open = visible.filter((i) => !i.done)
  const done = visible.filter((i) => i.done).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''))
  const openNames = new Set(open.map((i) => normalizeName(i.name)))
  // Einfache Listen (Packliste, Gäste …): keine Abteilungen, Vorschläge nur aus dieser Liste
  const suggestions = plain
    ? suggest(buildHistory((items ?? []).filter((i) => i.cleared)), openNames, name, name ? 6 : 8)
    : suggest(history, openNames, name, name ? 6 : 8)
  const [picked, setPicked] = useState<string>()

  // Offene Artikel nach Abteilung gruppieren, Abteilungen in Laden-Reihenfolge
  const byCategory = new Map<string, ShoppingItem[]>()
  for (const i of open) {
    const c = plain ? 'alle' : itemCategory(i)
    byCategory.set(c, [...(byCategory.get(c) ?? []), i])
  }
  const groups = [...byCategory.entries()]
    .sort(([a], [b]) => categoryOrder(a) - categoryOrder(b))
    .map(([id, rows]) => ({ id, items: rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt)) }))

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const n = name
    const q = qty
    setName('')
    setQty('')
    await addShoppingItem(list, n, q, plain ? undefined : categoryFor(n, history))
  }

  async function addSuggestion(s: Suggestion) {
    // Eingetippte Menge hat Vorrang vor der zuletzt verwendeten
    const q = qty.trim() || s.qty
    setName('')
    setQty('')
    await addShoppingItem(list, s.name, q, s.category)
  }

  return (
    <div>
      <form onSubmit={add} className="flex gap-2">
        <input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Menge" aria-label="Menge" className={`${field} w-20 px-2 py-2`} />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={plain ? 'Neuer Eintrag' : 'Artikel, z. B. Milch'}
          aria-label={plain ? 'Eintrag' : 'Artikel'}
          autoComplete="off"
          className={`${field} min-w-0 flex-1 px-3 py-2`}
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
        >
          +
        </button>
      </form>

      {/* Vorschläge: beim Tippen passende, sonst die häufigsten */}
      {suggestions.length > 0 && (
        <div className="mt-2">
          <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">{plain ? 'Schon mal auf der Liste:' : name ? 'Schon mal gekauft:' : 'Häufig gekauft – antippen zum Hinzufügen:'}</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => addSuggestion(s)}
                className="rounded-full bg-emerald-50 px-2.5 py-1 text-sm text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/30 dark:hover:bg-emerald-500/20"
              >
                + {!plain && categoryInfo(s.category).emoji} {s.name}
                {(qty.trim() || s.qty) && <span className="ml-1 text-emerald-600/80 dark:text-emerald-300/70">({qty.trim() || s.qty})</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {items && open.length === 0 && done.length === 0 && (
        <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
          <SleepingCat className="mx-auto mb-2 w-20 text-slate-300 dark:text-slate-600" />
          Die Liste ist leer.
        </div>
      )}

      {/* Zufallswahl („Was machen wir?“) – nur bei Ideen-Listen */}
      {random && open.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm ring-1 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/30">
          <button
            type="button"
            onClick={() => {
              const others = open.filter((i) => i.id !== picked)
              setPicked(others[Math.floor(Math.random() * others.length)].id)
            }}
            className="rounded-lg bg-amber-500 px-3 py-1 font-semibold text-white hover:bg-amber-400 active:scale-95"
          >
            🎲 Was machen wir?
          </button>
          {picked && open.some((i) => i.id === picked) && (
            <span className="font-medium">
              → {open.find((i) => i.id === picked)!.name} ✨
            </span>
          )}
        </div>
      )}

      {groups.map((g) => {
        const c = categoryInfo(g.id)
        return (
          <section key={g.id} className="mt-3">
            {!plain && (
              <h3 className="px-2 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                <span aria-hidden>{c.emoji}</span> {c.label}
              </h3>
            )}
            <ul className="mt-0.5 grid gap-0.5">
              {g.items.map((i) => (
                <ShoppingRow key={i.id} item={i} plain={plain} highlight={i.id === picked} />
              ))}
            </ul>
          </section>
        )
      })}

      {done.length > 0 && (
        <>
          <div className="mt-4 mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{plain ? 'Erledigt' : 'Im Wagen'} ({done.length})</span>
            <button onClick={() => clearDoneItems(list)} className="hover:underline">
              Erledigte entfernen
            </button>
          </div>
          <ul className="grid gap-0.5">
            {done.map((i) => (
              <ShoppingRow key={i.id} item={i} plain={plain} />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function ShoppingRow({ item, plain, highlight }: { item: ShoppingItem; plain?: boolean; highlight?: boolean }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(item.name)
  const [qty, setQty] = useState(item.qty ?? '')
  const [category, setCategory] = useState(itemCategory(item))

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await updateShoppingItem(item.id, { name: name.trim(), qty: qty.trim() || undefined, ...(plain ? {} : { category }) })
    setEditing(false)
  }

  if (editing) {
    return (
      <li>
        <form onSubmit={save} onKeyDown={(e) => e.key === 'Escape' && setEditing(false)} className="flex flex-wrap gap-2 py-1">
          <input value={qty} onChange={(e) => setQty(e.target.value)} aria-label="Menge" className={`${field} w-20 px-2 py-1`} />
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} aria-label="Artikel" className={`${field} min-w-0 flex-1 px-2 py-1`} />
          {!plain && <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Abteilung" className={`${field} px-2 py-1`}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>}
          <button className="rounded-lg bg-indigo-600 px-3 text-sm font-semibold text-white">OK</button>
        </form>
      </li>
    )
  }

  return (
    <li
      className={`group flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-100/70 dark:hover:bg-slate-800/50 ${
        highlight ? 'bg-amber-50 ring-2 ring-amber-300 dark:bg-amber-500/10 dark:ring-amber-500/40' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={item.done}
        onChange={() => toggleShoppingItem(item)}
        aria-label={item.done ? `${item.name} zurück auf die Liste` : `${item.name} abhaken`}
        className="size-5 shrink-0 cursor-pointer accent-emerald-600"
      />
      <button onClick={() => setEditing(true)} className="min-w-0 flex-1 text-left" title="Bearbeiten">
        {item.qty && <span className="mr-2 text-sm font-semibold text-slate-500 tabular-nums dark:text-slate-400">{item.qty}</span>}
        <span className={item.done ? 'text-slate-400 line-through dark:text-slate-500' : ''}>{item.name}</span>
      </button>
      <button
        onClick={() => deleteShoppingItem(item.id)}
        aria-label={`${item.name} löschen`}
        className="rounded-md px-1.5 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-rose-600 focus:opacity-100 max-md:opacity-100"
      >
        ✕
      </button>
    </li>
  )
}
