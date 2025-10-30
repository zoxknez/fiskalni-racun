import { createQueryClient } from '@lib/query-config'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

interface QueryProviderProps {
  children: React.ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  // ⭐ ENHANCED: Use centralized query config with offline-first support
  const [queryClient] = useState(() => createQueryClient())

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
