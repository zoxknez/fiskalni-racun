/**
 * Web Worker Hook – stabilna, SSR-safe, sa progress podrškom
 *
 * @module hooks/useWebWorker
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { logger } from '@/lib/logger'

type MaybeError = unknown

export interface UseWebWorkerOptions<R> {
  /** Poziva se na SVAKU poruku iz workera */
  onMessage?: (data: R) => void
  /** Poziva se na grešku (error event ili hvatanje u konstrukciji) */
  onError?: (error: Error) => void
  /** Ako je true – svaka poruka završava proces;
   *  Ako je funkcija – završava kada vrati true; default: false (ručno kontrolisan lifecycle) */
  completeWhen?: boolean | ((data: R) => boolean)
  /** Opcioni handler za messageerror (structured clone fail, sl.) */
  onMessageError?: (e: MessageEvent<unknown>) => void
  /** Debug label (samo za log) */
  name?: string
}

function toError(e: MaybeError): Error {
  if (e instanceof Error) return e
  if (e && typeof e === 'object' && 'message' in e) {
    const message = (e as { message?: unknown }).message
    return new Error(typeof message === 'string' ? message : String(message))
  }
  return new Error(String(e))
}

function isBrowser() {
  return typeof window !== 'undefined' && typeof Worker !== 'undefined'
}

/**
 * Pokušaj kreiranja module workera; ako padne, loguj jasan error (fallback na classic može biti besmislen ako je worker ESM).
 */
function createWorker(workerUrl: string | URL) {
  // Vite/Next: new URL(relative, import.meta.url) očekuje relativnu putanju ka ovom fajlu
  const url = workerUrl instanceof URL ? workerUrl : new URL(workerUrl, import.meta.url)
  try {
    return new Worker(url, { type: 'module' })
  } catch (err) {
    logger.error('Module Worker konstrukcija neuspešna (da li je worker ESM bundlovan?):', err)
    // Fallback pokušaj (classic) – radi samo ako je worker klasičan skript
    try {
      return new Worker(url)
    } catch (err2) {
      throw toError(err2)
    }
  }
}

export function useWebWorker<T = unknown, R = unknown>(
  workerUrl: string | URL,
  options: UseWebWorkerOptions<R> = {}
) {
  const [isReady, setIsReady] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const workerRef = useRef<Worker | null>(null)
  const optsRef = useRef<UseWebWorkerOptions<R>>(options)
  const workerName = options.name

  // uvek držimo najnovije callback-ove u refu (bez re-kreiranja workera)
  useEffect(() => {
    optsRef.current = options
  }, [options])

  // Init/teardown workera
  useEffect(() => {
    if (!isBrowser()) {
      logger.debug('useWebWorker: nije u browser okruženju – preskačem init')
      return
    }

    try {
      const worker = createWorker(workerUrl)

      const onMessage = (e: MessageEvent<R>) => {
        const { onMessage, completeWhen } = optsRef.current
        try {
          onMessage?.(e.data)
        } catch (cbErr) {
          logger.error('Greška u onMessage callback-u:', cbErr)
        }

        // Kontrola završetka procesa
        if (completeWhen === true) {
          setIsProcessing(false)
        } else if (typeof completeWhen === 'function') {
          try {
            if (completeWhen(e.data)) setIsProcessing(false)
          } catch (pErr) {
            logger.error('Greška u completeWhen predicate-u:', pErr)
          }
        }
      }

      const onMessageError = (e: MessageEvent<unknown>) => {
        logger.error('Web Worker messageerror:', e)
        setError(new Error('messageerror: structured clone failed ili nevalidna poruka'))
        setIsProcessing(false)
        optsRef.current.onMessageError?.(e)
      }

      const onError = (e: ErrorEvent) => {
        const err = new Error(e.message || 'Web Worker error')
        setError(err)
        setIsProcessing(false)
        optsRef.current.onError?.(err)
        logger.error('Web Worker error:', err)
      }

      worker.addEventListener('message', onMessage as EventListener)
      worker.addEventListener('messageerror', onMessageError as EventListener)
      worker.addEventListener('error', onError as EventListener)

      workerRef.current = worker
      setIsReady(true)
      logger.debug('Web Worker initialized:', workerName ?? String(workerUrl))
    } catch (err) {
      const e = toError(err)
      setError(e)
      logger.error('Failed to create Web Worker:', e)
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
        setIsReady(false)
        setIsProcessing(false)
        logger.debug('Web Worker terminated:', workerName ?? String(workerUrl))
      }
    }
    // samo workerUrl kreira/uništava; options su kroz ref
  }, [workerUrl, workerName])

  // Post message (sa opcionim transferables)
  const postMessage = useCallback((data: T, transfer?: Transferable[]) => {
    if (!workerRef.current) {
      const err = new Error('Worker not initialized')
      setError(err)
      logger.error(err.message)
      return
    }
    setIsProcessing(true)
    setError(null)
    try {
      if (transfer && transfer.length > 0) {
        workerRef.current.postMessage(data, transfer)
      } else {
        workerRef.current.postMessage(data)
      }
    } catch (err) {
      const e = toError(err)
      setError(e)
      setIsProcessing(false)
      optsRef.current.onError?.(e)
      logger.error('postMessage greška:', e)
    }
  }, [])

  // Terminate
  const terminate = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
      setIsReady(false)
      setIsProcessing(false)
    }
  }, [])

  // Restart
  const restart = useCallback(() => {
    terminate()
    // mali tick da pusti React da commit-uje terminate
    setTimeout(() => {
      try {
        const w = createWorker(workerUrl)
        workerRef.current = w
        setIsReady(true)
      } catch (err) {
        const e = toError(err)
        setError(e)
        logger.error('Restart worker-a neuspešan:', e)
      }
    }, 0)
  }, [terminate, workerUrl])

  return {
    isSupported: isBrowser(),
    isReady,
    isProcessing,
    error,
    postMessage,
    terminate,
    restart,
  }
}

