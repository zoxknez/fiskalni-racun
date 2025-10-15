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
class MockIntersectionObserver {
  readonly root: Element | Document | null = null
  readonly rootMargin = ''
  readonly thresholds: readonly number[] = []
  private readonly callback: IntersectionObserverCallback

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
  }

  disconnect() {}

  observe() {
    this.callback([], this as unknown as IntersectionObserver)
  }

  takeRecords(): IntersectionObserverEntry[] {
    return []
  }

  unobserve() {}
}

global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver

// Mock ResizeObserver
class MockResizeObserver {
  private readonly callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  disconnect() {}

  observe() {
    this.callback([], this as unknown as ResizeObserver)
  }

  unobserve() {}
}

global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver

// Mock requestIdleCallback
const requestIdleCallbackMock: typeof window.requestIdleCallback = (callback) => {
  const start = Date.now()
  return window.setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
    })
  }, 0)
}

const cancelIdleCallbackMock: typeof window.cancelIdleCallback = (handle) => {
  window.clearTimeout(handle)
}

global.requestIdleCallback = vi.fn(requestIdleCallbackMock)
global.cancelIdleCallback = vi.fn(cancelIdleCallbackMock)

// Mock createImageBitmap
const createImageBitmapMock: typeof globalThis.createImageBitmap = async () =>
  ({
    width: 100,
    height: 100,
    close: vi.fn(),
  }) as ImageBitmap

global.createImageBitmap = vi.fn(
  createImageBitmapMock
) as unknown as typeof globalThis.createImageBitmap

// Suppress console errors in tests (optional)
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
}
