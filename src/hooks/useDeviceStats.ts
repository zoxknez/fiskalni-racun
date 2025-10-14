import { useMemo } from 'react'
import { getDaysUntil } from '@/lib'
import type { Device } from '@/types'

export interface DeviceStats {
  total: number
  active: number
  expired: number
  inService: number
  expiringSoon: number // within 30 days
  expiringCritical: number // within 7 days
}

/**
 * Calculate comprehensive device statistics
 * Uses lib/utils getDaysUntil for consistency
 */
export function useDeviceStats(devices: Device[] | undefined): DeviceStats {
  return useMemo(() => {
    if (!devices) {
      return {
        total: 0,
        active: 0,
        expired: 0,
        inService: 0,
        expiringSoon: 0,
        expiringCritical: 0,
      }
    }

    const stats: DeviceStats = {
      total: devices.length,
      active: 0,
      expired: 0,
      inService: 0,
      expiringSoon: 0,
      expiringCritical: 0,
    }

    devices.forEach((device) => {
      // Count by status
      if (device.status === 'active') stats.active++
      else if (device.status === 'expired') stats.expired++
      else if (device.status === 'in-service') stats.inService++

      // Count expiring devices (only active ones)
      if (device.status === 'active') {
        const daysUntil = getDaysUntil(device.warrantyExpiry)
        
        if (daysUntil >= 0 && daysUntil <= 30) {
          stats.expiringSoon++
        }
        
        if (daysUntil >= 0 && daysUntil <= 7) {
          stats.expiringCritical++
        }
      }
    })

    return stats
  }, [devices])
}
