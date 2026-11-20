import { useSyncExternalStore } from 'react'
import { readStore, writeStore } from './storage'

/*
 * „Was ich nutze“: Bereiche der App ein- und ausschalten (pro Gerät/Person).
 * Ausgeschaltet = nicht in der Navigation und nicht auf der Heute-Seite; die Daten bleiben erhalten.
 */

export type ModuleId = 'gemeinsam' | 'gewohnheiten' | 'ziele' | 'budget' | 'rueckblick' | 'statistik' | 'punkte'

export const MODULES: { id: ModuleId; label: string; emoji: string; desc: string }[] = [
  { id: 'gemeinsam', label: 'Gemeinsam', emoji: '👥', desc: 'Haushalt, Einkauf, Reisen, gemeinsames Budget' },
  { id: 'gewohnheiten', label: 'Gewohnheiten', emoji: '🔁', desc: 'Routinen abhaken, auch auf der Heute-Seite' },
  { id: 'ziele', label: 'Ziele & Wochenfokus', emoji: '🎯', desc: 'Monatsziele und Top 3 der Woche' },
  { id: 'budget', label: 'Mein Budget', emoji: '💶', desc: 'Persönliche Ausgaben und Fixkosten' },
  { id: 'rueckblick', label: 'Wochenrückblick', emoji: '🗓️', desc: 'Geführter Rückblick am Wochenende' },
  { id: 'statistik', label: 'Statistik', emoji: '📊', desc: 'Auswertungen und Jahresübersicht' },
  { id: 'punkte', label: 'Punkte, Level & Streak', emoji: '🏆', desc: 'Belohnungen fürs Erledigen' },
]

const KEY = 'powerplan-modules-off'
const listeners = new Set<() => void>()
let cache: ModuleId[] | undefined

function off(): ModuleId[] {
  if (!cache) cache = readStore<ModuleId[]>(KEY, [])
  return cache
}

export function moduleOn(id: ModuleId): boolean {
  return !off().includes(id)
}

export function setModule(id: ModuleId, on: boolean) {
  cache = on ? off().filter((m) => m !== id) : [...new Set([...off(), id])]
  writeStore(KEY, cache)
  listeners.forEach((l) => l())
}

/** Liste der ausgeschalteten Module – aktualisiert sich überall sofort */
export function useModules(): (id: ModuleId) => boolean {
  const list = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    off,
  )
  return (id) => !list.includes(id)
}

/** „ – +10 Punkte“ nur, wenn Punkte eingeschaltet sind */
export function plusPoints(n: number, sep = ' · '): string {
  return moduleOn('punkte') ? `${sep}+${n} Punkte` : ''
}
