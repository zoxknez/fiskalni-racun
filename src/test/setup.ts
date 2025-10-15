/**
 * Vitest Setup File
 *
 * Global test configuration and utilities
 */

import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock environment variables
beforeAll(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
} as any

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any

// Mock requestIdleCallback
global.requestIdleCallback = vi.fn((cb) => setTimeout(cb, 0)) as any
global.cancelIdleCallback = vi.fn()

// Mock createImageBitmap
global.createImageBitmap = vi.fn().mockResolvedValue({
  width: 100,
  height: 100,
  close: vi.fn(),
}) as any

// Suppress console errors in tests (optional)
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
}
