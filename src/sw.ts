/// <reference lib="webworker" />
// @ts-nocheck - Service Worker koristi workbox tipove koji nisu 100% kompatibilni sa exactOptionalPropertyTypes

/**
 * Custom Service Worker za Fiskalni Račun
 *
 * Koristi injectManifest režim sa vite-plugin-pwa
 * Ovaj fajl se kompajlira i bundluje sa svim workbox dependencijama
 */

import { BackgroundSyncPlugin, Queue } from 'workbox-background-sync'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'

declare const self: ServiceWorkerGlobalScope

// Precache app shell - __WB_MANIFEST se zamenjuje listom precache-ovanih fajlova
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// ============================================
// CACHING STRATEGIES
// ============================================

// API Routes (Neon/Vercel) - Network First
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 5, // 5 minutes
        purgeOnQuotaError: true,
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
)

// Slike - Cache First sa 30 dana
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'image-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dana
        purgeOnQuotaError: true,
      }),
    ],
  })
)

// Fontovi - Cache First sa 1 godinom
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: 'font-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 godina
      }),
    ],
  })
)

// Google Fonts stylesheets
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-styles',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
)

// Google Fonts webfonts
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 godina
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
)

// Statički asseti - Cache First
registerRoute(
  ({ url }) => /\.(js|css|woff2?)$/.test(url.pathname),
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 dana
      }),
    ],
  })
)

// ============================================
// BACKGROUND SYNC
// ============================================

const bgSyncPlugin = new BackgroundSyncPlugin('syncQueue', {
  maxRetentionTime: 24 * 60, // 24 sata u minutima
  onSync: async ({ queue }) => {
    let entry = await queue.shiftRequest()
    while (entry) {
      try {
        await fetch(entry.request.clone())
        console.log('[SW] Background sync successful:', entry.request.url)
        entry = await queue.shiftRequest()
      } catch (error) {
        console.error('[SW] Background sync failed:', error)
        await queue.unshiftRequest(entry)
        throw error
      }
    }
  },
})

// Background sync for Neon API mutations
registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method),
  new NetworkFirst({
    cacheName: 'api-mutations',
    plugins: [bgSyncPlugin],
  })
)

// ============================================
// PUSH NOTIFICATIONS
// ============================================

self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received')

  const data = event.data?.json() ?? {}

  const options: NotificationOptions = {
    body: data.body ?? 'Nova notifikacija',
    icon: '/logo.svg',
    badge: '/badge.png',
    vibrate: [200, 100, 200],
    data: data.url ?? '/',
    actions: [
      { action: 'view', title: 'Pogledaj' },
      { action: 'dismiss', title: 'Zatvori' },
    ],
    tag: data.tag ?? 'default',
    requireInteraction: false,
  }

  event.waitUntil(self.registration.showNotification(data.title ?? 'Fiskalni Račun', options))
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag)

  event.notification.close()

  if (event.action === 'view') {
    const url = (event.notification.data as string) ?? '/'
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clientList) => {
        // Focus existing window if open
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus()
          }
        }
        // Open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(url)
        }
      })
    )
  }
})

// ============================================
// PERIODIC BACKGROUND SYNC
// ============================================

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncPendingData())
  }
})

async function syncPendingData() {
  console.log('[SW] Periodic sync started')

  try {
    const queue = new Queue('syncQueue')
    const entries = await queue.getAll()

    for (const entry of entries) {
      try {
        await fetch(entry.request.clone())
        await queue.shiftRequest()
      } catch (error) {
        console.error('[SW] Sync failed for:', entry.request.url, error)
      }
    }

    console.log('[SW] Periodic sync completed')
  } catch (error) {
    console.error('[SW] Periodic sync error:', error)
  }
}

// ============================================
// INSTALL & ACTIVATE EVENTS
// ============================================

self.addEventListener('install', () => {
  console.log('[SW] Installing new Service Worker version')
  // Odmah preuzmi novi SW bez čekanja
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker')
  event.waitUntil(
    (async () => {
      // Dobij sve cache imena
      const cacheNames = await caches.keys()
      console.log('[SW] Found caches:', cacheNames)

      // Aktuelni cache-evi koje ne brišemo
      const currentCaches = [
        'neon-api-cache',
        'image-cache',
        'font-cache',
        'google-fonts-styles',
        'google-fonts-webfonts',
        'static-assets',
        'api-mutations',
      ]

      // Briši stare cache-eve
      const deletePromises = cacheNames
        .filter((name) => {
          // Workbox precache ima specifičan format
          if (name.startsWith('workbox-precache')) return false
          return !currentCaches.includes(name)
        })
        .map((name) => {
          console.log('[SW] Deleting old cache:', name)
          return caches.delete(name)
        })

      await Promise.all(deletePromises)
      console.log('[SW] Cache cleanup completed')

      // Preuzmi kontrolu nad svim klijentima
      await self.clients.claim()
    })()
  )
})

// ============================================
// MESSAGE HANDLERS
// ============================================

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data?.type === 'FORCE_REFRESH') {
    console.log('[SW] Force refresh requested')
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'CLEAR_CACHE_AND_RELOAD' })
      })
    })
  }

  if (event.data?.type === 'GET_VERSION') {
    event.ports?.[0]?.postMessage({ version: '1.0.0' })
  }
})

console.log('[SW] Service Worker initialized')
