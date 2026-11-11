import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ShoppingListView from '../components/ShoppingListView'
import TaskInput from '../components/TaskInput'
import TaskList from '../components/TaskList'
import { useToast } from '../components/Toast'
import { db, type Space } from '../db'
import { compareTasks } from '../lib/tasks'
import {
  addShoppingList,
  assignableEmails,
  deleteShoppingList,
  deleteSpace,
  inviteMember,
  removeMember,
  renameSpace,
  shortName,
} from '../lib/spaces'
import { useMyEmail } from '../lib/useMe'

const card = 'rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'
type Tab = 'aufgaben' | 'einkauf' | 'mitglieder'

/** Ein gemeinsamer Bereich: Aufgaben, Einkaufslisten und Mitglieder. */
export default function Bereich() {
  const { spaceId = '' } = useParams()
  const space = useLiveQuery(() => db.spaces.get(spaceId), [spaceId])
  const members = useLiveQuery(() => (space ? db.members.where('realmId').equals(space.realmId).toArray() : []), [space?.realmId]) ?? []
  const tasks = useLiveQuery(() => db.tasks.where('spaceId').equals(spaceId).toArray(), [spaceId])
  const lists = useLiveQuery(() => db.shoppingLists.where('spaceId').equals(spaceId).sortBy('createdAt'), [spaceId])
  const me = useMyEmail()
  const [tab, setTab] = useState<Tab>('aufgaben')
  const [listId, setListId] = useState<string>()
  const [filter, setFilter] = useState<'alle' | 'meine' | 'offen'>('offen')
  const navigate = useNavigate()
  const toast = useToast()

  // Erste Liste vorauswählen
  useEffect(() => {
    if (lists?.length && !lists.some((l) => l.id === listId)) setListId(lists[0].id)
  }, [lists, listId])

  if (space === undefined) return <p className="text-sm text-slate-500">Lade …</p>
  if (!space) {
    return (
      <p className="text-sm text-slate-500">
        Diesen Bereich gibt es nicht (mehr). <Link to="/gemeinsam" className="text-indigo-600 hover:underline">Zur Übersicht →</Link>
      </p>
    )
  }

  const people = assignableEmails(space, members.map((m) => m.email))
  const isOwner = space.createdByEmail === me
  const shown = (tasks ?? [])
    .filter((t) => (filter === 'alle' ? true : filter === 'offen' ? !t.done : !t.done && (!t.assignee || t.assignee === me)))
    .sort(compareTasks)
  const activeList = lists?.find((l) => l.id === listId)

  return (
    <div className="max-w-3xl">
      <Link to="/gemeinsam" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
        ← Alle Bereiche
      </Link>
      <SpaceHeader space={space} people={people} me={me} />

      {/* Reiter */}
      <div role="tablist" className="mt-4 mb-4 flex gap-1">
        {(
          [
            ['aufgaben', '✅ Aufgaben'],
            ['einkauf', '🛒 Einkauf'],
            ['mitglieder', '👥 Mitglieder'],
          ] as [Tab, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              tab === value
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'aufgaben' && (
        <section>
          <TaskInput space={space} people={people} />
          <div className="mt-4 mb-2 flex gap-1 text-xs">
            {(
              [
                ['offen', 'Offen'],
                ['meine', 'Für mich'],
                ['alle', 'Alle'],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                className={`rounded-full px-2.5 py-1 font-medium ${
                  filter === v ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' : 'text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {tasks && <TaskList tasks={shown} empty="Keine Aufgaben in diesem Bereich." />}
        </section>
      )}

      {tab === 'einkauf' && (
        <section className={card}>
          <div className="mb-3 flex flex-wrap items-center gap-1">
            {(lists ?? []).map((l) => (
              <button
                key={l.id}
                onClick={() => setListId(l.id)}
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  l.id === listId ? 'bg-emerald-600 text-white' : 'text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800'
                }`}
              >
                {l.title}
              </button>
            ))}
            <NewListButton onCreate={(title) => addShoppingList(space, title)} />
          </div>
          {activeList ? (
            <>
              <ShoppingListView list={activeList} />
              {(lists?.length ?? 0) > 1 && (
                <button
                  onClick={async () => {
                    if (!window.confirm(`Liste „${activeList.title}“ mit allen Artikeln löschen?`)) return
                    await deleteShoppingList(activeList)
                  }}
                  className="mt-4 text-xs text-rose-600 hover:underline dark:text-rose-400"
                >
                  Diese Liste löschen
                </button>
              )}
            </>
          ) : (
            <p className="py-6 text-center text-sm text-slate-500">Noch keine Einkaufsliste.</p>
          )}
        </section>
      )}

      {tab === 'mitglieder' && (
        <section className={card}>
          <h2 className="font-semibold">Mitglieder</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {space.createdByEmail && (
              <li className="flex items-center gap-2">
                <span>👑</span>
                <span className="truncate">{space.createdByEmail === me ? `Ich (${me})` : space.createdByEmail}</span>
                <span className="ml-auto text-xs text-slate-500">Ersteller</span>
              </li>
            )}
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-2">
                <span>{m.accepted ? '✅' : m.rejected ? '🚫' : '⏳'}</span>
                <span className="truncate">{m.email === me ? `Ich (${me})` : m.email}</span>
                <span className="ml-auto text-xs text-slate-500">{m.accepted ? 'dabei' : m.rejected ? 'abgelehnt' : 'eingeladen'}</span>
                {isOwner && m.email !== me && (
                  <button
                    onClick={() => removeMember(m.id)}
                    aria-label={`${m.email} entfernen`}
                    className="rounded-md px-1.5 text-slate-400 hover:text-rose-600"
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
          <InviteForm onInvite={(email) => inviteMember(space, email)} />

          {isOwner && (
            <button
              onClick={async () => {
                if (!window.confirm(`Bereich „${space.title}“ mit allen Aufgaben und Listen für ALLE Mitglieder löschen?`)) return
                await deleteSpace(space)
                toast('Bereich gelöscht')
                navigate('/gemeinsam')
              }}
              className="mt-6 text-xs text-rose-600 hover:underline dark:text-rose-400"
            >
              Bereich löschen
            </button>
          )}
        </section>
      )}
    </div>
  )
}

function SpaceHeader({ space, people, me }: { space: Space; people: string[]; me?: string }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(space.title)
  const [emoji, setEmoji] = useState(space.emoji ?? '')

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    await renameSpace(space, title, emoji)
    setEditing(false)
  }

  if (editing) {
    return (
      <form onSubmit={save} className="mt-2 flex gap-2">
        <input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={8} aria-label="Symbol" className="w-12 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center dark:border-slate-700 dark:bg-slate-800" />
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Name" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-800" />
        <button className="rounded-lg bg-indigo-600 px-3 text-sm font-semibold text-white">Speichern</button>
      </form>
    )
  }

  return (
    <header className="mt-2">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <span aria-hidden>{space.emoji || '👥'}</span> {space.title}
        <button onClick={() => setEditing(true)} className="ml-1 text-sm font-normal text-slate-400 hover:text-slate-600" aria-label="Umbenennen">
          ✏️
        </button>
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {people.map((p) => (p === me ? 'Ich' : shortName(p))).join(', ')}
      </p>
    </header>
  )
}

function InviteForm({ onInvite }: { onInvite: (email: string) => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setMsg('')
    try {
      await onInvite(email)
      setMsg(`📨 Einladung an ${email} verschickt – sie erscheint nach der Anmeldung unter „Gemeinsam“.`)
      setEmail('')
    } catch (err) {
      setMsg((err as Error).message)
    }
  }

  return (
    <form onSubmit={submit} className="mt-4">
      <label className="text-sm font-medium" htmlFor="invite-email">
        Jemanden einladen
      </label>
      <div className="mt-1 flex gap-2">
        <input
          id="invite-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-Mail-Adresse"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
        <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Einladen</button>
      </div>
      {msg && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{msg}</p>}
    </form>
  )
}

function NewListButton({ onCreate }: { onCreate: (title: string) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="rounded-full px-3 py-1 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
        + Liste
      </button>
    )
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (!title.trim()) return
        await onCreate(title)
        setTitle('')
        setOpen(false)
      }}
      className="flex gap-1"
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        placeholder="z. B. Drogerie"
        aria-label="Name der neuen Liste"
        className="w-32 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
      />
      <button className="rounded-full bg-emerald-600 px-3 py-1 text-sm font-semibold text-white">OK</button>
    </form>
  )
}
