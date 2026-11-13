/*
 * Push-Erinnerungen im Service Worker (wird von vite-plugin-pwa in sw.js geladen).
 * Der Push-Dienst (push-worker/) schickt verschlüsselt: { title, body, tag }.
 * Gleiches „tag“ wie die Erinnerung in der offenen App → keine doppelte Benachrichtigung.
 */
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = { title: 'PowerPlan', body: event.data ? event.data.text() : '' }
  }
  const icon = self.registration.scope + 'pwa-192.png'
  event.waitUntil(
    self.registration.showNotification(data.title || 'PowerPlan', {
      body: data.body || '',
      tag: data.tag || 'powerplan',
      icon,
      badge: icon,
      data: { url: self.registration.scope + 'heute' },
    }),
  )
})

// Tippen auf die Benachrichtigung: offene App nach vorne holen, sonst öffnen
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if ('focus' in c) return c.focus()
      return self.clients.openWindow(url)
    }),
  )
})
