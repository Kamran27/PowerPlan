import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import Heute from './pages/Heute'
import Aufgaben from './pages/Aufgaben'
import Statistik from './pages/Statistik'
import Gewohnheiten from './pages/Gewohnheiten'
import Einstellungen from './pages/Einstellungen'

const navItems = [
  { to: '/heute', label: 'Heute', icon: '☀️' },
  { to: '/aufgaben', label: 'Aufgaben', icon: '✅' },
  { to: '/gewohnheiten', label: 'Gewohnheiten', icon: '🔁' },
  { to: '/statistik', label: 'Statistik', icon: '📈' },
  { to: '/einstellungen', label: 'Einstellungen', icon: '⚙️' },
]

function navClass({ isActive }: { isActive: boolean }) {
  return [
    'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
    'max-md:flex-1 max-md:flex-col max-md:gap-0.5 max-md:py-1.5 max-md:text-xs',
    isActive
      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
  ].join(' ')
}

export default function App() {
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 md:flex">
      {/* Seitenleiste (Desktop) / Leiste unten (Handy) */}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 md:static md:w-56 md:shrink-0 md:border-t-0 md:border-r">
        <div className="hidden px-5 py-6 md:block">
          <span className="text-lg font-bold tracking-tight">⚡ PowerPlan</span>
        </div>
        <ul className="flex gap-1 p-2 md:flex-col md:px-3">
          {navItems.map((item) => (
            <li key={item.to} className="max-md:flex-1">
              <NavLink to={item.to} className={navClass}>
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-24 md:px-8 md:pt-10 md:pb-10">
        <Routes>
          <Route path="/" element={<Navigate to="/heute" replace />} />
          <Route path="/heute" element={<Heute />} />
          <Route path="/aufgaben" element={<Aufgaben />} />
          <Route path="/gewohnheiten" element={<Gewohnheiten />} />
          <Route path="/statistik" element={<Statistik />} />
          <Route path="/einstellungen" element={<Einstellungen />} />
          <Route path="*" element={<Navigate to="/heute" replace />} />
        </Routes>
      </main>
    </div>
  )
}
