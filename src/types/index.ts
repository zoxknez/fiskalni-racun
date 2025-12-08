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

export type { DeviceCategory, Locale, ReceiptCategory } from '@lib/categories'
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
  full_name?: string
  avatarUrl?: string
  avatar_url?: string
  createdAt?: Date
  created_at?: string
  is_admin?: boolean
  isAdmin?: boolean
}

export interface AppSettings {
  language: 'sr' | 'en' | 'hr' | 'sl'
  currency: 'RSD' | 'BAM' | 'EUR'
  theme: 'light' | 'dark' | 'system'
  notificationsEnabled: boolean
  pushNotifications: boolean
  emailNotifications: boolean
  appLock: boolean
  biometricLock: boolean
  warrantyExpiryThreshold: number // days before expiry to show "expiring soon" warning
  warrantyCriticalThreshold: number // days before expiry to show critical alert
  onboardingCompleted?: boolean // whether user has completed onboarding
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
