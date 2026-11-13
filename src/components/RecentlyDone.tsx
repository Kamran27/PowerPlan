import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { addDays, localDateOf, todayISO } from '../lib/date'
import { canGiveKudos, toggleKudos } from '../lib/kudos'
import { shortName } from '../lib/spaces'
import { useMyEmail } from '../lib/useMe'
import Avatar from './Avatar'

/** „Zuletzt erledigt“ in allen gemeinsamen Bereichen (3 Tage) – mit 👏 für die anderen. */
export default function RecentlyDone() {
  const me = useMyEmail()
  const since = addDays(todayISO(), -2)
  const done = useLiveQuery(
    () => db.tasks.filter((t) => !!t.spaceId && t.done && !!t.doneAt && localDateOf(t.doneAt) >= since).toArray(),
    [since],
  )
  const spaces = useLiveQuery(() => db.spaces.toArray(), [])
  if (!done?.length) return null
  const list = done.sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? '')).slice(0, 8)

  return (
    <section className="mt-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <h2 className="mb-2 font-semibold">Zuletzt erledigt</h2>
      <ul className="grid gap-1">
        {list.map((t) => {
          const space = spaces?.find((s) => s.id === t.spaceId)
          const clapped = !!me && !!t.kudos?.includes(me)
          return (
            <li key={t.id} className="flex items-center gap-2 text-sm">
              <Avatar email={t.doneBy} size="sm" me={me} />
              <span className="min-w-0 flex-1 truncate">
                <span className="text-slate-500 dark:text-slate-400">{t.doneBy === me ? 'Du' : shortName(t.doneBy)}: </span>
                {t.title}
                {space && <span className="text-xs text-slate-400"> · {space.emoji ?? '👥'} {space.title}</span>}
              </span>
              {canGiveKudos(t, me) ? (
                <button
                  onClick={() => toggleKudos(t, me!)}
                  aria-pressed={clapped}
                  aria-label={`${shortName(t.doneBy)} applaudieren`}
                  className={`rounded-full px-2 py-0.5 ring-1 ${clapped ? 'bg-amber-100 ring-amber-300 dark:bg-amber-500/20 dark:ring-amber-500/40' : 'ring-slate-200 grayscale hover:grayscale-0 dark:ring-slate-700'}`}
                >
                  👏
                </button>
              ) : t.kudos?.length ? (
                <span className="text-xs" title="Applaus bekommen">👏 {t.kudos.length}</span>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
