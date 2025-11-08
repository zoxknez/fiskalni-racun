import { type OCRResult, type OcrOptions, runOCR } from '@lib/ocr'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { ocrLogger } from '@/lib/logger'

/**
 * Modern OCR Hook with AbortController support
 *
 * Features:
 * - Automatic cancellation on unmount
 * - Manual cancellation support
 * - Loading and error states
 * - Proper cleanup
 * - Memory leak prevention
 * - ⭐ Configurable timeout
 * - ⭐ Dynamic language selection based on user locale
 */
export function useOCR(options?: { timeout?: number; language?: string }) {
  const [isPending, startTransition] = useTransition()
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<OCRResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // ⭐ FIXED: Track mounted state to prevent memory leaks
  const isMountedRef = useRef(true)

  // ⭐ FIXED: Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false

      // Cancel any ongoing OCR operation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }

      ocrLogger.debug('OCR hook unmounted, cleanup complete')
    }
  }, [])

  /**
   * Process image with OCR
   * Automatically cancels previous OCR if still running
   */
  const processImage = useCallback(
    async (file: File | Blob): Promise<OCRResult | null> => {
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

        // ⭐ FIXED: Pass configurable timeout and language to runOCR
        const ocrOptions: OcrOptions = {
          signal: abortController.signal,
          enhance: true,
          dpi: 300,
          ...(options?.timeout ? { timeout: options.timeout } : {}),
          ...(options?.language ? { languages: options.language } : {}),
        }

        const ocrResult = await runOCR(file, ocrOptions)

        // ⭐ FIXED: Only update state if component is still mounted
        if (!abortController.signal.aborted && isMountedRef.current) {
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

        // ⭐ FIXED: Only update state if component is still mounted
        if (isMountedRef.current) {
          setError(errorMessage)
        }

        ocrLogger.error('OCR processing failed:', err)
        return null
      } finally {
        if (!abortController.signal.aborted && isMountedRef.current) {
          setIsProcessing(false)
        }
        abortControllerRef.current = null
      }
    },
    [options?.timeout, options?.language]
  )

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
