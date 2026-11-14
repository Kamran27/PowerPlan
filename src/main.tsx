import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { ToastProvider } from './components/Toast'
import GameProvider from './components/GameProvider'
import { watchSystemTheme } from './lib/theme'
import { registerSW } from 'virtual:pwa-register'

watchSystemTheme()

// Neue Version zuverlässig übernehmen: beim Zurückkehren zur App und alle 30 Min. nachsehen.
// Ist eine da, lädt die App sich selbst neu (registerType „autoUpdate“).
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (!reg) return
    const check = () => reg.update().catch(() => {})
    window.setInterval(check, 30 * 60_000)
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check())
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* basename: lokal "/", auf GitHub Pages "/PowerPlan" */}
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <ToastProvider>
        <GameProvider>
          <App />
        </GameProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
