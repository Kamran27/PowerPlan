import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { ToastProvider } from './components/Toast'
import GameProvider from './components/GameProvider'

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
