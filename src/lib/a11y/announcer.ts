/**
 * Accessibility - Screen Reader Announcements
 *
 * @module lib/a11y/announcer
 */

import { useCallback } from 'react'

/**
 * Announce message to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div')
  announcement.setAttribute('role', priority === 'assertive' ? 'alert' : 'status')
  announcement.setAttribute('aria-live', priority)
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message

  document.body.appendChild(announcement)

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

/**
 * React hook for announcements
 */
export function useAnnouncer() {
  const announcePolite = useCallback((message: string) => {
    announce(message, 'polite')
  }, [])

  const announceAssertive = useCallback((message: string) => {
    announce(message, 'assertive')
  }, [])

  return {
    announce: announcePolite,
    announcePolite,
    announceAssertive,
  }
}

/**
 * Create live region element
 */
export function createLiveRegion(priority: 'polite' | 'assertive' = 'polite'): HTMLDivElement {
  const region = document.createElement('div')
  region.setAttribute('role', priority === 'assertive' ? 'alert' : 'status')
  region.setAttribute('aria-live', priority)
  region.setAttribute('aria-atomic', 'true')
  region.className = 'sr-only'

  return region
}
