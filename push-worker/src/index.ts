/*
 * PowerPlan Push-Dienst (Cloudflare Worker + D1, kostenloser Tarif)
 *
 * - POST /sync         { subscription, reminders[] } → Gerät anmelden und seine geplanten Erinnerungen ersetzen
 * - POST /unsubscribe  { endpoint }                   → Gerät abmelden
 * - Zeitplan (jede Minute): fällige Erinnerungen als verschlüsselte Web-Push-Nachricht senden
 *
 * Gespeichert wird nur, was für die Erinnerung nötig ist: Zeitpunkt, Titel, Uhrzeit-Text.
 * Nachrichten sind Ende-zu-Ende-verschlüsselt (RFC 8291); der Push-Anbieter (Apple/Google) kann sie nicht lesen.
 */

export interface Env {
  DB: D1Database
  VAPID_PUBLIC_KEY: string // base64url, 65 Byte (unkomprimierter P-256-Punkt)
  VAPID_PRIVATE_KEY: string // base64url, 32 Byte (Secret – nie ins Repository!)
  VAPID_SUBJECT: string // z. B. "mailto:…" oder die App-Adresse
  ALLOWED_ORIGINS: string // Komma-getrennt
}

interface Reminder {
  at: number
  tag: string
  title: string
  body: string
}

const MAX_REMINDERS = 300
const MAX_AHEAD_MS = 8 * 24 * 3600_000

/* ---------------- Hilfen ---------------- */

const enc = new TextEncoder()

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

function bytesToB64url(b: Uint8Array): string {
  let s = ''
  for (const x of b) s += String.fromCharCode(x)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

async function sha256Hex(s: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)))
  return [...d].map((x) => x.toString(16).padStart(2, '0')).join('')
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8))
}

/* ---------------- VAPID (wer sendet?) ---------------- */

