/**
 * Modern Background Sync API
 *
 * Uses native Background Sync API for reliable offline sync
 * Falls back to visibility-based sync if not supported
 *
 * Supported: Chrome 49+, Edge 79+, Opera 36+
 *
 * Features:
 * - Sync continues even if user closes tab
 * - Automatic retry by browser
 * - Battery and network aware
 */

import { logger } from './logger'

/**
 * Check if Background Sync API is supported
 */
export function isBackgroundSyncSupported(): boolean {
  return 'serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype
}

/**
 * Register background sync tag
 * Browser will trigger sync event when online
 */
export async function registerBackgroundSync(tag: string = 'sync-queue'): Promise<boolean> {
  if (!isBackgroundSyncSupported()) {
    logger.warn('Background Sync API not supported')
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    await registration.sync.register(tag)
    logger.log('Background sync registered:', tag)
    return true
  } catch (error) {
    logger.error('Failed to register background sync:', error)
    return false
  }
}

/**
 * Get pending sync tags
 */
export async function getPendingSyncTags(): Promise<string[]> {
  if (!isBackgroundSyncSupported()) {
    return []
  }

  try {
    const registration = await navigator.serviceWorker.ready
    return await registration.sync.getTags()
  } catch (error) {
    logger.error('Failed to get sync tags:', error)
    return []
  }
}

/**
 * Badge API - Set app badge (notification count)
 * Supported: Chrome 81+, Edge 81+, Safari 16.4+
 */

export function isBadgeSupported(): boolean {
  return 'setAppBadge' in navigator
}

/**
 * Set app badge count
 * Shows number on app icon
 */
export async function setBadge(count: number): Promise<boolean> {
  if (!isBadgeSupported()) {
    return false
  }

  try {
    if (count > 0) {
      await (navigator as any).setAppBadge(count)
    } else {
      await (navigator as any).clearAppBadge()
    }
    logger.debug('Badge set:', count)
    return true
  } catch (error) {
    logger.error('Failed to set badge:', error)
    return false
  }
}

/**
 * Clear app badge
 */
export async function clearBadge(): Promise<boolean> {
  if (!isBadgeSupported()) {
    return false
  }

  try {
    await (navigator as any).clearAppBadge()
    logger.debug('Badge cleared')
    return true
  } catch (error) {
    logger.error('Failed to clear badge:', error)
    return false
  }
}

/**
 * Screen Wake Lock API
 * Prevents screen from sleeping during QR scan
 *
 * Supported: Chrome 84+, Edge 84+, Safari 16.4+
 */

let wakeLock: any = null

export function isWakeLockSupported(): boolean {
  return 'wakeLock' in navigator
}

export async function requestWakeLock(): Promise<boolean> {
  if (!isWakeLockSupported()) {
    return false
  }

  try {
    wakeLock = await (navigator as any).wakeLock.request('screen')
    logger.log('Wake lock activated')

    wakeLock.addEventListener('release', () => {
      logger.log('Wake lock released')
    })

    return true
  } catch (error) {
    logger.error('Failed to request wake lock:', error)
    return false
  }
}

export async function releaseWakeLock(): Promise<void> {
  if (wakeLock) {
    await wakeLock.release()
    wakeLock = null
    logger.log('Wake lock released manually')
  }
}

/**
 * Automatically release wake lock when page is hidden
 */
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (wakeLock && document.visibilityState === 'hidden') {
      releaseWakeLock()
    }
  })
}
