import { useEffect, useRef, useState } from 'react'
import { CalendarCheck, CalendarDays, ChartColumn, Ellipsis, ListChecks, Repeat, Search, Settings, Sun, Target, Users } from 'lucide-react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Heute from './pages/Heute'
import Woche from './pages/Woche'
import Aufgaben from './pages/Aufgaben'
import Gemeinsam from './pages/Gemeinsam'
import Bereich from './pages/Bereich'
import Statistik from './pages/Statistik'
import Gewohnheiten from './pages/Gewohnheiten'
import Ziele from './pages/Ziele'
import Einstellungen from './pages/Einstellungen'
import Suche from './pages/Suche'
import Wochenrueckblick from './pages/Wochenrueckblick'
import LevelBadge from './components/LevelBadge'
import ReminderService from './components/ReminderService'
import LoginDialog from './components/LoginDialog'
import FocusBar from './components/FocusBar'
import PushSync from './components/PushSync'
import QuickAddFab from './components/QuickAddFab'
import KudosNotifier from './components/KudosNotifier'
import CatWalker from './components/CatWalker'
import { SleepingCat } from './components/Cats'
import { triggerCatParade } from './lib/celebrate'
import CloudStatus from './components/CloudStatus'
import LegacyImportBanner from './components/LegacyImportBanner'

/**
 * label = Seitenleiste (Desktop), short = Leiste unten (Handy).
 * more = auf dem Handy im „Mehr“-Menü statt in der Leiste (zu wenig Platz für alle).
 */
const navItems = [
  { to: '/heute', label: 'Heute', short: 'Heute', icon: Sun },
  { to: '/woche', label: 'Woche', short: 'Woche', icon: CalendarDays },
  { to: '/aufgaben', label: 'Aufgaben', short: 'Aufgaben', icon: ListChecks },
  { to: '/gemeinsam', label: 'Gemeinsam', short: 'Gemeinsam', icon: Users },
  { to: '/gewohnheiten', label: 'Gewohnheiten', short: 'Routinen', icon: Repeat },
  { to: '/ziele', label: 'Ziele', short: 'Ziele', icon: Target },
  { to: '/suche', label: 'Suche', short: 'Suche', icon: Search, more: true },
  { to: '/wochenrueckblick', label: 'Wochenrückblick', short: 'Rückblick', icon: CalendarCheck, more: true },
  { to: '/statistik', label: 'Statistik', short: 'Statistik', icon: ChartColumn, more: true },
  { to: '/einstellungen', label: 'Einstellungen', short: 'Einstellungen', icon: Settings, more: true },
]

function navClass({ isActive }: { isActive: boolean }) {
  return [
    'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
    'max-md:flex-1 max-md:flex-col max-md:gap-0.5 max-md:px-0.5 max-md:py-1.5 max-md:text-[10px]',
    isActive
      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
  ].join(' ')
}

export default function App() {
  const { pathname } = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const logoTaps = useRef<number[]>([])
  // Der Wochenkalender bekommt mehr Breite als die übrigen Seiten
  const wide = pathname.startsWith('/woche')
  const moreActive = navItems.some((i) => i.more && pathname.startsWith(i.to))

  // „Mehr“-Menü beim Seitenwechsel schließen
  useEffect(() => setMoreOpen(false), [pathname])

  // Strg/⌘ + K öffnet überall die Suche
  const navigate = useNavigate()
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        navigate('/suche')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return (
    <>
      <ReminderService />
      <LoginDialog />
      <FocusBar />
      <PushSync />
      <QuickAddFab />
      <KudosNotifier />
      <CatWalker />
      <div className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 md:flex">
        {/* Seitenleiste (Desktop) / Leiste unten (Handy) */}
        <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 md:static md:w-56 md:shrink-0 md:border-t-0 md:border-r">
          <div className="hidden px-5 py-6 md:block">
            {/* Geheimtipp: 5× schnell aufs Logo tippen → Katzenparade */}
            <button
              type="button"
              onClick={() => {
                const now = Date.now()
                logoTaps.current = [...logoTaps.current.filter((t) => now - t < 2000), now]
                if (logoTaps.current.length >= 5) {
                  logoTaps.current = []
                  triggerCatParade()
                }
              }}
              className="text-lg font-bold tracking-tight"
            >
              ⚡ PowerPlan
            </button>
            <LevelBadge className="-mx-3 mt-3" />
            <CloudStatus />
          </div>
          <ul className="flex gap-1 p-2 md:flex-col md:px-3">
            {navItems.map((item) => (
              <li key={item.to} className={item.more ? 'max-md:hidden' : 'max-md:flex-1'}>
                <NavLink to={item.to} className={navClass} aria-label={item.label}>
                  <item.icon aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
                  <span className="max-md:hidden">{item.label}</span>
                  <span className="md:hidden" aria-hidden>
                    {item.short}
                  </span>
                </NavLink>
              </li>
            ))}
            {/* Handy: „Mehr“ für Statistik & Einstellungen */}
            <li className="relative flex-1 md:hidden">
              <button
                onClick={() => setMoreOpen((o) => !o)}
                aria-expanded={moreOpen}
                aria-label="Mehr"
                className={navClass({ isActive: moreActive || moreOpen }) + ' w-full'}
              >
                <Ellipsis aria-hidden className="size-5" strokeWidth={1.75} />
                <span aria-hidden>Mehr</span>
              </button>
              {moreOpen && (
                <div className="absolute right-0 bottom-full mb-2 w-48 rounded-xl bg-white p-1 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                  {navItems
                    .filter((i) => i.more)
                    .map((i) => (
                      <NavLink
                        key={i.to}
                        to={i.to}
                        className={({ isActive }) =>
                          `flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`
                        }
                      >
                        <i.icon aria-hidden className="size-4" strokeWidth={1.75} /> {i.label}
                      </NavLink>
                    ))}
                </div>
              )}
            </li>
          </ul>
          {/* Versteckt: unten in der Seitenleiste schläft eine Katze (nur am Computer) */}
          <SleepingCat className="mx-auto mt-10 hidden w-20 text-slate-300 md:block dark:text-slate-700" />
        </nav>

        <main className={`mx-auto w-full px-4 ${wide ? 'max-w-7xl' : 'max-w-5xl'} pt-6 pb-36 md:px-8 md:pt-10 md:pb-10`}>
          <LegacyImportBanner />
          {/* key = Seitenwechsel → sanft einblenden */}
          <div key={pathname.split('/').slice(0, 2).join('/')} className="page-in">
          <Routes>
            <Route path="/" element={<Navigate to="/heute" replace />} />
            <Route path="/heute" element={<Heute />} />
            <Route path="/woche" element={<Woche />} />
            <Route path="/aufgaben" element={<Aufgaben />} />
            <Route path="/gemeinsam" element={<Gemeinsam />} />
            <Route path="/gemeinsam/:spaceId" element={<Bereich />} />
            <Route path="/gewohnheiten" element={<Gewohnheiten />} />
            <Route path="/ziele" element={<Ziele />} />
            <Route path="/statistik" element={<Statistik />} />
            <Route path="/einstellungen" element={<Einstellungen />} />
            <Route path="/suche" element={<Suche />} />
            <Route path="/wochenrueckblick" element={<Wochenrueckblick />} />
            <Route path="*" element={<Navigate to="/heute" replace />} />
          </Routes>
          </div>
        </main>
      </div>
    </>
  )
}
