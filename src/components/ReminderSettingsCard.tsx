import { useState } from 'react'
import { disablePush, enablePush, needsInstallForPush, pushConfigured, pushEnabled, pushSupported, sendTestPush } from '../lib/push'
import { ensurePermission, getReminderSettings, notificationsSupported, setReminderSettings, showNotification } from '../lib/reminders'
import { useToast } from './Toast'

const card = 'mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'

/** Einstellungen → Erinnerungen vor Zeitblöcken. */
export default function ReminderSettingsCard() {
  const [settings, setSettings] = useState(getReminderSettings)
  const [permission, setPermission] = useState(notificationsSupported() ? Notification.permission : 'unsupported')
  const toast = useToast()
  const [push, setPush] = useState(pushEnabled)
  const [pushBusy, setPushBusy] = useState(false)

  async function togglePush(on: boolean) {
    setPushBusy(true)
    try {
      if (on) {
        await enablePush()
        // Push braucht die Erinnerungen vor Zeitblöcken
        if (!settings.blocks) {
          const next = { ...settings, blocks: true }
          setSettings(next)
          setReminderSettings(next)
        }
        setPermission('granted')
        toast('📲 Push-Erinnerungen sind an')
      } else {
        await disablePush()
        toast('Push-Erinnerungen aus')
      }
      setPush(on)
    } catch (e) {
      toast((e as Error).message)
    } finally {
      setPushBusy(false)
    }
  }

  async function testPush() {
    try {
      await sendTestPush()
      toast('🔔 Test kommt in etwa 1 Minute – du kannst die App jetzt schließen.')
    } catch (e) {
      toast((e as Error).message)
    }
  }

  async function toggle(enabled: boolean) {
    if (enabled) {
      const p = await ensurePermission()
      setPermission(p)
      if (p === 'denied') toast('Benachrichtigungen sind blockiert – Erinnerungen erscheinen nur in der App.')
    }
    const next = { ...settings, blocks: enabled }
    setSettings(next)
    setReminderSettings(next)
  }

  function changeLead(minutes: number) {
    const next = { ...settings, leadMinutes: minutes }
    setSettings(next)
    setReminderSettings(next)
  }

  async function test() {
    const shown = await showNotification('PowerPlan-Test', 'So sehen deine Erinnerungen aus. ⏰', 'powerplan-test')
    toast(shown ? '⏰ Test-Erinnerung gesendet' : '⏰ So erscheint die Erinnerung in der App (System-Benachrichtigungen sind aus)')
  }

  return (
    <section className={card}>
      <h2 className="font-semibold">Erinnerungen</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Erinnert dich vor dem Beginn eines Zeitblocks im Tagesplan – solange PowerPlan geöffnet ist (auch im Hintergrund-Tab).
      </p>

      <label className="mt-4 flex items-center gap-3">
        <input
          type="checkbox"
          checked={settings.blocks}
          onChange={(e) => toggle(e.target.checked)}
          className="size-5 cursor-pointer accent-indigo-600"
        />
        <span className="text-sm">Vor Zeitblöcken erinnern</span>
        <select
          value={settings.leadMinutes}
          onChange={(e) => changeLead(Number(e.target.value))}
          disabled={!settings.blocks}
          aria-label="Wie viele Minuten vorher"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800"
        >
          {[0, 5, 10, 15].map((m) => (
            <option key={m} value={m}>
              {m === 0 ? 'zum Beginn' : `${m} Min. vorher`}
            </option>
          ))}
        </select>
      </label>

      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        System-Benachrichtigungen:{' '}
        {permission === 'granted'
          ? '✅ erlaubt'
          : permission === 'denied'
            ? '🚫 blockiert – in den Browser-Einstellungen für diese Seite erlauben'
            : permission === 'unsupported'
              ? 'werden von diesem Browser nicht unterstützt (Meldung erscheint in der App)'
              : 'noch nicht gefragt – wird beim Einschalten abgefragt'}
      </p>

      {settings.blocks && (
        <button
          onClick={test}
          className="mt-3 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800"
        >
          Test-Erinnerung senden
        </button>
      )}

      {/* Push: auch bei geschlossener App */}
      <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
        <h3 className="text-sm font-semibold">📲 Auch bei geschlossener App (Push)</h3>
        {!pushConfigured() ? (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Der Push-Dienst ist noch nicht eingerichtet.</p>
        ) : !pushSupported() ? (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Dieser Browser kann keine Push-Nachrichten empfangen.</p>
        ) : needsInstallForPush() ? (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Auf dem iPhone/iPad gehen Push-Nachrichten nur in der installierten App: Safari → Teilen → „Zum Home-Bildschirm“, dann PowerPlan von dort öffnen und hier einschalten.
          </p>
        ) : (
          <>
            <label className="mt-2 flex items-center gap-3">
              <input
                type="checkbox"
                checked={push}
                disabled={pushBusy}
                onChange={(e) => togglePush(e.target.checked)}
                className="size-5 cursor-pointer accent-indigo-600"
              />
              <span className="text-sm">Erinnerungen per Push auf dieses Gerät</span>
            </label>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Die Zeitblöcke der nächsten 7 Tage werden an deinen eigenen Push-Dienst gemeldet (nur Uhrzeit und Titel) und kommen verschlüsselt an.
            </p>
            {push && (
              <button
                onClick={testPush}
                className="mt-3 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800"
              >
                Test-Push in 1 Minute
              </button>
            )}
          </>
        )}
      </div>
    </section>
  )
}
