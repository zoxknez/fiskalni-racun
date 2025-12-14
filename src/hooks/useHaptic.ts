import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { useCallback } from 'react'

type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error'

/**
 * Hook for tactile feedback
 *
 * Uses Capacitor Haptics on native platforms (iOS/Android) for native feel
 * Falls back to Vibration API on web for PWA support
 */
export function useHaptic(enabled = true) {
  const isNative = Capacitor.isNativePlatform()

  const vibrate = useCallback(
    async (type: HapticType = 'light') => {
      if (!enabled) return

      // Use Capacitor Haptics on native platforms
      if (isNative) {
        try {
          switch (type) {
            case 'light':
              await Haptics.impact({ style: ImpactStyle.Light })
              break
            case 'medium':
              await Haptics.impact({ style: ImpactStyle.Medium })
              break
            case 'heavy':
              await Haptics.impact({ style: ImpactStyle.Heavy })
              break
            case 'selection':
              await Haptics.selectionChanged()
              break
            case 'success':
              await Haptics.notification({ type: NotificationType.Success })
              break
            case 'warning':
              await Haptics.notification({ type: NotificationType.Warning })
              break
            case 'error':
              await Haptics.notification({ type: NotificationType.Error })
              break
          }
        } catch {
          // Ignore errors if haptics fails
        }
        return
      }

      // Fallback to Vibration API on web
      if (typeof navigator === 'undefined' || !navigator.vibrate) return

      try {
        switch (type) {
          case 'light':
            navigator.vibrate(10)
            break
          case 'medium':
            navigator.vibrate(20)
            break
          case 'heavy':
            navigator.vibrate(40)
            break
          case 'selection':
            navigator.vibrate(5)
            break
          case 'success':
            navigator.vibrate([10, 30, 10])
            break
          case 'warning':
            navigator.vibrate([30, 50, 10])
            break
          case 'error':
            navigator.vibrate([50, 100, 50, 100])
            break
        }
      } catch {
        // Ignore errors if vibration fails or is not allowed
      }
    },
    [enabled, isNative]
  )

  // Convenience methods matching iOS Haptic Engine naming
  const impactLight = useCallback(() => vibrate('light'), [vibrate])
  const impactMedium = useCallback(() => vibrate('medium'), [vibrate])
  const impactHeavy = useCallback(() => vibrate('heavy'), [vibrate])
  const selectionChange = useCallback(() => vibrate('selection'), [vibrate])
  const notificationSuccess = useCallback(() => vibrate('success'), [vibrate])
  const notificationWarning = useCallback(() => vibrate('warning'), [vibrate])
  const notificationError = useCallback(() => vibrate('error'), [vibrate])

  return {
    vibrate,
    impactLight,
    impactMedium,
    impactHeavy,
    selectionChange,
    notificationSuccess,
    notificationWarning,
    notificationError,
  }
}
