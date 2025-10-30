/**
 * PWA Update Hook
 *
 * Detects and handles service worker updates
 *
 * @module hooks/usePWAUpdate
 */

import { useRegisterSW } from 'virtual:pwa-register/react'
import { useCallback } from 'react'
import { logger } from '@/lib/logger'

/**
 * Hook to handle PWA updates
 *
 * @example
 * ```tsx
 * function UpdateNotification() {
 *   const { needRefresh, updateServiceWorker } = usePWAUpdate()
 *
 *   if (!needRefresh) return null
 *
 *   return (
 *     <div>
 *       Nova verzija dostupna!
 *       <button onClick={updateServiceWorker}>Ažuriraj</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function usePWAUpdate() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      logger.info('Service Worker registered:', registration)

      // ⚠️ MEMORY LEAK FIX: Store interval ID and clear on unload
      // Check for updates every hour
      const intervalId = setInterval(
        () => {
          registration?.update()
        },
        60 * 60 * 1000
      )

      // ⚠️ MEMORY LEAK FIX: Clear interval on page unload
      if (typeof window !== 'undefined') {
        const cleanup = () => clearInterval(intervalId)
        window.addEventListener('beforeunload', cleanup, { once: true })
      }
    },

    onRegisterError(error) {
      logger.error('Service Worker registration failed:', error)
    },

    onNeedRefresh() {
      logger.info('New app version available')
      setNeedRefresh(true)
    },

    onOfflineReady() {
      logger.info('App ready to work offline')
    },
  })

  const update = useCallback(async () => {
    try {
      await updateServiceWorker(true)
      logger.info('Service Worker updated, reloading...')

      // Track update
      if (window.posthog) {
        window.posthog.capture('app_updated')
      }
    } catch (error) {
      logger.error('Service Worker update failed:', error)
    }
  }, [updateServiceWorker])

  const dismiss = useCallback(() => {
    setNeedRefresh(false)
  }, [setNeedRefresh])

  return {
    needRefresh,
    update,
    dismiss,
  }
}
