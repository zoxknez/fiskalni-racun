import { useEffect, useState } from 'react'

/**
 * Modern useDebounce hook
 *
 * Debounces a value - useful for search inputs
 * Delays updating the value until user stops typing
 */
export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delayMs)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delayMs])

  return debouncedValue
}
