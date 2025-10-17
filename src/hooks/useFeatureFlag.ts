/**
 * Feature Flag Hook
 *
 * React hook for PostHog feature flags
 *
 * @module hooks/useFeatureFlag
 */

import posthog from 'posthog-js'
import { useEffect, useState } from 'react'
import { getFeatureFlag, isFeatureEnabled } from '@/lib/analytics/posthog'

type PosthogWithFlags = typeof posthog & {
  getAllFlags?: () => Record<string, string | boolean>
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

    // Check immediately
    checkFlag()

    // Listen for feature flag changes
    posthog.onFeatureFlags?.(checkFlag)

    return () => {
      // Cleanup if needed
    }
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

    checkVariant()
    posthog.onFeatureFlags?.(checkVariant)
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
      const client = posthog as PosthogWithFlags
      const allFlags = client.getAllFlags?.() || {}
      setFlags(allFlags)
    }

    updateFlags()
    posthog.onFeatureFlags?.(updateFlags)
  }, [])

  return flags
}
