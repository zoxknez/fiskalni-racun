/**
 * Suspense Boundary Component
 *
 * Modern wrapper for React Suspense with fallback UI
 *
 * @module components/common/SuspenseBoundary
 */

import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { type ReactNode, Suspense } from 'react'

interface SuspenseBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  name?: string
}

/**
 * Default loading fallback
 */
function DefaultFallback({ name }: { name?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[200px] w-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-3"
      >
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        {name && <p className="text-sm text-dark-600 dark:text-dark-400">Učitavam {name}...</p>}
      </motion.div>
    </div>
  )
}

/**
 * Suspense boundary with default fallback
 *
 * @example
 * ```tsx
 * <SuspenseBoundary name="račune">
 *   <LazyReceiptList />
 * </SuspenseBoundary>
 * ```
 */
export function SuspenseBoundary({ children, fallback, name }: SuspenseBoundaryProps) {
  const resolvedFallback = fallback || <DefaultFallback {...(name ? { name } : {})} />
  return <Suspense fallback={resolvedFallback}>{children}</Suspense>
}

/**
 * Skeleton loading fallback
 */
export function SkeletonFallback({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.1 }}
          className="rounded-2xl bg-dark-100 dark:bg-dark-800 p-4 h-24 animate-pulse"
        />
      ))}
    </div>
  )
}

/**
 * Card skeleton fallback
 */
export function CardSkeletonFallback({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="rounded-2xl bg-dark-100 dark:bg-dark-800 p-6 h-48 animate-pulse"
        />
      ))}
    </div>
  )
}
