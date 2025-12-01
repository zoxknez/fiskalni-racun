/**
 * Performance Quick Wins
 *
 * Praktični utility-ji za instant performance improvements
 *
 * @module lib/performance/quickWins
 */

import { logger } from '../logger'

/**
 * Lazy load image sa loading="lazy" atributom
 */
export function lazyImage(src: string, alt: string, className?: string): HTMLImageElement {
  const img = document.createElement('img')
  img.src = src
  img.alt = alt
  img.loading = 'lazy'
  img.decoding = 'async'

  if (className) {
    img.className = className
  }

  return img
}

/**
 * Prefetch URL (route ili resource)
 */
export function prefetch(
  url: string,
  type: 'document' | 'script' | 'style' | 'fetch' = 'document'
): void {
  if (typeof document === 'undefined') return

  // Proveri da li link već postoji
  const existing = document.querySelector(`link[rel="prefetch"][href="${url}"]`)
  if (existing) return

  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = url
  link.as = type

  document.head.appendChild(link)

  logger.debug('Prefetched:', url, type)
}

/**
 * Preload kritičan resurs
 */
export function preload(url: string, type: 'script' | 'style' | 'font' | 'image'): void {
  if (typeof document === 'undefined') return

  const existing = document.querySelector(`link[rel="preload"][href="${url}"]`)
  if (existing) return

  const link = document.createElement('link')
  link.rel = 'preload'
  link.href = url
  link.as = type

  // Dodaj crossorigin za fontove
  if (type === 'font') {
    link.crossOrigin = 'anonymous'
  }

  document.head.appendChild(link)

  logger.debug('Preloaded:', url, type)
}

/**
 * DNS Prefetch za eksterni domeni
 */
export function dnsPrefetch(domain: string): void {
  if (typeof document === 'undefined') return

  const existing = document.querySelector(`link[rel="dns-prefetch"][href="${domain}"]`)
  if (existing) return

  const link = document.createElement('link')
  link.rel = 'dns-prefetch'
  link.href = domain

  document.head.appendChild(link)

  logger.debug('DNS prefetched:', domain)
}

/**
 * Preconnect za eksterni domeni koji će sigurno biti korišćeni
 */
export function preconnect(domain: string, crossorigin = false): void {
  if (typeof document === 'undefined') return

  const existing = document.querySelector(`link[rel="preconnect"][href="${domain}"]`)
  if (existing) return

  const link = document.createElement('link')
  link.rel = 'preconnect'
  link.href = domain

  if (crossorigin) {
    link.crossOrigin = 'anonymous'
  }

  document.head.appendChild(link)

  logger.debug('Preconnected:', domain)
}

/**
 * Debounce funkcija za optimizaciju event handlera
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle funkcija za scroll/resize eventi
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true

      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * Request Idle Callback wrapper (sa fallback)
 */
export function runWhenIdle(callback: () => void, timeout = 2000): void {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback, { timeout })
  } else {
    setTimeout(callback, 1)
  }
}

/**
 * Defer non-critical code execution
 */
export function defer(callback: () => void): void {
  if ('requestAnimationFrame' in window) {
    requestAnimationFrame(() => {
      requestAnimationFrame(callback)
    })
  } else {
    setTimeout(callback, 0)
  }
}

/**
 * Batch multiple state updates
 */
export function batch<T>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<void>
): Promise<void> {
  const batches: T[][] = []

  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize))
  }

  return batches.reduce((promise, batch) => promise.then(() => processor(batch)), Promise.resolve())
}

/**
 * Memoize expensive calculations
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  func: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>()

  return function memoized(...args: Parameters<T>): ReturnType<T> {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)

    const cached = cache.get(key)
    if (cached !== undefined) {
      return cached
    }

    const result = func(...args) as ReturnType<T>
    cache.set(key, result)

    return result
  } as T
}

/**
 * Intersection Observer helper za lazy loading
 */
export function observeIntersection(
  element: Element,
  callback: (entry: IntersectionObserverEntry) => void,
  options?: IntersectionObserverInit
): () => void {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        callback(entry)
      }
    }
  }, options)

  observer.observe(element)

  // Return cleanup function
  return () => observer.disconnect()
}

/**
 * Passive event listener helper
 */
export function addPassiveListener<K extends keyof WindowEventMap>(
  target: Window | Document | Element,
  event: K,
  handler: (e: WindowEventMap[K]) => void
): () => void {
  const options = { passive: true }

  target.addEventListener(event, handler as EventListener, options)

  return () => target.removeEventListener(event, handler as EventListener)
}

/**
 * Web Worker helper
 */
export function createWorker<T, R>(
  workerFunction: (data: T) => R
): {
  run: (data: T) => Promise<R>
  terminate: () => void
} {
  const code = `
    self.onmessage = function(e) {
      const result = (${workerFunction.toString()})(e.data);
      self.postMessage(result);
    };
  `

  const blob = new Blob([code], { type: 'application/javascript' })
  const worker = new Worker(URL.createObjectURL(blob))

  return {
    run: (data: T) => {
      return new Promise<R>((resolve, reject) => {
        worker.onmessage = (e) => resolve(e.data)
        worker.onerror = reject
        worker.postMessage(data)
      })
    },
    terminate: () => worker.terminate(),
  }
}

/**
 * Detect slow network i prilagodi kvalitet
 */
export function isSlowConnection(): boolean {
  if (!('connection' in navigator)) return false

  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } })
    .connection

  if (!connection) return false

  return connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g'
}

/**
 * Detect battery status i štedi resurse
 */
export async function isBatteryLow(): Promise<boolean> {
  if (!('getBattery' in navigator)) return false

  try {
    const battery = await (
      navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean }> }
    ).getBattery?.()

    if (!battery) return false

    return battery.level < 0.2 && !battery.charging
  } catch {
    return false
  }
}

/**
 * Adaptive performance strategy
 */
export async function getPerformanceLevel(): Promise<'high' | 'medium' | 'low'> {
  const isSlowNet = isSlowConnection()
  const isLowBat = await isBatteryLow()

  // Check device memory (if available)
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  const isLowMem = memory ? memory < 4 : false

  if (isSlowNet || isLowBat || isLowMem) {
    return 'low'
  }

  // Check hardware concurrency
  const cores = navigator.hardwareConcurrency || 2

  if (cores < 4) {
    return 'medium'
  }

  return 'high'
}

/**
 * Initialize common performance optimizations
 */
export function initPerformanceOptimizations(): void {
  // DNS prefetch za eksterne domene
  dnsPrefetch('https://fonts.googleapis.com')
  dnsPrefetch('https://fonts.gstatic.com')

  // Preconnect za kritične domene
  preconnect('https://fonts.googleapis.com', true)
  preconnect('https://fonts.gstatic.com', true)

  // Proveri da li je potrebno smanjiti kvalitet animacija
  getPerformanceLevel().then((level) => {
    if (level === 'low') {
      document.documentElement.classList.add('reduce-motion')
      logger.info('Performance: Low-end device detected, reducing animations')
    }
  })

  logger.debug('Performance optimizations initialized')
}
