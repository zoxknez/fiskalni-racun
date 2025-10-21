/**
 * PostHog Analytics Integration
 *
 * Product analytics and feature flags
 *
 * @module lib/analytics/posthog
 */

import posthog from 'posthog-js'
import { logger } from '@/lib/logger'
import { env, features } from '../env'

/**
 * Initialize PostHog
 */
export function initPostHog() {
  if (!features.enablePostHog || !env.VITE_POSTHOG_KEY) {
    logger.debug('PostHog disabled')
    return
  }

  posthog.init(env.VITE_POSTHOG_KEY, {
    api_host: 'https://app.posthog.com',

    loaded: (posthog) => {
      if (import.meta.env.DEV) {
        posthog.opt_out_capturing()
        logger.debug('PostHog loaded (opt-out in dev)')
      }
    },

    // ⭐ Automatic event capture
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,

    // ⭐ Session recording
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '[data-private]',
    },

    // ⭐ Feature flags
    bootstrap: {
      featureFlags: {},
    },

    // Privacy
    respect_dnt: true,
    opt_out_capturing_by_default: import.meta.env.DEV,
  })

  logger.debug('PostHog initialized')
}

/**
 * Identify user
 */
export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (!features.enablePostHog) return

  posthog.identify(userId, properties)
}

/**
 * Reset user (on logout)
 */
export function resetUser() {
  if (!features.enablePostHog) return

  posthog.reset()
}

/**
 * Track custom event
 */
export function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  if (!features.enablePostHog) return

  posthog.capture(eventName, properties)
}

/**
 * Feature flag hooks
 */
export function isFeatureEnabled(flagKey: string): boolean {
  if (!features.enablePostHog) return false

  return posthog.isFeatureEnabled(flagKey) || false
}

export function getFeatureFlag(flagKey: string): string | boolean | undefined {
  if (!features.enablePostHog) return undefined

  return posthog.getFeatureFlag(flagKey)
}

/**
 * Re-export posthog instance for direct access
 */
export { posthog }

/**
 * ⭐ Predefined analytics events
 */
export const analytics = {
  // Receipt events
  receiptScanned: (method: 'qr' | 'ocr' | 'manual') => {
    trackEvent('receipt_scanned', { method })
  },

  receiptSaved: (data: { category: string; amount: number; hasImage: boolean }) => {
    trackEvent('receipt_saved', data)
  },

  receiptDeleted: (id: number) => {
    trackEvent('receipt_deleted', { receipt_id: id })
  },

  // Device/Warranty events
  deviceCreated: (data: { category: string; warrantyMonths: number }) => {
    trackEvent('device_created', data)
  },

  deviceUpdated: (id: number) => {
    trackEvent('device_updated', { device_id: id })
  },

  warrantyExpiring: (daysLeft: number) => {
    trackEvent('warranty_expiring_viewed', { days_left: daysLeft })
  },

  // Search events
  searchPerformed: (query: string, resultsCount: number) => {
    trackEvent('search_performed', {
      query_length: query.length,
      results_count: resultsCount,
    })
  },

  // Export events
  dataExported: (format: 'csv' | 'pdf' | 'json', itemCount: number) => {
    trackEvent('data_exported', {
      format,
      item_count: itemCount,
    })
  },

  // App events
  appInstalled: () => {
    trackEvent('app_installed')
  },

  offlineModeEntered: () => {
    trackEvent('offline_mode_entered')
  },

  syncCompleted: (itemsSynced: number) => {
    trackEvent('sync_completed', { items_synced: itemsSynced })
  },

  // Error events
  errorOccurred: (error: Error, context: string) => {
    trackEvent('error_occurred', {
      error_message: error.message,
      context,
    })
  },
}
