import { AlertTriangle, CheckCircle2, Clock, type LucideIcon, XCircle } from 'lucide-react'
import { useMemo } from 'react'
import { getDaysUntil } from '@/lib'
import type { Device } from '@/types'
import { useUserSettings } from './useUserSettings'

export type WarrantyStatusType =
  | 'active'
  | 'expiring-soon'
  | 'expiring-critical'
  | 'expired'
  | 'in-service'

export interface WarrantyStatusInfo {
  type: WarrantyStatusType
  icon: LucideIcon
  label: string
  daysRemaining: number
  color: string
  bgColor: string
  textColor: string
  borderColor: string
  severity: 'success' | 'warning' | 'danger' | 'info'
}

/**
 * Calculate warranty status with full UI metadata
 * Uses lib/utils getDaysUntil for consistency
 * Uses user-defined thresholds from settings
 * Returns null if device is undefined
 */
export function useWarrantyStatus(device?: Device): WarrantyStatusInfo | null {
  const userSettings = useUserSettings()

  // Use user settings or fallback to defaults
  const expiryThreshold = userSettings?.warrantyExpiryThreshold ?? 30
  const criticalThreshold = userSettings?.warrantyCriticalThreshold ?? 7

  return useMemo(() => {
    if (!device) return null

    const daysRemaining = getDaysUntil(device.warrantyExpiry)

    // In Service
    if (device.status === 'in-service') {
      return {
        type: 'in-service',
        icon: Clock,
        label: 'U servisu',
        daysRemaining,
        color: '#3B82F6', // blue-600
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        textColor: 'text-blue-600 dark:text-blue-400',
        borderColor: 'border-blue-200 dark:border-blue-800',
        severity: 'info',
      } as WarrantyStatusInfo
    }

    // Expired
    if (device.status === 'expired' || daysRemaining < 0) {
      return {
        type: 'expired',
        icon: XCircle,
        label: 'Istekla',
        daysRemaining,
        color: '#EF4444', // red-600
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        textColor: 'text-red-600 dark:text-red-400',
        borderColor: 'border-red-200 dark:border-red-800',
        severity: 'danger',
      } as WarrantyStatusInfo
    }

    // Critical - use user-defined threshold
    if (daysRemaining <= criticalThreshold) {
      return {
        type: 'expiring-critical',
        icon: AlertTriangle,
        label: `${daysRemaining}d`,
        daysRemaining,
        color: '#F59E0B', // amber-600
        bgColor: 'bg-amber-100 dark:bg-amber-900/30',
        textColor: 'text-amber-600 dark:text-amber-400',
        borderColor: 'border-amber-200 dark:border-amber-800',
        severity: 'danger',
      } as WarrantyStatusInfo
    }

    // Soon - use user-defined threshold
    if (daysRemaining <= expiryThreshold) {
      return {
        type: 'expiring-soon',
        icon: AlertTriangle,
        label: `${daysRemaining}d`,
        daysRemaining,
        color: '#F59E0B', // amber-600
        bgColor: 'bg-amber-100 dark:bg-amber-900/30',
        textColor: 'text-amber-600 dark:text-amber-400',
        borderColor: 'border-amber-200 dark:border-amber-800',
        severity: 'warning',
      } as WarrantyStatusInfo
    }

    // Active
    return {
      type: 'active',
      icon: CheckCircle2,
      label: 'Aktivna',
      daysRemaining,
      color: '#10B981', // green-600
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      textColor: 'text-green-600 dark:text-green-400',
      borderColor: 'border-green-200 dark:border-green-800',
      severity: 'success',
    } as WarrantyStatusInfo
  }, [device, expiryThreshold, criticalThreshold])
}
