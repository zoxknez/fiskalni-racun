import { useEffect, useState } from 'react'

/**
 * Modern useMediaQuery hook
 *
 * SSR-safe media query hook
 * Automatically updates when screen size changes
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)

    // Update state when media query changes
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Modern API (addEventListener)
    mediaQuery.addEventListener('change', handler)

    // Initial check
    setMatches(mediaQuery.matches)

    return () => {
      mediaQuery.removeEventListener('change', handler)
    }
  }, [query])

  return matches
}

/**
 * Pre-configured breakpoint hooks
 */
export function useIsMobile() {
  return useMediaQuery('(max-width: 768px)')
}

export function useIsTablet() {
  return useMediaQuery('(min-width: 769px) and (max-width: 1024px)')
}

export function useIsDesktop() {
  return useMediaQuery('(min-width: 1025px)')
}

export function usePrefersReducedMotion() {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

export function usePrefersDark() {
  return useMediaQuery('(prefers-color-scheme: dark)')
}

export function usePrefersLight() {
  return useMediaQuery('(prefers-color-scheme: light)')
}

export function useIsPortrait() {
  return useMediaQuery('(orientation: portrait)')
}

export function useIsLandscape() {
  return useMediaQuery('(orientation: landscape)')
}
