/**
 * Zod Validation Schemas
 *
 * Runtime validation for API responses and user inputs
 * Provides type safety and catches data inconsistencies early
 */

import { z } from 'zod'

// ============================================
// BASE SCHEMAS
// ============================================

export const timestampSchema = z.object({
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
})

export const imageSchema = z.object({
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  name: z.string().optional(),
  size: z.number().int().positive().optional(),
  type: z.string().optional(),
})

// ============================================
// RECEIPT SCHEMAS
// ============================================

export const receiptItemSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Item name is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().nonnegative('Price cannot be negative'),
  totalPrice: z.number().nonnegative('Total cannot be negative'),
  category: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
})

export const consumptionSchema = z.object({
  value: z.number().nonnegative('Consumption value must be non-negative'),
  unit: z.string().min(1, 'Unit is required'),
})

export const fiscalReceiptSchema = z
  .object({
    id: z.string().uuid().optional(),
    type: z.literal('fiscal'),
    merchantName: z.string().min(1, 'Merchant name is required'),
    merchantTin: z.string().optional(),
    date: z.coerce.date(),
    amount: z.number().positive('Amount must be positive'),
    totalAmount: z.number().positive('Total amount must be positive'),
    taxAmount: z.number().nonnegative().optional(),
    pfr: z.string().optional(),
    counter: z.string().optional(),
    qrCode: z.string().optional(),
    qrData: z.string().optional(),
    category: z.enum(['food', 'transport', 'utilities', 'healthcare', 'entertainment', 'other']),
    paymentMethod: z.enum(['cash', 'card', 'transfer', 'other']).optional(),
    notes: z.string().max(1000).optional(),
    items: z.array(receiptItemSchema).optional(),
    images: z.array(imageSchema).optional(),
    location: z.string().optional(),
    userId: z.string().uuid().optional(),
    householdId: z.string().uuid().optional(),
    syncStatus: z.enum(['local', 'synced', 'pending', 'error']).optional(),
  })
  .refine((data) => data.totalAmount >= data.amount, {
    message: 'Total amount cannot be less than amount',
    path: ['totalAmount'],
  })

export const householdBillSchema = z
  .object({
    id: z.string().uuid().optional(),
    type: z.literal('household'),
    billType: z.enum(['electricity', 'water', 'gas', 'internet', 'phone', 'rent', 'other']),
    provider: z.string().min(1, 'Provider is required'),
    accountNumber: z.string().optional(),
    amount: z.number().positive('Amount must be positive'),
    dueDate: z.coerce.date(),
    paymentDate: z.coerce.date().optional(),
    isPaid: z.boolean().default(false),
    isRecurring: z.boolean().default(false),
    recurringDay: z.number().int().min(1).max(31).optional(),
    notes: z.string().max(1000).optional(),
    images: z.array(imageSchema).optional(),
    userId: z.string().uuid().optional(),
    householdId: z.string().uuid().optional(),
    syncStatus: z.enum(['local', 'synced', 'pending', 'error']).optional(),
  })
  .refine((data) => !data.paymentDate || data.paymentDate >= data.dueDate, {
    message: 'Payment date cannot be before due date',
    path: ['paymentDate'],
  })
  .refine((data) => !data.isRecurring || data.recurringDay !== undefined, {
    message: 'Recurring bills must have a recurring day',
    path: ['recurringDay'],
  })

export const receiptSchema = z.union([fiscalReceiptSchema, householdBillSchema]) as z.ZodType<any>

// ============================================
// WARRANTY SCHEMAS
// ============================================

export const warrantySchema = z
  .object({
    id: z.string().uuid().optional(),
    receiptId: z.string().uuid().optional(),
    productName: z.string().min(1, 'Product name is required'),
    manufacturer: z.string().optional(),
    serialNumber: z.string().optional(),
    purchaseDate: z.coerce.date(),
    warrantyEndDate: z.coerce.date(),
    warrantyDuration: z.number().int().positive().optional(),
    warrantyType: z.enum(['manufacturer', 'extended', 'store', 'other']).optional(),
    notes: z.string().max(1000).optional(),
    images: z.array(imageSchema).optional(),
    notificationDays: z.number().int().positive().default(30),
    isNotified: z.boolean().default(false),
    userId: z.string().uuid().optional(),
    householdId: z.string().uuid().optional(),
    syncStatus: z.enum(['local', 'synced', 'pending', 'error']).optional(),
  })
  .refine((data) => data.warrantyEndDate > data.purchaseDate, {
    message: 'Warranty end date must be after purchase date',
    path: ['warrantyEndDate'],
  })

