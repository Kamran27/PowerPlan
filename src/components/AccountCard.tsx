import { useObservable } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../db'
import { describeSync } from '../lib/cloud'
import { resetLegacyHandled } from '../lib/legacy'
import { useToast } from './Toast'

const card = 'rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'

/** Einstellungen → Konto & Synchronisation. */
export default function AccountCard() {
  const user = useObservable(db.cloud.currentUser)
  const sync = useObservable(db.cloud.syncState)
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const s = describeSync(sync)

  async function syncNow() {
    setBusy(true)
    try {
      await db.cloud.sync()
      toast('☁️ Abgeglichen')
    } catch {
      toast('Abgleich gerade nicht möglich – bist du online?')
    } finally {
      setBusy(false)
    }
  }

  const license = user?.license
  const licenseText = !license
    ? null
    : license.type === 'prod'
      ? '✅ Dauerhafter Nutzer'
      : license.type === 'eval'
        ? `🧪 Testnutzer${license.evalDaysLeft !== undefined ? ` – noch ${license.evalDaysLeft} aktive Tage Sync` : ''}`
        : license.type

  return (
    <section className={`${card} mb-6`}>
      <h2 className="font-semibold">Konto & Synchronisation</h2>
      {user?.isLoggedIn ? (
        <>
          <dl className="mt-3 grid gap-1 text-sm">
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-slate-500 dark:text-slate-400">Angemeldet</dt>
              <dd className="truncate font-medium">{user.email}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-slate-500 dark:text-slate-400">Status</dt>
              <dd>
                <span aria-hidden>{s.icon}</span> {s.text}
              </dd>
            </div>
            {licenseText && (
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-slate-500 dark:text-slate-400">Lizenz</dt>
                <dd>{licenseText}</dd>
              </div>
            )}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={syncNow}
              disabled={busy}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {busy ? 'Gleiche ab …' : 'Jetzt abgleichen'}
            </button>
            <button
              onClick={() => {
                resetLegacyHandled()
                window.location.reload()
              }}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800"
            >
              Alte Daten dieses Geräts suchen
            </button>
            <button
              onClick={() => db.cloud.logout()}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50 dark:text-rose-400 dark:ring-rose-500/30 dark:hover:bg-rose-500/10"
            >
              Abmelden
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Melde dich auf jedem Gerät mit derselben E-Mail an – dann siehst du überall dieselben Daten. Offline Geändertes wird
            automatisch abgeglichen, sobald wieder Internet da ist.
          </p>
        </>
      ) : (
        <div className="mt-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">Nicht angemeldet.</p>
          <button
            onClick={() => db.cloud.login()}
            className="mt-3 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Anmelden
          </button>
        </div>
      )}
    </section>
  )
}
