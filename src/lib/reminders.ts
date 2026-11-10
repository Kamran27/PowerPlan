import { readStore, writeStore } from './storage'

/** Einstellungen der Erinnerungen – pro Browser/Gerät gespeichert (Benachrichtigungen sind ohnehin gerätebezogen). */
export interface ReminderSettings {
  blocks: boolean
  /** Minuten vor Blockbeginn */
  leadMinutes: number
}

const KEY = 'powerplan.reminders'
const DEFAULTS: ReminderSettings = { blocks: false, leadMinutes: 5 }

export function getReminderSettings(): ReminderSettings {
  return { ...DEFAULTS, ...readStore<Partial<ReminderSettings>>(KEY, {}) }
}

export function setReminderSettings(s: ReminderSettings) {
  writeStore(KEY, s)
  window.dispatchEvent(new Event('powerplan-reminders-changed'))
}

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

/** Fragt (falls nötig) nach der Erlaubnis für Benachrichtigungen. */
export async function ensurePermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

/**
 * Zeigt eine System-Benachrichtigung. Über den Service Worker, wenn vorhanden
 * (nötig für installierte Apps, z. B. auf dem iPhone), sonst direkt.
 */
export async function showNotification(title: string, body: string, tag: string) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false
  const options: NotificationOptions = { body, tag, icon: '/pwa-192.png', badge: '/pwa-192.png' }
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      await reg.showNotification(title, options)
      return true
    }
  } catch {
    // weiter mit dem direkten Weg
  }
  new Notification(title, options)
  return true
}
