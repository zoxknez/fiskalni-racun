/**
 * React Query Configuration with Persistent Cache
 *
 * ⭐ ADDED: Advanced React Query setup with:
 * - localStorage persistence for offline support
 * - Offline-first query behavior
 * - Automatic retry with exponential backoff
 * - Query invalidation on focus/reconnect
 *
 * Note: Install these packages for full persistence:
 * npm install @tanstack/react-query-persist-client @tanstack/query-sync-storage-persister
 */

import { QueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger'

// ============================================
// PERSISTER CONFIGURATION (Optional)
// ============================================

/**
 * Basic persister configuration
 * For production, install @tanstack/query-sync-storage-persister
 */
export const createPersister = () => {
  // Placeholder - requires @tanstack/query-sync-storage-persister
  return null
}

// ============================================
// QUERY CLIENT CONFIGURATION
// ============================================

/**
 * Creates a configured QueryClient with optimal defaults
 *
 * Key features:
 * - 24 hour stale time for most queries
 * - 7 day cache time for persistence
 * - 3 retry attempts with exponential backoff
 * - Automatic refetch on window focus and reconnect
 * - Error logging with Sentry integration ready
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Cache configuration
        gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days (formerly cacheTime)
        staleTime: 1000 * 60 * 60 * 24, // 24 hours

        // Network configuration
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchOnMount: true,

        // Retry configuration with exponential backoff
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors (client errors)
          if (error instanceof Error && 'status' in error) {
            const status = (error as Error & { status: number }).status
            if (status >= 400 && status < 500) {
              return false
            }
          }

          // Retry up to 3 times for other errors
          return failureCount < 3
        },
        retryDelay: (attemptIndex) => {
          // Exponential backoff: 1s, 2s, 4s
          return Math.min(1000 * 2 ** attemptIndex, 30000)
        },

        // Network mode for offline support
        networkMode: 'offlineFirst', // Try cache first, even when offline
      },
      mutations: {
        // Retry mutations only once (avoid duplicate submissions)
        retry: 1,
        retryDelay: 1000,

        // Network mode
        networkMode: 'offlineFirst',

        // Error handling
        onError: (error) => {
          logger.error('Mutation error', error)

          // TODO: Send to Sentry
          // Sentry.captureException(error, {
          //   tags: { type: 'mutation_error' },
          // })
        },
      },
    },
  })
}

// ============================================
// SINGLETON QUERY CLIENT
// ============================================

let queryClientInstance: QueryClient | undefined

/**
 * Get or create singleton query client instance
 * Ensures same client is used across the app
 */
export function getQueryClient() {
  if (!queryClientInstance) {
    queryClientInstance = createQueryClient()
  }
  return queryClientInstance
}

// ============================================
// QUERY KEY FACTORY
// ============================================

/**
 * Centralized query key factory for type-safe and consistent keys
 *
 * Usage:
 * ```tsx
 * const { data } = useQuery({
 *   queryKey: queryKeys.receipts.list({ type: 'fiscal' }),
 *   queryFn: () => fetchReceipts({ type: 'fiscal' }),
 * })
 * ```
 */
export const queryKeys = {
  // Receipts
  receipts: {
    all: ['receipts'] as const,
    lists: () => [...queryKeys.receipts.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.receipts.lists(), filters] as const,
    details: () => [...queryKeys.receipts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.receipts.details(), id] as const,
    recent: (limit?: number) => [...queryKeys.receipts.all, 'recent', limit] as const,
  },

  // Warranties
  warranties: {
    all: ['warranties'] as const,
    lists: () => [...queryKeys.warranties.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.warranties.lists(), filters] as const,
    details: () => [...queryKeys.warranties.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.warranties.details(), id] as const,
    expiring: (days?: number) => [...queryKeys.warranties.all, 'expiring', days] as const,
  },

  // Statistics
  stats: {
    all: ['stats'] as const,
    dashboard: () => [...queryKeys.stats.all, 'dashboard'] as const,
    category: (category: string) => [...queryKeys.stats.all, 'category', category] as const,
    monthly: (year: number, month: number) =>
      [...queryKeys.stats.all, 'monthly', year, month] as const,
  },

  // User & Household
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    households: () => [...queryKeys.user.all, 'households'] as const,
    settings: () => [...queryKeys.user.all, 'settings'] as const,
  },

  household: {
    all: ['household'] as const,
    detail: (id: string) => [...queryKeys.household.all, 'detail', id] as const,
    members: (id: string) => [...queryKeys.household.all, 'members', id] as const,
    invites: (id: string) => [...queryKeys.household.all, 'invites', id] as const,
  },
} as const

