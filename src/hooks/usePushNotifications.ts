import { track } from '@lib/analytics'
import { useCallback, useEffect, useRef, useState } from 'react'
import { logger } from '@/lib/logger'
import {
  getNotificationPermission,
  isPushSupported,
  isSubscribed,
  sendTestNotification,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push'
import type { AppSettings } from '@/types'

export type TogglePushOutcome =
  | { status: 'busy' }
  | { status: 'unsupported' }
  | { status: 'notifications_disabled' }
  | { status: 'permission_blocked'; permission: NotificationPermission }
  | { status: 'subscribed'; permission: NotificationPermission }
  | { status: 'unsubscribed'; permission: NotificationPermission }
  | { status: 'error'; error: string; permission: NotificationPermission }

export type SendTestOutcome =
  | { status: 'busy' }
  | { status: 'unsupported' }
  | { status: 'not_enabled' }
  | { status: 'permission_blocked'; permission: NotificationPermission }
  | { status: 'sent' }
  | { status: 'error'; error: string }

export type EnsureUnsubscribedOutcome =
  | { status: 'unsupported' }
  | { status: 'idle' }
  | { status: 'success'; permission: NotificationPermission }
  | { status: 'error'; error: string; permission: NotificationPermission }

interface UsePushNotificationsOptions {
  notificationsEnabled: boolean
  pushNotifications: boolean
  updateSettings: (settings: Partial<AppSettings>) => void
  userId?: string
}

interface UsePushNotificationsReturn {
  pushSupported: boolean
  notificationPermission: NotificationPermission
  pushError: string | null
  isPushProcessing: boolean
  isSendingTest: boolean
  isPushStateLoading: boolean
  togglePush: () => Promise<TogglePushOutcome>
  sendTest: () => Promise<SendTestOutcome>
  ensureUnsubscribed: () => Promise<EnsureUnsubscribedOutcome>
  refreshPermission: () => Promise<NotificationPermission>
  resetPushError: () => void
}

export function usePushNotifications({
  notificationsEnabled,
  pushNotifications,
  updateSettings,
  userId,
}: UsePushNotificationsOptions): UsePushNotificationsReturn {
  const [pushSupported, setPushSupported] = useState(false)
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>('default')
  const [pushError, setPushError] = useState<string | null>(null)
  const [isPushProcessing, setIsPushProcessing] = useState(false)
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [isPushStateLoading, setIsPushStateLoading] = useState(true)

  const notificationsEnabledRef = useRef(notificationsEnabled)
  const pushNotificationsRef = useRef(pushNotifications)
  const updateSettingsRef = useRef(updateSettings)
  const userIdRef = useRef(userId)
  const lastPermissionRef = useRef<NotificationPermission | null>(null)
  const isProcessingRef = useRef(false)
  const isSendingTestRef = useRef(false)

  useEffect(() => {
    notificationsEnabledRef.current = notificationsEnabled
  }, [notificationsEnabled])

  useEffect(() => {
    pushNotificationsRef.current = pushNotifications
  }, [pushNotifications])

  useEffect(() => {
    updateSettingsRef.current = updateSettings
  }, [updateSettings])

  useEffect(() => {
    userIdRef.current = userId
  }, [userId])

  useEffect(() => {
    isProcessingRef.current = isPushProcessing
  }, [isPushProcessing])

  useEffect(() => {
    isSendingTestRef.current = isSendingTest
  }, [isSendingTest])

  const refreshPermission = useCallback(async () => {
    if (typeof window === 'undefined') return 'default'
    const permission = await getNotificationPermission()
    setNotificationPermission(permission)

    const previous = lastPermissionRef.current
    lastPermissionRef.current = permission

    if (permission === 'denied' && previous !== 'denied') {
      track('push_permission_denied', {
        userId: userIdRef.current,
      })
    }

    return permission
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    let cancelled = false
    setIsPushStateLoading(true)

    const checkSupport = async () => {
      const supported = await isPushSupported()
      if (cancelled) return
      setPushSupported(supported)
      await refreshPermission()

      if (!supported) {
        setIsPushStateLoading(false)
        return
      }

      try {
        const subscribed = await isSubscribed()
        if (cancelled) return
        if (subscribed !== pushNotificationsRef.current) {
          pushNotificationsRef.current = subscribed
        }
      } catch (error) {
        logger.error('Failed to check subscription status:', error)
      } finally {
        if (!cancelled) setIsPushStateLoading(false)
      }
    }

    checkSupport()

    return () => {
      cancelled = true
    }
  }, [refreshPermission])

  const resetPushError = useCallback(() => setPushError(null), [])

  const togglePush = useCallback(async (): Promise<TogglePushOutcome> => {
    if (isProcessingRef.current) {
      return { status: 'busy' }
    }

    if (!pushSupported || typeof window === 'undefined') {
      return { status: 'unsupported' }
    }

    if (!notificationsEnabledRef.current) {
      return { status: 'notifications_disabled' }
    }

    const currentPermission = await refreshPermission()
    if (currentPermission === 'denied') {
      track('push_permission_denied', {
        userId: userIdRef.current,
        source: 'toggle',
      })
      return { status: 'permission_blocked', permission: currentPermission }
    }

    const enable = !pushNotificationsRef.current
    setIsPushProcessing(true)
    isProcessingRef.current = true
    setPushError(null)

    try {
      if (enable) {
        await subscribeToPush()
      } else {
        await unsubscribeFromPush()
      }

      pushNotificationsRef.current = enable
      updateSettingsRef.current({ pushNotifications: enable })

      const permission = await refreshPermission()
      track('push_subscription_success', {
        userId: userIdRef.current,
        action: enable ? 'subscribe' : 'unsubscribe',
        permission,
      })

      return {
        status: enable ? 'subscribed' : 'unsubscribed',
        permission,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown push error'
      setPushError(message)
      const permission = await refreshPermission()

      updateSettingsRef.current({ pushNotifications: !enable })
      pushNotificationsRef.current = !enable

      track('push_subscription_error', {
        userId: userIdRef.current,
        action: enable ? 'subscribe' : 'unsubscribe',
        message,
        permission,
      })

      return { status: 'error', error: message, permission }
    } finally {
      setIsPushProcessing(false)
      isProcessingRef.current = false
    }
  }, [pushSupported, refreshPermission])

  const ensureUnsubscribed = useCallback(async (): Promise<EnsureUnsubscribedOutcome> => {
    if (!pushSupported || typeof window === 'undefined') {
      return { status: 'unsupported' }
    }

    if (!pushNotificationsRef.current) {
      return { status: 'idle' }
    }

    setIsPushProcessing(true)
    isProcessingRef.current = true
    setPushError(null)

    try {
      await unsubscribeFromPush()
      updateSettingsRef.current({ pushNotifications: false })
      pushNotificationsRef.current = false
      const permission = await refreshPermission()

      track('push_subscription_success', {
        userId: userIdRef.current,
        action: 'forced-unsubscribe',
        permission,
      })

      return { status: 'success', permission }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown push error'
      setPushError(message)
      const permission = await refreshPermission()

      track('push_subscription_error', {
        userId: userIdRef.current,
        action: 'forced-unsubscribe',
        message,
        permission,
      })

      return { status: 'error', error: message, permission }
    } finally {
      setIsPushProcessing(false)
      isProcessingRef.current = false
    }
  }, [pushSupported, refreshPermission])

  const sendTest = useCallback(async (): Promise<SendTestOutcome> => {
    if (isSendingTestRef.current) {
      return { status: 'busy' }
    }

    if (!pushSupported || typeof window === 'undefined') {
      return { status: 'unsupported' }
    }

    if (!notificationsEnabledRef.current || !pushNotificationsRef.current) {
      return { status: 'not_enabled' }
    }

    if (notificationPermission !== 'granted') {
      const permission = await refreshPermission()
      return { status: 'permission_blocked', permission }
    }

    setIsSendingTest(true)
    isSendingTestRef.current = true
    setPushError(null)

    try {
      await sendTestNotification()
      track('push_test_sent', {
        userId: userIdRef.current,
      })
      return { status: 'sent' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown push error'
      setPushError(message)
      track('push_test_error', {
        userId: userIdRef.current,
        message,
      })
      return { status: 'error', error: message }
    } finally {
      setIsSendingTest(false)
      isSendingTestRef.current = false
      refreshPermission()
    }
  }, [notificationPermission, pushSupported, refreshPermission])

  return {
    pushSupported,
    notificationPermission,
    pushError,
    isPushProcessing,
    isSendingTest,
    isPushStateLoading,
    togglePush,
    sendTest,
    ensureUnsubscribed,
    refreshPermission,
    resetPushError,
  }
}
