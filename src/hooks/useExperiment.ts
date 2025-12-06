/**
 * A/B Testing Hook
 *
 * Enables feature flag experiments and A/B tests using PostHog.
 * Supports multiple variations and automatic variant assignment.
 *
 * @module useExperiment
 */

import { useEffect, useState } from 'react'
import { getPosthogClient } from '@/lib/analytics/posthog'

/**
 * Hook for A/B testing experiments
 *
 * @template T - Type of the variation value
 * @param {string} experimentKey - Unique key for the experiment in PostHog
 * @param {T[]} variations - Array of possible variations
 * @param {T} defaultVariation - Default variation to use before assignment
 * @returns {T} The assigned variation for this user
 *
 * @example
 * // Simple boolean experiment
 * const showNewFeature = useExperiment('new-feature-test', [true, false], false)
 *
 * @example
 * // Multi-variant experiment with strings
 * const colorScheme = useExperiment('color-scheme-test', ['blue', 'green', 'purple'], 'blue')
 *
 * @example
 * // Complex variation objects
 * const layoutConfig = useExperiment(
 *   'layout-experiment',
 *   [
 *     { columns: 2, spacing: 'compact' },
 *     { columns: 3, spacing: 'normal' },
 *   ],
 *   { columns: 2, spacing: 'normal' }
 * )
 */
export function useExperiment<T>(experimentKey: string, variations: T[], defaultVariation: T): T {
  const [variation, setVariation] = useState<T>(defaultVariation)

  useEffect(() => {
    let mounted = true

    const resolveVariant = (flagValue: unknown) => {
      if (!mounted) return

      if (flagValue !== undefined && flagValue !== null) {
        if (typeof flagValue === 'number' && variations[flagValue] !== undefined) {
          setVariation(variations[flagValue])
          return
        }

        if (typeof flagValue === 'string') {
          const matchedVariation = variations.find((v) => String(v) === flagValue)
          if (matchedVariation !== undefined) {
            setVariation(matchedVariation)
            return
          }
        }

        if (typeof flagValue === 'boolean') {
          const boolVariation = variations.find((v) => v === flagValue)
          if (boolVariation !== undefined) {
            setVariation(boolVariation)
            return
          }
        }
      }

      setVariation(defaultVariation)
    }

    void getPosthogClient().then((client) => {
      if (!client) return
      const flagValue = client.getFeatureFlag?.(experimentKey)
      resolveVariant(flagValue)
      client.onFeatureFlags?.(() => resolveVariant(client.getFeatureFlag?.(experimentKey)))
    })

    return () => {
      mounted = false
    }
  }, [experimentKey, variations, defaultVariation])

  return variation
}

/**
 * Hook for multi-variant experiments with automatic tracking
 *
 * This version automatically tracks when a user is exposed to an experiment
 * and which variant they received.
 *
 * @template T
 * @param {string} experimentKey - Unique key for the experiment
 * @param {Record<string, T>} variants - Named variants object
 * @param {string} defaultVariantKey - Key of the default variant
 * @returns {{ variant: T, variantKey: string }} The assigned variant and its key
 *
 * @example
 * const { variant, variantKey } = useMultiVariantExperiment(
 *   'checkout-flow',
 *   {
 *     control: { steps: 3, layout: 'vertical' },
 *     variant_a: { steps: 2, layout: 'horizontal' },
 *     variant_b: { steps: 1, layout: 'single-page' },
 *   },
 *   'control'
 * )
 */
export function useMultiVariantExperiment<T>(
  experimentKey: string,
  variants: Record<string, T>,
  defaultVariantKey: string
): { variant: T; variantKey: string; isLoading: boolean } {
  const [variantKey, setVariantKey] = useState<string>(defaultVariantKey)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    let mounted = true

    // Wait for PostHog to load
    const checkFeatureFlag = async () => {
      // Ensure PostHog is ready
      getPosthogClient().then((client) => {
        if (!client) {
          setIsLoading(false)
          return
        }

        client.onFeatureFlags?.(() => {
          if (!mounted) return

          const flagValue = client.getFeatureFlag?.(experimentKey)

          let assignedKey = defaultVariantKey

          if (flagValue !== undefined && flagValue !== null) {
            const flagStr = String(flagValue)
            if (variants[flagStr] !== undefined) {
              assignedKey = flagStr
            }
          }

          setVariantKey(assignedKey)
          setIsLoading(false)

          client.capture('$experiment_exposure', {
            experiment_name: experimentKey,
            variant: assignedKey,
          })
        })
      })
    }

    checkFeatureFlag()

    return () => {
      mounted = false
    }
  }, [experimentKey, variants, defaultVariantKey])

  return {
    variant: variants[variantKey] as T,
    variantKey,
    isLoading,
  }
}

/**
 * Hook for gradual feature rollouts
 *
 * @param {string} featureKey - Feature flag key
 * @param {boolean} defaultValue - Default value if flag is not set
 * @returns {boolean} Whether the feature is enabled for this user
 *
 * @example
 * const hasNewDashboard = useFeatureRollout('new-dashboard', false)
 */
export function useFeatureRollout(featureKey: string, defaultValue = false): boolean {
  const [isEnabled, setIsEnabled] = useState<boolean>(defaultValue)

  useEffect(() => {
    let mounted = true

    getPosthogClient().then((client) => {
      if (!client) return

      client.onFeatureFlags?.(() => {
        if (!mounted) return

        const flagValue = client.isFeatureEnabled?.(featureKey)
        setIsEnabled(flagValue ?? defaultValue)
      })
    })

    return () => {
      mounted = false
    }
  }, [featureKey, defaultValue])

  return isEnabled
}

/**
 * Hook for experiments with custom conversion tracking
 *
 * @template T
 * @param {string} experimentKey - Experiment key
 * @param {T[]} variations - Array of variations
 * @param {T} defaultVariation - Default variation
 * @returns {{ variation: T, trackConversion: (eventName: string, properties?: Record<string, any>) => void }}
 *
 * @example
 * const { variation: buttonText, trackConversion } = useExperimentWithConversion(
 *   'cta-button-test',
 *   ['Buy Now', 'Get Started', 'Try Free'],
 *   'Buy Now'
 * )
 *
 * const handleClick = () => {
 *   trackConversion('button_clicked', { button_text: buttonText })
 * }
 */
export function useExperimentWithConversion<T>(
  experimentKey: string,
  variations: T[],
  defaultVariation: T
): {
  variation: T
  trackConversion: (eventName: string, properties?: Record<string, unknown>) => void
} {
  const variation = useExperiment(experimentKey, variations, defaultVariation)

  const trackConversion = (eventName: string, properties?: Record<string, unknown>) => {
    void getPosthogClient().then((client) =>
      client?.capture(eventName, {
        experiment: experimentKey,
        variant: variation,
        ...properties,
      })
    )
  }

  return {
    variation,
    trackConversion,
  }
}
