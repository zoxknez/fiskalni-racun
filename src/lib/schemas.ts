import { z } from 'zod'

// Receipt Item Schema
export const ReceiptItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Naziv stavke je obavezan'),
  quantity: z.number().positive().optional(),
  price: z.number().positive().optional(),
  total: z.number().positive().optional(),
})

// Attachment Schema
export const AttachmentSchema = z.object({
  id: z.string(),
  type: z.enum(['image', 'pdf', 'document']),
  name: z.string().min(1),
  url: z.string().url(),
  size: z.number().positive().optional(),
  createdAt: z.date(),
})

// Receipt Schema
export const ReceiptSchema = z.object({
  id: z.string(),
  vendor: z.string().min(2, 'Prodavac mora imati najmanje 2 karaktera'),
  pib: z.string().optional(),
  date: z.date(),
  time: z.string().optional(),
  amount: z.number().positive('Iznos mora biti veći od 0'),
  vat: z.number().nonnegative().optional(),
  category: z.string().min(1, 'Kategorija je obavezna'),
  notes: z.string().optional(),
  items: z.array(ReceiptItemSchema).optional(),
  attachments: z.array(AttachmentSchema).optional(),
  eReceiptUrl: z.string().url().optional(),
  qrData: z.string().optional(),
  currency: z.string().default('RSD'),
  paymentMethod: z.enum(['cash', 'card', 'transfer', 'other']).optional(),
  location: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  syncStatus: z.enum(['synced', 'pending', 'error']).default('synced'),
})

// Create Receipt Input (bez auto-generisanih polja)
export const CreateReceiptSchema = ReceiptSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  syncStatus: true,
})

// Update Receipt Input (sva polja opciona)
export const UpdateReceiptSchema = ReceiptSchema.partial().required({ id: true })

// Reminder Schema
export const ReminderSchema = z.object({
  id: z.string(),
  deviceId: z.string(),
  type: z.enum(['30days', '7days', '1day', 'custom']),
  date: z.date(),
  sent: z.boolean().default(false),
  opened: z.boolean().optional(),
})

// Device Schema
export const DeviceSchema = z.object({
  id: z.string(),
  receiptId: z.string().optional(),
  brand: z.string().min(1, 'Brend je obavezan'),
  model: z.string().min(1, 'Model je obavezan'),
  serialNumber: z.string().optional(),
  category: z.string().min(1, 'Kategorija je obavezna'),
  purchaseDate: z.date(),
  warrantyDuration: z.number().positive('Trajanje garancije mora biti veće od 0'),
  warrantyExpires: z.date(),
  warrantyStatus: z.enum(['active', 'expiring', 'expired']),
  warrantyTerms: z.string().optional(),
  serviceName: z.string().optional(),
  serviceAddress: z.string().optional(),
  servicePhone: z.string().optional(),
  attachments: z.array(AttachmentSchema).optional(),
  reminders: z.array(ReminderSchema).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// Create Device Input
export const CreateDeviceSchema = DeviceSchema.omit({
  id: true,
  warrantyExpires: true,
  warrantyStatus: true,
  createdAt: true,
  updatedAt: true,
})

// Update Device Input
export const UpdateDeviceSchema = DeviceSchema.partial().required({ id: true })

// Types extracted from schemas
export type Receipt = z.infer<typeof ReceiptSchema>
export type CreateReceiptInput = z.infer<typeof CreateReceiptSchema>
export type UpdateReceiptInput = z.infer<typeof UpdateReceiptSchema>

export type Device = z.infer<typeof DeviceSchema>
export type CreateDeviceInput = z.infer<typeof CreateDeviceSchema>
export type UpdateDeviceInput = z.infer<typeof UpdateDeviceSchema>

export type ReceiptItem = z.infer<typeof ReceiptItemSchema>
export type Attachment = z.infer<typeof AttachmentSchema>
export type Reminder = z.infer<typeof ReminderSchema>
