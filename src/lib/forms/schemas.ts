import { z } from 'zod'
import i18n from '@/i18n'
import { passwordSchema } from '../validation/passwordSchema'

/**
 * Auth - Sign up schema
 */
export const signUpSchema = z
  .object({
    email: z
      .string()
      .min(1, i18n.t('validation.emailRequired'))
      .email(i18n.t('validation.emailInvalid')),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: i18n.t('validation.passwordsDoNotMatch'),
    path: ['confirmPassword'],
  })

export type SignUpFormData = z.infer<typeof signUpSchema>

/**
 * Auth - Sign in schema
 */
export const signInSchema = z.object({
  email: z
    .string()
    .min(1, i18n.t('validation.emailRequired'))
    .email(i18n.t('validation.emailInvalid')),
  password: z.string().min(1, i18n.t('validation.passwordRequired')),
})

export type SignInFormData = z.infer<typeof signInSchema>

/**
 * Receipt - Add/Edit schema
 */
export const receiptSchema = z.object({
  merchantName: z
    .string()
    .min(1, i18n.t('validation.merchantNameRequired'))
    .max(200, i18n.t('validation.merchantNameMaxLength')),
  pib: z
    .string()
    .regex(/^\d{9}$/, i18n.t('validation.pibInvalid'))
    .optional()
    .or(z.literal('')),
  date: z.coerce.date({
    invalid_type_error: i18n.t('validation.dateRequired'),
  }),
  time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, i18n.t('validation.timeInvalid')),
  totalAmount: z
    .number({
      required_error: i18n.t('validation.amountRequired'),
    })
    .positive(i18n.t('validation.amountPositive'))
    .max(1000000, i18n.t('validation.amountMax')),
  vatAmount: z.number().nonnegative(i18n.t('validation.vatAmountNonNegative')).optional(),
  category: z.string().min(1, i18n.t('validation.categoryRequired')),
  notes: z
    .string()
    .max(500, i18n.t('validation.notesMaxLength', { max: 500 }))
    .optional(),
  qrLink: z.string().url(i18n.t('validation.urlInvalid')).optional().or(z.literal('')),
  imageUrl: z.string().url(i18n.t('validation.urlInvalid')).optional().or(z.literal('')),
})

export type ReceiptFormData = z.infer<typeof receiptSchema>

/**
 * Device - Add/Edit schema
 */
export const deviceSchema = z.object({
  brand: z
    .string()
    .min(1, i18n.t('validation.brandRequired'))
    .max(100, i18n.t('validation.brandMaxLength')),
  model: z
    .string()
    .min(1, i18n.t('validation.modelRequired'))
    .max(100, i18n.t('validation.modelMaxLength')),
  category: z.string().min(1, i18n.t('validation.categoryRequired')),
  serialNumber: z
    .string()
    .max(100, i18n.t('validation.serialNumberMaxLength'))
    .optional()
    .or(z.literal('')),
  purchaseDate: z.coerce.date({
    invalid_type_error: i18n.t('validation.dateRequired'),
  }),
  warrantyDuration: z
    .number()
    .int(i18n.t('validation.warrantyDurationInt'))
    .nonnegative(i18n.t('validation.warrantyDurationNonNegative'))
    .max(120, i18n.t('validation.warrantyDurationMax')),
  warrantyTerms: z.string().max(1000).optional(),
  serviceCenterName: z.string().max(200, i18n.t('validation.serviceNameMaxLength')).optional(),
  serviceCenterAddress: z
    .string()
    .max(300, i18n.t('validation.serviceAddressMaxLength'))
    .optional(),
  serviceCenterPhone: z
    .string()
    .regex(/^[\d\s\-+()]*$/, i18n.t('validation.servicePhoneInvalid'))
    .max(50, i18n.t('validation.servicePhoneMaxLength'))
    .optional()
    .or(z.literal('')),
  serviceCenterHours: z.string().max(200, i18n.t('validation.serviceHoursMaxLength')).optional(),
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
    query: z.string().max(200, i18n.t('validation.queryMaxLength')),
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
      message: i18n.t('validation.amountMinMax'),
      path: ['amountMin'],
    }
  )

export type SearchFormData = z.infer<typeof searchSchema>
