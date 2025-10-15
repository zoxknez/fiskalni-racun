/**
 * Resource Preloading Utilities
 *
 * Optimize loading performance with preload/prefetch hints
 *
 * @module lib/performance/preload
 */

/**
 * Preload critical resource
 * Use for resources needed immediately
 */
export function preload(href: string, as: string, type?: string) {
  const link = document.createElement('link')
  link.rel = 'preload'
  link.href = href
  link.as = as

  if (type) {
    link.type = type
  }

  document.head.appendChild(link)
}

/**
 * Prefetch resource
 * Use for resources needed for next navigation
 */
export function prefetch(href: string, as?: string) {
  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = href

  if (as) {
    link.as = as
  }

  document.head.appendChild(link)
}

/**
 * Preconnect to origin
 * Use for external domains
 */
export function preconnect(href: string, crossorigin = false) {
  const link = document.createElement('link')
  link.rel = 'preconnect'
  link.href = href

  if (crossorigin) {
    link.crossOrigin = 'anonymous'
  }

  document.head.appendChild(link)
}

/**
 * DNS prefetch
 * Use for domains that will be used later
 */
export function dnsPrefetch(href: string) {
  const link = document.createElement('link')
  link.rel = 'dns-prefetch'
  link.href = href

  document.head.appendChild(link)
}

/**
 * Preload critical assets
 */
export function preloadCriticalAssets() {
  // Preload fonts
  preload('/fonts/Inter-Regular.woff2', 'font', 'font/woff2')
  preload('/fonts/Inter-Bold.woff2', 'font', 'font/woff2')

  // Preconnect to external services
  preconnect('https://fonts.googleapis.com')
  preconnect('https://fonts.gstatic.com', true)

  // DNS prefetch for Supabase
  dnsPrefetch('https://supabase.co')
}

/**
 * Prefetch route chunks
 */
export function prefetchRoute(route: string) {
  // This would prefetch the JS chunk for a specific route
  // Requires integration with your routing setup

  const routeChunks: Record<string, string> = {
    '/receipts': '/assets/ReceiptsPage',
    '/warranties': '/assets/WarrantiesPage',
    '/analytics': '/assets/AnalyticsPage',
  }

  const chunk = routeChunks[route]
  if (chunk) {
    prefetch(chunk, 'script')
  }
}

/**
 * Preload image
 */
export function preloadImage(src: string) {
  const img = new Image()
  img.src = src
}

/**
 * Lazy load image with IntersectionObserver
 */
export function lazyLoadImage(img: HTMLImageElement) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const lazyImage = entry.target as HTMLImageElement
  const src = lazyImage.dataset['src']

        if (src) {
          lazyImage.src = src
          lazyImage.removeAttribute('data-src')
          observer.unobserve(lazyImage)
        }
      }
    }
  })

  observer.observe(img)

  return () => observer.disconnect()
}
