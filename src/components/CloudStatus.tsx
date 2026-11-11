import { useObservable } from 'dexie-react-hooks'
import { db } from '../db'
import { describeSync } from '../lib/cloud'

/** Kleine Statuszeile für die Seitenleiste: angemeldet als … · synchronisiert. */
export default function CloudStatus() {
  const user = useObservable(db.cloud.currentUser)
  const sync = useObservable(db.cloud.syncState)
  if (!user?.isLoggedIn) return null
  const s = describeSync(sync)
  const color = s.tone === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : s.tone === 'warn' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'
  return (
    <div className="mt-2 px-0 text-[11px] leading-tight" title={user.email}>
      <div className={color}>
        <span aria-hidden>{s.icon}</span> {s.text}
      </div>
      <div className="truncate text-slate-400">{user.email}</div>
    </div>
  )
}
