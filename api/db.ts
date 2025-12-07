import { type NeonQueryFunction, neon } from '@neondatabase/serverless'

// Type helper for query results
export type QueryResult<T = Record<string, unknown>> = T[]

// In API routes, use DATABASE_URL (not VITE_NEON_DATABASE_URL)
// VITE_ prefix is only for client-side code
const DATABASE_URL = process.env['DATABASE_URL'] || process.env['VITE_NEON_DATABASE_URL']

if (!DATABASE_URL) {
  // Log warning but don't throw at import time
  // This prevents Vercel from returning HTML error page
  // Error will be caught by error handler when route is called
  console.error(
    '[api/db.ts] ⚠️  DATABASE_URL environment variable is not defined.\n' +
      'Please set DATABASE_URL in your Vercel project settings:\n' +
      '1. Go to Vercel Dashboard > Your Project > Settings > Environment Variables\n' +
      '2. Add DATABASE_URL with your Neon database connection string'
  )
}

// Create sql instance - lazy initialization
let sqlInstance: NeonQueryFunction<false, false> | null = null

function getSqlInstance(): NeonQueryFunction<false, false> {
  if (!DATABASE_URL) {
    throw new Error(
      'DATABASE_URL environment variable is not defined. Please configure it in your Vercel project settings under Environment Variables.'
    )
  }

  if (!sqlInstance) {
    sqlInstance = neon(DATABASE_URL)
  }

  return sqlInstance
}

// Export sql as a tagged template function that lazily initializes
export const sql: NeonQueryFunction<false, false> = ((
  strings: TemplateStringsArray,
  ...values: unknown[]
) => {
  const instance = getSqlInstance()
  return instance(strings, ...values)
}) as NeonQueryFunction<false, false>
