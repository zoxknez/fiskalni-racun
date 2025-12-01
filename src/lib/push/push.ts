/**
 * Push Notifications Service
 *
 * Handles subscription and management of push notifications
 */

import { logger } from '@/lib/logger'

export async function isPushSupported(): Promise<boolean> {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  return Notification.permission
}

export async function isSubscribed(): Promise<boolean> {
  if (!(await isPushSupported())) return false

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  return !!subscription
}

export async function subscribeToPush(): Promise<boolean> {
  if (!(await isPushSupported())) return false

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: import.meta.env['VITE_VAPID_PUBLIC_KEY'],
    })

    // TODO: Send subscription to backend
    logger.info('Push subscription successful', subscription)
    return true
  } catch (error) {
    logger.error('Push subscription failed', error)
    return false
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!(await isPushSupported())) return false

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await subscription.unsubscribe()
      // TODO: Notify backend
      return true
    }
    return false
  } catch (error) {
    logger.error('Push unsubscription failed', error)
    return false
  }
}

export async function sendTestNotification(): Promise<boolean> {
  // This would typically trigger a backend endpoint
  logger.info('Test notification requested')
  return true
}
