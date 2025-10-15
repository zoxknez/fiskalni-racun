/**
 * Advanced PWA Features
 *
 * Collection of modern Web APIs for PWA
 */

import { logger } from './logger'

/**
 * File System Access API
 * Save files directly to user's file system
 *
 * Supported: Chrome 86+, Edge 86+
 */

export function isFileSystemAccessSupported(): boolean {
  return 'showSaveFilePicker' in window
}

export async function saveFile(
  data: Blob,
  suggestedName: string
): Promise<{ success: boolean; error?: string }> {
  if (!isFileSystemAccessSupported()) {
    // Fallback: download link
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = suggestedName
    a.click()
    URL.revokeObjectURL(url)
    return { success: true }
  }

  try {
    const options = {
      suggestedName,
      types: [
        {
          description: 'JSON Files',
          accept: {
            'application/json': ['.json'],
          },
        },
      ],
    }

    const handle = await (window as any).showSaveFilePicker(options)
    const writable = await handle.createWritable()
    await writable.write(data)
    await writable.close()

    logger.log('File saved successfully:', suggestedName)
    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: 'cancelled' }
    }

    logger.error('Failed to save file:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Contact Picker API
 * Pick contacts from device (mobile)
 *
 * Supported: Chrome 80+ (Android), Safari 14.5+ (iOS)
 */

export function isContactPickerSupported(): boolean {
  return 'contacts' in navigator && 'ContactsManager' in window
}

export async function pickContact(properties: string[] = ['name', 'email', 'tel']): Promise<any[]> {
  if (!isContactPickerSupported()) {
    throw new Error('Contact Picker API not supported')
  }

  try {
    const contacts = await (navigator as any).contacts.select(properties, { multiple: false })
    return contacts
  } catch (error) {
    logger.error('Contact picker failed:', error)
    return []
  }
}

/**
 * Web Payment API
 * Not yet implemented but ready for future
 */

export function isPaymentSupported(): boolean {
  return 'PaymentRequest' in window
}

/**
 * Vibration API
 * Haptic feedback on mobile
 *
 * Supported: Most mobile browsers
 */

export function vibrate(pattern: number | number[]): boolean {
  if (!('vibrate' in navigator)) {
    return false
  }

  try {
    navigator.vibrate(pattern)
    return true
  } catch (error) {
    logger.error('Vibration failed:', error)
    return false
  }
}

/**
 * Predefined vibration patterns
 */
export const VibrationPatterns = {
  short: 50,
  medium: 100,
  long: 200,
  success: [50, 50, 50],
  error: [100, 50, 100],
  warning: [50, 100, 50],
  doubleClick: [50, 50, 50],
}

/**
 * Geolocation API (for store locations)
 * Modern async wrapper
 */

export function isGeolocationSupported(): boolean {
  return 'geolocation' in navigator
}

export async function getCurrentPosition(): Promise<GeolocationPosition> {
  if (!isGeolocationSupported()) {
    throw new Error('Geolocation not supported')
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000, // 5 minutes
    })
  })
}

/**
 * Network Information API
 * Check connection speed/type
 *
 * Supported: Chrome 61+, Edge 79+, Opera 48+
 */

export function isNetworkInformationSupported(): boolean {
  return 'connection' in navigator
}

export function getNetworkInfo(): {
  effectiveType: string // '4g', '3g', '2g', 'slow-2g'
  downlink: number // Mbps
  rtt: number // ms
  saveData: boolean
} | null {
  if (!isNetworkInformationSupported()) {
    return null
  }

  const conn = (navigator as any).connection

  return {
    effectiveType: conn.effectiveType || 'unknown',
    downlink: conn.downlink || 0,
    rtt: conn.rtt || 0,
    saveData: conn.saveData || false,
  }
}

/**
 * Should we load heavy resources?
 * Based on connection type and save-data preference
 */
export function shouldLoadHeavyResources(): boolean {
  const network = getNetworkInfo()

  if (!network) {
    return true // Unknown connection, assume good
  }

  // Don't load if user enabled data saver
  if (network.saveData) {
    return false
  }

  // Don't load on slow connections
  if (['slow-2g', '2g'].includes(network.effectiveType)) {
    return false
  }

  return true
}

/**
 * Device Memory API
 * Check available memory
 *
 * Supported: Chrome 63+, Edge 79+, Opera 50+
 */

export function getDeviceMemory(): number | null {
  if ('deviceMemory' in navigator) {
    return (navigator as any).deviceMemory // GB
  }
  return null
}

/**
 * Should we use memory-intensive features?
 */
export function shouldUseMemoryIntensiveFeatures(): boolean {
  const memory = getDeviceMemory()

  if (memory === null) {
    return true // Unknown, assume OK
  }

  // Don't use on low-memory devices (< 4GB)
  return memory >= 4
}
