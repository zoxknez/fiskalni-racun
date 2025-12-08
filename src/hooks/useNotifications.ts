/**
 * useNotifications Hook
 *
 * Aggregates all types of notifications from different sources:
 * - Warranty expiration reminders
 * - Document expiration reminders
 * - Household bill due date reminders
 * - System notifications
 */

import { useMemo } from 'react'
import { useDevices, useDocuments, useHouseholdBills } from '@/hooks/useDatabase'

export type NotificationType =
  | 'warranty_expiring'
  | 'warranty_expired'
  | 'document_expiring'
  | 'document_expired'
  | 'bill_due'
  | 'bill_overdue'
  | 'system'

export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low'

export interface AppNotification {
  id: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  entityId?: string
  entityType?: 'device' | 'document' | 'bill'
  link?: string
  createdAt: Date
  expiresAt?: Date
  daysRemaining?: number
  isRead?: boolean
}

function getDaysUntil(date: Date): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function getPriority(daysRemaining: number): NotificationPriority {
  if (daysRemaining < 0) return 'critical'
  if (daysRemaining <= 1) return 'critical'
  if (daysRemaining <= 7) return 'high'
  if (daysRemaining <= 30) return 'medium'
  return 'low'
}

export function useNotifications() {
  const devices = useDevices()
  const documents = useDocuments()
  const householdBills = useHouseholdBills()

  const notifications = useMemo<AppNotification[]>(() => {
    const result: AppNotification[] = []
    const now = new Date()

    // Warranty notifications (devices)
    if (devices) {
      for (const device of devices) {
        if (!device.id || !device.warrantyExpiry || device.status === 'in-service') continue

        const daysRemaining = getDaysUntil(device.warrantyExpiry)
        const deviceName = `${device.brand} ${device.model}`

        // Only show notifications for items expiring within 30 days or already expired
        if (daysRemaining <= 30) {
          const isExpired = daysRemaining < 0
          result.push({
            id: `warranty-${device.id}`,
            type: isExpired ? 'warranty_expired' : 'warranty_expiring',
            priority: getPriority(daysRemaining),
            title: isExpired
              ? 'Garancija je istekla'
              : daysRemaining === 0
                ? 'Garancija ističe danas!'
                : daysRemaining === 1
                  ? 'Garancija ističe sutra!'
                  : `Garancija ističe za ${daysRemaining} dana`,
            message: deviceName,
            entityId: device.id,
            entityType: 'device',
            link: `/warranties/${device.id}`,
            createdAt: now,
            expiresAt: device.warrantyExpiry,
            daysRemaining,
          })
        }
      }
    }

    // Document expiration notifications
    if (documents) {
      for (const doc of documents) {
        if (!doc.id || !doc.expiryDate) continue

        const daysRemaining = getDaysUntil(doc.expiryDate)
        const reminderDays = doc.expiryReminderDays ?? 30

        if (daysRemaining <= reminderDays) {
          const isExpired = daysRemaining < 0
          result.push({
            id: `document-${doc.id}`,
            type: isExpired ? 'document_expired' : 'document_expiring',
            priority: getPriority(daysRemaining),
            title: isExpired
              ? 'Dokument je istekao'
              : daysRemaining === 0
                ? 'Dokument ističe danas!'
                : daysRemaining === 1
                  ? 'Dokument ističe sutra!'
                  : `Dokument ističe za ${daysRemaining} dana`,
            message: doc.name,
            entityId: doc.id,
            entityType: 'document',
            link: '/documents',
            createdAt: now,
            expiresAt: doc.expiryDate,
            daysRemaining,
          })
        }
      }
    }

    // Household bill due date notifications
    if (householdBills) {
      for (const bill of householdBills) {
        if (!bill.id || !bill.dueDate || bill.status === 'paid') continue

        const daysRemaining = getDaysUntil(bill.dueDate)

        // Show bills due within 14 days or overdue
        if (daysRemaining <= 14) {
          const isOverdue = daysRemaining < 0
          result.push({
            id: `bill-${bill.id}`,
            type: isOverdue ? 'bill_overdue' : 'bill_due',
            priority: isOverdue ? 'critical' : getPriority(daysRemaining),
            title: isOverdue
              ? 'Račun je zakasnio!'
              : daysRemaining === 0
                ? 'Račun dospeva danas!'
                : daysRemaining === 1
                  ? 'Račun dospeva sutra!'
                  : `Račun dospeva za ${daysRemaining} dana`,
            message: `${bill.provider} - ${bill.amount.toLocaleString('sr-RS')} RSD`,
            entityId: bill.id,
            entityType: 'bill',
            link: '/analytics',
            createdAt: now,
            expiresAt: bill.dueDate,
            daysRemaining,
          })
        }
      }
    }

    // Sort by priority and days remaining
    return result.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff
      return (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0)
    })
  }, [devices, documents, householdBills])

  const stats = useMemo(() => {
    const critical = notifications.filter((n) => n.priority === 'critical').length
    const high = notifications.filter((n) => n.priority === 'high').length
    const medium = notifications.filter((n) => n.priority === 'medium').length
    const total = notifications.length
    const unread = notifications.filter((n) => !n.isRead).length

    return { critical, high, medium, total, unread }
  }, [notifications])

  const groupedNotifications = useMemo(() => {
    const groups: Record<NotificationType, AppNotification[]> = {
      warranty_expiring: [],
      warranty_expired: [],
      document_expiring: [],
      document_expired: [],
      bill_due: [],
      bill_overdue: [],
      system: [],
    }

    for (const notification of notifications) {
      groups[notification.type].push(notification)
    }

    return groups
  }, [notifications])

  return {
    notifications,
    groupedNotifications,
    stats,
    hasNotifications: notifications.length > 0,
    hasCritical: stats.critical > 0,
  }
}