/* ============================================================
 *  Specijalizovani hook: OCR worker
 *  - očekuje { type: 'progress' | 'result' | 'done', ... }
 * ============================================================ */
export function useOCRWorker() {
  const [text, setText] = useState<string>('')
  const [progress, setProgress] = useState(0)

  const { isSupported, isReady, isProcessing, error, postMessage } = useWebWorker<
    { type: 'recognize'; imageData: string },
    { type: string; data?: unknown; progress?: number }
  >('../workers/ocr.worker.ts', {
    name: 'ocr.worker',
    // Samo kad stigne 'result' ili 'done' gasimo processing
    completeWhen: (msg) => msg?.type === 'result' || msg?.type === 'done',
    onMessage: (data) => {
      if (data?.type === 'result') {
        setText(String(data.data ?? ''))
      } else if (data?.type === 'progress') {
        const p = Number(data.progress)
        setProgress(Number.isFinite(p) ? Math.max(0, Math.min(100, p * 100)) : 0)
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
    isSupported,
    isReady,
    isProcessing,
    error,
    text,
    progress,
    recognize,
  }
}

/* ============================================================
 *  Specijalizovani hook: Image worker
 *  - očekuje { type: 'result', data: Blob | string } za final
 * ============================================================ */
export function useImageWorker() {
  const [result, setResult] = useState<string>('')
  const lastUrlRef = useRef<string | null>(null)

  type InMsg =
    | { type: 'optimize'; imageData: string; options?: Record<string, unknown> }
    | { type: 'resize'; imageData: string; options: { maxWidth: number; maxHeight: number } }
    | {
        type: 'compress'
        imageData: string
        options: { quality: number; format?: 'webp' | 'jpeg' | 'png' }
      }
    | { type: 'thumbnail'; imageData: string }

  type OutMsg = { type: string; data?: unknown }

  const { isSupported, isReady, isProcessing, error, postMessage } = useWebWorker<InMsg, OutMsg>(
    '../workers/image.worker.ts',
    {
      name: 'image.worker',
      completeWhen: (msg) => msg?.type === 'result' || msg?.type === 'done',
      onMessage: (data) => {
        if (data?.type === 'result') {
          if (data.data instanceof Blob) {
            const url = URL.createObjectURL(data.data)
            if (lastUrlRef.current) {
              URL.revokeObjectURL(lastUrlRef.current)
            }
            lastUrlRef.current = url
            setResult(url)
            return
          }

          setResult(String(data.data ?? ''))
        }
      },
    }
  )

  useEffect(() => {
    return () => {
      if (lastUrlRef.current) {
        URL.revokeObjectURL(lastUrlRef.current)
        lastUrlRef.current = null
      }
    }
  }, [])

  const optimize = useCallback(
    (imageData: string, options?: Record<string, unknown>) => {
      setResult('')
      if (options) {
        postMessage({ type: 'optimize', imageData, options })
      } else {
        postMessage({ type: 'optimize', imageData })
      }
    },
    [postMessage]
  )

  const resize = useCallback(
    (imageData: string, maxWidth: number, maxHeight: number) => {
      setResult('')
      postMessage({ type: 'resize', imageData, options: { maxWidth, maxHeight } })
    },
    [postMessage]
  )

  const compress = useCallback(
    (imageData: string, quality: number, format?: 'webp' | 'jpeg' | 'png') => {
      setResult('')
      const options = format ? { quality, format } : { quality }
      postMessage({ type: 'compress', imageData, options })
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
    isSupported,
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
