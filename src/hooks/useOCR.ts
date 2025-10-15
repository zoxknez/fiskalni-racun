import { type OCRResult, runOCR } from '@lib/ocr'
import { useCallback, useRef, useState, useTransition } from 'react'
import { ocrLogger } from '@/lib/logger'

/**
 * Modern OCR Hook with AbortController support
 *
 * Features:
 * - Automatic cancellation on unmount
 * - Manual cancellation support
 * - Loading and error states
 * - Proper cleanup
 */
export function useOCR() {
  const [isPending, startTransition] = useTransition()
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<OCRResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * Process image with OCR
   * Automatically cancels previous OCR if still running
   */
  const processImage = useCallback(async (file: File | Blob): Promise<OCRResult | null> => {
    // Cancel previous OCR if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new AbortController
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setIsProcessing(true)
    setError(null)
    setResult(null)

    try {
      ocrLogger.debug('Starting OCR processing...')

      const ocrResult = await runOCR(file, {
        signal: abortController.signal,
        enhance: true,
        dpi: 300,
      })

      // Only update if not aborted
      if (!abortController.signal.aborted) {
        // ⭐ Use transition for non-urgent state updates
        startTransition(() => {
          setResult(ocrResult)
        })
        ocrLogger.debug('OCR processing completed', ocrResult)
        return ocrResult
      }

      return null
    } catch (err) {
      // Ignore abort errors
      if (err instanceof DOMException && err.name === 'AbortError') {
        ocrLogger.debug('OCR processing cancelled')
        return null
      }

      const errorMessage = err instanceof Error ? err.message : 'OCR failed'
      setError(errorMessage)
      ocrLogger.error('OCR processing failed:', err)
      return null
    } finally {
      if (!abortController.signal.aborted) {
        setIsProcessing(false)
      }
      abortControllerRef.current = null
    }
  }, [])

  /**
   * Cancel ongoing OCR processing
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsProcessing(false)
      ocrLogger.debug('OCR processing cancelled manually')
    }
  }, [])

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    cancel()
    setResult(null)
    setError(null)
  }, [cancel])

  return {
    processImage,
    cancel,
    reset,
    isProcessing: isProcessing || isPending,
    result,
    error,
  }
}
