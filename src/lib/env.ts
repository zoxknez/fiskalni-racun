/**
 * Modern Environment Variables Validation
 *
 * Type-safe environment variables with runtime validation
 * Prevents silent failures from missing env vars
 */

import { ZodError, type ZodIssue, z } from 'zod'
import { logger } from '@/lib/logger'

/**
 * Environment variables schema
 * All required env vars must be defined here
 */
const envSchema = z.object({
  // Neon PostgreSQL Database
  VITE_NEON_DATABASE_URL: z
    .string()
    .min(1, 'Neon database URL is required')
    .refine(
      (url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
      'Invalid Neon database URL format'
    )
    .refine(
      (url) => !url.includes('user:password') && !url.includes('placeholder'),
      'Please set a real Neon database URL (remove placeholder values)'
    ),

  // Optional - Monitoring & Analytics
  VITE_SENTRY_DSN: z.string().url().optional(),
  VITE_GA_MEASUREMENT_ID: z.string().optional(),
  VITE_POSTHOG_KEY: z.string().optional(),
  VITE_VERCEL_ANALYTICS_ID: z.string().optional(),
  VITE_VAPID_PUBLIC_KEY: z.string().optional(),

  // Optional - App Info
  VITE_APP_VERSION: z.string().optional(),
  VITE_APP_ENV: z.enum(['development', 'staging', 'production']).optional(),

  // Mode
  MODE: z.enum(['development', 'production', 'test']),
  DEV: z.boolean(),
  PROD: z.boolean(),
  SSR: z.boolean(),
})

/**
 * Validated environment variables
 * Throws error if validation fails
 */
type StrictImportMetaEnv = {
  VITE_NEON_DATABASE_URL: string
  VITE_SENTRY_DSN?: string
  VITE_GA_MEASUREMENT_ID?: string
  VITE_POSTHOG_KEY?: string
  VITE_VERCEL_ANALYTICS_ID?: string
  VITE_VAPID_PUBLIC_KEY?: string
  VITE_APP_VERSION?: string
  VITE_APP_ENV?: 'development' | 'staging' | 'production'
  MODE: 'development' | 'production' | 'test'
  DEV: boolean
  PROD: boolean
  SSR: boolean
}

function validateEnv() {
  const rawEnv = import.meta.env as unknown as StrictImportMetaEnv

  const env = {
    VITE_NEON_DATABASE_URL: rawEnv.VITE_NEON_DATABASE_URL,
    VITE_SENTRY_DSN: rawEnv.VITE_SENTRY_DSN,
    VITE_GA_MEASUREMENT_ID: rawEnv.VITE_GA_MEASUREMENT_ID,
    VITE_POSTHOG_KEY: rawEnv.VITE_POSTHOG_KEY,
    VITE_VERCEL_ANALYTICS_ID: rawEnv.VITE_VERCEL_ANALYTICS_ID,
    VITE_VAPID_PUBLIC_KEY: rawEnv.VITE_VAPID_PUBLIC_KEY,
    VITE_APP_VERSION: rawEnv.VITE_APP_VERSION,
    VITE_APP_ENV: rawEnv.VITE_APP_ENV,
    MODE: rawEnv.MODE,
    DEV: rawEnv.DEV,
    PROD: rawEnv.PROD,
    SSR: rawEnv.SSR,
  }

  try {
    const validated = envSchema.parse(env)

    // Additional security checks in production
    if (validated.PROD) {
      // Warn if optional but recommended vars are missing
      if (!validated.VITE_SENTRY_DSN) {
        logger.warn('⚠️  VITE_SENTRY_DSN not set - error tracking disabled')
      }

      // Ensure we're not using development/localhost URLs in production
      if (validated.VITE_NEON_DATABASE_URL.includes('localhost')) {
        throw new Error('Cannot use localhost database URL in production!')
      }
    }

    return validated
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.issues.map(
        (issue: ZodIssue) => `${issue.path.join('.')}: ${issue.message}`
      )

      logger.error('❌ Environment validation failed:')
      logger.error(messages.join('\n'))
      logger.error('\n💡 Tip: Copy .env.example to .env and fill in your values')

      throw new Error(`Invalid environment variables:\n${messages.join('\n')}`)
    }
    throw error
  }
}

/**
 * Typed and validated environment variables
 */
export const env = validateEnv()

/**
 * Helper to check if in development
 */
export const isDevelopment = env.MODE === 'development'

/**
 * Helper to check if in production
 */
export const isProduction = env.MODE === 'production'

/**
 * Helper to check if in test
 */
export const isTest = env.MODE === 'test'

/**
 * Get app version
 */
export const appVersion = env.VITE_APP_VERSION || '1.0.0'

/**
 * Feature flags based on environment
 */
export const features = {
  enableAnalytics: isProduction && !!env.VITE_GA_MEASUREMENT_ID,
  enableSentry: isProduction && !!env.VITE_SENTRY_DSN,
  enablePostHog: isProduction && !!env.VITE_POSTHOG_KEY,
  enableVercelAnalytics: isProduction && !!env.VITE_VERCEL_ANALYTICS_ID,
  enableDevTools: isDevelopment,
  enableMocking: isTest,
} as const

// Example usage:
/*
import { env, features, isProduction } from '@/lib/env'

// Type-safe access
const neonDbUrl = env.VITE_NEON_DATABASE_URL // string (validated)

// Feature flags
if (features.enableAnalytics) {
  initializeGA()
}

// Environment checks
if (isProduction) {
  // Production-only code
}
*/