async function vapidAuthorization(env: Env, endpoint: string): Promise<string> {
  const pub = b64urlToBytes(env.VAPID_PUBLIC_KEY)
  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    x: bytesToB64url(pub.slice(1, 33)),
    y: bytesToB64url(pub.slice(33, 65)),
    d: env.VAPID_PRIVATE_KEY,
  }
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const header = bytesToB64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const claims = bytesToB64url(
    enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT })),
  )
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${header}.${claims}`)))
  return `vapid t=${header}.${claims}.${bytesToB64url(sig)}, k=${env.VAPID_PUBLIC_KEY}`
}

/* ---------------- Verschlüsselung (RFC 8291, aes128gcm) ---------------- */

async function encryptPayload(p256dh: string, auth: string, plaintext: Uint8Array): Promise<Uint8Array> {
  const uaPublic = b64urlToBytes(p256dh)
  const authSecret = b64urlToBytes(auth)
  const asKeys = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair
  const asPublic = new Uint8Array((await crypto.subtle.exportKey('raw', asKeys.publicKey)) as ArrayBuffer)
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey } as unknown as SubtleCryptoDeriveKeyAlgorithm, asKeys.privateKey, 256))

  const ikm = await hkdf(authSecret, shared, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12)

  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const padded = concat(plaintext, new Uint8Array([2])) // 0x02 = letzter (einziger) Datensatz
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, padded))

  const rs = new Uint8Array(4)
  new DataView(rs.buffer).setUint32(0, 4096)
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, cipher)
}

async function sendPush(env: Env, sub: { endpoint: string; p256dh: string; auth: string }, message: object): Promise<number> {
  const body = await encryptPayload(sub.p256dh, sub.auth, enc.encode(JSON.stringify(message)))
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidAuthorization(env, sub.endpoint),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '900', // nach 15 Min. ist eine Erinnerung nicht mehr sinnvoll
      Urgency: 'high',
    },
    body,
  })
  return res.status
}

/* ---------------- HTTP ---------------- */

function cors(env: Env, req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  return allowed.includes(origin)
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' }
    : {}
}

function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } })
}

function cleanText(s: unknown, max: number): string {
  return String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
}

async function handleSync(env: Env, body: unknown): Promise<Response | { id: string; count: number }> {
  const b = body as { subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }; reminders?: Reminder[] }
  const endpoint = b.subscription?.endpoint
  const p256dh = b.subscription?.keys?.p256dh
  const auth = b.subscription?.keys?.auth
  if (!endpoint || !p256dh || !auth || !/^https:\/\//.test(endpoint)) return new Response('Ungültiges Abo', { status: 400 })

  const id = await sha256Hex(endpoint)
  const now = Date.now()
  const reminders = (Array.isArray(b.reminders) ? b.reminders : [])
    .filter((r) => typeof r?.at === 'number' && r.at > now - 60_000 && r.at < now + MAX_AHEAD_MS)
    .slice(0, MAX_REMINDERS)

  const stmts = [
    env.DB.prepare('INSERT INTO subs (id, endpoint, p256dh, auth, updated_at) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(id) DO UPDATE SET p256dh = ?3, auth = ?4, updated_at = ?5').bind(
      id,
      endpoint,
      p256dh,
      auth,
      now,
    ),
    // Noch nicht gesendete Erinnerungen dieses Geräts komplett ersetzen
    env.DB.prepare('DELETE FROM reminders WHERE sub_id = ?1 AND sent = 0').bind(id),
    ...reminders.map((r) =>
      env.DB.prepare('INSERT INTO reminders (sub_id, at, tag, title, body) VALUES (?1, ?2, ?3, ?4, ?5)').bind(
        id,
        Math.round(r.at),
        cleanText(r.tag, 120),
        cleanText(r.title, 140),
        cleanText(r.body, 140),
      ),
    ),
  ]
  await env.DB.batch(stmts)
  return { id, count: reminders.length }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const headers = cors(env, req)
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (!headers['Access-Control-Allow-Origin']) return new Response('Nicht erlaubt', { status: 403 })
    if (req.method !== 'POST') return new Response('Nur POST', { status: 405, headers })

    const url = new URL(req.url)
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return new Response('Kein JSON', { status: 400, headers })
    }

    if (url.pathname === '/sync') {
      const r = await handleSync(env, body)
      return r instanceof Response ? new Response(r.body, { status: r.status, headers }) : json(r, 200, headers)
    }
    if (url.pathname === '/unsubscribe') {
      const endpoint = (body as { endpoint?: string }).endpoint
      if (endpoint) {
        const id = await sha256Hex(endpoint)
        await env.DB.batch([env.DB.prepare('DELETE FROM reminders WHERE sub_id = ?1').bind(id), env.DB.prepare('DELETE FROM subs WHERE id = ?1').bind(id)])
      }
      return json({ ok: true }, 200, headers)
    }
    return new Response('Unbekannt', { status: 404, headers })
  },

  /** Jede Minute: fällige Erinnerungen senden, Altes aufräumen. */
  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    const now = Date.now()
    const due = await env.DB.prepare(
      `SELECT r.rowid AS rid, r.tag, r.title, r.body, s.id AS sid, s.endpoint, s.p256dh, s.auth
       FROM reminders r JOIN subs s ON s.id = r.sub_id
       WHERE r.sent = 0 AND r.at <= ?1 AND r.at > ?2 LIMIT 200`,
    )
      .bind(now, now - 15 * 60_000)
      .all<{ rid: number; tag: string; title: string; body: string; sid: string; endpoint: string; p256dh: string; auth: string }>()

    const gone = new Set<string>()
    for (const r of due.results) {
      if (gone.has(r.sid)) continue
      try {
        const status = await sendPush(env, r, { title: r.title, body: r.body, tag: r.tag })
        // 404/410 = Abo existiert nicht mehr (App gelöscht, Erlaubnis entzogen) → aufräumen
        if (status === 404 || status === 410) gone.add(r.sid)
      } catch (e) {
        console.error('Push fehlgeschlagen', e)
      }
      await env.DB.prepare('UPDATE reminders SET sent = 1 WHERE rowid = ?1').bind(r.rid).run()
    }
    for (const sid of gone) {
      await env.DB.batch([env.DB.prepare('DELETE FROM reminders WHERE sub_id = ?1').bind(sid), env.DB.prepare('DELETE FROM subs WHERE id = ?1').bind(sid)])
    }
    // Erledigtes und Verpasstes nach einem Tag löschen; Geräte, die sich 60 Tage nicht gemeldet haben, auch
    await env.DB.batch([
      env.DB.prepare('DELETE FROM reminders WHERE at < ?1').bind(now - 24 * 3600_000),
      env.DB.prepare('DELETE FROM subs WHERE updated_at < ?1').bind(now - 60 * 24 * 3600_000),
    ])
  },
}
