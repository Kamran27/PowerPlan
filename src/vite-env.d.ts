/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Nur beim Entwickeln: Adresse der Test-Datenbank (siehe .env.development) */
  readonly VITE_DEXIE_DB_URL?: string
}
