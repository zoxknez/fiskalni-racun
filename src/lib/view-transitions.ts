/**
 * View Transitions API
 *
 * Provides smooth page transitions using native browser API
 * Falls back gracefully if not supported
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API
 */

/**
 * Check if View Transitions API is supported
 */
export function isViewTransitionSupported(): boolean {
  return 'startViewTransition' in document
}

/**
 * Start a view transition
 *
 * @param callback - Function to execute during transition
 * @returns Promise that resolves when transition completes
 *
 * @example
 * ```ts
 * startViewTransition(() => {
 *   navigate('/receipts')
 * })
 * ```
 */
export function startViewTransition(callback: () => void): Promise<void> {
  if ('startViewTransition' in document && typeof document.startViewTransition === 'function') {
    const transition = document.startViewTransition(callback)
    return transition.finished
  }

  // Fallback: execute immediately
  callback()
  return Promise.resolve()
}

/**
 * Start a view transition with error handling
 */
export async function startViewTransitionSafe(callback: () => void | Promise<void>): Promise<void> {
  try {
    if ('startViewTransition' in document && typeof document.startViewTransition === 'function') {
      const transition = document.startViewTransition(async () => {
        await callback()
      })
      await transition.finished
    } else {
      await callback()
    }
  } catch (error) {
    console.error('View transition error:', error)
    // Fallback: execute anyway
    await callback()
  }
}
