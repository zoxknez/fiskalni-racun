/**
 * Rate Limit Feedback Component
 *
 * Shows user-friendly feedback when rate limits are approached or exceeded.
 *
 * @module components/common/RateLimitFeedback
 */

import { cn } from '@lib/utils'
import { memo, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Clock } from '@/lib/icons'

interface RateLimitInfo {
  /** Remaining requests in current window */
  remaining: number
  /** Total limit for the window */
  limit: number
  /** Seconds until rate limit resets */
  resetInSeconds: number
}

interface RateLimitFeedbackProps {
  /** Rate limit info from API response headers */
  info: RateLimitInfo | null
  /** Whether to show the component */
  show?: boolean
  /** Callback when countdown completes */
  onReset?: () => void
  className?: string
}

/**
 * Extract rate limit info from response headers
 */
export function extractRateLimitInfo(response: Response): RateLimitInfo | null {
  const remaining = response.headers.get('X-RateLimit-Remaining')
  const limit = response.headers.get('X-RateLimit-Limit')
  const reset = response.headers.get('X-RateLimit-Reset')
  const retryAfter = response.headers.get('Retry-After')

  if (!remaining && !retryAfter) return null

  const now = Math.floor(Date.now() / 1000)
  let resetInSeconds = 0

  if (retryAfter) {
    resetInSeconds = Number.parseInt(retryAfter, 10)
  } else if (reset) {
    resetInSeconds = Math.max(0, Number.parseInt(reset, 10) - now)
  }

  return {
    remaining: remaining ? Number.parseInt(remaining, 10) : 0,
    limit: limit ? Number.parseInt(limit, 10) : 0,
    resetInSeconds,
  }
}

/**
 * Rate limit feedback banner
 */
export const RateLimitFeedback = memo(function RateLimitFeedback({
  info,
  show = true,
  onReset,
  className,
}: RateLimitFeedbackProps) {
  const { t } = useTranslation()
  const [countdown, setCountdown] = useState(info?.resetInSeconds ?? 0)

  useEffect(() => {
    if (!info?.resetInSeconds) return

    setCountdown(info.resetInSeconds)

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          onReset?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [info?.resetInSeconds, onReset])

  if (!show || !info) return null

  const isBlocked = info.remaining === 0
  const isWarning = !isBlocked && info.remaining <= 2

  if (!isBlocked && !isWarning) return null

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <div
      className={cn(
        'rounded-lg p-3',
        isBlocked
          ? 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200'
          : 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200',
        className
      )}
      role="alert"
    >
      <div className="flex items-center gap-2">
        {isBlocked ? (
          <Clock className="h-5 w-5 flex-shrink-0" />
        ) : (
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
        )}
        <div className="flex-1">
          {isBlocked ? (
            <>
              <p className="font-medium text-sm">{t('rateLimit.blocked', 'Previše pokušaja')}</p>
              <p className="text-xs opacity-80">
                {t('rateLimit.tryAgainIn', 'Pokušajte ponovo za')} {formatTime(countdown)}
              </p>
            </>
          ) : (
            <>
              <p className="font-medium text-sm">
                {t('rateLimit.warning', 'Preostalo pokušaja')}: {info.remaining}/{info.limit}
              </p>
              <p className="text-xs opacity-80">
                {t('rateLimit.slowDown', 'Sačekajte malo pre sledećeg pokušaja')}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
})

/**
 * Hook for managing rate limit state
 */
export function useRateLimitState() {
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null)

  const updateFromResponse = (response: Response) => {
    const info = extractRateLimitInfo(response)
    if (info) {
      setRateLimitInfo(info)
    }
  }

  const clear = () => {
    setRateLimitInfo(null)
  }

  return {
    rateLimitInfo,
    updateFromResponse,
    clear,
    isBlocked: rateLimitInfo?.remaining === 0,
    isWarning: rateLimitInfo ? rateLimitInfo.remaining > 0 && rateLimitInfo.remaining <= 2 : false,
  }
}
