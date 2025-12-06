/**
 * Modern Testing Utilities
 *
 * Reusable test helpers and wrappers
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type RenderOptions, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import { BrowserRouter } from 'react-router-dom'
import i18n from '../i18n'

/**
 * Create test query client
 * Disabled retry and loading states for faster tests
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

/**
 * All Providers Wrapper for tests
 */
interface AllProvidersProps {
  children: ReactNode
}

export function AllProviders({ children }: AllProvidersProps) {
  const queryClient = createTestQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

/**
 * Custom render function with all providers
 */
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options })
}

/**
 * Wait for condition to be true
 * Useful for async assertions
 */
export async function waitFor(
  condition: () => boolean,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 3000, interval = 50 } = options
  const startTime = Date.now()

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition')
    }
    await new Promise((resolve) => setTimeout(resolve, interval))
  }
}

/**
 * Create mock user
 */
export function createMockUser(overrides = {}) {
  return {
    id: 'test-user-123',
    email: 'test@example.com',
    fullName: 'Test User',
    avatarUrl: null,
    createdAt: new Date(),
    ...overrides,
  }
}

/**
 * Create mock receipt
 */
export function createMockReceipt(overrides = {}) {
  return {
    id: 1,
    merchantName: 'Test Market',
    pib: '123456789',
    date: new Date(),
    time: '12:00',
    totalAmount: 1000,
    category: 'hrana',
    syncStatus: 'synced' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

/**
 * Create mock device
 */
export function createMockDevice(overrides = {}) {
  const purchaseDate = new Date()
  const warrantyExpiry = new Date()
  warrantyExpiry.setMonth(warrantyExpiry.getMonth() + 24)

  return {
    id: 1,
    brand: 'Samsung',
    model: 'Galaxy S21',
    category: 'Elektronika',
    purchaseDate,
    warrantyDuration: 24,
    warrantyExpiry,
    status: 'active' as const,
    reminders: [],
    syncStatus: 'synced' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

/**
 * Mock localStorage
 */
export function mockLocalStorage() {
  const store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      Object.keys(store).forEach((key) => {
        delete store[key]
      })
    },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length
    },
  }
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
