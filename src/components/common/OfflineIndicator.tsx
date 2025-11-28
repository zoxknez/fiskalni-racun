import clsx from 'clsx'
import { useReducedMotion } from 'framer-motion'
import { Wifi, WifiOff } from 'lucide-react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Offline Indicator
 * Shows notification when user goes offline/online
 */
function OfflineIndicator() {
  const { t } = useTranslation()
  const prefersReducedMotion = useReducedMotion()
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showOfflineMessage, setShowOfflineMessage] = useState(false)
  const hideTimeoutRef = useRef<number | null>(null)

  const handleOnline = useCallback(() => {
    setIsOnline(true)
    setShowOfflineMessage(true)

    if (hideTimeoutRef.current !== null) {
      window.clearTimeout(hideTimeoutRef.current)
    }

    hideTimeoutRef.current = window.setTimeout(() => {
      setShowOfflineMessage(false)
      hideTimeoutRef.current = null
    }, 4000)
  }, [])

  const handleOffline = useCallback(() => {
    setIsOnline(false)
    setShowOfflineMessage(true)

    if (hideTimeoutRef.current !== null) {
      window.clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      if (hideTimeoutRef.current !== null) {
        window.clearTimeout(hideTimeoutRef.current)
      }
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [handleOnline, handleOffline])

  // Don't show anything if online
  if (isOnline && !showOfflineMessage) return null

  return (
    <>
      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed top-0 right-0 left-0 z-50 bg-amber-500 px-4 py-2 text-center font-medium text-sm text-white shadow-lg dark:bg-amber-600">
          <div className="flex items-center justify-center gap-2">
            <WifiOff className="h-4 w-4" />
            <span>{t('offline.banner')}</span>
          </div>
        </div>
      )}

      {/* Back Online Toast */}
      {isOnline && showOfflineMessage && (
        <div
          className={clsx(
            '-translate-x-1/2 fixed top-4 left-1/2 z-50 transform',
            !prefersReducedMotion && 'animate-slide-down'
          )}
        >
          <div className="flex items-center gap-3 rounded-lg bg-green-500 px-6 py-3 text-white shadow-2xl dark:bg-green-600">
            <Wifi className="h-5 w-5" />
            <span className="font-medium">{t('offline.backOnline')}</span>
          </div>
        </div>
      )}
    </>
  )
}

export default memo(OfflineIndicator)
