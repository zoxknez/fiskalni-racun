import { useEffect, useRef } from 'react'
import { logger } from '@/lib/logger'

/**
 * Hook koji sluša na update poruke od Service Workera
 * i automatski briše cache + reloaduje stranicu
 */
export function useSWUpdate() {
  const messageListenerRef = useRef<((event: MessageEvent) => void) | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    messageListenerRef.current = (event: MessageEvent) => {
      const { data } = event

      if (data?.type === 'CLEAR_CACHE_AND_RELOAD') {
        logger.debug('[useSWUpdate] SW tražи cache cleanup')

        // Obriši sve cache-eve
        caches.keys().then((names) => {
          Promise.all(names.map((name) => caches.delete(name)))
            .then(() => {
              logger.debug('[useSWUpdate] Cache-evi obrisani, reloadujem stranicu')
              // Hard reload bez cache-a
              window.location.reload()
            })
            .catch((err) => {
              logger.error('[useSWUpdate] Error clearing caches:', err)
              window.location.reload()
            })
        })
      }
    }

    navigator.serviceWorker.addEventListener('message', messageListenerRef.current)

    return () => {
      if (messageListenerRef.current) {
        navigator.serviceWorker.removeEventListener('message', messageListenerRef.current)
      }
    }
  }, [])
}
