import { Wifi, WifiOff } from 'lucide-react'
import * as React from 'react'

/**
 * Offline Indicator
 * Shows notification when user goes offline/online
 */
export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine)
  const [showOfflineMessage, setShowOfflineMessage] = React.useState(false)

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowOfflineMessage(false)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowOfflineMessage(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Don't show anything if online
  if (isOnline && !showOfflineMessage) return null

  return (
    <>
      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed top-0 right-0 left-0 z-50 bg-amber-500 px-4 py-2 text-center font-medium text-sm text-white shadow-lg dark:bg-amber-600">
          <div className="flex items-center justify-center gap-2">
            <WifiOff className="h-4 w-4" />
            <span>Offline režim - Promene će biti sinhronizovane kada se povežeš</span>
          </div>
        </div>
      )}

      {/* Back Online Toast */}
      {isOnline && showOfflineMessage && (
        <div className="-translate-x-1/2 fixed top-4 left-1/2 z-50 transform animate-slide-down">
          <div className="flex items-center gap-3 rounded-lg bg-green-500 px-6 py-3 text-white shadow-2xl dark:bg-green-600">
            <Wifi className="h-5 w-5" />
            <span className="font-medium">Ponovo online! ✓</span>
          </div>
        </div>
      )}
    </>
  )
}
