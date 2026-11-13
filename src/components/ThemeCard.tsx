import { useState } from 'react'
import { getTheme, setTheme, type Theme } from '../lib/theme'

const OPTIONS: [Theme, string][] = [
  ['system', '🖥️ Wie das System'],
  ['light', '☀️ Hell'],
  ['dark', '🌙 Dunkel'],
]

/** Einstellungen → Darstellung: hell, dunkel oder wie das System (pro Gerät). */
export default function ThemeCard() {
  const [theme, setLocal] = useState<Theme>(getTheme)
  return (
    <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <h2 className="font-semibold">Darstellung</h2>
      <div role="radiogroup" aria-label="Darstellung" className="mt-3 flex flex-wrap gap-2">
        {OPTIONS.map(([value, label]) => (
          <button
            key={value}
            role="radio"
            aria-checked={theme === value}
            onClick={() => {
              setTheme(value)
              setLocal(value)
            }}
            className={`rounded-lg px-3 py-2 text-sm font-medium ring-1 ${
              theme === value
                ? 'bg-indigo-600 text-white ring-indigo-600'
                : 'text-slate-700 ring-slate-300 hover:bg-slate-50 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Gilt für dieses Gerät.</p>
    </section>
  )
}
