import { type RefObject, useEffect } from 'react'

/**
 * Modern useClickOutside Hook
 *
 * Detects clicks outside of element
 * Perfect for dropdowns, modals, popovers
 */

export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  handler: (event: MouseEvent | TouchEvent) => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return

    const handleClick = (event: MouseEvent | TouchEvent) => {
      const element = ref.current

      // Do nothing if element doesn't exist or event target is inside
      if (!element || element.contains(event.target as Node)) {
        return
      }

      handler(event)
    }

    // Use capture phase for better handling
    document.addEventListener('mousedown', handleClick, true)
    document.addEventListener('touchstart', handleClick, true)

    return () => {
      document.removeEventListener('mousedown', handleClick, true)
      document.removeEventListener('touchstart', handleClick, true)
    }
  }, [ref, handler, enabled])
}
