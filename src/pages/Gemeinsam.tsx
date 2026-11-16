import { useLiveQuery, useObservable } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import BottomSheet from '../components/BottomSheet'
import { Plus } from 'lucide-react'
import RecentlyDone from '../components/RecentlyDone'
import { useToast } from '../components/Toast'
import { db } from '../db'
import { createSpace, shortName } from '../lib/spaces'
import KindPicker from '../components/KindPicker'
import { countdownText, kindInfo, type SpaceKind } from '../lib/spaceKinds'
import { todayISO } from '../lib/date'
import { softField } from '../lib/pillStyles'
import Skeleton from '../components/Skeleton'

const card = 'rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'

/** Übersicht der gemeinsamen Bereiche + offene Einladungen + neuen Bereich anlegen. */
export default function Gemeinsam() {
  const spaces = useLiveQuery(() => db.spaces.toArray(), [])
  const members = useLiveQuery(() => db.members.toArray(), [])
  const openTasks = useLiveQuery(() => db.tasks.filter((t) => !!t.spaceId && !t.done).toArray(), [])
  const openItems = useLiveQuery(() => db.shoppingItems.filter((i) => !i.done).toArray(), [])
  const invites = useObservable(db.cloud.invites) ?? []
  const pendingInvites = invites.filter((i) => !i.accepted && !i.rejected)
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState('')
  const [kindId, setKindId] = useState<SpaceKind>('haushalt')
  const [date, setDate] = useState('')
  const [starter, setStarter] = useState(true)
  const [creating, setCreating] = useState(false)
  const kind = kindInfo(kindId)
  const navigate = useNavigate()
  const toast = useToast()

  async function create(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    try {
      const id = await createSpace(title, emoji || kind.emoji, { kind: kindId, starter, date: kind.dateLabel ? date : undefined })
      setTitle('')
      setEmoji('')
      setDate('')
      setCreating(false)
      navigate(`/gemeinsam/${id}`)
    } catch (err) {
      console.error(err)
      toast('Bereich konnte nicht angelegt werden – bist du angemeldet?')
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Gemeinsam" subtitle="Bereiche, die ihr teilt – Haushalt, Reisen, Budget, Feiern und mehr." cat="pair" />

      {/* Einladungen an mich */}
      {pendingInvites.length > 0 && (
        <section className="mb-6 grid gap-2">
          {pendingInvites.map((inv) => (
            <div key={inv.id} className="rounded-2xl bg-sky-50 p-4 text-sm ring-1 ring-sky-200 dark:bg-sky-500/10 dark:ring-sky-500/30">
              <p>
                📨 <strong>{inv.invitedBy?.name || shortName(inv.invitedBy?.email) || 'Jemand'}</strong> lädt dich in den Bereich{' '}
                <strong>„{inv.realm?.name ?? 'Unbenannt'}“</strong> ein.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => inv.accept().then(() => toast('✅ Einladung angenommen'))}
                  className="rounded-lg bg-sky-600 px-3 py-1.5 font-semibold text-white hover:bg-sky-500"
                >
                  Annehmen
                </button>
                <button onClick={() => inv.reject()} className="rounded-lg px-3 py-1.5 hover:bg-sky-100 dark:hover:bg-sky-500/20">
                  Ablehnen
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Bereiche */}
      {!spaces && <Skeleton rows={2} className="mt-4" />}
      {spaces && spaces.length === 0 && (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Noch keine gemeinsamen Bereiche. Leg unten einen an und lade deine Partnerin per E-Mail ein.
        </p>
      )}
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {(spaces ?? []).map((s) => {
          const m = (members ?? []).filter((x) => x.realmId === s.realmId)
          const tasks = (openTasks ?? []).filter((t) => t.spaceId === s.id).length
          const items = (openItems ?? []).filter((i) => i.spaceId === s.id).length
          return (
            <li key={s.id}>
              <Link to={`/gemeinsam/${s.id}`} className={`${card} block hover:ring-indigo-300 dark:hover:ring-indigo-500/50`}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl" aria-hidden>
                    {s.emoji || kindInfo(s.kind).emoji}
                  </span>
                  <span className="font-semibold">{s.title}</span>
                  {s.kind && <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">{kindInfo(s.kind).label}</span>}
                </div>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {tasks} offene Aufgaben · {items} offene Einträge
                </p>
                {s.date && kindInfo(s.kind).dateLabel && (
                  <p className="mt-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    {kindInfo(s.kind).dateLabel}: {countdownText(s.date, todayISO())}
                  </p>
                )}
                <p className="mt-1 truncate text-xs text-slate-400">
                  {m.length === 0 ? 'Noch niemand eingeladen' : `${m.length + 1} Mitglieder`}
                </p>
              </Link>
            </li>
          )
        })}
      </ul>

      <button
        onClick={() => setCreating(true)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-indigo-500/60 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
      >
        <Plus aria-hidden className="size-4" /> Neuer Bereich
      </button>

      {/* Neuer Bereich: nur über den Knopf – als Fenster, damit man nicht versehentlich hineinklickt */}
      <BottomSheet open={creating} onClose={() => setCreating(false)} title="Neuer Bereich">
      <form onSubmit={create} className="grid gap-3">
        <KindPicker value={kindId} onChange={setKindId} />
        <div className="flex flex-wrap gap-2">
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder={kind.emoji}
            aria-label="Symbol (optional)"
            maxLength={8}
            className={`${softField} !w-12 text-center`}
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`Name, z. B. ${kind.placeholder}`}
            aria-label="Name des Bereichs"
            className={`${softField} min-w-0 flex-[1_1_12rem]`}
          />
          {kind.dateLabel && (
            <label className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 dark:text-slate-400">{kind.dateLabel}</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label={kind.dateLabel} className={`${softField} !w-auto`} />
            </label>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {(kind.tasks.length > 0 || kind.lists.some((l) => l.items.length)) && (
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={starter} onChange={(e) => setStarter(e.target.checked)} className="size-4 accent-indigo-600" />
              Mit Vorschlägen starten
              <span className="text-xs text-slate-400">
                ({[kind.tasks.length && `${kind.tasks.length} Aufgaben`, ...kind.lists.filter((l) => l.items.length).map((l) => l.title)].filter(Boolean).join(', ')})
              </span>
            </label>
          )}
          <button
            type="submit"
            disabled={!title.trim()}
            className="ml-auto rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 hover:bg-indigo-500 active:scale-95 disabled:opacity-40"
          >
            Anlegen
          </button>
        </div>
      </form>

      </BottomSheet>

      <RecentlyDone />
    </div>
  )
}
