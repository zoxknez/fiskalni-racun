import { useCallback, useEffect, useState } from 'react'
import { safeJSONParse } from '@/lib/json'
import { logger } from '@/lib/logger'

/**
 * Modern useLocalStorage hook
 *
 * Features:
 * - Type-safe
 * - SSR-safe
 * - Syncs across tabs
 * - Error handling
 * - Automatic serialization
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Get initial value from localStorage or use default
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? safeJSONParse(item, initialValue) : initialValue
    } catch (error) {
      logger.error('Error reading from localStorage:', error)
      return initialValue
    }
  })

  // ⭐ FIXED: Update localStorage when state changes (no stale closure)
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        setStoredValue((prev) => {
          // Allow value to be a function (same API as useState)
          const valueToStore = value instanceof Function ? value(prev) : value

          if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, JSON.stringify(valueToStore))

            // Dispatch storage event for cross-tab sync
            window.dispatchEvent(
              new StorageEvent('storage', {
                key,
                newValue: JSON.stringify(valueToStore),
              })
            )
          }

          return valueToStore
        })
      } catch (error) {
        logger.error('Error writing to localStorage:', error)
      }
    },
    [key]
  )

  // Remove from localStorage
  const remove = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key)
        setStoredValue(initialValue)
      }
    } catch (error) {
      logger.error('Error removing from localStorage:', error)
    }
  }, [key, initialValue])

  // Sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        // ⭐ FIXED: Safe JSON parse with fallback
        const parsed = safeJSONParse(e.newValue, null as T | null)
        if (parsed !== null) {
          setStoredValue(parsed)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [key])

  return [storedValue, setValue, remove]
}
