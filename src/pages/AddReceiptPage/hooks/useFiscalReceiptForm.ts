/**
 * Hook for managing fiscal receipt form state
 */

import { classifyCategory } from '@lib/categories'
import { useCallback, useMemo, useState } from 'react'
import type { FiscalReceiptFormData } from '../types'
import { getDefaultFiscalReceiptData } from '../utils/defaults'
import { validateFiscalReceipt } from '../utils/validators'

export function useFiscalReceiptForm(initialData?: Partial<FiscalReceiptFormData>) {
  // Form state
  const [formData, setFormData] = useState<FiscalReceiptFormData>(() => ({
    ...getDefaultFiscalReceiptData(),
    ...initialData,
  }))

  // Track if user manually changed category (to prevent auto-classification override)
  const [userEditedCategory, setUserEditedCategory] = useState(false)

  // Validation
  const errors = useMemo(() => validateFiscalReceipt(formData), [formData])
  const isValid = Object.keys(errors).length === 0

  /**
   * Update a single form field
   */
  const updateField = useCallback((field: keyof FiscalReceiptFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Mark category as manually edited
    if (field === 'category') {
      setUserEditedCategory(true)
    }
  }, [])

  /**
   * Update multiple fields at once (useful for OCR/QR data)
   */
  const updateMultipleFields = useCallback((updates: Partial<FiscalReceiptFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }, [])

  /**
   * Auto-classify category based on merchant name
   * Only if user hasn't manually edited category
   */
  const autoClassifyCategory = useCallback(() => {
    if (!userEditedCategory && formData.merchantName.trim()) {
      const classified = classifyCategory({ merchantName: formData.merchantName })
      if (classified) {
        setFormData((prev) => ({ ...prev, category: classified }))
      }
    }
  }, [formData.merchantName, userEditedCategory])

  /**
   * Reset form to default values
   */
  const reset = useCallback(() => {
    setFormData(getDefaultFiscalReceiptData())
    setUserEditedCategory(false)
  }, [])

  /**
   * Populate form from parsed data (OCR or QR)
   */
  const populateFromParsedData = useCallback(
    (parsedData: Partial<FiscalReceiptFormData>) => {
      updateMultipleFields(parsedData)

      // Auto-classify if merchant name is provided
      if (parsedData.merchantName && !userEditedCategory) {
        const classified = classifyCategory({ merchantName: parsedData.merchantName })
        if (classified) {
          setFormData((prev) => ({ ...prev, category: classified }))
        }
      }
    },
    [updateMultipleFields, userEditedCategory]
  )

  return {
    formData,
    errors,
    isValid,
    userEditedCategory,
    updateField,
    updateMultipleFields,
    autoClassifyCategory,
    populateFromParsedData,
    reset,
  }
}
