import { useRegisterSW } from 'virtual:pwa-register/react'
import { Download, X } from 'lucide-react'
import * as React from 'react'

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

  // Service Worker update handling
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      if (!registration) return
      console.log('SW Registered:', registration)
    },
    onRegisterError(error) {
      console.log('SW registration error', error)
    },
  })

  // Listen for install prompt event
  React.useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      setDeferredPrompt(e)

      // Don't show if already dismissed in this session
      const dismissed = sessionStorage.getItem('pwa-install-dismissed')
      if (!dismissed) {
        // Show prompt after 10 seconds
        setTimeout(() => {
          setShowInstallPrompt(true)
        }, 10000)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Handle install
  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    console.log(`User response to install prompt: ${outcome}`)

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
  const handleUpdate = () => {
    updateServiceWorker(true)
  }

  return (
    <>
      {/* Update Notification */}
      {needRefresh && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
          <div className="bg-primary-600 dark:bg-primary-700 text-white rounded-lg shadow-2xl p-4 flex items-start gap-3">
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Nova verzija dostupna! 🎉</h3>
              <p className="text-sm text-primary-100 mb-3">
                Klikni da ažuriraš aplikaciju sa najnovijim funkcijama.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleUpdate}
                  className="px-4 py-2 bg-white text-primary-600 rounded-lg font-medium hover:bg-primary-50 transition-colors text-sm"
                >
                  Ažuriraj sada
                </button>
                <button
                  type="button"
                  onClick={() => setNeedRefresh(false)}
                  className="px-4 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors text-sm"
                >
                  Kasnije
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNeedRefresh(false)}
              className="text-primary-200 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Install Prompt */}
      {showInstallPrompt && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
          <div className="bg-white dark:bg-dark-800 border-2 border-primary-500 dark:border-primary-600 rounded-lg shadow-2xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-dark-900 dark:text-dark-50 mb-1">
                Instaliraj aplikaciju 📱
              </h3>
              <p className="text-sm text-dark-600 dark:text-dark-400 mb-3">
                Dodaj Fiskalni Račun na početni ekran za brži pristup i offline rad.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleInstall}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors text-sm"
                >
                  Instaliraj
                </button>
                <button
                  type="button"
                  onClick={handleDismissInstall}
                  className="px-4 py-2 bg-dark-100 dark:bg-dark-700 text-dark-700 dark:text-dark-300 rounded-lg hover:bg-dark-200 dark:hover:bg-dark-600 transition-colors text-sm"
                >
                  Ne sada
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismissInstall}
              className="text-dark-400 hover:text-dark-600 dark:hover:text-dark-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
