import { neon } from '@neondatabase/serverless'

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

// Create sql instance - lazy initialization to avoid errors at import time
let sqlInstance: ReturnType<typeof neon> | null = null

function getSql() {
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

// Proxy to lazy-initialize sql instance
export const sql = new Proxy({} as ReturnType<typeof neon>, {
  get(_target, prop) {
    const instance = getSql()
    const value = instance[prop as keyof typeof instance]

    if (typeof value === 'function') {
      return value.bind(instance)
    }

    return value
  },
}) as ReturnType<typeof neon>
