import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, type FormEvent } from 'react'
import { Settings2, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import MealPlanView from '../components/MealPlanView'
import ExpensesPanel from '../components/ExpensesPanel'
import BudgetPanel from '../components/BudgetPanel'
import BudgetOverview from '../components/BudgetOverview'
import Avatar from '../components/Avatar'
import { Cat } from '../components/Cats'
import RecipesPanel from '../components/RecipesPanel'
import ShoppingListView from '../components/ShoppingListView'
import TaskInput from '../components/TaskInput'
import TaskList from '../components/TaskList'
import { useToast } from '../components/Toast'
import { db, type Space } from '../db'
import { compareTasks } from '../lib/tasks'
import {
  addShoppingList,
  applyKind,
  assignableEmails,
  deleteShoppingList,
  deleteSpace,
  inviteMember,
  removeMember,
  renameSpace,
  shortName,
  migratePersonalBudget,
  updateSpaceKind,
} from '../lib/spaces'
import { useMyEmail } from '../lib/useMe'
import { countdownText, kindInfo, tabLabel, type SpaceKind, type SpaceTab } from '../lib/spaceKinds'
import KindPicker from '../components/KindPicker'
import { formatDayShort, todayISO } from '../lib/date'
import { softField } from '../lib/pillStyles'
import Skeleton from '../components/Skeleton'
import { confirmDialog } from '../lib/confirm'

const card = 'rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'
type Tab = SpaceTab

/** Ein gemeinsamer Bereich: Aufgaben, Einkaufslisten und Mitglieder. */
export default function Bereich() {
  const { spaceId = '' } = useParams()
  const space = useLiveQuery(() => db.spaces.get(spaceId), [spaceId])
  const members = useLiveQuery(() => (space ? db.members.where('realmId').equals(space.realmId).toArray() : []), [space?.realmId]) ?? []
  const tasks = useLiveQuery(() => db.tasks.where('spaceId').equals(spaceId).toArray(), [spaceId])
  const lists = useLiveQuery(() => db.shoppingLists.where('spaceId').equals(spaceId).sortBy('createdAt'), [spaceId])
  const expenseCount = useLiveQuery(() => db.expenses.where('spaceId').equals(spaceId).count(), [spaceId]) ?? 0
  // Listen mit (nicht weggeräumten) Einträgen – leere Einkaufslisten blenden keinen extra Reiter ein
  const filledLists = useLiveQuery(
    async () => new Set((await db.shoppingItems.where('spaceId').equals(spaceId).filter((i) => !i.cleared).toArray()).map((i) => i.listId)),
    [spaceId],
  )
  const me = useMyEmail()
  const [params] = useSearchParams()
  const initialTab = params.get('tab')
  const [chosenTab, setTab] = useState<Tab | undefined>((initialTab as Tab) || undefined)
  const [listId, setListId] = useState<string>()
  const [plainId, setPlainId] = useState<string>()
  const [filter, setFilter] = useState<'alle' | 'meine' | 'offen'>('offen')
  const navigate = useNavigate()
  const toast = useToast()

  // Umzug: früher im Gemeinsamen als „nur ich“ markierte Budget-Einträge → „Mein Budget“ (privat)
  useEffect(() => {
    if (space?.kind !== 'budget' || !me) return
    migratePersonalBudget(me).then((n) => {
      if (n) toast(`👤 ${n} persönliche ${n === 1 ? 'Position' : 'Positionen'} nach „Mein Budget“ verschoben`)
    })
  }, [space?.kind, me, toast])

  // Einkaufslisten (mit Abteilungen) und einfache Listen (Packliste, Gäste …) getrennt
  const shopLists = (lists ?? []).filter((l) => !l.plain)
  const plainLists = (lists ?? []).filter((l) => l.plain)

  // Erste Liste vorauswählen
  useEffect(() => {
    if (shopLists.length && !shopLists.some((l) => l.id === listId)) setListId(shopLists[0].id)
    if (plainLists.length && !plainLists.some((l) => l.id === plainId)) setPlainId(plainLists[0].id)
  }, [shopLists, plainLists, listId, plainId])

  if (space === undefined) return <Skeleton rows={4} />
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
  const activeList = shopLists.find((l) => l.id === listId)
  const activePlain = plainLists.find((l) => l.id === plainId)
  const kind = kindInfo(space.kind)
  // Reiter der Vorlage; vorhandene Einkaufslisten und Ausgaben bleiben immer erreichbar (z. B. nach Wechsel der Art)
  const tabs: Tab[] = [...kind.tabs]
  if (!tabs.includes('einkauf') && shopLists.some((l) => filledLists?.has(l.id))) tabs.splice(tabs.indexOf('mitglieder'), 0, 'einkauf')
  if (!tabs.includes('kosten') && expenseCount) tabs.splice(tabs.indexOf('mitglieder'), 0, 'kosten')
  const tab: Tab = chosenTab && tabs.includes(chosenTab) ? chosenTab : tabs[0]

  return (
    <div className="max-w-3xl">
      <Link to="/gemeinsam" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
        ← Alle Bereiche
      </Link>
      <SpaceHeader space={space} people={people} me={me} isOwner={isOwner} />

      {/* Reiter */}
      <div role="tablist" className="mt-4 mb-4 flex flex-wrap gap-1">
        {tabs.map((value) => [value, tabLabel(kind, value)] as const).map(([value, label]) => (
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
          {tasks ? <TaskList tasks={shown} empty="Keine Aufgaben in diesem Bereich." /> : <Skeleton />}
        </section>
      )}

      {tab === 'einkauf' && (
        <section className={card}>
          <div className="mb-3 flex flex-wrap items-center gap-1">
            {shopLists.map((l) => (
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
              {shopLists.length > 1 && (
                <button
                  onClick={async () => {
                    if (!(await confirmDialog(`Liste „${activeList.title}“ mit allen Artikeln löschen?`))) return
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
      {tab === 'einkauf' && <RecipesPanel space={space} list={activeList} />}
      {tab === 'essen' && <MealPlanView space={space} lists={shopLists} />}

      {tab === 'listen' && (
        <section className={card}>
          <div className="mb-3 flex flex-wrap items-center gap-1">
            {plainLists.map((l) => (
              <button
                key={l.id}
                onClick={() => setPlainId(l.id)}
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  l.id === plainId ? 'bg-indigo-600 text-white' : 'text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800'
                }`}
              >
                {l.title}
              </button>
            ))}
            <NewListButton placeholder="z. B. Strand" onCreate={(title) => addShoppingList(space, title, { plain: true })} />
          </div>
          {activePlain ? (
            <>
              <ShoppingListView list={activePlain} random={kind.random} />
              <button
                onClick={async () => {
                  if (!(await confirmDialog(`Liste „${activePlain.title}“ mit allen Einträgen löschen?`))) return
                  await deleteShoppingList(activePlain)
                }}
                className="mt-4 text-xs text-rose-600 hover:underline dark:text-rose-400"
              >
                Diese Liste löschen
              </button>
            </>
          ) : (
            <p className="py-6 text-center text-sm text-slate-500">Noch keine Liste – leg oben eine an.</p>
          )}
        </section>
      )}

      {tab === 'uebersicht' && <BudgetOverview space={space} people={people} me={me} />}
      {tab === 'kosten' && <ExpensesPanel space={space} people={people} me={me} showStand={kind.id !== 'budget'} />}
      {tab === 'budget' && <BudgetPanel space={space} people={people} me={me} />}

      {tab === 'mitglieder' && (
        <section className={card}>
          <h2 className="font-semibold">Mitglieder</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {space.createdByEmail && (
              <li className="flex items-center gap-2">
                <Avatar email={space.createdByEmail} me={me} />
                <span className="truncate">{space.createdByEmail === me ? `Ich (${me})` : space.createdByEmail}</span>
                <span aria-hidden>👑</span>
                <span className="ml-auto text-xs text-slate-500">Ersteller</span>
              </li>
            )}
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-2">
                <Avatar email={m.email} me={me} />
                <span className="truncate">{m.email === me ? `Ich (${me})` : m.email}</span>
                <span aria-hidden>{m.accepted ? '✅' : m.rejected ? '🚫' : '⏳'}</span>
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
                if (!(await confirmDialog(`Bereich „${space.title}“ mit allen Aufgaben und Listen für ALLE Mitglieder löschen?`))) return
                await deleteSpace(space)
                toast('Bereich gelöscht')
                navigate('/gemeinsam')
              }}
              className="mt-6 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50 dark:text-rose-400 dark:ring-rose-500/30 dark:hover:bg-rose-500/10"
            >
              <Trash2 aria-hidden className="size-4" /> Bereich löschen
            </button>
          )}
        </section>
      )}
    </div>
  )
}

function SpaceHeader({ space, people, me, isOwner }: { space: Space; people: string[]; me?: string; isOwner: boolean }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(space.title)
  const [emoji, setEmoji] = useState(space.emoji ?? '')
  const [kindId, setKindId] = useState<SpaceKind>(kindInfo(space.kind).id)
  const [date, setDate] = useState(space.date ?? '')
  const [starter, setStarter] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()
  const kind = kindInfo(space.kind)
  const newKind = kindInfo(kindId)
  const kindChanged = newKind.id !== kind.id

  function open() {
    setTitle(space.title)
    setEmoji(space.emoji ?? '')
    setKindId(kind.id)
    setDate(space.date ?? '')
    setStarter(false)
    setEditing(true)
  }

  async function remove() {
    const ok = await confirmDialog(
      `„${space.title}“ mit allen Aufgaben, Listen, Kosten und Budget wird für alle Mitglieder gelöscht. Das kann nicht rückgängig gemacht werden.`,
      { title: 'Bereich löschen?', confirmLabel: 'Endgültig löschen' },
    )
    if (!ok) return
    try {
      await deleteSpace(space)
      toast(`🗑️ Bereich „${space.title}“ gelöscht`)
      navigate('/gemeinsam')
    } catch (err) {
      console.error(err)
      toast('Löschen hat nicht geklappt – bitte noch einmal versuchen.')
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    await renameSpace(space, title, emoji)
    await updateSpaceKind(space, newKind.id, newKind.dateLabel ? date : undefined)
    // Neue Art: fehlende Listen immer anlegen (sonst wäre z. B. der Reiter „Packliste“ leer), Vorschläge nur auf Wunsch
    if (kindChanged || starter) await applyKind(space, newKind.id, { tasks: starter, items: starter })
    setEditing(false)
  }

  if (editing) {
    return (
      <form onSubmit={save} className="mt-2 grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div className="flex gap-2">
          <input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={8} aria-label="Symbol" className={`${softField} !w-12 text-center`} />
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Name" className={`${softField} min-w-0 flex-1`} />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">Art des Bereichs</p>
          <KindPicker value={kindId} onChange={setKindId} />
        </div>
        {newKind.dateLabel && (
          <label className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500 dark:text-slate-400">{newKind.dateLabel}:</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${softField} !w-auto`} />
          </label>
        )}
        {(newKind.tasks.length > 0 || newKind.lists.some((l) => l.items.length)) && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={starter} onChange={(e) => setStarter(e.target.checked)} className="size-4 accent-indigo-600" />
            Vorschläge der Vorlage hinzufügen ({newKind.tasks.length} Aufgaben{newKind.lists.some((l) => l.items.length) ? ', Listen-Einträge' : ''})
          </label>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={() => setEditing(false)} className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
            Abbrechen
          </button>
          <button className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 hover:bg-indigo-500">Speichern</button>
        </div>
      </form>
    )
  }

  return (
    <header className="relative mt-2">
      {/* Zwei Katzen – wie ihr zwei */}
      <Cat pose="pair" className="absolute right-0 bottom-0 text-slate-400 dark:text-slate-500" />
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <span aria-hidden>{space.emoji || kind.emoji}</span> {space.title}
        <button
          onClick={open}
          aria-label="Bearbeiten"
          title="Name, Art und Datum ändern"
          className="ml-1 flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <Settings2 aria-hidden className="size-3.5" /> Bearbeiten
        </button>
        {isOwner && (
          <button
            onClick={remove}
            aria-label="Bereich löschen"
            title="Bereich mit allem darin löschen"
            className="flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20"
          >
            <Trash2 aria-hidden className="size-3.5" /> Löschen
          </button>
        )}
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
        {kind.id !== 'frei' && (
          <span className="mr-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium dark:bg-slate-800">
            {kind.emoji} {kind.label}
          </span>
        )}
        <span className="flex -space-x-1.5">
          {people.map((p) => (
            <Avatar key={p} email={p} me={me} />
          ))}
        </span>
        <span className="ml-1">{people.map((p) => (p === me ? 'Ich' : shortName(p))).join(', ')}</span>
      </div>
      {/* Countdown bis zum Stichtag (Reise, Feier, Projekt) */}
      {kind.dateLabel &&
        (space.date ? (
          <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-1.5 text-sm ring-1 ring-indigo-200 dark:bg-indigo-500/10 dark:ring-indigo-500/30">
            <span aria-hidden>{kind.emoji}</span>
            <span className="text-slate-600 dark:text-slate-300">
              {kind.dateLabel}: {formatDayShort(space.date)}
            </span>
            <strong className="text-indigo-700 dark:text-indigo-300">{countdownText(space.date, todayISO())}</strong>
          </p>
        ) : (
          <button onClick={open} className="mt-3 text-sm text-indigo-600 hover:underline dark:text-indigo-400">
            + {kind.dateLabel} festlegen (Countdown)
          </button>
        ))}
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

function NewListButton({ onCreate, placeholder = 'z. B. Drogerie' }: { onCreate: (title: string) => Promise<void>; placeholder?: string }) {
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
        placeholder={placeholder}
        aria-label="Name der neuen Liste"
        className="w-32 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
      />
      <button className="rounded-full bg-emerald-600 px-3 py-1 text-sm font-semibold text-white">OK</button>
    </form>
  )
}
