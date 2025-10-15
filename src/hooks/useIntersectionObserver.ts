import { useEffect, useRef, useState } from 'react'

/**
 * Modern useIntersectionObserver Hook
 *
 * Detects when element is visible in viewport
 * Perfect for lazy loading, infinite scroll, analytics
 *
 * Uses modern IntersectionObserver API
 */

export interface UseIntersectionObserverOptions {
  threshold?: number | number[]
  root?: Element | null
  rootMargin?: string
  freezeOnceVisible?: boolean
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): [React.RefObject<HTMLElement>, boolean] {
  const { threshold = 0, root = null, rootMargin = '0px', freezeOnceVisible = false } = options

  const elementRef = useRef<HTMLElement>(null)
  const [isIntersecting, setIsIntersecting] = useState(false)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    // Don't observe if already visible and frozen
    if (freezeOnceVisible && isIntersecting) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
      },
      { threshold, root, rootMargin }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [threshold, root, rootMargin, freezeOnceVisible, isIntersecting])

  return [elementRef, isIntersecting]
}

/**
 * useOnScreen - Simple visibility detection
 */
export function useOnScreen(
  options?: UseIntersectionObserverOptions
): [React.RefObject<HTMLElement>, boolean] {
  return useIntersectionObserver({ ...options, freezeOnceVisible: true })
}
