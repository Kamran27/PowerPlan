import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import Heute from './pages/Heute'
import Aufgaben from './pages/Aufgaben'
import Statistik from './pages/Statistik'
import Gewohnheiten from './pages/Gewohnheiten'
import Ziele from './pages/Ziele'
import LevelBadge from './components/LevelBadge'
import ReminderService from './components/ReminderService'
import LoginDialog from './components/LoginDialog'
import CloudStatus from './components/CloudStatus'
import LegacyImportBanner from './components/LegacyImportBanner'
import Einstellungen from './pages/Einstellungen'

/** label = Seitenleiste (Desktop), short = Leiste unten (Handy, wenig Platz) */
const navItems = [
  { to: '/heute', label: 'Heute', short: 'Heute', icon: '☀️' },
  { to: '/aufgaben', label: 'Aufgaben', short: 'Aufgaben', icon: '✅' },
  { to: '/gewohnheiten', label: 'Gewohnheiten', short: 'Routinen', icon: '🔁' },
  { to: '/ziele', label: 'Ziele', short: 'Ziele', icon: '🎯' },
  { to: '/statistik', label: 'Statistik', short: 'Statistik', icon: '📈' },
  { to: '/einstellungen', label: 'Einstellungen', short: 'Optionen', icon: '⚙️' },
]

function navClass({ isActive }: { isActive: boolean }) {
  return [
    'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
    'max-md:flex-1 max-md:flex-col max-md:gap-0.5 max-md:px-1 max-md:py-1.5 max-md:text-[11px]',
    isActive
      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
  ].join(' ')
}

export default function App() {
  return (
    <>
    <ReminderService />
    <LoginDialog />
    <div className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 md:flex">
      {/* Seitenleiste (Desktop) / Leiste unten (Handy) */}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 md:static md:w-56 md:shrink-0 md:border-t-0 md:border-r">
        <div className="hidden px-5 py-6 md:block">
          <span className="text-lg font-bold tracking-tight">⚡ PowerPlan</span>
          <LevelBadge className="-mx-3 mt-3" />
          <CloudStatus />
        </div>
        <ul className="flex gap-1 p-2 md:flex-col md:px-3">
          {navItems.map((item) => (
            <li key={item.to} className="max-md:flex-1">
              <NavLink to={item.to} className={navClass} aria-label={item.label}>
                <span aria-hidden>{item.icon}</span>
                <span className="max-md:hidden">{item.label}</span>
                <span className="md:hidden" aria-hidden>
                  {item.short}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-24 md:px-8 md:pt-10 md:pb-10">
        <LegacyImportBanner />
        <Routes>
          <Route path="/" element={<Navigate to="/heute" replace />} />
          <Route path="/heute" element={<Heute />} />
          <Route path="/aufgaben" element={<Aufgaben />} />
          <Route path="/gewohnheiten" element={<Gewohnheiten />} />
          <Route path="/ziele" element={<Ziele />} />
          <Route path="/statistik" element={<Statistik />} />
          <Route path="/einstellungen" element={<Einstellungen />} />
          <Route path="*" element={<Navigate to="/heute" replace />} />
        </Routes>
      </main>
    </div>
    </>
  )
}
