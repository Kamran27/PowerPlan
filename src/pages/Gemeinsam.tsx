import { useLiveQuery, useObservable } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import RecentlyDone from '../components/RecentlyDone'
import { useToast } from '../components/Toast'
import { db } from '../db'
import { createSpace, shortName } from '../lib/spaces'
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
  const navigate = useNavigate()
  const toast = useToast()

  async function create(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    try {
      const id = await createSpace(title, emoji)
      setTitle('')
      setEmoji('')
      navigate(`/gemeinsam/${id}`)
    } catch (err) {
      console.error(err)
      toast('Bereich konnte nicht angelegt werden – bist du angemeldet?')
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Gemeinsam" subtitle="Bereiche, die ihr teilt – Aufgaben und Einkaufslisten für alle Mitglieder." cat="pair" />

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

      {/* Neuer Bereich */}
      <form onSubmit={create} className={`${card} flex gap-2`}>
        <input
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          placeholder="🏠"
          aria-label="Symbol (optional)"
          maxLength={8}
          className="w-12 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center dark:border-slate-700 dark:bg-slate-800"
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Neuer Bereich, z. B. Haushalt"
          aria-label="Name des Bereichs"
          className="min-w-0 flex-1 bg-transparent px-2 outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={!title.trim()}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
        >
          Anlegen
        </button>
      </form>

      {/* Bereiche */}
      {!spaces && <Skeleton rows={2} className="mt-4" />}
      {spaces && spaces.length === 0 && (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Noch keine gemeinsamen Bereiche. Leg oben einen an und lade deine Partnerin per E-Mail ein.
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
                    {s.emoji || '👥'}
                  </span>
                  <span className="font-semibold">{s.title}</span>
                </div>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {tasks} offene Aufgaben · {items} Artikel auf Einkaufslisten
                </p>
                <p className="mt-1 truncate text-xs text-slate-400">
                  {m.length === 0 ? 'Noch niemand eingeladen' : `${m.length + 1} Mitglieder`}
                </p>
              </Link>
            </li>
          )
        })}
      </ul>

      <RecentlyDone />
    </div>
  )
}