// ============================================
// USER & HOUSEHOLD SCHEMAS
// ============================================

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email('Invalid email address'),
  fullName: z.string().min(1, 'Full name is required').optional(),
  avatarUrl: z.string().url().optional(),
  language: z.enum(['sr', 'en']).default('sr'),
  currency: z.string().length(3).default('RSD'),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  notificationsEnabled: z.boolean().default(true),
  ...timestampSchema.shape,
})

export const householdSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Household name is required'),
  description: z.string().max(500).optional(),
  ownerId: z.string().uuid(),
  currency: z.string().length(3).default('RSD'),
  language: z.enum(['sr', 'en']).default('sr'),
  members: z
    .array(
      z.object({
        userId: z.string().uuid(),
        role: z.enum(['owner', 'admin', 'member']),
        joinedAt: z.string().datetime(),
      })
    )
    .optional(),
  ...timestampSchema.shape,
})

export const householdInviteSchema = z.object({
  id: z.string().uuid().optional(),
  householdId: z.string().uuid(),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member']),
  invitedBy: z.string().uuid(),
  expiresAt: z.string().datetime(),
  status: z.enum(['pending', 'accepted', 'rejected', 'expired']),
  ...timestampSchema.shape,
})

// ============================================
// STATISTICS SCHEMAS
// ============================================

export const categoryStatSchema = z.object({
  category: z.string(),
  total: z.number().nonnegative(),
  count: z.number().int().nonnegative(),
  percentage: z.number().min(0).max(100),
})

export const monthlyStatSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format (YYYY-MM)'),
  total: z.number().nonnegative(),
  count: z.number().int().nonnegative(),
  categories: z.array(categoryStatSchema).optional(),
})

export const dashboardStatsSchema = z.object({
  totalReceipts: z.number().int().nonnegative(),
  totalSpent: z.number().nonnegative(),
  thisMonthSpent: z.number().nonnegative(),
  thisMonthCount: z.number().int().nonnegative(),
  averagePerReceipt: z.number().nonnegative(),
  topCategories: z.array(categoryStatSchema),
  monthlyStats: z.array(monthlyStatSchema),
  expiringWarranties: z.number().int().nonnegative(),
})

// ============================================
// API RESPONSE SCHEMAS
// ============================================

export const apiSuccessSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
  message: z.string().optional(),
})

export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
})

export const apiResponseSchema = z.union([apiSuccessSchema, apiErrorSchema])

// ============================================
// SUPABASE RESPONSE SCHEMAS
// ============================================

export const supabaseReceiptResponseSchema = z.object({
  data: z.array(receiptSchema).nullable(),
  error: z
    .object({
      message: z.string(),
      details: z.string().optional(),
      hint: z.string().optional(),
      code: z.string().optional(),
    })
    .nullable(),
  count: z.number().int().nonnegative().nullable().optional(),
})

export const supabaseWarrantyResponseSchema = z.object({
  data: z.array(warrantySchema).nullable(),
  error: z
    .object({
      message: z.string(),
      details: z.string().optional(),
      hint: z.string().optional(),
      code: z.string().optional(),
    })
    .nullable(),
  count: z.number().int().nonnegative().nullable().optional(),
})

// ============================================
// FORM VALIDATION SCHEMAS
// ============================================

