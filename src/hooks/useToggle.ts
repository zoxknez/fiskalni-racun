import { useCallback, useState } from 'react'

/**
 * Modern useToggle hook
 * Better than useState<boolean> for toggle operations
 */
export function useToggle(initialValue = false): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = useState(initialValue)

  const toggle = useCallback(() => setValue((v) => !v), [])
  const set = useCallback((newValue: boolean) => setValue(newValue), [])

  return [value, toggle, set]
}
