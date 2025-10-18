/**
 * Modern Environment Variables Validation
 *
 * Type-safe environment variables with runtime validation
 * Prevents silent failures from missing env vars
 */

import { ZodError, type ZodIssue, z } from 'zod'

/**
 * Environment variables schema
 * All required env vars must be defined here
 */
const envSchema = z.object({
  // Supabase
  VITE_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),

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
  VITE_SUPABASE_URL: string
  VITE_SUPABASE_ANON_KEY: string
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
    VITE_SUPABASE_URL: rawEnv.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: rawEnv.VITE_SUPABASE_ANON_KEY,
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
    return envSchema.parse(env)
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.issues.map(
        (issue: ZodIssue) => `${issue.path.join('.')}: ${issue.message}`
      )

      console.error('❌ Environment validation failed:')
      console.error(messages.join('\n'))

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
const supabaseUrl = env.VITE_SUPABASE_URL // string (validated)

// Feature flags
if (features.enableAnalytics) {
  initializeGA()
}

// Environment checks
if (isProduction) {
  // Production-only code
}
*/
