// Re-export types from lib/db.ts for consistency
export type {
  Device,
  Receipt,
  ReceiptItem,
  Reminder,
  SyncQueue,
  UserSettings,
} from '@lib/db'

// Re-export category types from lib/categories.ts
import type { CategoryValue } from '@lib/categories'

export type { CategoryDef, Locale } from '@lib/categories'
export type Category = CategoryValue

export interface Attachment {
  id: string
  type: 'image' | 'pdf' | 'document'
  name: string
  url: string
  size?: number
  createdAt: Date
}

export interface User {
  id: string
  email: string
  fullName?: string
  avatarUrl?: string
  createdAt: Date
}

export interface AppSettings {
  language: 'sr' | 'en'
  theme: 'light' | 'dark' | 'system'
  notificationsEnabled: boolean
  pushNotifications: boolean
  emailNotifications: boolean
  appLock: boolean
  biometricLock: boolean
  warrantyExpiryThreshold: number // days before expiry to show "expiring soon" warning
  warrantyCriticalThreshold: number // days before expiry to show critical alert
}

// Category type now imported from lib/categories.ts above

export interface SpendingInsight {
  period: string
  total: number
  byCategory: Record<Category, number>
  topVendors: Array<{ vendor: string; amount: number }>
  count: number
}

export interface FilterOptions {
  dateFrom?: Date
  dateTo?: Date
  category?: Category
  vendor?: string
  minAmount?: number
  maxAmount?: number
}

export interface SortOptions {
  field: 'date' | 'amount' | 'vendor'
  order: 'asc' | 'desc'
}
