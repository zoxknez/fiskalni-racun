/**
 * Custom Service Worker
 *
 * Advanced caching strategies and background sync
 */

import { BackgroundSyncPlugin, Queue } from 'workbox-background-sync'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'

// Precache app shell
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// ============================================
// CACHING STRATEGIES
// ============================================

// API calls - Network First with 1 hour cache
registerRoute(
  ({ url }) => url.origin.includes('supabase.co'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60, // 1 hour
        purgeOnQuotaError: true,
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
)

// Images - Cache First with 30 day retention
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        purgeOnQuotaError: true,
      }),
    ],
  })
)

// Fonts - Cache First with 1 year retention
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: 'fonts',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
      }),
    ],
  })
)

// Static assets - Cache First
registerRoute(
  ({ url }) => url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|woff2?)$/),
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      }),
    ],
  })
)

// HTML pages - Network First
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      }),
    ],
  })
)

// ============================================
// BACKGROUND SYNC
// ============================================

const bgSyncPlugin = new BackgroundSyncPlugin('syncQueue', {
  maxRetentionTime: 24 * 60, // 24 hours in minutes
  onSync: async ({ queue }) => {
    let entry
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request.clone())
        console.log('[SW] Background sync successful:', entry.request.url)
      } catch (error) {
        console.error('[SW] Background sync failed:', error)
        await queue.unshiftRequest(entry)
        throw error
      }
    }
  },
})

// Register background sync for failed POST/PUT/PATCH/DELETE requests
registerRoute(
  ({ url, request }) =>
    url.origin.includes('supabase.co') &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method),
  new NetworkFirst({
    cacheName: 'api-mutations',
    plugins: [bgSyncPlugin],
  }),
  'POST'
)

// ============================================
// PUSH NOTIFICATIONS
// ============================================

self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event)

  const data = event.data?.json() || {}

  const options = {
    body: data.body || 'Nova notifikacija',
    icon: '/logo.svg',
    badge: '/badge.png',
    vibrate: [200, 100, 200],
    data: data.url || '/',
    actions: [
      { action: 'view', title: 'Pogledaj', icon: '/icons/view.png' },
      { action: 'dismiss', title: 'Zatvori', icon: '/icons/close.png' },
    ],
    tag: data.tag || 'default',
    requireInteraction: false,
  }

  event.waitUntil(self.registration.showNotification(data.title || 'Fiskalni Račun', options))
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag)

  event.notification.close()

  if (event.action === 'view') {
    const url = event.notification.data || '/'
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Focus existing window if open
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus()
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url)
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
    // Get all pending requests from IndexedDB sync queue
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
// SKIP WAITING
// ============================================

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

console.log('[SW] Service Worker initialized')
