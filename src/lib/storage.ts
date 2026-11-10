/** Kleine, fehlertolerante Hülle um localStorage (kann im privaten Modus fehlen oder werfen). */
export function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function writeStore(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Speichern nicht möglich – ignorieren, die App funktioniert trotzdem.
  }
}
