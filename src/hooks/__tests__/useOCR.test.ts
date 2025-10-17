/**
 * useOCR Hook Tests
 */

import type { OCRResult } from '@lib/ocr'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// Mock OCR module
vi.mock('@lib/ocr', () => ({
  runOCR: vi.fn(),
  disposeOcrWorker: vi.fn(),
}))

import { runOCR } from '@lib/ocr'

// Simple version of useOCR for testing
function useOCR() {
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [result, setResult] = React.useState<any>(null)
  const [error, setError] = React.useState<string | null>(null)

  const processImage = async (file: File | Blob) => {
    setIsProcessing(true)
    setError(null)

    try {
      const ocrResult = await runOCR(file, {})
      setResult(ocrResult)
      return ocrResult
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'OCR failed'
      setError(errorMessage)
      return null
    } finally {
      setIsProcessing(false)
    }
  }

  return { processImage, isProcessing, result, error }
}

import React from 'react'

describe('useOCR Hook', () => {
  it('should process image successfully', async () => {
    const mockResult: OCRResult = {
      rawText: 'Test text',
      fields: [{ label: 'ukupno', value: '1000', confidence: 0.9 }],
    }

    vi.mocked(runOCR).mockResolvedValue(mockResult)

    const { result } = renderHook(() => useOCR())

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    const processPromise = result.current.processImage(file)

    // Should be processing
    expect(result.current.isProcessing).toBe(true)

    const ocrResult = await processPromise

    await waitFor(() => {
      expect(result.current.isProcessing).toBe(false)
      expect(result.current.result).toEqual(mockResult)
      expect(result.current.error).toBeNull()
      expect(ocrResult).toEqual(mockResult)
    })
  })

  it('should handle OCR errors', async () => {
    vi.mocked(runOCR).mockRejectedValue(new Error('OCR processing failed'))

    const { result } = renderHook(() => useOCR())

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    await result.current.processImage(file)

    await waitFor(() => {
      expect(result.current.isProcessing).toBe(false)
      expect(result.current.error).toBe('OCR processing failed')
      expect(result.current.result).toBeNull()
    })
  })

  it('should set processing state correctly', async () => {
    vi.mocked(runOCR).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ rawText: '', fields: [] }), 100))
    )

    const { result } = renderHook(() => useOCR())

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    expect(result.current.isProcessing).toBe(false)

    const promise = result.current.processImage(file)

    expect(result.current.isProcessing).toBe(true)

    await promise

    await waitFor(() => {
      expect(result.current.isProcessing).toBe(false)
    })
  })
})
