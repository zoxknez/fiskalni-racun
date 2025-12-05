/**
 * Sync API Validation Schemas
 *
 * Zod schemas for validating sync request data
 */

import { z } from 'zod'

// ────────────────────────────────────────────────────────────
// Base Schemas
// ────────────────────────────────────────────────────────────

const dateSchema = z
  .union([z.string().datetime(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.date()])
  .nullable()
  .optional()

const uuidSchema = z.string().uuid()

// ────────────────────────────────────────────────────────────
// Entity Type Enum
// ────────────────────────────────────────────────────────────

export const EntityType = z.enum([
  'receipt',
  'device',
  'reminder',
  'householdBill',
  'document',
  'settings',
])

export type EntityTypeValue = z.infer<typeof EntityType>

// ────────────────────────────────────────────────────────────
// Operation Type Enum
// ────────────────────────────────────────────────────────────

export const OperationType = z.enum(['create', 'update', 'delete'])

export type OperationTypeValue = z.infer<typeof OperationType>

// ────────────────────────────────────────────────────────────
// Receipt Schema
// ────────────────────────────────────────────────────────────

export const ReceiptDataSchema = z
  .object({
    merchantName: z.string().min(1).max(255),
    pib: z.string().max(20).nullable().optional(),
    date: dateSchema,
    time: z.string().max(10).nullable().optional(),
    totalAmount: z.number().min(0),
    vatAmount: z.number().min(0).nullable().optional(),
    items: z
      .array(
        z.object({
          name: z.string(),
          quantity: z.number().optional(),
          unitPrice: z.number().optional(),
          totalPrice: z.number().optional(),
        })
      )
      .nullable()
      .optional(),
    category: z.string().max(50).nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
    qrLink: z.string().url().nullable().optional(),
    imageUrl: z.string().url().nullable().optional(),
    pdfUrl: z.string().url().nullable().optional(),
    createdAt: dateSchema,
    updatedAt: dateSchema,
  })
  .strict()

// ────────────────────────────────────────────────────────────
// Device Schema
// ────────────────────────────────────────────────────────────

export const DeviceDataSchema = z
  .object({
    receiptId: uuidSchema.nullable().optional(),
    brand: z.string().min(1).max(100),
    model: z.string().min(1).max(100),
    category: z.string().max(50).nullable().optional(),
    serialNumber: z.string().max(100).nullable().optional(),
    imageUrl: z.string().url().nullable().optional(),
    purchaseDate: dateSchema,
    warrantyDuration: z.number().int().min(0).max(120).nullable().optional(),
    warrantyExpiry: dateSchema,
    warrantyTerms: z.string().max(2000).nullable().optional(),
    status: z.enum(['active', 'expired', 'in_service']).default('active'),
    serviceCenterName: z.string().max(255).nullable().optional(),
    serviceCenterAddress: z.string().max(500).nullable().optional(),
    serviceCenterPhone: z.string().max(50).nullable().optional(),
    serviceCenterHours: z.string().max(255).nullable().optional(),
    attachments: z.array(z.string().url()).nullable().optional(),
    createdAt: dateSchema,
    updatedAt: dateSchema,
  })
  .strict()

// ────────────────────────────────────────────────────────────
// Reminder Schema
// ────────────────────────────────────────────────────────────

export const ReminderDataSchema = z
  .object({
    deviceId: uuidSchema,
    type: z.enum(['email', 'push', 'sms']),
    daysBeforeExpiry: z.number().int().min(1).max(365),
    status: z.enum(['pending', 'sent', 'failed']).default('pending'),
    sentAt: dateSchema,
    createdAt: dateSchema,
    updatedAt: dateSchema,
  })
  .strict()

// ────────────────────────────────────────────────────────────
// Household Bill Schema
// ────────────────────────────────────────────────────────────

export const HouseholdBillDataSchema = z
  .object({
    billType: z.string().min(1).max(50),
    provider: z.string().min(1).max(255),
    accountNumber: z.string().max(50).nullable().optional(),
    amount: z.number().min(0),
    billingPeriodStart: dateSchema,
    billingPeriodEnd: dateSchema,
    dueDate: dateSchema,
    paymentDate: dateSchema,
    status: z.enum(['pending', 'paid', 'overdue']).default('pending'),
    consumption: z
      .object({
        value: z.number().optional(),
        unit: z.string().optional(),
      })
      .nullable()
      .optional(),
    notes: z.string().max(1000).nullable().optional(),
    createdAt: dateSchema,
    updatedAt: dateSchema,
  })
  .strict()

// ────────────────────────────────────────────────────────────
// Document Schema
// ────────────────────────────────────────────────────────────

export const DocumentDataSchema = z
  .object({
    type: z.string().min(1).max(50),
    name: z.string().min(1).max(255),
    fileUrl: z.string().url().nullable().optional(),
    thumbnailUrl: z.string().url().nullable().optional(),
    expiryDate: dateSchema,
    expiryReminderDays: z.number().int().min(0).max(365).nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
    createdAt: dateSchema,
    updatedAt: dateSchema,
  })
  .strict()

// ────────────────────────────────────────────────────────────
// Settings Schema
// ────────────────────────────────────────────────────────────

export const SettingsDataSchema = z
  .object({
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    language: z.enum(['sr', 'en', 'hr', 'sl']).default('sr'),
    notificationsEnabled: z.boolean().default(true),
    emailNotifications: z.boolean().default(false),
    pushNotifications: z.boolean().default(true),
    biometricLock: z.boolean().default(false),
    warrantyExpiryThreshold: z.number().int().min(1).max(365).default(30),
    warrantyCriticalThreshold: z.number().int().min(1).max(30).default(7),
    quietHoursStart: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .nullable()
      .optional(),
    quietHoursEnd: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .nullable()
      .optional(),
    updatedAt: dateSchema,
  })
  .strict()

// ────────────────────────────────────────────────────────────
// Main Sync Request Schema
// ────────────────────────────────────────────────────────────

export const SyncRequestSchema = z.object({
  entityType: EntityType,
  entityId: uuidSchema,
  operation: OperationType,
  data: z.record(z.unknown()).optional(),
})

export type SyncRequest = z.infer<typeof SyncRequestSchema>

// ────────────────────────────────────────────────────────────
// Validation Helper
// ────────────────────────────────────────────────────────────

export function validateEntityData(
  entityType: EntityTypeValue,
  data: unknown
): { success: true; data: unknown } | { success: false; error: z.ZodError } {
  const schemas: Record<EntityTypeValue, z.ZodSchema> = {
    receipt: ReceiptDataSchema,
    device: DeviceDataSchema,
    reminder: ReminderDataSchema,
    householdBill: HouseholdBillDataSchema,
    document: DocumentDataSchema,
    settings: SettingsDataSchema,
  }

  const schema = schemas[entityType]
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  return { success: false, error: result.error }
}

// ────────────────────────────────────────────────────────────
// Table Mapping
// ────────────────────────────────────────────────────────────

export const ENTITY_TABLE_MAP: Record<EntityTypeValue, string> = {
  receipt: 'receipts',
  device: 'devices',
  reminder: 'reminders',
  householdBill: 'household_bills',
  document: 'documents',
  settings: 'user_settings',
}
