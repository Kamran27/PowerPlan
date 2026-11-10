import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Pfad, unter dem die App läuft: lokal "/", auf GitHub Pages "/PowerPlan/" (Build mit --mode github).
export default defineConfig(({ mode }) => {
  const base = mode === 'github' ? '/PowerPlan/' : '/'

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      // Installierbare App (PWA): Manifest + Service Worker für Offline-Betrieb.
      // Im Entwicklungsmodus (npm run dev) ist der Service Worker aus; testen mit: npm run build && npm run preview
      VitePWA({
        registerType: 'autoUpdate', // neue Version wird beim nächsten Öffnen automatisch übernommen
        includeAssets: ['apple-touch-icon.png'],
        manifest: {
          name: 'PowerPlan',
          short_name: 'PowerPlan',
          description: 'Persönliche Tages- und Produktivitätsplanung, die beim Dranbleiben hilft.',
          lang: 'de',
          start_url: `${base}heute`,
          scope: base,
          display: 'standalone',
          background_color: '#f8fafc',
          theme_color: '#4f46e5',
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
          navigateFallback: `${base}index.html`, // alle Seiten (/heute, /ziele …) funktionieren offline
        },
      }),
    ],
  }
})
