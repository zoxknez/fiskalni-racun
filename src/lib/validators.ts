import { z } from 'zod'

/**
 * Modern Zod Validation Utilities
 *
 * Reusable validation schemas and utilities
 * Composable, type-safe, with Serbian error messages
 */

/**
 * Common field validators
 */
export const validators = {
  // Email validation
  email: z
    .string()
    .email('Neispravan email format')
    .min(5, 'Email je prekratak')
    .max(255, 'Email je predugačak')
    .toLowerCase()
    .trim(),

  // PIB validation (9 digits)
  pib: z
    .string()
    .regex(/^\d{9}$/, 'PIB mora imati tačno 9 cifara')
    .trim(),

  // Phone number validation
  phone: z
    .string()
    .regex(/^[\d\s+()-]{6,20}$/, 'Neispravan format broja telefona')
    .trim(),

  // Serbian postal code
  postalCode: z.string().regex(/^\d{5}$/, 'Poštanski broj mora imati 5 cifara'),

  // Positive number
  positiveNumber: z.number().positive('Broj mora biti veći od 0').finite('Broj mora biti konačan'),

  // Non-negative number
  nonNegativeNumber: z
    .number()
    .nonnegative('Broj ne može biti negativan')
    .finite('Broj mora biti konačan'),

  // Currency amount
  currency: z
    .number()
    .positive('Iznos mora biti veći od 0')
    .multipleOf(0.01, 'Maksimalno 2 decimale')
    .max(1000000000, 'Iznos je prevelik'),

  // Date validation
  date: z.coerce.date().refine((date) => !Number.isNaN(date.getTime()), 'Neispravan datum'),

  // Past date only
  pastDate: z.coerce.date().max(new Date(), 'Datum ne može biti u budućnosti'),

  // Future date only
  futureDate: z.coerce.date().min(new Date(), 'Datum ne može biti u prošlosti'),

  // URL validation
  url: z
    .string()
    .url('Neispravan URL format')
    .refine((url) => url.startsWith('http://') || url.startsWith('https://'), {
      message: 'URL mora početi sa http:// ili https://',
    }),

  // Hex color
  hexColor: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i, 'Neispravan hex color format'),

  // Non-empty string
  nonEmptyString: z.string().trim().min(1, 'Polje ne može biti prazno'),

  // Optional non-empty string (empty string → undefined)
  optionalNonEmptyString: z
    .string()
    .trim()
    .transform((val) => (val === '' ? undefined : val))
    .optional(),
}

/**
 * Composite validators
 */

// Create range validator
export function numberInRange(min: number, max: number, message?: string) {
  return z
    .number()
    .min(min, message || `Mora biti veće ili jednako ${min}`)
    .max(max, message || `Mora biti manje ili jednako ${max}`)
}

// Create string length validator
export function stringLength(min: number, max: number) {
  return z
    .string()
    .min(min, `Mora imati najmanje ${min} karaktera`)
    .max(max, `Mora imati najviše ${max} karaktera`)
}

// Create enum from array
export function createEnum<T extends string>(values: readonly T[]) {
  return z.enum(values as [T, ...T[]])
}

// Advanced validators removed due to Zod v4 compatibility issues
// Use basic validators above instead

/**
 * Safe parse with default value
 */
export function parseWithDefault<T>(schema: z.ZodType<T>, data: unknown, defaultValue: T): T {
  const result = schema.safeParse(data)
  return result.success ? result.data : defaultValue
}

/**
 * Validate or throw with custom error
 */
export function validateOrThrow<T>(
  schema: z.ZodType<T>,
  data: unknown,
  errorPrefix: string = 'Validation failed'
): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as any
      const messages = zodError.issues?.map((e: any) => e.message).join(', ') || 'Unknown error'
      throw new Error(`${errorPrefix}: ${messages}`)
    }
    throw error
  }
}

// Example usage:
/*
// Email with custom validation
const userEmail = validators.email.parse('user@example.com')

// Range validation
const age = numberInRange(18, 100).parse(25)

// Async validation (check if email exists in DB)
const uniqueEmailSchema = z.object({
  email: validators.email.pipe(
    asyncValidator(
      async (email) => {
        const exists = await checkEmailExists(email)
        return !exists
      },
      'Email već postoji',
      300 // debounce 300ms
    )
  )
})

// Safe parse with default
const config = parseWithDefault(
  z.object({ theme: z.enum(['light', 'dark']) }),
  localStorage.getItem('config'),
  { theme: 'light' }
)
*/
