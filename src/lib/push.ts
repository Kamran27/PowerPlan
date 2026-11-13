import { db } from '../db'
import { addDays, todayISO } from './date'
import { ensurePermission, getReminderSettings } from './reminders'
import { readStore, writeStore } from './storage'

/*
 * Push-Erinnerungen: kommen auch bei geschlossener App (iPhone: nur als installierte App vom Home-Bildschirm).
 * Die App meldet ihre geplanten Erinnerungen (Zeitblöcke der nächsten 7 Tage) an den eigenen Push-Dienst
 * (Ordner push-worker/, Cloudflare). Der schickt sie zur richtigen Zeit verschlüsselt ans Gerät.
 */

/** Adresse des Push-Dienstes und öffentlicher Schlüssel – werden beim Einrichten (push-worker/) gesetzt. */
export const PUSH_URL = ''
export const VAPID_PUBLIC_KEY = ''

const KEY = 'powerplan.push'

export interface PushReminder {
  at: number
  tag: string
  title: string
  body: string
}

export function pushConfigured(): boolean {
  return !!PUSH_URL && !!VAPID_PUBLIC_KEY
}

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** iPhone/iPad im normalen Safari-Tab: Push geht dort erst als installierte App. */
export function needsInstallForPush(): boolean {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
  return ios && !standalone
}

export function pushEnabled(): boolean {
  return readStore<boolean>(KEY, false)
}

function setPushEnabled(v: boolean) {
  writeStore(KEY, v)
  window.dispatchEvent(new Event('powerplan-reminders-changed'))
}

function keyBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64url.length + 3) % 4)
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

async function getSubscription(create: boolean): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) throw new Error('Push geht nur in der veröffentlichten/installierten App (kein Service Worker in der Entwicklungsversion).')
  const existing = await reg.pushManager.getSubscription()
  if (existing || !create) return existing
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) as BufferSource })
}

/** Erinnerungen der nächsten 7 Tage aus dem Tagesplan (erledigte Aufgaben ausgenommen). */
export async function buildReminders(now = Date.now()): Promise<PushReminder[]> {
  const { leadMinutes } = getReminderSettings()
  const today = todayISO()
  const blocks = await db.timeBlocks.where('date').between(today, addDays(today, 7), true, true).toArray()
  const out: PushReminder[] = []
  for (const b of blocks) {
    const task = b.taskId ? await db.tasks.get(b.taskId) : undefined
    if (task?.done) continue
    const [y, m, d] = b.date.split('-').map(Number)
    const [hh, mm] = b.start.split(':').map(Number)
    const at = new Date(y, m - 1, d, hh, mm).getTime() - leadMinutes * 60_000
    if (at < now - 60_000) continue
    const title = task?.title ?? b.title
    out.push({
      at,
      // gleiches Kennzeichen wie die Erinnerung in der offenen App (ReminderService) → nicht doppelt
      tag: `${b.date}|${b.id}|${b.start}`,
      title: `${leadMinutes ? `In ${leadMinutes} Min.` : 'Jetzt'}: ${title}`,
      body: `${b.start}–${b.end} Uhr`,
    })
  }
  return out.sort((a, b) => a.at - b.at)
}

async function post(path: string, body: unknown) {
  const res = await fetch(`${PUSH_URL}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`Push-Dienst antwortet nicht (${res.status})`)
  return res.json()
}

/** Geplante Erinnerungen an den Push-Dienst melden (ersetzt die vorherigen dieses Geräts). */
export async function syncPush(extra: PushReminder[] = []): Promise<number> {
  if (!pushConfigured() || !pushEnabled()) return 0
  const sub = await getSubscription(false)
  if (!sub) return 0
  const reminders = [...extra, ...(await buildReminders())]
  const r = (await post('/sync', { subscription: sub.toJSON(), reminders })) as { count: number }
  return r.count
}

export async function enablePush(): Promise<void> {
  const p = await ensurePermission()
  if (p !== 'granted') throw new Error('Benachrichtigungen sind nicht erlaubt.')
  await getSubscription(true)
  setPushEnabled(true)
  await syncPush()
}

export async function disablePush(): Promise<void> {
  setPushEnabled(false)
  const sub = await getSubscription(false).catch(() => null)
  if (!sub) return
  await post('/unsubscribe', { endpoint: sub.endpoint }).catch(() => undefined)
  await sub.unsubscribe()
}

/** Test: Push-Nachricht in etwa einer Minute (die App darf dafür geschlossen werden). */
export async function sendTestPush(): Promise<void> {
  await syncPush([{ at: Date.now() + 30_000, tag: `test-${Date.now()}`, title: '🔔 PowerPlan-Test', body: 'Push-Erinnerungen funktionieren – auch bei geschlossener App.' }])
}
