import { useObservable } from 'dexie-react-hooks'
import { useEffect, useState, type FormEvent } from 'react'
import type { DXCAlert, DXCUserInteraction } from 'dexie-cloud-addon'
import { db } from '../db'

/** Deutsche Texte für die Meldungen von Dexie Cloud (Fallback: Originaltext). */
function alertText(a: DXCAlert): string {
  const p = a.messageParams ?? {}
  switch (a.messageCode) {
    case 'OTP_SENT':
      return `Wir haben dir einen Anmelde-Code${p.email ? ` an ${p.email}` : ''} geschickt. Schau in dein Postfach (auch im Spam-Ordner).`
    case 'INVALID_OTP':
      return 'Der Code ist falsch oder abgelaufen. Bitte noch einmal versuchen.'
    case 'INVALID_EMAIL':
      return 'Bitte eine gültige E-Mail-Adresse eingeben.'
    case 'LICENSE_LIMIT_REACHED':
    case 'NO_SEATS_AVAILABLE':
      return 'Die maximale Anzahl an Nutzern für diese App ist erreicht.'
    case 'USER_NOT_REGISTERED':
      return 'Diese E-Mail-Adresse ist nicht freigeschaltet.'
    case 'USER_NOT_ACCEPTED':
      return 'Die Einladung wurde noch nicht angenommen.'
    case 'USER_DEACTIVATED':
      return 'Dieses Konto ist deaktiviert.'
    case 'LOGOUT_CONFIRMATION':
      return 'Es gibt noch Änderungen, die nicht mit der Cloud abgeglichen sind. Beim Abmelden gehen sie auf diesem Gerät verloren.'
    default:
      return a.message
  }
}

const TEXTS: Record<string, { title: string; submit: string; labels?: Record<string, string> }> = {
  email: { title: 'Bei PowerPlan anmelden', submit: 'Code senden', labels: { email: 'E-Mail-Adresse' } },
  otp: { title: 'Code eingeben', submit: 'Anmelden', labels: { otp: 'Code aus der E-Mail' } },
  'logout-confirmation': { title: 'Wirklich abmelden?', submit: 'Abmelden' },
}

const alertColors = {
  error: 'bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/30',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30',
  info: 'bg-indigo-50 text-indigo-800 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-200 dark:ring-indigo-500/30',
}

/**
 * Zeigt die Anmelde-Schritte von Dexie Cloud als eigenen, deutschen Dialog
 * (aktiviert über customLoginGui in db.ts).
 */
export default function LoginDialog() {
  const ui = useObservable(db.cloud.userInteraction)
  if (!ui) return null
  // key: bei jedem neuen Schritt (E-Mail → Code) frische Eingabefelder
  return <InteractionForm key={`${ui.type}-${ui.title}-${ui.alerts.map((a) => a.messageCode).join()}`} ui={ui} />
}

function InteractionForm({ ui }: { ui: DXCUserInteraction }) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const t = TEXTS[ui.type]
  const fields = Object.entries(ui.fields ?? {}) as [string, { type: string; label?: string; placeholder?: string }][]

  useEffect(() => setBusy(false), [ui])

  function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const params = Object.fromEntries(fields.map(([name]) => [name, (values[name] ?? '').trim()]))
    ui.onSubmit(params)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        className="grid w-full max-w-sm gap-4 rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
      >
        <div className="text-center">
          <div className="text-3xl" aria-hidden>
            ⚡
          </div>
          <h2 id="login-title" className="mt-1 text-lg font-semibold">
            {t?.title ?? ui.title}
          </h2>
          {ui.type === 'email' && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Deine Daten werden sicher in der Cloud gespeichert und auf all deinen Geräten abgeglichen. Kein Passwort nötig – du
              bekommst einen Code per E-Mail.
            </p>
          )}
        </div>

        {ui.alerts.map((a, i) => (
          <p key={i} className={`rounded-lg px-3 py-2 text-sm ring-1 ${alertColors[a.type]}`}>
            {alertText(a)}
          </p>
        ))}

        {fields.map(([name, f], i) => (
          <label key={name} className="grid gap-1 text-sm font-medium">
            {t?.labels?.[name] ?? f.label ?? name}
            <input
              autoFocus={i === 0}
              type={f.type === 'email' || name === 'email' ? 'email' : f.type === 'password' ? 'password' : 'text'}
              inputMode={name === 'otp' ? 'text' : undefined}
              autoComplete={name === 'email' ? 'email' : name === 'otp' ? 'one-time-code' : undefined}
              placeholder={name === 'email' ? 'name@beispiel.de' : name === 'otp' ? 'z. B. ABC123' : f.placeholder}
              value={values[name] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
              className={`rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal dark:border-slate-700 dark:bg-slate-800 ${
                name === 'otp' ? 'text-center text-lg tracking-[0.3em] uppercase' : ''
              }`}
            />
          </label>
        ))}

        <div className="flex gap-2">
          {ui.cancelLabel && (
            <button
              type="button"
              onClick={ui.onCancel}
              className="flex-1 rounded-lg px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800"
            >
              {ui.type === 'otp' ? 'Zurück' : 'Abbrechen'}
            </button>
          )}
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {busy ? 'Einen Moment …' : (t?.submit ?? ui.submitLabel)}
          </button>
        </div>
      </form>
    </div>
  )
}
