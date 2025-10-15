/**
 * Form Validation Schemas
 *
 * Zod schemas for all forms in the app
 *
 * @module lib/forms/schemas
 */

import { z } from 'zod'
import { passwordSchema } from '../validation/passwordSchema'

/**
 * Auth - Sign up schema
 */
export const signUpSchema = z
  .object({
    email: z.string().min(1, 'Email je obavezan').email('Unesite validnu email adresu'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Šifre se ne poklapaju',
    path: ['confirmPassword'],
  })

export type SignUpFormData = z.infer<typeof signUpSchema>

/**
 * Auth - Sign in schema
 */
export const signInSchema = z.object({
  email: z.string().min(1, 'Email je obavezan').email('Unesite validnu email adresu'),
  password: z.string().min(1, 'Šifra je obavezna'),
})

export type SignInFormData = z.infer<typeof signInSchema>

/**
 * Receipt - Add/Edit schema
 */
export const receiptSchema = z.object({
  merchantName: z.string().min(1, 'Naziv prodavca je obavezan').max(200, 'Naziv je predug'),
  pib: z
    .string()
    .regex(/^\d{9}$/, 'PIB mora imati 9 cifara')
    .optional()
    .or(z.literal('')),
  date: z.coerce.date(),
  time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Nevalidan format vremena'),
  totalAmount: z.number().positive('Iznos mora biti pozitivan').max(1000000, 'Iznos je prevelik'),
  vatAmount: z.number().nonnegative().optional(),
  category: z.string().min(1, 'Kategorija je obavezna'),
  notes: z.string().max(500, 'Napomena je preduga').optional(),
  qrLink: z.string().url('Nevažeći URL').optional().or(z.literal('')),
  imageUrl: z.string().url().optional().or(z.literal('')),
})

export type ReceiptFormData = z.infer<typeof receiptSchema>

/**
 * Device - Add/Edit schema
 */
export const deviceSchema = z.object({
  brand: z.string().min(1, 'Brend je obavezan').max(100, 'Brend je predug'),
  model: z.string().min(1, 'Model je obavezan').max(100, 'Model je predug'),
  category: z.string().min(1, 'Kategorija je obavezna'),
  serialNumber: z.string().max(100).optional().or(z.literal('')),
  purchaseDate: z.coerce.date(),
  warrantyDuration: z
    .number()
    .int('Mora biti ceo broj')
    .nonnegative('Ne može biti negativan')
    .max(120, 'Maksimalno 120 meseci (10 godina)'),
  warrantyTerms: z.string().max(1000).optional(),
  serviceCenterName: z.string().max(200).optional(),
  serviceCenterAddress: z.string().max(300).optional(),
  serviceCenterPhone: z
    .string()
    .regex(/^[\d\s\-+()]*$/, 'Nevažeći format telefona')
    .max(50)
    .optional()
    .or(z.literal('')),
  serviceCenterHours: z.string().max(200).optional(),
  receiptId: z.number().optional(),
})

export type DeviceFormData = z.infer<typeof deviceSchema>

/**
 * Settings schema
 */
export const settingsSchema = z.object({
  language: z.enum(['sr', 'en']),
  theme: z.enum(['light', 'dark', 'system']),
  notificationsEnabled: z.boolean(),
  pushNotifications: z.boolean(),
  emailNotifications: z.boolean(),
  appLock: z.boolean(),
  biometricLock: z.boolean(),
  warrantyExpiryThreshold: z.number().int().min(1).max(365),
  warrantyCriticalThreshold: z.number().int().min(1).max(365),
})

export type SettingsFormData = z.infer<typeof settingsSchema>

/**
 * Search schema
 */
export const searchSchema = z
  .object({
    query: z.string().max(200),
    category: z.string().optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    amountMin: z.number().nonnegative().optional(),
    amountMax: z.number().positive().optional(),
  })
  .refine(
    (data) => {
      if (data.amountMin !== undefined && data.amountMax !== undefined) {
        return data.amountMin <= data.amountMax
      }
      return true
    },
    {
      message: 'Minimalni iznos ne može biti veći od maksimalnog',
      path: ['amountMin'],
    }
  )

export type SearchFormData = z.infer<typeof searchSchema>
