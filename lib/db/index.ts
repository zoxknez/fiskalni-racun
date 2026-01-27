/**
 * Database Module Index
 *
 * Re-exports all database types and utilities for convenient imports.
 *
 * @module lib/db
 *
 * @example
 * ```ts
 * // Import types
 * import type { Receipt, Device } from '@lib/db'
 *
 * // Import utilities
 * import { computeWarrantyExpiry, coerceAmount } from '@lib/db'
 * ```
 */

// Re-export all types
export type {
  Budget,
  BudgetPeriod,
  Device,
  DeviceStatus,
  Document,
  DocumentType,
  HouseholdBill,
  HouseholdConsumption,
  Migration,
  Receipt,
  ReceiptItem,
  RecurringBill,
  RecurringFrequency,
  Reminder,
  ReminderStatus,
  Subscription,
  SubscriptionBillingCycle,
  SubscriptionCategory,
  SupportedLanguage,
  SyncEntityType,
  SyncOperation,
  SyncQueue,
  SyncStatus,
  Tag,
  ThemeMode,
  UserSettings,
} from './types'

// Re-export utilities
export {
  coerceAmount,
  computeWarrantyExpiry,
  computeWarrantyStatus,
  daysUntil,
  isWithinDays,
  normalizeLanguage,
} from './utils'
