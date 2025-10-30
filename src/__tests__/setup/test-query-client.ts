/**
 * Test-specific Query Client Configuration
 *
 * Optimized for E2E tests with aggressive cleanup to prevent memory leaks
 */

import { QueryClient } from '@tanstack/react-query'

/**
 * Creates a QueryClient optimized for testing
 *
 * Key differences from production:
 * - Much shorter cache times (30 seconds vs 7 days)
 * - Shorter stale time (5 seconds vs 24 hours)
 * - No retries to speed up tests
 * - Disabled refetch on window focus
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // ⚠️ AGGRESSIVE CACHE CLEANUP for tests
        gcTime: 30 * 1000, // 30 seconds (vs 7 days in prod)
        staleTime: 5 * 1000, // 5 seconds (vs 24 hours in prod)

        // Disable automatic refetching in tests
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,

        // No retries in tests - fail fast
        retry: false,

        // Offline-first for consistency
        networkMode: 'offlineFirst',
      },
      mutations: {
        retry: false, // No retries in tests
      },
    },
  })
}
