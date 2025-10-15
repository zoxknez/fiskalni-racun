import { disposeOcrWorker } from '@lib/ocr'
import { useEffect } from 'react'
import { ocrLogger } from '@/lib/logger'

/**
 * Hook to cleanup OCR worker on app unmount
 * This prevents memory leaks from Tesseract.js worker
 */
export function useOCRCleanup() {
  useEffect(() => {
    return () => {
      ocrLogger.debug('Cleaning up OCR worker...')
      disposeOcrWorker()
        .then(() => {
          ocrLogger.debug('OCR worker cleanup completed')
        })
        .catch((error) => {
          ocrLogger.error('OCR worker cleanup failed:', error)
        })
    }
  }, [])
}
