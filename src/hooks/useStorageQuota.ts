import { useCallback, useEffect, useState } from 'react'
import { logger } from '@/lib/logger'

/**
 * Modern Storage Quota Hook
 *
 * Monitors IndexedDB storage quota using StorageManager API
 * Alerts user when storage is running low
 *
 * Modern API (Chrome 55+, Firefox 57+, Safari 15.2+)
 */

export interface StorageInfo {
  used: number // bytes
  quota: number // bytes
  usedMB: number
  quotaMB: number
  percentageUsed: number
  isLow: boolean // > 80%
  isCritical: boolean // > 95%
}

export function useStorageQuota() {
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null)
  const [isSupported, setIsSupported] = useState(false)

  const checkStorageQuota = useCallback(async () => {
    if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
      setIsSupported(false)
      return
    }

    setIsSupported(true)

    try {
      const estimate = await navigator.storage.estimate()
      const used = estimate.usage || 0
      const quota = estimate.quota || 0

      const info: StorageInfo = {
        used,
        quota,
        usedMB: Math.round((used / 1048576) * 100) / 100,
        quotaMB: Math.round((quota / 1048576) * 100) / 100,
        percentageUsed: quota > 0 ? Math.round((used / quota) * 100) : 0,
        isLow: quota > 0 && used / quota > 0.8,
        isCritical: quota > 0 && used / quota > 0.95,
      }

      setStorageInfo(info)

      // Log warnings
      if (info.isCritical) {
        logger.warn('🚨 CRITICAL: Storage usage >95%', info)
      } else if (info.isLow) {
        logger.warn('⚠️ WARNING: Storage usage >80%', info)
      } else {
        logger.debug('Storage usage:', info)
      }
    } catch (error) {
      logger.error('Failed to check storage quota:', error)
    }
  }, [])

  useEffect(() => {
    checkStorageQuota()

    // Check every 30 seconds
    const interval = setInterval(checkStorageQuota, 30000)

    return () => clearInterval(interval)
  }, [checkStorageQuota])

  const requestPersistentStorage = useCallback(async (): Promise<boolean> => {
    if (!('storage' in navigator) || !('persist' in navigator.storage)) {
      return false
    }

    try {
      const isPersisted = await navigator.storage.persisted()

      if (!isPersisted) {
        const granted = await navigator.storage.persist()
        logger.info('Persistent storage requested:', granted)
        return granted
      }

      return true
    } catch (error) {
      logger.error('Failed to request persistent storage:', error)
      return false
    }
  }, [])

  const cleanupOldData = useCallback(async () => {
    const { db } = await import('@lib/db')

    try {
      // ⭐ Delete receipts older than 6 months that are synced
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      const deleted = await db.receipts
        .where('date')
        .below(sixMonthsAgo)
        .and((r) => r.syncStatus === 'synced')
        .delete()

      logger.info(`Deleted ${deleted} old receipts`)

      // ⭐ Clear old cached images
      if ('caches' in window) {
        const cache = await caches.open('images')
        const requests = await cache.keys()

        // Delete half of cached images
        const toDelete = requests.slice(0, Math.floor(requests.length / 2))
        await Promise.all(toDelete.map((req) => cache.delete(req)))

        logger.info(`Deleted ${toDelete.length} cached images`)
      }

      // Re-check quota
      await checkStorageQuota()

      return deleted
    } catch (error) {
      logger.error('Cleanup failed:', error)
      throw error
    }
  }, [checkStorageQuota])

  return {
    storageInfo,
    isSupported,
    requestPersistentStorage,
    refetch: checkStorageQuota,
    cleanupOldData,
  }
}
