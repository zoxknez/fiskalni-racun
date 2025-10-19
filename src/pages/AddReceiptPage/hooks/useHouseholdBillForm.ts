/**
 * Hook for managing household bill form state
 */

import { useCallback, useMemo, useState } from 'react'
import type { HouseholdBillFormData } from '../types'
import { getDefaultHouseholdBillData } from '../utils/defaults'
import { validateHouseholdBill } from '../utils/validators'

export function useHouseholdBillForm(initialData?: Partial<HouseholdBillFormData>) {
  // Form state
  const [formData, setFormData] = useState<HouseholdBillFormData>(() => ({
    ...getDefaultHouseholdBillData(),
    ...initialData,
  }))

  // Validation
  const errors = useMemo(() => validateHouseholdBill(formData), [formData])
  const isValid = Object.keys(errors).length === 0

  /**
   * Update a single form field
   */
  const updateField = useCallback((field: keyof HouseholdBillFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }, [])

  /**
   * Update multiple fields at once
   */
  const updateMultipleFields = useCallback((updates: Partial<HouseholdBillFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }, [])

  /**
   * Reset form to default values
   */
  const reset = useCallback(() => {
    setFormData(getDefaultHouseholdBillData())
  }, [])

  return {
    formData,
    errors,
    isValid,
    updateField,
    updateMultipleFields,
    reset,
  }
}
