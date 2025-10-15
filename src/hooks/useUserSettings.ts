import { db } from '@lib/db'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAppStore } from '@/store/useAppStore'
import type { UserSettings } from '@/types'

/**
 * Hook to get current user settings from IndexedDB
 * Returns default values if no settings found
 */
export function useUserSettings(): UserSettings | undefined {
  const user = useAppStore((s) => s.user)
  const userId = user?.id ?? 'anonymous'

  return useLiveQuery(async () => {
    const settings = await db.settings.where('userId').equals(userId).first()

    // Return defaults if no settings found
    if (!settings) {
      return {
        userId,
        theme: 'system',
  language: 'sr',
        notificationsEnabled: true,
        emailNotifications: true,
        pushNotifications: true,
        biometricLock: false,
        warrantyExpiryThreshold: 30,
        warrantyCriticalThreshold: 7,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:30',
        updatedAt: new Date(),
      }
    }

    return settings
  }, [userId])
}