// ============================================
// QUERY INVALIDATION HELPERS
// ============================================

/**
 * Helper functions for invalidating queries
 *
 * Usage:
 * ```tsx
 * await invalidateQueries(queryClient, 'receipts')
 * ```
 */
export async function invalidateQueries(
  queryClient: QueryClient,
  resource: 'receipts' | 'warranties' | 'stats' | 'user' | 'household' | 'all'
) {
  switch (resource) {
    case 'receipts':
      await queryClient.invalidateQueries({ queryKey: queryKeys.receipts.all })
      await queryClient.invalidateQueries({ queryKey: queryKeys.stats.all })
      break
    case 'warranties':
      await queryClient.invalidateQueries({ queryKey: queryKeys.warranties.all })
      break
    case 'stats':
      await queryClient.invalidateQueries({ queryKey: queryKeys.stats.all })
      break
    case 'user':
      await queryClient.invalidateQueries({ queryKey: queryKeys.user.all })
      break
    case 'household':
      await queryClient.invalidateQueries({ queryKey: queryKeys.household.all })
      break
    case 'all':
      await queryClient.invalidateQueries()
      break
  }
}

/**
 * Prefetch helper for optimistic loading
 *
 * Usage:
 * ```tsx
 * await prefetchQuery(queryClient, 'receipts', fetchReceipts)
 * ```
 */
export async function prefetchQuery<T>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>
) {
  await queryClient.prefetchQuery({
    queryKey,
    queryFn,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// ============================================
// OPTIMISTIC UPDATE HELPER
// ============================================

/**
 * Helper for optimistic updates with automatic rollback on error
 *
 * Usage:
 * ```tsx
 * await optimisticUpdate(
 *   queryClient,
 *   queryKeys.receipts.list(),
 *   (old) => [...old, newReceipt],
 *   async () => api.createReceipt(newReceipt)
 * )
 * ```
 */
export async function optimisticUpdate<TData>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  updater: (old: TData) => TData,
  mutationFn: () => Promise<unknown>
): Promise<void> {
  // Cancel outgoing refetches
  await queryClient.cancelQueries({ queryKey })

  // Snapshot previous value
  const previousData = queryClient.getQueryData<TData>(queryKey)

  // Optimistically update
  if (previousData) {
    queryClient.setQueryData(queryKey, updater(previousData))
  }

  try {
    // Perform mutation
    await mutationFn()
  } catch (error) {
    // Rollback on error
    if (previousData) {
      queryClient.setQueryData(queryKey, previousData)
    }
    throw error
  } finally {
    // Always refetch after mutation
    await queryClient.invalidateQueries({ queryKey })
  }
}

// ============================================
// CACHE UTILITIES
// ============================================

/**
 * Clear all cached data (useful for logout)
 */
export async function clearAllCache(queryClient: QueryClient) {
  await queryClient.clear()

  // Also clear persisted cache
  try {
    localStorage.removeItem('REACT_QUERY_OFFLINE_CACHE')
  } catch (error) {
    logger.error('Failed to clear persisted cache', error)
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(queryClient: QueryClient) {
  const cache = queryClient.getQueryCache()
  const queries = cache.getAll()

  return {
    totalQueries: queries.length,
    activeQueries: queries.filter((q) => q.getObserversCount() > 0).length,
    staleQueries: queries.filter((q) => q.isStale()).length,
    fetchingQueries: queries.filter((q) => q.state.fetchStatus === 'fetching').length,
    errorQueries: queries.filter((q) => q.state.status === 'error').length,
  }
}
