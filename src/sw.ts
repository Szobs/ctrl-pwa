/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  const { title, body, icon, badge, url, tag } = data

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: icon || '/ctrl-pwa/icon-192.png',
      badge: badge || '/ctrl-pwa/icon-192.png',
      tag: tag || 'ctrl-notification',
      data: { url: url || '/ctrl-pwa/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/ctrl-pwa/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      const existing = clients.find(c => c.url.includes('ctrl-pwa'))
      if (existing) return existing.focus()
      return self.clients.openWindow(url)
    })
  )
})
