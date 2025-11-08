/**
 * Haptic Feedback Utilities
 *
 * Provides consistent haptic feedback across the app
 * Falls back gracefully on web/unsupported devices
 *
 * @module lib/haptics
 */

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { logger } from './logger'

let isHapticsAvailable: boolean | null = null

/**
 * Check if haptics are available on this device
 */
async function checkHapticsAvailability(): Promise<boolean> {
  if (isHapticsAvailable !== null) {
    return isHapticsAvailable
  }

  try {
    // Try to trigger a very light vibration
    await Haptics.impact({ style: ImpactStyle.Light })
    isHapticsAvailable = true
    return true
  } catch {
    isHapticsAvailable = false
    return false
  }
}

/**
 * Trigger impact haptic feedback
 * @param style - Light, Medium, or Heavy impact
 */
export async function hapticImpact(style: ImpactStyle = ImpactStyle.Medium): Promise<void> {
  try {
    const available = await checkHapticsAvailability()
    if (!available) return

    await Haptics.impact({ style })
  } catch (error) {
    logger.debug('Haptic impact failed:', error)
  }
}

/**
 * Trigger notification haptic feedback
 * @param type - Success, Warning, or Error
 */
export async function hapticNotification(type: NotificationType): Promise<void> {
  try {
    const available = await checkHapticsAvailability()
    if (!available) return

    await Haptics.notification({ type })
  } catch (error) {
    logger.debug('Haptic notification failed:', error)
  }
}

/**
 * Trigger selection changed haptic (light tick)
 */
export async function hapticSelection(): Promise<void> {
  try {
    const available = await checkHapticsAvailability()
    if (!available) return

    await Haptics.selectionChanged()
  } catch (error) {
    logger.debug('Haptic selection failed:', error)
  }
}

/**
 * Vibrate with custom pattern (web fallback)
 */
export async function hapticVibrate(pattern: number | number[] = 100): Promise<void> {
  try {
    await Haptics.vibrate({ duration: typeof pattern === 'number' ? pattern : 100 })
  } catch {
    // Fallback to web vibration API
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  }
}

/**
 * Convenience methods for common actions
 */
export const haptics = {
  /** Light tap (button press, selection) */
  light: () => hapticImpact(ImpactStyle.Light),

  /** Medium tap (toggle, checkbox) */
  medium: () => hapticImpact(ImpactStyle.Medium),

  /** Heavy tap (delete, important action) */
  heavy: () => hapticImpact(ImpactStyle.Heavy),

  /** Success notification */
  success: () => hapticNotification(NotificationType.Success),

  /** Warning notification */
  warning: () => hapticNotification(NotificationType.Warning),

  /** Error notification */
  error: () => hapticNotification(NotificationType.Error),

  /** Selection changed (picker, slider) */
  selection: () => hapticSelection(),

  /** Custom vibration pattern */
  vibrate: (pattern: number | number[]) => hapticVibrate(pattern),
} as const
