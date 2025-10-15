/**
 * Custom hooks for React 18 concurrent features
 *
 * @module hooks/useTransitionState
 */

import { useCallback, useState, useTransition } from 'react'

/**
 * useState with transition support
 *
 * Updates are marked as non-urgent, allowing React to interrupt
 * them for more important updates
 *
 * @example
 * ```tsx
 * const [value, setValue, isPending] = useTransitionState('')
 *
 * // This update won't block urgent updates (like input typing)
 * setValue('new value')
 *
 * if (isPending) {
 *   return <Spinner />
 * }
 * ```
 */
export function useTransitionState<T>(
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [isPending, startTransition] = useTransition()
  const [state, setState] = useState<T>(initialValue)

  const setTransitionState = useCallback((value: T | ((prev: T) => T)) => {
    startTransition(() => {
      setState(value)
    })
  }, [])

  return [state, setTransitionState, isPending]
}

/**
 * Async state with transition
 *
 * Automatically wraps async operations in transitions
 *
 * @example
 * ```tsx
 * const [data, fetchData, isPending] = useAsyncTransition(async () => {
 *   const res = await fetch('/api/data')
 *   return res.json()
 * })
 * ```
 */
export function useAsyncTransition<T>(
  asyncFn: () => Promise<T>
): [T | null, () => Promise<void>, boolean, Error | null] {
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const execute = useCallback(async () => {
    setError(null)

    try {
      const result = await asyncFn()

      startTransition(() => {
        setData(result)
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    }
  }, [asyncFn])

  return [data, execute, isPending, error]
}
