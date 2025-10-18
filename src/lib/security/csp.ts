/**
 * Content Security Policy utilities
 *
 * Implements strict CSP with nonce-based script execution
 * and Trusted Types for XSS prevention
 *
 * @module lib/security/csp
 */

/**
 * Generate CSP nonce for inline scripts
 * Should be called per-request on server-side rendering
 * For client-side apps, nonce can be embedded in meta tag
 */
export function generateNonce(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Get nonce from meta tag (set by server)
 */
export function getNonce(): string | null {
  const meta = document.querySelector('meta[property="csp-nonce"]')
  return meta?.getAttribute('content') || null
}

/**
 * Create script element with nonce
 */
export function createNoncedScript(src: string, nonce?: string): HTMLScriptElement {
  const script = document.createElement('script')
  script.src = src

  const actualNonce = nonce || getNonce()
  if (actualNonce) {
    script.setAttribute('nonce', actualNonce)
  }

  return script
}

/**
 * Trusted Types policy for sanitizing HTML
 * Prevents DOM XSS attacks
 */
let trustedTypesPolicy: TrustedTypePolicy | null = null

type DomPurify = {
  sanitize: (input: string, config?: { RETURN_TRUSTED_TYPE?: boolean }) => string
}

function getDomPurify(): DomPurify | null {
  if (typeof window === 'undefined') {
    return null
  }

  const maybePurify = (window as Window & { DOMPurify?: DomPurify }).DOMPurify
  return maybePurify ?? null
}

export function getTrustedTypesPolicy(): TrustedTypePolicy | null {
  // Check if Trusted Types are supported
  if (typeof window === 'undefined' || !window.trustedTypes) {
    return null
  }

  if (trustedTypesPolicy) {
    return trustedTypesPolicy
  }

  try {
    trustedTypesPolicy = window.trustedTypes.createPolicy('default', {
      createHTML: (input: string) => {
        // Sanitize HTML using DOMPurify
        const domPurify = getDomPurify()
        if (domPurify) {
          return domPurify.sanitize(input, {
            RETURN_TRUSTED_TYPE: true,
          })
        }

        // Fallback: basic sanitization (not recommended for production)
        return input
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;')
      },

      createScript: (input: string) => {
        // Only allow safe scripts
        // In production, you might want to maintain a whitelist
        console.warn('Attempting to execute script:', input)
        return input
      },

      createScriptURL: (input: string) => {
        // Validate script URLs against whitelist
        const allowedOrigins = [
          window.location.origin,
          'https://accounts.google.com',
          'https://*.supabase.co',
        ]

        try {
          const url = new URL(input, window.location.origin)
          const isAllowed = allowedOrigins.some((origin) => {
            if (origin.includes('*')) {
              const pattern = origin.replace('*', '.*')
              return new RegExp(`^${pattern}$`).test(url.origin)
            }
            return url.origin === origin
          })

          if (!isAllowed) {
            throw new Error(`Script URL not in whitelist: ${input}`)
          }

          return input
        } catch (error) {
          console.error('Invalid script URL:', input, error)
          throw error
        }
      },
    })

    return trustedTypesPolicy
  } catch (error) {
    console.error('Failed to create Trusted Types policy:', error)
    return null
  }
}

/**
 * Safely set innerHTML using Trusted Types
 */
export function safeSetInnerHTML(element: Element, html: string): void {
  const policy = getTrustedTypesPolicy()

  const domPurify = getDomPurify()

  if (policy) {
    element.innerHTML = policy.createHTML(html) as unknown as string
  } else if (domPurify) {
    element.innerHTML = domPurify.sanitize(html)
  } else {
    // Last resort: basic sanitization
    console.warn('No sanitization available, using basic escaping')
    element.textContent = html
  }
}

/**
 * Safely create script element
 */
export function safeCreateScript(src: string): HTMLScriptElement | null {
  const policy = getTrustedTypesPolicy()
  const script = document.createElement('script')

  try {
    if (policy) {
      script.src = policy.createScriptURL(src) as unknown as string
    } else {
      script.src = src
    }

    const nonce = getNonce()
    if (nonce) {
      script.setAttribute('nonce', nonce)
    }

    return script
  } catch (error) {
    console.error('Failed to create script:', error)
    return null
  }
}

/**
 * Initialize CSP and Trusted Types
 * Call this early in app initialization
 */
export function initializeSecurityPolicies(): void {
  // Initialize Trusted Types policy
  getTrustedTypesPolicy()

  // Set up CSP violation reporting
  document.addEventListener('securitypolicyviolation', (event) => {
    console.error('CSP Violation:', {
      directive: event.violatedDirective,
      blocked: event.blockedURI,
      document: event.documentURI,
      line: event.lineNumber,
      column: event.columnNumber,
    })

    // In production, send to error tracking service
    const globalWindow = window as typeof window & {
      Sentry?: {
        captureMessage?: (message: string, context?: Record<string, unknown>) => void
      }
    }

    if (import.meta.env.PROD && globalWindow.Sentry?.captureMessage) {
      globalWindow.Sentry.captureMessage('CSP Violation', {
        level: 'warning',
        extra: {
          directive: event.violatedDirective,
          blocked: event.blockedURI,
          document: event.documentURI,
        },
      })
    }
  })

  console.log('Security policies initialized')
}
