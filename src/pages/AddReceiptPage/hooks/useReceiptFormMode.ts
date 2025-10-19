/**
 * Hook for managing form mode (QR/Photo/Manual) with URL sync
 */

import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DEFAULT_FORM_MODE, DEFAULT_MANUAL_TYPE } from '../constants'
import type { FormMode, ManualFormType } from '../types'

export function useReceiptFormMode() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Initialize mode from URL or default
  const initialMode = (searchParams.get('mode') as FormMode) || DEFAULT_FORM_MODE

  const [mode, setModeState] = useState<FormMode>(initialMode)
  const [manualType, setManualType] = useState<ManualFormType>(DEFAULT_MANUAL_TYPE)
  const [loading, setLoading] = useState(false)

  /**
   * Set mode and sync with URL (refresh safe)
   */
  const setMode = useCallback(
    (newMode: FormMode) => {
      setModeState(newMode)
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          params.set('mode', newMode)
          return params
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  return {
    mode,
    manualType,
    loading,
    setMode,
    setManualType,
    setLoading,
  }
}
