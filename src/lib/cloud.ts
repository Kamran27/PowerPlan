import type { SyncState } from 'dexie-cloud-addon'

/** Lesbarer Sync-Status mit Symbol. */
export function describeSync(s?: SyncState): { icon: string; text: string; tone: 'ok' | 'busy' | 'warn' } {
  if (!s) return { icon: '☁️', text: 'Verbinde …', tone: 'busy' }
  if (s.license === 'expired') return { icon: '⚠️', text: 'Lizenz abgelaufen – Sync pausiert', tone: 'warn' }
  if (s.phase === 'offline' || s.status === 'offline') return { icon: '📴', text: 'Offline – wird später abgeglichen', tone: 'warn' }
  if (s.phase === 'error' || s.status === 'error') return { icon: '⚠️', text: 'Sync-Fehler', tone: 'warn' }
  if (s.phase === 'pushing' || s.phase === 'pulling' || s.phase === 'not-in-sync' || s.status === 'connecting')
    return { icon: '🔄', text: 'Synchronisiere …', tone: 'busy' }
  if (s.phase === 'in-sync') return { icon: '☁️', text: 'Synchronisiert', tone: 'ok' }
  return { icon: '☁️', text: 'Verbinde …', tone: 'busy' }
}
