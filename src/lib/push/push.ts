/**
 * Push Notifications Module
 *
 * Handles web push notification subscriptions and management.
 * Uses the Push API and Service Worker for delivering notifications.
 *
 * @module push
 */

import { supabase } from '@/lib/supabase'

/**
 * Push subscription data
 */
export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied'
  }
  return Notification.permission
}

/**
 * Request notification permission from user
 *
 * @returns {Promise<NotificationPermission>} The permission status
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    throw new Error('Push notifikacije nisu podržane u vašem browseru')
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  const permission = await Notification.requestPermission()
  return permission
}

/**
 * Convert base64 string to Uint8Array for VAPID key
 *
 * @param base64String - Base64 encoded VAPID public key
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

/**
 * Subscribe to push notifications
 *
 * @returns {Promise<PushSubscription>} The push subscription object
 */
export async function subscribeToPush(): Promise<PushSubscription> {
  if (!isPushSupported()) {
    throw new Error('Push notifikacije nisu podržane')
  }

  // Request permission first
  const permission = await requestNotificationPermission()
  if (permission !== 'granted') {
    throw new Error('Dozvola za notifikacije je odbijena')
  }

  try {
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      return subscription
    }

    // Get VAPID public key from environment
    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY

    if (!vapidPublicKey) {
      throw new Error('VAPID public key nije konfigurisan')
    }

    // Subscribe to push notifications
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    })

    // Store subscription in database
    await storeSubscription(subscription)

    return subscription
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Nije moguće pretplatiti se na notifikacije: ${err.message}`)
    }
    throw new Error('Nepoznata greška prilikom pretplate na notifikacije')
  }
}

/**
 * Store push subscription in database
 *
 * @param subscription - The push subscription to store
 */
async function storeSubscription(subscription: PushSubscription): Promise<void> {
  const subscriptionData = subscription.toJSON()

  const { error } = await supabase.from('push_subscriptions').upsert({
    endpoint: subscription.endpoint,
    p256dh: subscriptionData.keys?.p256dh,
    auth: subscriptionData.keys?.auth,
    user_agent: navigator.userAgent,
    updated_at: new Date().toISOString(),
  } as never)

  if (error) {
    console.error('Failed to store push subscription:', error)
    throw new Error('Nije moguće sačuvati pretplatu na notifikacije')
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      return true
    }

    // Remove from database first
    await removeSubscription(subscription.endpoint)

    // Unsubscribe from push manager
    const success = await subscription.unsubscribe()
    return success
  } catch (err) {
    console.error('Failed to unsubscribe from push:', err)
    return false
  }
}

/**
 * Remove subscription from database
 *
 * @param endpoint - The subscription endpoint to remove
 */
async function removeSubscription(endpoint: string): Promise<void> {
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)

  if (error) {
    console.error('Failed to remove subscription from database:', error)
  }
}

/**
 * Get current push subscription
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    return await registration.pushManager.getSubscription()
  } catch {
    return null
  }
}

/**
 * Check if user is subscribed to push notifications
 */
export async function isSubscribed(): Promise<boolean> {
  const subscription = await getCurrentSubscription()
  return subscription !== null
}

/**
 * Send a test notification
 */
export async function sendTestNotification(): Promise<void> {
  if (!isPushSupported()) {
    throw new Error('Notifikacije nisu podržane')
  }

  if (Notification.permission !== 'granted') {
    throw new Error('Dozvola za notifikacije nije data')
  }

  // Send test notification directly (not push)
  const registration = await navigator.serviceWorker.ready
  await registration.showNotification('Test notifikacija', {
    body: 'Vaše push notifikacije rade ispravno!',
    icon: '/logo.svg',
    badge: '/logo.svg',
    tag: 'test-notification',
    requireInteraction: false,
    data: {
      url: '/',
    },
  })
}