// Extract the base schema before refinements to use .omit()
const baseFiscalReceiptSchema = z.object({
  id: z.string().optional(),
  type: z.literal('fiscal'),
  merchantName: z.string().min(1, 'Merchant name is required'),
  merchantTin: z.string().optional(),
  date: z.coerce.date(),
  totalAmount: z.number().positive('Total amount must be positive'),
  vatAmount: z.number().nonnegative().optional(),
  items: z.array(receiptItemSchema).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  imageUrl: z.string().url().optional(),
  qrData: z.string().optional(),
  notes: z.string().optional(),
  userId: z.string().optional(),
  householdId: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurringInterval: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  recurringDay: z.number().int().min(1).max(31).optional(),
  syncStatus: z.enum(['pending', 'synced', 'failed']).optional(),
})

export const addFiscalReceiptFormSchema = baseFiscalReceiptSchema.omit({
  id: true,
  userId: true,
  householdId: true,
  syncStatus: true,
})

// Extract the base schema before refinements to use .omit()
const baseHouseholdBillSchema = z.object({
  id: z.string().optional(),
  type: z.literal('household'),
  billType: z.enum(['electricity', 'water', 'gas', 'internet', 'phone', 'rent', 'other']),
  provider: z.string().min(1, 'Provider is required'),
  accountNumber: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  billingPeriodStart: z.coerce.date(),
  billingPeriodEnd: z.coerce.date(),
  dueDate: z.coerce.date(),
  paymentDate: z.coerce.date().optional(),
  status: z.enum(['pending', 'paid', 'overdue']).default('pending'),
  consumption: consumptionSchema.optional(),
  notes: z.string().optional(),
  userId: z.string().optional(),
  householdId: z.string().optional(),
  syncStatus: z.enum(['pending', 'synced', 'failed']).optional(),
})

export const addHouseholdBillFormSchema = baseHouseholdBillSchema.omit({
  id: true,
  userId: true,
  householdId: true,
  syncStatus: true,
})

// Extract the base schema before refinements to use .omit()
const baseWarrantySchema = z.object({
  id: z.string().optional(),
  receiptId: z.string().optional(),
  productName: z.string().min(1, 'Product name is required'),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.coerce.date(),
  warrantyDuration: z.number().int().positive('Warranty duration must be positive'),
  warrantyExpiry: z.coerce.date(),
  warrantyTerms: z.string().optional(),
  serviceCenterName: z.string().optional(),
  serviceCenterPhone: z.string().optional(),
  userId: z.string().optional(),
  syncStatus: z.enum(['pending', 'synced', 'failed']).optional(),
})

export const addWarrantyFormSchema = baseWarrantySchema.omit({
  id: true,
  userId: true,
  syncStatus: true,
})

export const updateProfileFormSchema = userProfileSchema.partial().omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const createHouseholdFormSchema = householdSchema.omit({
  id: true,
  ownerId: true,
  members: true,
  created_at: true,
  updated_at: true,
})

// ============================================
// SEARCH & FILTER SCHEMAS
// ============================================

export const receiptFilterSchema = z.object({
  type: z.enum(['fiscal', 'household', 'all']).optional(),
  category: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  minAmount: z.number().nonnegative().optional(),
  maxAmount: z.number().nonnegative().optional(),
  merchantName: z.string().optional(),
  isPaid: z.boolean().optional(),
  householdId: z.string().uuid().optional(),
})

export const warrantyFilterSchema = z.object({
  status: z.enum(['active', 'expiring', 'expired', 'all']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  householdId: z.string().uuid().optional(),
})

// ============================================
// TYPES (inferred from schemas)
// ============================================

export type Receipt = z.infer<typeof receiptSchema>
export type FiscalReceipt = z.infer<typeof fiscalReceiptSchema>
export type HouseholdBill = z.infer<typeof householdBillSchema>
export type ReceiptItem = z.infer<typeof receiptItemSchema>
export type Warranty = z.infer<typeof warrantySchema>
export type UserProfile = z.infer<typeof userProfileSchema>
export type Household = z.infer<typeof householdSchema>
export type HouseholdInvite = z.infer<typeof householdInviteSchema>
export type DashboardStats = z.infer<typeof dashboardStatsSchema>
export type CategoryStat = z.infer<typeof categoryStatSchema>
export type MonthlyStat = z.infer<typeof monthlyStatSchema>
export type ReceiptFilter = z.infer<typeof receiptFilterSchema>
export type WarrantyFilter = z.infer<typeof warrantyFilterSchema>
