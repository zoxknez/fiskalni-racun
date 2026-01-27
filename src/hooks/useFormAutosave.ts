/**
 * Form Autosave Hook
 *
 * Automatically saves form data to localStorage with debouncing.
 * Prevents data loss if user accidentally closes the tab or refreshes.
 *
 * @module hooks/useFormAutosave
 */

import { useCallback, useEffect, useRef, useState } from 'react'

const AUTOSAVE_PREFIX = 'form_autosave_'
const DEFAULT_DEBOUNCE_MS = 1000

interface UseFormAutosaveOptions<T> {
  /** Unique key to identify this form's saved data */
  formKey: string
  /** Current form values */
  values: T
  /** Debounce delay in milliseconds (default: 1000) */
  debounceMs?: number
  /** Whether autosave is enabled (default: true) */
  enabled?: boolean
  /** Callback when data is restored */
  onRestore?: (data: T) => void
  /** Transform values before saving (e.g., remove sensitive data) */
  transformBeforeSave?: (values: T) => Partial<T>
  /** Validate restored data before applying */
  validateRestored?: (data: unknown) => data is T
}

interface UseFormAutosaveReturn<T> {
  /** Whether there's saved data available */
  hasSavedData: boolean
  /** The saved data (if available) */
  savedData: T | null
  /** Timestamp when data was last saved */
  lastSavedAt: Date | null
  /** Restore saved data */
  restoreSavedData: () => T | null
  /** Clear saved data (call after successful submit) */
  clearSavedData: () => void
  /** Manually trigger save */
  saveNow: () => void
  /** Dismiss the restore prompt without restoring */
  dismissRestore: () => void
}

/**
 * Hook for automatically saving form data to localStorage
 *
 * @example
 * ```tsx
 * function AddReceiptForm() {
 *   const [formData, setFormData] = useState(initialValues)
 *
 *   const {
 *     hasSavedData,
 *     restoreSavedData,
 *     clearSavedData,
 *     lastSavedAt,
 *   } = useFormAutosave({
 *     formKey: 'add-receipt',
 *     values: formData,
 *     onRestore: (data) => setFormData(data),
 *   })
 *
 *   // Show restore prompt
 *   if (hasSavedData) {
 *     return <RestorePrompt onRestore={restoreSavedData} onDismiss={dismissRestore} />
 *   }
 *
 *   const handleSubmit = async () => {
 *     await saveReceipt(formData)
 *     clearSavedData() // Clear after successful save
 *   }
 * }
 * ```
 */
export function useFormAutosave<T extends Record<string, unknown>>({
  formKey,
  values,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  enabled = true,
  onRestore,
  transformBeforeSave,
  validateRestored,
}: UseFormAutosaveOptions<T>): UseFormAutosaveReturn<T> {
  const storageKey = `${AUTOSAVE_PREFIX}${formKey}`
  const timestampKey = `${storageKey}_timestamp`
  const dismissedKey = `${storageKey}_dismissed`

  const [hasSavedData, setHasSavedData] = useState(false)
  const [savedData, setSavedData] = useState<T | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const valuesRef = useRef(values)
  valuesRef.current = values

  // Check for saved data on mount
  useEffect(() => {
    if (!enabled) return

    try {
      const dismissed = sessionStorage.getItem(dismissedKey)
      if (dismissed) return

      const saved = localStorage.getItem(storageKey)
      const timestamp = localStorage.getItem(timestampKey)

      if (saved) {
        const parsed = JSON.parse(saved)

        // Validate if validator provided
        if (validateRestored && !validateRestored(parsed)) {
          localStorage.removeItem(storageKey)
          localStorage.removeItem(timestampKey)
          return
        }

        setSavedData(parsed as T)
        setHasSavedData(true)

        if (timestamp) {
          setLastSavedAt(new Date(timestamp))
        }
      }
    } catch {
      // Invalid saved data, clear it
      localStorage.removeItem(storageKey)
      localStorage.removeItem(timestampKey)
    }
  }, [enabled, storageKey, timestampKey, dismissedKey, validateRestored])

  // Debounced save effect
  useEffect(() => {
    if (!enabled) return

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      try {
        const dataToSave = transformBeforeSave
          ? transformBeforeSave(valuesRef.current)
          : valuesRef.current

        localStorage.setItem(storageKey, JSON.stringify(dataToSave))
        localStorage.setItem(timestampKey, new Date().toISOString())
      } catch {
        // Storage full or other error, silently fail
      }
    }, debounceMs)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [enabled, storageKey, timestampKey, debounceMs, transformBeforeSave])

  const restoreSavedData = useCallback((): T | null => {
    if (!savedData) return null

    onRestore?.(savedData)
    setHasSavedData(false)
    sessionStorage.removeItem(dismissedKey)

    return savedData
  }, [savedData, onRestore, dismissedKey])

  const clearSavedData = useCallback(() => {
    localStorage.removeItem(storageKey)
    localStorage.removeItem(timestampKey)
    sessionStorage.removeItem(dismissedKey)
    setHasSavedData(false)
    setSavedData(null)
    setLastSavedAt(null)
  }, [storageKey, timestampKey, dismissedKey])

  const saveNow = useCallback(() => {
    try {
      const dataToSave = transformBeforeSave
        ? transformBeforeSave(valuesRef.current)
        : valuesRef.current

      localStorage.setItem(storageKey, JSON.stringify(dataToSave))
      localStorage.setItem(timestampKey, new Date().toISOString())
    } catch {
      // Storage full or other error
    }
  }, [storageKey, timestampKey, transformBeforeSave])

  const dismissRestore = useCallback(() => {
    sessionStorage.setItem(dismissedKey, 'true')
    setHasSavedData(false)
  }, [dismissedKey])

  return {
    hasSavedData,
    savedData,
    lastSavedAt,
    restoreSavedData,
    clearSavedData,
    saveNow,
    dismissRestore,
  }
}

/**
 * Format the last saved timestamp for display
 */
export function formatLastSaved(date: Date | null): string {
  if (!date) return ''

  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))

  if (minutes < 1) return 'Upravo sačuvano'
  if (minutes < 60) return `Sačuvano pre ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Sačuvano pre ${hours}h`

  return `Sačuvano ${date.toLocaleDateString('sr-RS')}`
}
