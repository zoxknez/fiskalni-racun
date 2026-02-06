/**
 * Database Types
 *
 * Centralized type definitions for the database entities.
 *
 * @module lib/db/types
 */

import type {
  HouseholdBillStatus,
  HouseholdBillType,
  HouseholdConsumptionUnit,
} from '@lib/household'

// ────────────────────────────────
// Receipt Types
// ────────────────────────────────
export interface ReceiptItem {
  name: string
  quantity: number
  price: number
  total: number
}

export interface Receipt {
  id?: string
  merchantName: string
  pib: string
  date: Date
  time: string
  totalAmount: number
  vatAmount?: number
  items?: ReceiptItem[]
  category: string
  tags?: string[]
  notes?: string
  qrLink?: string
  imageUrl?: string
  pdfUrl?: string
  createdAt: Date
  updatedAt: Date
  syncStatus: SyncStatus
}

// ────────────────────────────────
// Household Bill Types
// ────────────────────────────────
export interface HouseholdConsumption {
  value: number
  unit: HouseholdConsumptionUnit
}

export interface HouseholdBill {
  id?: string
  billType: HouseholdBillType
  provider: string
  accountNumber?: string
  amount: number
  billingPeriodStart: Date
  billingPeriodEnd: Date
  dueDate: Date
  paymentDate?: Date
  status: HouseholdBillStatus
  consumption?: HouseholdConsumption
  notes?: string
  createdAt: Date
  updatedAt: Date
  syncStatus: SyncStatus
}

// ────────────────────────────────
// Device Types
// ────────────────────────────────
export interface Device {
  id?: string
  receiptId?: string
  brand: string
  model: string
  category: string
  serialNumber?: string
  imageUrl?: string
  purchaseDate: Date
  warrantyDuration: number
  warrantyExpiry: Date
  warrantyTerms?: string
  status: DeviceStatus
  serviceCenterName?: string
  serviceCenterAddress?: string
  serviceCenterPhone?: string
  serviceCenterHours?: string
  attachments?: string[]
  tags?: string[]
  reminders: Reminder[]
  createdAt: Date
  updatedAt: Date
  syncStatus: SyncStatus
}

export type DeviceStatus = 'active' | 'expired' | 'in-service'

// ────────────────────────────────
// Reminder Types
// ────────────────────────────────
export interface Reminder {
  id?: string
  deviceId: string
  type: 'warranty'
  daysBeforeExpiry: number
  status: ReminderStatus
  sentAt?: Date
  createdAt: Date
}

export type ReminderStatus = 'pending' | 'sent' | 'dismissed'

// ────────────────────────────────
// Tag Types
// ────────────────────────────────
export interface Tag {
  id?: string
  name: string
  color: string
  createdAt: Date
  updatedAt: Date
}

// ────────────────────────────────
// Budget Types
// ────────────────────────────────
export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly'

export interface Budget {
  id?: string
  name: string
  amount: number
  period: BudgetPeriod
  category?: string
  startDate: Date
  isActive: boolean
  color: string
  createdAt: Date
  updatedAt: Date
}

// ────────────────────────────────
// Recurring Bill Types
// ────────────────────────────────
export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export interface RecurringBill {
  id?: string
  name: string
  amount: number
  category: string
  frequency: RecurringFrequency
  nextDueDate: Date
  lastPaidDate?: Date
  reminderDays: number
  isPaused: boolean
  notes?: string
  createdAt: Date
  updatedAt: Date
}

// ────────────────────────────────
// Subscription Types
// ────────────────────────────────
export type SubscriptionBillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export type SubscriptionCategory =
  | 'streaming'
  | 'music'
  | 'gaming'
  | 'fitness'
  | 'software'
  | 'news'
  | 'cloud'
  | 'education'
  | 'other'

export interface Subscription {
  id?: string
  name: string
  provider: string
  category: SubscriptionCategory
  amount: number
  billingCycle: SubscriptionBillingCycle
  nextBillingDate: Date
  startDate: Date
  cancelUrl?: string
  loginUrl?: string
  notes?: string
  isActive: boolean
  reminderDays: number
  logoUrl?: string
  createdAt: Date
  updatedAt: Date
}

// ────────────────────────────────
// Settings Types
// ────────────────────────────────
export type SupportedLanguage = 'sr' | 'en' | 'hr' | 'sl'
export type ThemeMode = 'light' | 'dark' | 'system'

export interface UserSettings {
  id?: string
  userId: string
  theme: ThemeMode
  language: SupportedLanguage
  notificationsEnabled: boolean
  emailNotifications: boolean
  pushNotifications: boolean
  biometricLock: boolean
  warrantyExpiryThreshold: number
  warrantyCriticalThreshold: number
  quietHoursStart: string
  quietHoursEnd: string
  updatedAt: Date
}

// ────────────────────────────────
// Document Types
// ────────────────────────────────
export type DocumentType =
  | 'id_card'
  | 'passport'
  | 'driver_license'
  | 'vehicle_registration'
  | 'registration_date'
  | 'health_insurance'
  | 'other'

export interface Document {
  id?: string
  type: DocumentType
  name: string
  fileUrl: string
  thumbnailUrl?: string
  expiryDate?: Date
  expiryReminderDays?: number
  notes?: string
  tags?: string[]
  createdAt: Date
  updatedAt: Date
  syncStatus: SyncStatus
}

// ────────────────────────────────
// Saved E-Receipt Types
// ────────────────────────────────
export interface SavedEReceipt {
  id?: string
  url: string
  merchantName?: string
  scannedAt: Date
  notes?: string
}

// ────────────────────────────────
// Sync Types
// ────────────────────────────────
export type SyncStatus = 'synced' | 'pending' | 'error'
export type SyncEntityType = 'receipt' | 'device' | 'reminder' | 'document' | 'householdBill'
export type SyncOperation = 'create' | 'update' | 'delete'

export interface SyncQueue {
  id?: number
  entityType: SyncEntityType
  entityId: string
  operation: SyncOperation
  data: unknown
  retryCount: number
  lastError?: string
  createdAt: Date
}

// ────────────────────────────────
// Migration Types
// ────────────────────────────────
export interface Migration {
  version: number
  name: string
  description: string
  appliedAt: Date
}
