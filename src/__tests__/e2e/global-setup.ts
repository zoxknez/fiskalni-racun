/**
 * Playwright Global Setup for E2E Tests
 *
 * Configures test environment to prevent memory leaks
 */

import type { FullConfig } from '@playwright/test'

async function globalSetup(_config: FullConfig) {
  console.log('🔧 Setting up E2E test environment...')

  // Set environment variables for test mode
  process.env['NODE_ENV'] = 'test'
  process.env['VITE_TEST_MODE'] = 'true'

  // Enable garbage collection in Node.js
  if (global.gc) {
    console.log('✅ Manual garbage collection enabled')
  } else {
    console.warn(
      '⚠️  Manual GC not available. Run with --expose-gc flag for better memory management'
    )
  }

  console.log('✅ E2E test environment ready')
}

export default globalSetup
