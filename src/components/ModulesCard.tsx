import { MODULES, setModule, useModules } from '../lib/modules'

/** Einstellungen → Was ich nutze: Bereiche ein- und ausschalten (pro Gerät, Daten bleiben erhalten). */
export default function ModulesCard() {
  const on = useModules()
  return (
    <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <h2 className="font-semibold">Was ich nutze</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Ausgeschaltetes verschwindet aus Menü und Heute-Seite. Deine Daten bleiben erhalten; gilt nur für dieses Gerät.
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {MODULES.map((m) => {
          const checked = on(m.id)
          return (
            <li key={m.id}>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 transition ${
                  checked ? 'bg-indigo-50/60 ring-indigo-200 dark:bg-indigo-500/10 dark:ring-indigo-500/30' : 'ring-slate-200 dark:ring-slate-700'
                }`}
              >
                <input type="checkbox" checked={checked} onChange={(e) => setModule(m.id, e.target.checked)} className="mt-0.5 size-4 accent-indigo-600" />
                <span className="text-sm">
                  <span className="font-medium">
                    {m.emoji} {m.label}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{m.desc}</span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
