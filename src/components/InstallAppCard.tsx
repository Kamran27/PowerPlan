import { useEffect, useState } from 'react'

/** Ereignis, das Chrome/Edge vor dem Installieren einer Web-App auslösen. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

const card = 'mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'

/** Einstellungen → PowerPlan als App installieren (PWA). */
export default function InstallAppCard() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandalone)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault() // eigenen Knopf zeigen statt Browser-Leiste
      setPrompt(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function install() {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setPrompt(null)
  }

  return (
    <section className={card}>
      <h2 className="font-semibold">App installieren</h2>
      {installed ? (
        <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">✅ PowerPlan läuft als installierte App.</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Installiert startet PowerPlan in einem eigenen Fenster, ohne Browser-Leiste, und funktioniert auch offline.
          </p>
          {prompt ? (
            <button onClick={install} className="mt-3 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
              ⚡ PowerPlan installieren
            </button>
          ) : (
            <ul className="mt-3 grid gap-1 text-sm text-slate-600 dark:text-slate-300">
              <li>
                <strong>Chrome / Edge:</strong> Installieren-Symbol rechts in der Adressleiste
              </li>
              <li>
                <strong>Safari (Mac):</strong> Ablage → Zum Dock hinzufügen
              </li>
              <li>
                <strong>iPhone / iPad (Safari):</strong> Teilen → Zum Home-Bildschirm
              </li>
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Wichtig: Jede Adresse hat ihren eigenen Datenspeicher. Nimm deine Daten per „Sicherung exportieren/importieren“ mit.
          </p>
        </>
      )}
    </section>
  )
}
