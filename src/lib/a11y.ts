/**
 * Modern Accessibility Utilities
 *
 * WCAG 2.1 AA/AAA compliant helpers
 * Keyboard navigation, screen reader support, focus management
 */

/**
 * Generate unique ID for aria-labelledby
 */
let idCounter = 0
export function generateA11yId(prefix: string = 'a11y'): string {
  return `${prefix}-${++idCounter}-${Date.now()}`
}

/**
 * Announce to screen readers
 * Uses ARIA live regions
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcer = getOrCreateAnnouncer(priority)
  announcer.textContent = message

  // Clear after announcement
  setTimeout(() => {
    announcer.textContent = ''
  }, 1000)
}

function getOrCreateAnnouncer(priority: 'polite' | 'assertive'): HTMLElement {
  const id = `sr-announcer-${priority}`
  let announcer = document.getElementById(id)

  if (!announcer) {
    announcer = document.createElement('div')
    announcer.id = id
    announcer.setAttribute('role', 'status')
    announcer.setAttribute('aria-live', priority)
    announcer.setAttribute('aria-atomic', 'true')
    announcer.style.position = 'absolute'
    announcer.style.left = '-10000px'
    announcer.style.width = '1px'
    announcer.style.height = '1px'
    announcer.style.overflow = 'hidden'
    document.body.appendChild(announcer)
  }

  return announcer
}

/**
 * Focus Management
 */

export function focusElement(selector: string | HTMLElement) {
  const element = typeof selector === 'string' ? document.querySelector(selector) : selector

  if (element instanceof HTMLElement) {
    element.focus()
  }
}

export function trapFocus(container: HTMLElement) {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )

  const firstElement = focusableElements[0] as HTMLElement
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }
    } else if (document.activeElement === lastElement) {
      // Tab
      event.preventDefault()
      firstElement.focus()
    }
  }

  container.addEventListener('keydown', handleKeyDown)

  return () => {
    container.removeEventListener('keydown', handleKeyDown)
  }
}

/**
 * Skip to main content link
 */
export function createSkipLink() {
  const skipLink = document.createElement('a')
  skipLink.href = '#main-content'
  skipLink.textContent = 'Skip to main content'
  skipLink.className =
    'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded'

  document.body.insertBefore(skipLink, document.body.firstChild)
}

/**
 * Color contrast checker
 * WCAG AA requires 4.5:1 for normal text, 3:1 for large text
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1)
  const lum2 = getLuminance(color2)

  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)

  return (lighter + 0.05) / (darker + 0.05)
}

function getLuminance(hexColor: string): number {
  const rgb = hexToRgb(hexColor)

  const transform = (value: number) => {
    const normalized = value / 255
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
  }

  const r = transform(rgb.r)
  const g = transform(rgb.g)
  const b = transform(rgb.b)

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)

  if (!result) {
    return { r: 0, g: 0, b: 0 }
  }

  const [, rHex = '00', gHex = '00', bHex = '00'] = result

  return {
    r: Number.parseInt(rHex, 16),
    g: Number.parseInt(gHex, 16),
    b: Number.parseInt(bHex, 16),
  }
}

export function meetsWCAG_AA(color1: string, color2: string): boolean {
  return getContrastRatio(color1, color2) >= 4.5
}

export function meetsWCAG_AAA(color1: string, color2: string): boolean {
  return getContrastRatio(color1, color2) >= 7
}

/**
 * Keyboard navigation helpers
 */

export function isNavigationKey(key: string): boolean {
  return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)
}

export function isActionKey(key: string): boolean {
  return ['Enter', ' ', 'Space'].includes(key)
}

export function isEscapeKey(key: string): boolean {
  return key === 'Escape' || key === 'Esc'
}

/**
 * Screen reader only text
 */
export function createSROnlyText(text: string): HTMLSpanElement {
  const span = document.createElement('span')
  span.textContent = text
  span.className = 'sr-only'
  return span
}

/**
 * Add aria-label if element doesn't have accessible name
 */
export function ensureAccessibleName(element: HTMLElement, fallbackLabel: string): void {
  if (
    !element.hasAttribute('aria-label') &&
    !element.hasAttribute('aria-labelledby') &&
    !element.textContent?.trim()
  ) {
    element.setAttribute('aria-label', fallbackLabel)
  }
}

/**
 * Announce route change to screen readers
 */
export function announceRouteChange(pageName: string) {
  announce(`Navigated to ${pageName}`, 'polite')
}

// Example usage:
/*
// In modal component
useEffect(() => {
  const cleanup = trapFocus(modalRef.current!)
  return cleanup
}, [])

// Check color contrast
const contrast = getContrastRatio('#ffffff', '#0ea5e9')
console.log('Contrast ratio:', contrast)
console.log('WCAG AA:', meetsWCAG_AA('#ffffff', '#0ea5e9'))

// Announce to screen reader
announce('Receipt added successfully')

// On route change
announceRouteChange('Receipts')
*/
