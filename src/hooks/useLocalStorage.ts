import { useCallback, useEffect, useState } from 'react'
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
      return item ? (JSON.parse(item) as T) : initialValue
    } catch (error) {
      logger.error('Error reading from localStorage:', error)
      return initialValue
    }
  })

  // Update localStorage when state changes
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        // Allow value to be a function (same API as useState)
        const valueToStore = value instanceof Function ? value(storedValue) : value

        setStoredValue(valueToStore)

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
      } catch (error) {
        logger.error('Error writing to localStorage:', error)
      }
    },
    [key, storedValue]
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
        try {
          setStoredValue(JSON.parse(e.newValue))
        } catch (error) {
          logger.error('Error parsing storage event:', error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [key])

  return [storedValue, setValue, remove]
}
