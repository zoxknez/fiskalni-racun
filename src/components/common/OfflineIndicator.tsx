import * as React from 'react'
import { WifiOff, Wifi } from 'lucide-react'

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
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 dark:bg-amber-600 text-white px-4 py-2 text-center text-sm font-medium shadow-lg">
          <div className="flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span>Offline režim - Promene će biti sinhronizovane kada se povežeš</span>
          </div>
        </div>
      )}

      {/* Back Online Toast */}
      {isOnline && showOfflineMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
          <div className="bg-green-500 dark:bg-green-600 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3">
            <Wifi className="w-5 h-5" />
            <span className="font-medium">Ponovo online! ✓</span>
          </div>
        </div>
      )}
    </>
  )
}
