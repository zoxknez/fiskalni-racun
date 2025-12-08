/**
 * Advanced Lazy Loading Components
 *
 * @module lib/performance/lazyLoad
 */

import { type ComponentType, lazy } from 'react'

/**
 * Lazy load component with retry logic
 *
 * Handles chunk loading failures (common in PWAs)
 */
export function lazyWithRetry<P>(
  componentImport: () => Promise<{ default: ComponentType<P> }>,
  retries = 3,
  interval = 1000
): React.LazyExoticComponent<ComponentType<P>> {
  return lazy(async () => {
    for (let i = 0; i < retries; i++) {
      try {
        return await componentImport()
      } catch (error) {
        if (i === retries - 1) {
          throw error
        }

        console.warn(`Chunk loading failed, retrying (${i + 1}/${retries})...`)
        await new Promise((resolve) => setTimeout(resolve, interval * (i + 1)))
      }
    }

    throw new Error('Failed to load component after retries')
  })
}

/**
 * Lazy load with preload support
 *
 * Allows preloading chunks on hover/focus
 */
type PreloadableLazyComponent<P> = React.LazyExoticComponent<ComponentType<P>> & {
  preload: () => Promise<{ default: ComponentType<P> }>
}

export function lazyWithPreload<P>(
  componentImport: () => Promise<{ default: ComponentType<P> }>
): PreloadableLazyComponent<P> {
  const LazyComponent = lazy(componentImport) as PreloadableLazyComponent<P>

  LazyComponent.preload = componentImport

  return LazyComponent
}

/**
 * Lazy load component only when viewport is idle
 *
 * Uses requestIdleCallback for non-critical components
 */
export function lazyIdle<P>(
  componentImport: () => Promise<{ default: ComponentType<P> }>
): React.LazyExoticComponent<ComponentType<P>> {
  return lazy(() => {
    return new Promise((resolve) => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          componentImport().then(resolve)
        })
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => {
          componentImport().then(resolve)
        }, 1)
      }
    })
  })
}

/**
 * Lazy load heavy library only when needed
 *
 * Example: OCR, Charts, etc.
 */
export function lazyLibrary<T>(libraryImport: () => Promise<T>): () => Promise<T> {
  let cached: T | null = null

  return async () => {
    if (cached) {
      return cached
    }

    cached = await libraryImport()
    return cached
  }
}

// ⭐ Predefined lazy libraries
export const lazyPDFGenerator = lazyLibrary(() => import('jspdf'))
