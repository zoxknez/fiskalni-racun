/**
 * Hook for QR code scanning
 */

import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { parseQRCode } from '@/lib/fiscalQRParser'
import type { ParsedQRData } from '../types'
import { normalizeTime, sanitizeAmountInput } from '../utils/formatters'

export function useQRScanner() {
  const [showScanner, setShowScanner] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  /**
   * Open QR scanner modal
   */
  const openScanner = useCallback(() => {
    setShowScanner(true)
  }, [])

  /**
   * Close QR scanner modal
   */
  const closeScanner = useCallback(() => {
    setShowScanner(false)
    setIsProcessing(false)
  }, [])

  /**
   * Handle QR code scan result
   */
  const handleQRScan = useCallback(
    (qrData: string): ParsedQRData | null => {
      setIsProcessing(true)

      try {
        const parsed = parseQRCode(qrData)

        if (!parsed) {
          toast.error('Невалидан QR код')
          return null
        }

        // Normalize and sanitize parsed data
        const normalizedData: ParsedQRData = {
          merchantName: parsed.merchantName || '',
          pib: parsed.pib || '',
          date: parsed.date ? (parsed.date.toISOString().split('T')[0] ?? '') : '',
          time: parsed.time ? normalizeTime(parsed.time) : '',
          amount: parsed.totalAmount ? sanitizeAmountInput(String(parsed.totalAmount)) : '',
        }

        closeScanner()
        toast.success('QR код успешно скениран')

        return normalizedData
      } catch (error) {
        console.error('QR parse error:', error)
        toast.error('Невалидан QR код')
        return null
      } finally {
        setIsProcessing(false)
      }
    },
    [closeScanner]
  )

  return {
    showScanner,
    isProcessing,
    openScanner,
    closeScanner,
    handleQRScan,
  }
}
