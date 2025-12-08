/**
 * Warranty Reminder Service
 *
 * Handles scheduling and displaying warranty expiration reminders
 */

import type { Device } from '@lib/db'
import { db } from '@lib/db'
import { logger } from '@/lib/logger'

export interface WarrantyReminder {
  id: string
  deviceId: string
  device: Pick<Device, 'brand' | 'model' | 'warrantyExpiry'>
  daysUntilExpiry: number
  type: '30days' | '7days' | '1day' | 'expired'
  message: string
  createdAt: Date
}

/**
 * Get all devices with warranties expiring soon
 */
export async function getExpiringWarranties(withinDays: number = 30): Promise<WarrantyReminder[]> {
  try {
    const now = new Date()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() + withinDays)

    const devices = await db.devices
      .filter((device) => {
        if (device.status === 'in-service') return false
        if (!device.warrantyExpiry) return false
        const expiry = new Date(device.warrantyExpiry)
        return expiry >= now && expiry <= cutoffDate
      })
      .toArray()

    return devices.map((device) => {
      const expiry = new Date(device.warrantyExpiry)
      const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      let type: WarrantyReminder['type']
      if (daysUntilExpiry <= 0) {
        type = 'expired'
      } else if (daysUntilExpiry <= 1) {
        type = '1day'
      } else if (daysUntilExpiry <= 7) {
        type = '7days'
      } else {
        type = '30days'
      }

      const message = getWarrantyMessage(device, daysUntilExpiry)

      return {
        id: `warranty-${device.id}-${type}`,
        deviceId: String(device.id ?? ''),
        device: {
          brand: device.brand,
          model: device.model,
          warrantyExpiry: device.warrantyExpiry,
        },
        daysUntilExpiry,
        type,
        message,
        createdAt: new Date(),
      }
    })
  } catch (error) {
    logger.error('Failed to get expiring warranties:', error)
    return []
  }
}

/**
 * Generate user-friendly warranty message
 */
function getWarrantyMessage(device: Device, daysUntilExpiry: number): string {
  const deviceName = `${device.brand} ${device.model}`

  if (daysUntilExpiry <= 0) {
    return `Garancija za ${deviceName} je istekla!`
  }
  if (daysUntilExpiry === 1) {
    return `Garancija za ${deviceName} ističe sutra!`
  }
  if (daysUntilExpiry <= 7) {
    return `Garancija za ${deviceName} ističe za ${daysUntilExpiry} dana.`
  }
  return `Garancija za ${deviceName} ističe za ${daysUntilExpiry} dana.`
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    return 'denied'
  }
  return Notification.requestPermission()
}

/**
 * Get current notification permission
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isPushSupported()) {
    return 'denied'
  }
  return Notification.permission
}

/**
 * Show a push notification for warranty reminder
 */
export async function showWarrantyNotification(reminder: WarrantyReminder): Promise<boolean> {
  if (!isPushSupported()) {
    logger.warn('Push notifications not supported')
    return false
  }

  if (Notification.permission !== 'granted') {
    logger.warn('Notification permission not granted')
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready

    // Build notification options (some properties require specific browser support)
    const notificationOptions: NotificationOptions = {
      body: reminder.message,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: reminder.id,
      data: {
        url: `/warranties/${reminder.deviceId}`,
        type: 'warranty-reminder',
        deviceId: reminder.deviceId,
      },
      requireInteraction: reminder.type === '1day' || reminder.type === 'expired',
    }

    await registration.showNotification(getNotificationTitle(reminder), notificationOptions)

    logger.info('Warranty notification shown:', reminder.id)
    return true
  } catch (error) {
    logger.error('Failed to show warranty notification:', error)
    return false
  }
}

/**
 * Get notification title based on urgency
 */
function getNotificationTitle(reminder: WarrantyReminder): string {
  switch (reminder.type) {
    case 'expired':
      return '⚠️ Garancija istekla!'
    case '1day':
      return '🔴 Garancija ističe sutra!'
    case '7days':
      return '🟠 Garancija ističe uskoro'
    default:
      return '📅 Podsetnik za garanciju'
  }
}

/**
 * Check and show notifications for all expiring warranties
 * Should be called periodically (e.g., on app load, once per day)
 */
export async function checkAndNotifyExpiringWarranties(): Promise<number> {
  // Get last notification check timestamp
  const lastCheck = localStorage.getItem('lastWarrantyNotificationCheck')
  const now = new Date()

  // Only check once per day
  if (lastCheck) {
    const lastCheckDate = new Date(lastCheck)
    const hoursSinceLastCheck = (now.getTime() - lastCheckDate.getTime()) / (1000 * 60 * 60)
    if (hoursSinceLastCheck < 12) {
      return 0
    }
  }

  // Get expiring warranties
  const reminders = await getExpiringWarranties(30)

  // Filter to only show critical ones (7 days or less)
  const criticalReminders = reminders.filter((r) => r.daysUntilExpiry <= 7)

  // Check which notifications haven't been shown today
  const shownNotifications = JSON.parse(
    localStorage.getItem('shownWarrantyNotifications') || '[]'
  ) as string[]

  const today = now.toISOString().split('T')[0]
  const newNotifications = criticalReminders.filter((r) => {
    const key = `${r.id}-${today}`
    return !shownNotifications.includes(key)
  })

  // Show notifications
  let shown = 0
  for (const reminder of newNotifications) {
    const success = await showWarrantyNotification(reminder)
    if (success) {
      shown++
      shownNotifications.push(`${reminder.id}-${today}`)
    }
  }

  // Update storage
  localStorage.setItem('lastWarrantyNotificationCheck', now.toISOString())
  // Keep only last 100 entries
  localStorage.setItem('shownWarrantyNotifications', JSON.stringify(shownNotifications.slice(-100)))

  return shown
}

/**
 * Get summary of warranty status for UI display
 */
export async function getWarrantySummary(): Promise<{
  expiringSoon: number
  expiredRecently: number
  active: number
}> {
  try {
    const now = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const devices = await db.devices.toArray()

    const expiringSoon = devices.filter((d) => {
      if (!d.warrantyExpiry || d.status === 'in-service') return false
      const expiry = new Date(d.warrantyExpiry)
      return expiry >= now && expiry <= thirtyDaysFromNow
    }).length

    const expiredRecently = devices.filter((d) => {
      if (!d.warrantyExpiry) return false
      const expiry = new Date(d.warrantyExpiry)
      return expiry < now && expiry >= thirtyDaysAgo
    }).length

    const active = devices.filter((d) => {
      if (!d.warrantyExpiry || d.status === 'in-service') return false
      const expiry = new Date(d.warrantyExpiry)
      return expiry >= now
    }).length

    return { expiringSoon, expiredRecently, active }
  } catch (error) {
    logger.error('Failed to get warranty summary:', error)
    return { expiringSoon: 0, expiredRecently: 0, active: 0 }
  }
}
