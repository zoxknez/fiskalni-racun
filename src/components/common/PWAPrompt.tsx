import { useRegisterSW } from 'virtual:pwa-register/react'
import { Download, X } from 'lucide-react'
import * as React from 'react'
import { useLocation } from 'react-router-dom'
import { logger } from '@/lib/logger'

type BeforeInstallPromptEvent = Event & {
  readonly platforms?: string[]
  prompt: () => Promise<void>
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

/**
 * PWA Install Prompt & Update Notification
 *
 * Features:
 * - Install prompt for Add to Home Screen
 * - Service Worker update notification
 * - Auto-dismiss after user action
 */
export default function PWAPrompt() {
  const [showInstallPrompt, setShowInstallPrompt] = React.useState(false)
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null)
  const promptTimeoutRef = React.useRef<number | null>(null)
  const { pathname } = useLocation()

  // Service Worker update handling
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      if (!registration) return
      logger.debug('SW Registered:', registration)
    },
    onRegisterError(error) {
      logger.debug('SW registration error', error)
    },
  })

  // Listen for install prompt event
  React.useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      setDeferredPrompt(e)

      // Don't show if already dismissed in this session
      const dismissed = sessionStorage.getItem('pwa-install-dismissed') === 'true'
      const forcePrompt = pathname.startsWith('/auth')

      if (promptTimeoutRef.current) {
        window.clearTimeout(promptTimeoutRef.current)
        promptTimeoutRef.current = null
      }

      if (!dismissed || forcePrompt) {
        if (forcePrompt) {
          setShowInstallPrompt(true)
        } else {
          promptTimeoutRef.current = window.setTimeout(() => {
            setShowInstallPrompt(true)
          }, 10000)
        }
      }
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      if (promptTimeoutRef.current) {
        window.clearTimeout(promptTimeoutRef.current)
      }
    }
  }, [pathname])

  // Force prompt when navigating to auth if we already captured the event
  React.useEffect(() => {
    if (deferredPrompt && pathname.startsWith('/auth') && !showInstallPrompt) {
      setShowInstallPrompt(true)
    }
  }, [deferredPrompt, pathname, showInstallPrompt])

  // Handle install
  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    logger.debug(`User response to install prompt: ${outcome}`)

    setDeferredPrompt(null)
    setShowInstallPrompt(false)
    sessionStorage.setItem('pwa-install-dismissed', 'true')
  }

  // Handle dismiss install prompt
  const handleDismissInstall = () => {
    setShowInstallPrompt(false)
    sessionStorage.setItem('pwa-install-dismissed', 'true')
  }

  // Handle update
  const handleUpdate = async () => {
    logger.debug('[PWA] Update clicked - clearing cache and reloading')

    // 1. Pošalji poruku SW-u da agresivno obriše cache
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'FORCE_REFRESH',
      })
    }

    // 2. Obriši sve cache-eve iz aplikacije
    try {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map((name) => caches.delete(name)))
      logger.debug('[PWA] All caches cleared:', cacheNames)
    } catch (error) {
      logger.error('[PWA] Error clearing caches:', error)
    }

    // 3. Update SW i reload stranicu nakon kratkе kašnjenja
    updateServiceWorker(true)

    // 4. Hard refresh nakon 1 sekunde da novi SW preuzme kontrolu
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }

  return (
    <>
      {/* Update Notification */}
      {needRefresh && (
        <div className="fixed right-4 bottom-4 left-4 z-50 animate-slide-up md:right-4 md:left-auto md:w-96">
          <div className="flex items-start gap-3 rounded-lg bg-primary-600 p-4 text-white shadow-2xl dark:bg-primary-700">
            <div className="flex-1">
              <h3 className="mb-1 font-semibold">Nova verzija dostupna! 🎉</h3>
              <p className="mb-3 text-primary-100 text-sm">
                Klikni da ažuriraš aplikaciju sa najnovijim funkcijama.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleUpdate}
                  className="rounded-lg bg-white px-4 py-2 font-medium text-primary-600 text-sm transition-colors hover:bg-primary-50"
                >
                  Ažuriraj sada
                </button>
                <button
                  type="button"
                  onClick={() => setNeedRefresh(false)}
                  className="rounded-lg bg-primary-700 px-4 py-2 text-sm text-white transition-colors hover:bg-primary-800"
                >
                  Kasnije
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNeedRefresh(false)}
              className="text-primary-200 transition-colors hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Install Prompt */}
      {showInstallPrompt && (
        <div className="fixed right-4 bottom-4 left-4 z-50 animate-slide-up md:right-4 md:left-auto md:w-96">
          <div className="flex items-start gap-3 rounded-lg border-2 border-primary-500 bg-white p-4 shadow-2xl dark:border-primary-600 dark:bg-dark-800">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
              <Download className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 font-semibold text-dark-900 dark:text-dark-50">
                Instaliraj aplikaciju 📱
              </h3>
              <p className="mb-3 text-dark-600 text-sm dark:text-dark-400">
                Dodaj Fiskalni Račun na početni ekran za brži pristup i offline rad.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleInstall}
                  className="rounded-lg bg-primary-600 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-primary-700"
                >
                  Instaliraj
                </button>
                <button
                  type="button"
                  onClick={handleDismissInstall}
                  className="rounded-lg bg-dark-100 px-4 py-2 text-dark-700 text-sm transition-colors hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-300 dark:hover:bg-dark-600"
                >
                  Ne sada
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismissInstall}
              className="text-dark-400 transition-colors hover:text-dark-600 dark:hover:text-dark-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
