# ⚡ PowerPlan

Persönliche Web-App für Tages- und Produktivitätsplanung, die beim Dranbleiben hilft.
Planung & Notizen: Second Brain → `01 Projekte/PowerPlan/PowerPlan.md`

## Starten
```bash
npm install
npm run dev      # Entwicklungsserver auf http://localhost:5173
npm run build    # Produktions-Build nach dist/
```

## Technik
React 19 · TypeScript · Vite · Tailwind CSS 4 · Dexie (IndexedDB) · React Router

## Struktur
- `src/db.ts`: lokale Datenbank (Aufgaben, Zeitblöcke, Tagesbilanzen)
- `src/App.tsx`: Layout und Navigation
- `src/pages/`: Seiten (Heute, Aufgaben, Statistik)
- `src/components/`: wiederverwendbare Bausteine
