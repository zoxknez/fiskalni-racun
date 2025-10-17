/**
 * Web Worker Hook
 *
 * Simplifies communication with web workers
 *
 * @module hooks/useWebWorker
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { logger } from '@/lib/logger'

interface UseWebWorkerOptions<R> {
  onMessage?: (data: R) => void
  onError?: (error: Error) => void
}

export function useWebWorker<T = any, R = any>(
  workerUrl: string,
  options: UseWebWorkerOptions<R> = {}
) {
  const [isReady, setIsReady] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const workerRef = useRef<Worker | null>(null)

  // Initialize worker
  useEffect(() => {
    try {
      const worker = new Worker(new URL(workerUrl, import.meta.url), {
        type: 'module',
      })

      worker.onmessage = (e: MessageEvent<R>) => {
        setIsProcessing(false)
        options.onMessage?.(e.data)
      }

      worker.onerror = (e) => {
        const error = new Error(e.message)
        setError(error)
        setIsProcessing(false)
        options.onError?.(error)
        logger.error('Web Worker error:', error)
      }

      workerRef.current = worker
      setIsReady(true)

      logger.debug('Web Worker initialized:', workerUrl)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create worker')
      setError(error)
      logger.error('Failed to create Web Worker:', error)
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
        logger.debug('Web Worker terminated:', workerUrl)
      }
    }
  }, [workerUrl, options])

  // Post message to worker
  const postMessage = useCallback((data: T) => {
    if (!workerRef.current) {
      logger.error('Worker not initialized')
      return
    }

    setIsProcessing(true)
    setError(null)
    workerRef.current.postMessage(data)
  }, [])

  // Terminate worker
  const terminate = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
      setIsReady(false)
    }
  }, [])

  return {
    isReady,
    isProcessing,
    error,
    postMessage,
    terminate,
  }
}

/**
 * Hook for OCR worker
 */
export function useOCRWorker() {
  const [text, setText] = useState<string>('')
  const [progress, setProgress] = useState(0)

  const { isReady, isProcessing, error, postMessage } = useWebWorker('../workers/ocr.worker.ts', {
    onMessage: (data: any) => {
      if (data.type === 'result') {
        setText(data.data)
      } else if (data.type === 'progress') {
        setProgress(data.progress * 100)
      }
    },
  })

  const recognize = useCallback(
    (imageData: string) => {
      setText('')
      setProgress(0)
      postMessage({ type: 'recognize', imageData })
    },
    [postMessage]
  )

  return {
    isReady,
    isProcessing,
    error,
    text,
    progress,
    recognize,
  }
}

/**
 * Hook for image worker
 */
export function useImageWorker() {
  const [result, setResult] = useState<string>('')

  const { isReady, isProcessing, error, postMessage } = useWebWorker('../workers/image.worker.ts', {
    onMessage: (data: any) => {
      if (data.type === 'result') {
        setResult(data.data)
      }
    },
  })

  const optimize = useCallback(
    (imageData: string, options?: any) => {
      setResult('')
      postMessage({ type: 'optimize', imageData, options })
    },
    [postMessage]
  )

  const resize = useCallback(
    (imageData: string, maxWidth: number, maxHeight: number) => {
      setResult('')
      postMessage({
        type: 'resize',
        imageData,
        options: { maxWidth, maxHeight },
      })
    },
    [postMessage]
  )

  const compress = useCallback(
    (imageData: string, quality: number, format?: 'webp' | 'jpeg' | 'png') => {
      setResult('')
      postMessage({
        type: 'compress',
        imageData,
        options: { quality, format },
      })
    },
    [postMessage]
  )

  const thumbnail = useCallback(
    (imageData: string) => {
      setResult('')
      postMessage({ type: 'thumbnail', imageData })
    },
    [postMessage]
  )

  return {
    isReady,
    isProcessing,
    error,
    result,
    optimize,
    resize,
    compress,
    thumbnail,
  }
}
