/**
 * Password Validation Schema
 *
 * Modern security requirements:
 * - Minimum 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * - Not in common passwords list
 *
 * @module lib/validation/passwordSchema
 */

import { z } from 'zod'

/**
 * Common passwords to reject (top 100 most common)
 * Source: https://github.com/danielmiessler/SecLists
 */
const COMMON_PASSWORDS = [
  'password',
  'Password123!',
  'Admin123!',
  'User123!',
  'Welcome123!',
  '123456',
  '12345678',
  'qwerty',
  'abc123',
  'monkey',
  '1234567',
  'letmein',
  'trustno1',
  'dragon',
  'baseball',
  '111111',
  'iloveyou',
  'master',
  'sunshine',
  'ashley',
  'bailey',
  'passw0rd',
  'shadow',
  '123123',
  '654321',
  'superman',
  'qazwsx',
  'michael',
  'Football',
]

/**
 * Password strength requirements
 */
export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 128

/**
 * Password validation schema
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Šifra mora imati najmanje ${PASSWORD_MIN_LENGTH} karaktera`)
  .max(PASSWORD_MAX_LENGTH, `Šifra ne sme biti duža od ${PASSWORD_MAX_LENGTH} karaktera`)
  .regex(/[A-Z]/, 'Šifra mora sadržati najmanje jedno veliko slovo')
  .regex(/[a-z]/, 'Šifra mora sadržati najmanje jedno malo slovo')
  .regex(/[0-9]/, 'Šifra mora sadržati najmanje jedan broj')
  .regex(/[^A-Za-z0-9]/, 'Šifra mora sadržati najmanje jedan specijalan karakter (!@#$%^&*)')
  .refine(
    (password) => {
      // Check against common passwords (case-insensitive)
      const lowerPassword = password.toLowerCase()
      return !COMMON_PASSWORDS.some((common) => lowerPassword === common.toLowerCase())
    },
    {
      message: 'Ova šifra je previše česta i nije bezbedna. Molimo izaberite jačiju šifru.',
    }
  )
  .refine(
    (password) => {
      // Check for sequential characters (123, abc, etc.)
      const sequences = ['0123456789', 'abcdefghijklmnopqrstuvwxyz', 'qwertyuiop', 'asdfghjkl']
      const lowerPassword = password.toLowerCase()

      for (const sequence of sequences) {
        for (let i = 0; i <= sequence.length - 4; i++) {
          const substring = sequence.substring(i, i + 4)
          if (lowerPassword.includes(substring)) {
            return false
          }
        }
      }

      return true
    },
    {
      message: 'Šifra ne sme sadržati sekvence karaktera (npr. 1234, abcd)',
    }
  )
  .refine(
    (password) => {
      // Check for repeated characters (aaaa, 1111, etc.)
      const repeatedPattern = /(.)\1{3,}/
      return !repeatedPattern.test(password)
    },
    {
      message: 'Šifra ne sme sadržati isti karakter ponovljen 4 ili više puta',
    }
  )

/**
 * Confirm password schema (must match)
 */
export const confirmPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Šifre se ne poklapaju',
    path: ['confirmPassword'],
  })

/**
 * Calculate password strength (0-100)
 */
export function calculatePasswordStrength(password: string): {
  score: number
  feedback: string
} {
  let score = 0

  // Length
  if (password.length >= 12) score += 20
  if (password.length >= 16) score += 10
  if (password.length >= 20) score += 10

  // Character diversity
  if (/[a-z]/.test(password)) score += 10
  if (/[A-Z]/.test(password)) score += 10
  if (/[0-9]/.test(password)) score += 10
  if (/[^A-Za-z0-9]/.test(password)) score += 10

  // Multiple character types
  const charTypes = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length

  if (charTypes >= 3) score += 10
  if (charTypes === 4) score += 10

  // Entropy check (variety of characters)
  const uniqueChars = new Set(password.split('')).size
  if (uniqueChars >= password.length * 0.6) score += 10

  // Generate feedback
  let feedback = ''
  if (score < 40) {
    feedback = 'Veoma slaba šifra'
  } else if (score < 60) {
    feedback = 'Slaba šifra'
  } else if (score < 80) {
    feedback = 'Dobra šifra'
  } else {
    feedback = 'Jaka šifra'
  }

  return { score, feedback }
}

/**
 * Generate secure random password
 */
export function generateSecurePassword(length = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?'

  const all = uppercase + lowercase + numbers + special

  let password = ''

  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)]
  }

  // Shuffle
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('')
}
