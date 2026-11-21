import { useState } from 'react'
import { Eye, EyeOff, RefreshCw, Trash2 } from 'lucide-react'
import { db, type Calendar } from '../db'
import { CAL_COLORS, calColor, calendarStatus, fetchIcs, refreshCalendars, useCalendars } from '../lib/calendars'
import { confirmDialog } from '../lib/confirm'
import { softField } from '../lib/pillStyles'

/**
 * Einstellungen → Kalender: Apple- oder Google-Kalender per Link einbinden (nur lesen).
 * Gespeichert wird nur der Link – privat, nur für dich sichtbar und auf all deinen Geräten.
 */
export default function CalendarsCard() {
  const { calendars } = useCalendars()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [color, setColor] = useState('sky')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [help, setHelp] = useState<'apple' | 'google' | null>(null)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await fetchIcs(url) // erst prüfen, ob der Link funktioniert
      await db.calendars.add({ name: name.trim() || 'Kalender', url: url.trim(), color } as Calendar)
      setName('')
      setUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Link funktioniert nicht')
    } finally {
      setBusy(false)
    }
  }

  async function remove(c: Calendar) {
    if (await confirmDialog(`„${c.name}“ entfernen? Die Termine verschwinden aus PowerPlan, im Kalender selbst bleibt alles.`, { confirmLabel: 'Entfernen', danger: true })) {
      await db.calendars.delete(c.id)
    }
  }

  return (
    <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">📅 Kalender</h2>
        {calendars.length > 0 && (
          <button onClick={() => refreshCalendars(calendars, true)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600">
            <RefreshCw className="size-3.5" /> Neu laden
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Termine aus deinem Apple- oder Google-Kalender erscheinen im Tagesplan und in der Woche (nur lesen, gestrichelt). Der Link ist privat und nur für dich sichtbar.
      </p>

      {calendars.length > 0 && (
        <ul className="mt-3 grid gap-2">
          {calendars.map((c) => {
            const st = calendarStatus(c.id)
            return (
              <li key={c.id} className="flex items-center gap-2 rounded-xl px-3 py-2 ring-1 ring-slate-200 dark:ring-slate-700">
                <span className={`size-3 shrink-0 rounded-full ${calColor(c.color).dot}`} />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm font-medium ${c.hidden ? 'text-slate-400 line-through' : ''}`}>{c.name}</span>
                  <span className={`block truncate text-xs ${st?.error ? 'text-rose-600' : 'text-slate-500 dark:text-slate-400'}`}>
                    {c.hidden
                      ? 'ausgeblendet'
                      : st?.error
                        ? `⚠️ ${st.error}`
                        : st?.text
                          ? `aktualisiert ${new Date(st.at!).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
                          : 'lädt …'}
                  </span>
                </span>
                <button
                  onClick={() => db.calendars.update(c.id, { hidden: !c.hidden })}
                  aria-label={c.hidden ? 'Einblenden' : 'Ausblenden'}
                  title={c.hidden ? 'Einblenden' : 'Ausblenden'}
                  className="rounded-md p-1.5 text-slate-400 hover:text-indigo-600"
                >
                  {c.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
                <button onClick={() => remove(c)} aria-label={`${c.name} entfernen`} className="rounded-md p-1.5 text-slate-400 hover:text-rose-600">
                  <Trash2 className="size-4" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <form onSubmit={add} className="mt-4 grid gap-2">
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name, z. B. Privat" aria-label="Name des Kalenders" className={`${softField} max-w-40`} />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            placeholder="webcal://… oder https://…ics"
            aria-label="Kalender-Link"
            className={softField}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label="Farbe" className="flex gap-1.5">
            {Object.entries(CAL_COLORS).map(([key, c]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={color === key}
                aria-label={c.label}
                onClick={() => setColor(key)}
                className={`size-6 rounded-full ${c.dot} ${color === key ? 'ring-2 ring-slate-900 ring-offset-2 dark:ring-white dark:ring-offset-slate-900' : ''}`}
              />
            ))}
          </div>
          <button type="submit" disabled={busy || !url.trim()} className="ml-auto rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            {busy ? 'Prüfe Link …' : 'Kalender hinzufügen'}
          </button>
        </div>
        {error && <p className="text-sm text-rose-600">⚠️ {error}</p>}
      </form>

      <div className="mt-4 flex gap-3 text-xs">
        <button onClick={() => setHelp(help === 'apple' ? null : 'apple')} className="text-indigo-600 hover:underline dark:text-indigo-400">
        Wo finde ich den Link? Apple
        </button>
        <button onClick={() => setHelp(help === 'google' ? null : 'google')} className="text-indigo-600 hover:underline dark:text-indigo-400">
          Google
        </button>
      </div>
      {help === 'apple' && (
        <ol className="mt-2 list-decimal space-y-1 rounded-xl bg-slate-50 p-3 pl-7 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
          <li>
            <strong>Mac:</strong> Kalender-App → Rechtsklick auf den Kalender (links) → <em>Kalender teilen …</em> → <em>Öffentlicher Kalender</em> anhaken → Link kopieren.
          </li>
          <li>
            <strong>iPhone:</strong> Kalender-App → <em>Kalender</em> (unten) → ⓘ neben dem Kalender → <em>Öffentlicher Kalender</em> einschalten → <em>Link teilen</em> → Kopieren.
          </li>
          <li>Der Link beginnt mit <code>webcal://p…-caldav.icloud.com/published/…</code>. Hier einfügen.</li>
          <li>Hinweis: Wer den Link kennt, kann die Termine lesen – nicht weitergeben.</li>
        </ol>
      )}
      {help === 'google' && (
        <ol className="mt-2 list-decimal space-y-1 rounded-xl bg-slate-50 p-3 pl-7 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
          <li>Am Computer calendar.google.com öffnen (geht nicht in der Handy-App).</li>
          <li>Links beim Kalender ⋮ → <em>Einstellungen und Freigabe</em>.</li>
          <li>
            Ganz unten bei <em>Kalender integrieren</em>: <strong>Privatadresse im iCal-Format</strong> kopieren (endet auf <code>basic.ics</code>).
          </li>
          <li>Hier einfügen. Die Adresse ist geheim – nicht weitergeben.</li>
        </ol>
      )}
    </section>
  )
}
