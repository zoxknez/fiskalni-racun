/**
 * Haptic Feedback utilities
 *
 * Provides vibration feedback for better UX on mobile devices
 *
 * @module lib/capacitor/haptics
 */

import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

/**
 * Check if haptics are available
 */
export function isHapticsAvailable(): boolean {
  return Capacitor.isNativePlatform()
}

/**
 * Light impact feedback (for taps, selections)
 */
export async function hapticsLight() {
  if (!isHapticsAvailable()) return

  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch (error) {
    console.warn('Haptics not available:', error)
  }
}

/**
 * Medium impact feedback (for buttons, actions)
 */
export async function hapticsMedium() {
  if (!isHapticsAvailable()) return

  try {
    await Haptics.impact({ style: ImpactStyle.Medium })
  } catch (error) {
    console.warn('Haptics not available:', error)
  }
}

/**
 * Heavy impact feedback (for important actions, errors)
 */
export async function hapticsHeavy() {
  if (!isHapticsAvailable()) return

  try {
    await Haptics.impact({ style: ImpactStyle.Heavy })
  } catch (error) {
    console.warn('Haptics not available:', error)
  }
}

/**
 * Success notification feedback
 */
export async function hapticsSuccess() {
  if (!isHapticsAvailable()) return

  try {
    await Haptics.notification({ type: NotificationType.Success })
  } catch (error) {
    console.warn('Haptics not available:', error)
  }
}

/**
 * Warning notification feedback
 */
export async function hapticsWarning() {
  if (!isHapticsAvailable()) return

  try {
    await Haptics.notification({ type: NotificationType.Warning })
  } catch (error) {
    console.warn('Haptics not available:', error)
  }
}

/**
 * Error notification feedback
 */
export async function hapticsError() {
  if (!isHapticsAvailable()) return

  try {
    await Haptics.notification({ type: NotificationType.Error })
  } catch (error) {
    console.warn('Haptics not available:', error)
  }
}

/**
 * Selection changed feedback (for pickers, sliders)
 */
export async function hapticsSelection() {
  if (!isHapticsAvailable()) return

  try {
    await Haptics.selectionStart()
    await Haptics.selectionChanged()
    await Haptics.selectionEnd()
  } catch (error) {
    console.warn('Haptics not available:', error)
  }
}
