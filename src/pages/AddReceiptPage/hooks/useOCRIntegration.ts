/**
 * Hook for OCR integration (photo scanning)
 */

import type { OCRField } from '@lib/ocr'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useOCR } from '@/hooks/useOCR'
import type { FiscalReceiptFormData } from '../types'
import { normalizeDate, normalizeTime, sanitizeAmountInput } from '../utils/formatters'

interface OCRResult {
  fields: OCRField[]
  raw?: string
}

export function useOCRIntegration() {
  const { processImage, cancel, reset, isProcessing, result: ocrResult, error: ocrError } = useOCR()

  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastOcrErrorRef = useRef<string | null>(null)

  // Track last error
  useEffect(() => {
    lastOcrErrorRef.current = ocrError
  }, [ocrError])

  // Cleanup image preview URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    }
  }, [imagePreviewUrl])

  // Cancel processing on unmount
  useEffect(() => {
    return () => {
      cancel()
    }
  }, [cancel])

  /**
   * Handle image file selection and start OCR processing
   */
  const handleImageSelect = useCallback(
    (file: File) => {
      // Cleanup old preview
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl)
      }

      // Set new image and preview
      setSelectedImage(file)
      const previewUrl = URL.createObjectURL(file)
      setImagePreviewUrl(previewUrl)

      // Start OCR processing
      processImage(file)
    },
    [imagePreviewUrl, processImage]
  )

  /**
   * Clear image and reset OCR state
   */
  const clearImage = useCallback(() => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
    }
    setSelectedImage(null)
    setImagePreviewUrl(null)
    reset()
  }, [imagePreviewUrl, reset])

  /**
   * Trigger file input click
   */
  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  /**
   * Extract fiscal receipt data from OCR result
   */
  const extractFiscalReceiptData = useCallback(
    (result: OCRResult): Partial<FiscalReceiptFormData> => {
      const fields = result.fields

      // Helper to find field by label
      const findField = (label: string) => fields.find((f) => f.label === label)?.value ?? ''

      return {
        merchantName: findField('merchantName') || findField('merchant') || '',
        pib: findField('pib') || findField('taxId') || '',
        date: normalizeDate(findField('date') || ''),
        time: normalizeTime(findField('time') || ''),
        amount: sanitizeAmountInput(findField('total') || findField('amount') || ''),
      }
    },
    []
  )

  return {
    // State
    selectedImage,
    imagePreviewUrl,
    fileInputRef,
    isProcessing,
    result: ocrResult,
    error: ocrError,
    lastError: lastOcrErrorRef.current,

    // Actions
    handleImageSelect,
    clearImage,
    openFilePicker,
    extractFiscalReceiptData,
  }
}
