export interface Receipt {
  id: string
  vendor: string
  pib?: string
  date: Date
  time?: string
  amount: number
  vat?: number
  category: string
  notes?: string
  items?: ReceiptItem[]
  attachments?: Attachment[]
  eReceiptUrl?: string
  qrData?: string
  createdAt: Date
  updatedAt: Date
  syncStatus?: 'synced' | 'pending' | 'error'
}

export interface ReceiptItem {
  id: string
  name: string
  quantity?: number
  price?: number
  total?: number
}

export interface Device {
  id: string
  receiptId?: string
  brand: string
  model: string
  serialNumber?: string
  category: string
  purchaseDate: Date
  warrantyDuration: number // months
  warrantyExpires: Date
  warrantyStatus: 'active' | 'expiring' | 'expired'
  warrantyTerms?: string
  serviceName?: string
  serviceAddress?: string
  servicePhone?: string
  attachments?: Attachment[]
  reminders?: Reminder[]
  createdAt: Date
  updatedAt: Date
}

export interface Reminder {
  id: string
  deviceId: string
  type: '30days' | '7days' | '1day' | 'custom'
  date: Date
  sent: boolean
  opened?: boolean
}

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
