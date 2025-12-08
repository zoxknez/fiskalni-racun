/**
 * Feature Flag Hook
 *
 * React hook for PostHog feature flags
 *
 * @module hooks/useFeatureFlag
 */

import { useEffect, useState } from 'react'
import {
  getFeatureFlag,
  getPosthogClient,
  getPosthogSync,
  isFeatureEnabled,
} from '@/lib/analytics/posthog'

type PosthogWithFlags = {
  getAllFlags?: () => Record<string, string | boolean>
  onFeatureFlags?: (cb: () => void) => void
  off?: (event: string, cb: () => void) => void
  isFeatureEnabled?: (flagKey: string) => boolean
  getFeatureFlag?: (flagKey: string) => string | boolean | undefined
  capture?: (event: string, properties?: Record<string, unknown>) => void
}

/**
 * Hook to check if feature flag is enabled
 *
 * @param flagKey - Feature flag key
 * @param defaultValue - Default value if flag not found
 * @returns Whether feature is enabled
 *
 * @example
 * ```tsx
 * function NewFeature() {
 *   const isEnabled = useFeatureFlag('new-ocr-engine')
 *
 *   if (!isEnabled) return null
 *
 *   return <NewOCRComponent />
 * }
 * ```
 */
export function useFeatureFlag(flagKey: string, defaultValue = false): boolean {
  const [isEnabled, setIsEnabled] = useState(defaultValue)

  useEffect(() => {
    const checkFlag = () => {
      setIsEnabled(isFeatureEnabled(flagKey) || defaultValue)
    }

    getPosthogClient()
      .then((client) => {
        if (!client) return
        // Check immediately once client is ready
        checkFlag()

        // Listen for feature flag changes
        client.onFeatureFlags?.(checkFlag)
      })
      .catch(() => {})
  }, [flagKey, defaultValue])

  return isEnabled
}

/**
 * Hook to get feature flag variant
 *
 * @example
 * ```tsx
 * function CTAButton() {
 *   const variant = useFeatureVariant('button-color')
 *
 *   return (
 *     <button className={variant === 'blue' ? 'bg-blue-500' : 'bg-green-500'}>
 *       Click me
 *     </button>
 *   )
 * }
 * ```
 */
export function useFeatureVariant(flagKey: string): string | boolean | undefined {
  const [variant, setVariant] = useState<string | boolean | undefined>(undefined)

  useEffect(() => {
    const checkVariant = () => {
      setVariant(getFeatureFlag(flagKey))
    }

    getPosthogClient()
      .then((client) => {
        if (!client) return
        checkVariant()
        client.onFeatureFlags?.(checkVariant)
      })
      .catch(() => {})
  }, [flagKey])

  return variant
}

/**
 * Hook to get all feature flags
 */
export function useFeatureFlags(): Record<string, string | boolean> {
  const [flags, setFlags] = useState<Record<string, string | boolean>>({})

  useEffect(() => {
    const updateFlags = () => {
      const client = getFeatureFlagClientRef()
      const allFlags = client?.getAllFlags?.() || {}
      setFlags(allFlags)
    }

    getPosthogClient()
      .then((client) => {
        if (!client) return
        updateFlags()
        client.onFeatureFlags?.(updateFlags)
      })
      .catch(() => {})
  }, [])

  return flags
}

function getFeatureFlagClientRef(): PosthogWithFlags | null {
  const client = getPosthogSync()
  return client as PosthogWithFlags | null
}
