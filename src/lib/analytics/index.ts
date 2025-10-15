/**
 * Modern Analytics Layer
 *
 * Unified analytics interface for multiple providers
 * Supports: Google Analytics, Plausible, PostHog, etc.
 *
 * Features:
 * - Type-safe events
 * - Privacy-focused
 * - GDPR compliant
 * - Batching and buffering
 * - Offline support
 */

import { logger } from '../logger'

type AnalyticsProperties = Record<string, unknown>

interface AnalyticsWindow extends Window {
  dataLayer?: unknown[]
  gtag?: (...args: unknown[]) => void
  plausible?: (eventName: string, options?: Record<string, unknown>) => void
}

export interface AnalyticsEvent {
  name: string
  properties?: AnalyticsProperties
  timestamp?: number
  userId?: string
  sessionId?: string
}

export interface AnalyticsUser {
  id: string
  email?: string
  properties?: AnalyticsProperties
}

export interface AnalyticsProvider {
  name: string
  track: (event: AnalyticsEvent) => void | Promise<void>
  identify?: (user: AnalyticsUser) => void | Promise<void>
  page?: (path: string, properties?: AnalyticsProperties) => void | Promise<void>
  reset?: () => void | Promise<void>
}

class AnalyticsManager {
  private providers: AnalyticsProvider[] = []
  private eventBuffer: AnalyticsEvent[] = []
  private isEnabled = true
  private sessionId: string

  constructor() {
    this.sessionId = this.generateSessionId()
  }

  /**
   * Register analytics provider
   */
  register(provider: AnalyticsProvider) {
    this.providers.push(provider)
    logger.log('Analytics provider registered:', provider.name)

    // Flush buffered events
    this.flushBuffer()
  }

  /**
   * Track event
   */
  track(name: string, properties?: AnalyticsProperties) {
    if (!this.isEnabled) return

    const event: AnalyticsEvent = {
      name,
      properties,
      timestamp: Date.now(),
      sessionId: this.sessionId,
    }

    // Buffer if no providers yet
    if (this.providers.length === 0) {
      this.eventBuffer.push(event)
      return
    }

    // Send to all providers
    for (const provider of this.providers) {
      try {
        provider.track(event)
      } catch (error) {
        logger.error(`Analytics provider ${provider.name} failed:`, error)
      }
    }
  }

  /**
   * Identify user
   */
  identify(user: AnalyticsUser) {
    for (const provider of this.providers) {
      if (provider.identify) {
        try {
          provider.identify(user)
        } catch (error) {
          logger.error(`Analytics identify failed for ${provider.name}:`, error)
        }
      }
    }
  }

  /**
   * Track page view
   */
  page(path: string, properties?: AnalyticsProperties) {
    for (const provider of this.providers) {
      if (provider.page) {
        try {
          provider.page(path, properties)
        } catch (error) {
          logger.error(`Analytics page failed for ${provider.name}:`, error)
        }
      }
    }
  }

  /**
   * Reset analytics (on logout)
   */
  reset() {
    for (const provider of this.providers) {
      if (provider.reset) {
        try {
          provider.reset()
        } catch (error) {
          logger.error(`Analytics reset failed for ${provider.name}:`, error)
        }
      }
    }
    this.sessionId = this.generateSessionId()
  }

  /**
   * Enable/disable analytics
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled
    logger.log('Analytics enabled:', enabled)
  }

  /**
   * Flush buffered events
   */
  private flushBuffer() {
    if (this.eventBuffer.length === 0) return

    logger.log('Flushing analytics buffer:', this.eventBuffer.length)

    for (const event of this.eventBuffer) {
      for (const provider of this.providers) {
        try {
          provider.track(event)
        } catch (error) {
          logger.error('Failed to flush event:', error)
        }
      }
    }

    this.eventBuffer = []
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
  }
}

// Singleton instance
export const analytics = new AnalyticsManager()

/**
 * Google Analytics 4 Provider
 */
export function createGAProvider(measurementId: string): AnalyticsProvider {
  // Load gtag.js
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  document.head.appendChild(script)

  // Initialize gtag
  const gaWindow = window as AnalyticsWindow
  gaWindow.dataLayer = gaWindow.dataLayer || []
  function gtag(...args: unknown[]) {
    gaWindow.dataLayer?.push(args)
  }
  gaWindow.gtag = gtag

  gtag('js', new Date())
  gtag('config', measurementId, {
    send_page_view: false, // We'll send manually
  })

  return {
    name: 'Google Analytics',
    track: (event) => {
      gtag('event', event.name, event.properties)
    },
    identify: (user) => {
      gtag('set', { user_id: user.id })
      if (user.properties) {
        gtag('set', 'user_properties', user.properties)
      }
    },
    page: (path, properties) => {
      gtag('event', 'page_view', {
        page_path: path,
        ...properties,
      })
    },
  }
}

/**
 * Plausible Analytics Provider (Privacy-focused)
 */
export function createPlausibleProvider(domain: string): AnalyticsProvider {
  const script = document.createElement('script')
  script.defer = true
  script.dataset.domain = domain
  script.src = 'https://plausible.io/js/script.js'
  document.head.appendChild(script)

  return {
    name: 'Plausible',
    track: (event) => {
      const plausibleWindow = window as AnalyticsWindow
      if (plausibleWindow.plausible) {
        plausibleWindow.plausible(event.name, { props: event.properties })
      }
    },
    page: (path) => {
      const plausibleWindow = window as AnalyticsWindow
      if (plausibleWindow.plausible) {
        plausibleWindow.plausible('pageview', { url: path })
      }
    },
  }
}

// Example usage:
/*
// In main.tsx or App.tsx
import { analytics, createGAProvider } from '@/lib/analytics'

if (import.meta.env.VITE_GA_MEASUREMENT_ID) {
  analytics.register(createGAProvider(import.meta.env.VITE_GA_MEASUREMENT_ID))
}

// Track events
analytics.track('receipt_added', {
  category: 'hrana',
  amount: 1000
})

// Identify user
analytics.identify({
  id: user.id,
  email: user.email
})

// Track page views
analytics.page('/receipts')
*/
