/**
 * Smooth Navigation Hook
 *
 * Uses View Transitions API for smooth page transitions
 * Falls back to regular navigation if not supported
 */

import { useCallback } from 'react'
import { useNavigate as useReactRouterNavigate } from 'react-router-dom'
import { startViewTransition } from '@/lib/view-transitions'

/**
 * Hook for smooth navigation with view transitions
 *
 * @returns Navigate function that uses view transitions
 *
 * @example
 * ```tsx
 * const navigate = useSmoothNavigate()
 *
 * // Navigate with smooth transition
 * navigate('/receipts')
 * ```
 */
export function useSmoothNavigate() {
  const navigate = useReactRouterNavigate()

  return useCallback(
    (to: string | number, options?: { replace?: boolean; state?: unknown }) => {
      startViewTransition(() => {
        if (typeof to === 'number') {
          navigate(to)
        } else {
          navigate(to, options)
        }
      })
    },
    [navigate]
  )
}
