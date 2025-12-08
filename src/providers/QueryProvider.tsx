import { createQueryClient } from '@lib/query-config'
import { QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense, useState } from 'react'

interface QueryProviderProps {
  children: React.ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  // ⭐ ENHANCED: Use centralized query config with offline-first support
  const [queryClient] = useState(() => createQueryClient())

  const Devtools = import.meta.env.DEV
    ? lazy(() =>
        import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools }))
      )
    : null

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* React Query Devtools - only in development and on desktop (hidden on mobile to avoid covering bottom nav) */}
      {Devtools && (
        <Suspense fallback={null}>
          <div className="hidden lg:block">
            <Devtools initialIsOpen={false} position="left" />
          </div>
        </Suspense>
      )}
    </QueryClientProvider>
  )
}
