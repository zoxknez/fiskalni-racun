import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.PLAYWRIGHT_PORT || 4173)
const HOST = process.env.PLAYWRIGHT_HOST || '127.0.0.1'
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || `http://${HOST}:${PORT}`

export default defineConfig({
  testDir: './src/__tests__/e2e',
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,
  workers: 1, // ⚠️ Single worker to prevent IndexedDB conflicts
  maxFailures: 3, // ⚠️ Stop after 3 failures to save resources
  globalSetup: './src/__tests__/e2e/global-setup.ts', // ⚠️ Memory leak prevention
  retries: 0, // ⚠️ No retries to prevent memory buildup
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'on-failure' }]],
  timeout: 60_000, // ⚠️ Reduced from 120s to prevent memory buildup
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: BASE_URL,
    headless: true,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 720 },
    navigationTimeout: 15000, // ⚠️ Allow time for animations to finish
    actionTimeout: 10000, // ⚠️ Allow time for user actions
    launchOptions: {
      args: [
        '--ignore-certificate-errors',
        '--disable-dev-shm-usage', // ⚠️ Prevent /dev/shm issues
        '--disable-gpu', // ⚠️ Reduce memory usage
        '--js-flags=--max-old-space-size=2048', // ⚠️ Limit JS heap to 2GB
      ],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // ⚠️ CRITICAL: Additional memory optimizations for Chrome
        launchOptions: {
          args: [
            '--ignore-certificate-errors',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-sandbox', // Reduce process overhead
            '--disable-setuid-sandbox',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--js-flags=--max-old-space-size=512', // ⚠️ Chrome: 512MB heap
            '--disable-features=site-per-process', // Reduce process count
            '--disable-extensions',
            '--disable-component-extensions-with-background-pages',
          ],
        },
      },
    },
  ],
  webServer: {
    command: `npm run preview:test -- --host ${HOST} --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: true, // ⚠️ CRITICAL: Don't restart server between test runs
    timeout: 120_000,
  },
})
