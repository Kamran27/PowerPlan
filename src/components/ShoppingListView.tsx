import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { db, type ShoppingItem, type ShoppingList } from '../db'
import { addShoppingItem, clearDoneItems, deleteShoppingItem, toggleShoppingItem, updateShoppingItem } from '../lib/spaces'

/** Eine Einkaufsliste: Artikel mit Menge hinzufügen, abhaken, bearbeiten, Erledigtes leeren. */
export default function ShoppingListView({ list }: { list: ShoppingList }) {
  const items = useLiveQuery(() => db.shoppingItems.where('listId').equals(list.id).toArray(), [list.id])
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const n = name
    const q = qty
    setName('')
    setQty('')
    await addShoppingItem(list, n, q)
  }

  const open = (items ?? []).filter((i) => !i.done).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const done = (items ?? []).filter((i) => i.done).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''))

  return (
    <div>
      <form onSubmit={add} className="flex gap-2">
        <input
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="Menge"
          aria-label="Menge"
          className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Artikel, z. B. Milch"
          aria-label="Artikel"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
        >
          +
        </button>
      </form>

      {items && open.length === 0 && done.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Die Liste ist leer. 🛒</p>
      )}

      <ul className="mt-2 grid gap-0.5">
        {open.map((i) => (
          <ShoppingRow key={i.id} item={i} />
        ))}
      </ul>

      {done.length > 0 && (
        <>
          <div className="mt-4 mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Im Wagen ({done.length})</span>
            <button onClick={() => clearDoneItems(list)} className="hover:underline">
              Erledigte entfernen
            </button>
          </div>
          <ul className="grid gap-0.5">
            {done.map((i) => (
              <ShoppingRow key={i.id} item={i} />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function ShoppingRow({ item }: { item: ShoppingItem }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(item.name)
  const [qty, setQty] = useState(item.qty ?? '')

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await updateShoppingItem(item.id, { name: name.trim(), qty: qty.trim() || undefined })
    setEditing(false)
  }

  if (editing) {
    return (
      <li>
        <form onSubmit={save} onKeyDown={(e) => e.key === 'Escape' && setEditing(false)} className="flex gap-2 py-1">
          <input value={qty} onChange={(e) => setQty(e.target.value)} aria-label="Menge" className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} aria-label="Artikel" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <button className="rounded-lg bg-indigo-600 px-3 text-sm font-semibold text-white">OK</button>
        </form>
      </li>
    )
  }

  return (
    <li className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-slate-100/70 dark:hover:bg-slate-800/50">
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
