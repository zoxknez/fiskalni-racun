import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

interface QueryProviderProps {
  children: React.ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // IndexedDB data never goes stale (local-first)
            staleTime: Number.POSITIVE_INFINITY,
            // Keep cache for 30 minutes (renamed from cacheTime)
            gcTime: 30 * 60 * 1000,
            // Don't refetch on window focus (local data doesn't change from server)
            refetchOnWindowFocus: false,
            // Don't refetch on reconnect (we use background sync instead)
            refetchOnReconnect: false,
            // Don't retry for IndexedDB queries (they either work or don't)
            retry: 0,

            // ⭐ NEW in v5 - Experimental features
            experimental_prefetchInRender: true,

            // ⭐ Optimized re-renders
            notifyOnChangeProps: 'all',
          },
          mutations: {
            // Retry mutations once (for transient errors)
            retry: 1,
            retryDelay: 1000,

            // ⭐ Network mode
            networkMode: 'online',
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* React Query Devtools - only in development and on desktop (hidden on mobile to avoid covering bottom nav) */}
      {import.meta.env.DEV && (
        <div className="hidden lg:block">
          <ReactQueryDevtools initialIsOpen={false} position="left" />
        </div>
      )}
    </QueryClientProvider>
  )
}
