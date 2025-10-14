import { z } from 'zod'

export const receiptSchema = z.object({
  merchantName: z.string().min(2, 'Prodavac je obavezan'),
  pib: z
    .string()
    .regex(/^[0-9]{9}$/g, 'PIB mora sadržati 9 cifara')
    .optional()
    .or(z.literal('')),
  date: z.coerce
    .date()
    .max(new Date(), { message: 'Datum ne može biti u budućnosti' }),
  time: z.string().min(1).default('00:00'),
  totalAmount: z
    .coerce
    .number()
    .positive('Iznos mora biti veći od 0'),
  vatAmount: z.number().nonnegative().optional(),
  category: z.string().min(1, 'Odaberi kategoriju'),
  notes: z.string().max(500).optional(),
  qrLink: z.string().url().optional(),
})

export const receiptItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive().default(1),
  price: z.number().nonnegative(),
  total: z.number().nonnegative(),
})

export const deviceSchema = z.object({
  receiptId: z.number().optional(),
  brand: z.string().min(1, 'Brend je obavezan'),
  model: z.string().min(1, 'Model je obavezan'),
  category: z.string().min(1, 'Kategorija je obavezna'),
  serialNumber: z.string().optional(),
  purchaseDate: z.coerce.date().max(new Date(), 'Datum kupovine mora biti u prošlosti'),
  warrantyDuration: z.number().min(0).max(120, 'Trajanje garancije max 120 meseci'),
  warrantyTerms: z.string().max(1000).optional(),
  serviceCenterName: z.string().optional(),
  serviceCenterAddress: z.string().optional(),
  serviceCenterPhone: z.string().optional(),
  serviceCenterHours: z.string().optional(),
})

export const reminderSchema = z.object({
  deviceId: z.number(),
  daysBeforeExpiry: z.union([
    z.literal(30),
    z.literal(7),
    z.literal(1),
    z.number().min(0).max(365),
  ]),
})

export const credentialsSchema = z.object({
  email: z.string().email('Unesi validan email'),
  otp: z.string().optional(),
})

export type ReceiptFormValues = z.infer<typeof receiptSchema>
export type ReceiptItemFormValues = z.infer<typeof receiptItemSchema>
export type DeviceFormValues = z.infer<typeof deviceSchema>
