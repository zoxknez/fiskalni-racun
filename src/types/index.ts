// Re-export types from lib/db.ts for consistency
export type {
  Receipt,
  ReceiptItem,
  Device,
  Reminder,
  UserSettings,
  SyncQueue,
} from '@lib/db'

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
  createdAt: Date
}

export interface AppSettings {
  language: 'sr' | 'en'
  theme: 'light' | 'dark' | 'system'
  pushNotifications: boolean
  emailNotifications: boolean
  appLock: boolean
  biometric: boolean
}

export type Category = 
  | 'groceries'
  | 'electronics'
  | 'clothing'
  | 'health'
  | 'home'
  | 'automotive'
  | 'entertainment'
  | 'education'
  | 'sports'
  | 'other'

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
