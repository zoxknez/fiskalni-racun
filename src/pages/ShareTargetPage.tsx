/**
 * Share Target Page (refined)
 *
 * Primi share payload iz Service Workera (postMessage),
 * fallback: pokupi title/text/url iz query string-a.
 */

import { addReceipt, type Receipt } from '@lib/db'
import { useReducedMotion } from 'framer-motion'
import { Loader2, Upload } from 'lucide-react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { logger } from '@/lib/logger'

type SharePayload = {
  title?: string | null
  text?: string | null
  url?: string | null
  /** Chrome SW šalje fajlove kao FileList/Array putem postMessage (uz transferable) */
  files?: File[]
}

function ShareTargetPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const prefersReducedMotion = useReducedMotion()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState<string>(
    t('shareTarget.processing', { defaultValue: 'Obrađujem fajl...' })
  )

  // ⭐ FIXED: Track all timers for cleanup
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  const handleQueryOnly = useCallback(() => {
    try {
      const sp = new URLSearchParams(window.location.search)
      const title = sp.get('title')
      const text = sp.get('text')
      const url = sp.get('url')

      logger.info('Share Target (query only):', { title, text, url })

      setStatus('success')
      setMessage(t('shareTarget.dataReceived', { defaultValue: 'Podaci primljeni!' }))

      // ⭐ FIXED: Track timer for cleanup
      const timer = setTimeout(() => {
        timersRef.current.delete(timer)
        navigate('/add', {
          state: { title: title ?? undefined, text: text ?? undefined, url: url ?? undefined },
        })
      }, 900)
      timersRef.current.add(timer)
    } catch (error) {
      logger.error('Share Target (query) error:', error)
      setStatus('error')
      setMessage(t('shareTarget.errorProcessing', { defaultValue: 'Greška pri obradi podataka' }))

      // ⭐ FIXED: Track timer for cleanup
      const timer = setTimeout(() => {
        timersRef.current.delete(timer)
        navigate('/')
      }, 1500)
      timersRef.current.add(timer)
    }
  }, [navigate, t])

  const handleSharePayload = useCallback(
    async (payload: SharePayload) => {
      try {
        const { title, text, url, files = [] } = payload
        logger.info('Share Target payload:', { title, text, url, files: files.length })

        let savedCount = 0

        for (const file of files) {
          if (!(file instanceof File)) continue

          if (file.type.startsWith('image/') || file.type === 'application/pdf') {
            const dataUrl = await fileToDataURL(file)
            const now = new Date()

            // Use addReceipt to automatically enqueue sync
            const receiptData: Omit<Receipt, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'> = {
              merchantName:
                title || t('shareTarget.sharedReceipt', { defaultValue: 'Shared Receipt' }),
              pib: '',
              date: now,
              time: now.toTimeString().slice(0, 5),
              totalAmount: 0,
              items: [],
              category: 'other',
              ...(file.type.startsWith('image/') ? { imageUrl: dataUrl } : { pdfUrl: dataUrl }),
              ...(text ? { notes: text } : {}),
              ...(url ? { qrLink: url } : {}),
            }

            await addReceipt(receiptData)
            savedCount += 1
          }
        }

        if (savedCount > 0) {
          setStatus('success')
          setMessage(
            t('shareTarget.receiptAdded', { defaultValue: 'Račun dodat! Otvaram unos...' })
          )

          // ⭐ FIXED: Track timer for cleanup
          const timer = setTimeout(() => {
            timersRef.current.delete(timer)
            navigate('/add?mode=photo&shared=1')
          }, 900)
          timersRef.current.add(timer)
          return
        }

        setStatus('success')
        setMessage(t('shareTarget.dataReceived', { defaultValue: 'Podaci primljeni!' }))

        // ⭐ FIXED: Track timer for cleanup
        const timer = setTimeout(() => {
          timersRef.current.delete(timer)
          navigate('/add', {
            state: { title: title ?? undefined, text: text ?? undefined, url: url ?? undefined },
          })
        }, 900)
        timersRef.current.add(timer)
      } catch (error) {
        logger.error('Share Target payload error:', error)
        setStatus('error')
        setMessage(t('shareTarget.errorFile', { defaultValue: 'Greška pri obradi fajla' }))

        // ⭐ FIXED: Track timer for cleanup
        const timer = setTimeout(() => {
          timersRef.current.delete(timer)
          navigate('/')
        }, 1500)
        timersRef.current.add(timer)
      }
    },
    [navigate, t]
  )

  useEffect(() => {
    let resolved = false
    const fallbackTimer = window.setTimeout(() => {
      if (!resolved) {
        resolved = true
        handleQueryOnly()
      }
    }, 600) // daj malo vremena SW-u da pošalje payload

    const onMessage = (e: MessageEvent) => {
      const data = e.data as { type?: string; payload?: SharePayload } | undefined
      if (!data || data.type !== 'SHARE_TARGET_PAYLOAD') return
      window.clearTimeout(fallbackTimer)
      if (resolved) return
      resolved = true
      handleSharePayload(data.payload ?? {}).catch((error) => {
        logger.error('Share Target payload dispatch failed:', error)
      })
    }

    navigator.serviceWorker?.addEventListener('message', onMessage)

    // Pingni SW da pošalje stashovan share payload (ako postoji)
    ;(async () => {
      try {
        const reg = await navigator.serviceWorker?.ready
        reg?.active?.postMessage({ type: 'SHARE_TARGET_REQUEST' })
      } catch (error) {
        logger.warn?.('Share Target ping failed', error)
      }
    })()

    return () => {
      navigator.serviceWorker?.removeEventListener('message', onMessage)
      window.clearTimeout(fallbackTimer)

      // ⭐ FIXED: Clear all pending timers on unmount
      for (const timer of timersRef.current) {
        clearTimeout(timer)
      }
      timersRef.current.clear()
    }
  }, [handleQueryOnly, handleSharePayload])

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark-50 p-4 dark:bg-dark-900">
      <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-xl dark:bg-dark-800">
        {status === 'processing' && (
          <>
            <Loader2
              className={`mx-auto mb-4 h-16 w-16 text-primary-500 ${prefersReducedMotion ? '' : 'animate-spin'}`}
            />
            <p className="text-dark-600 dark:text-dark-400" aria-live="polite">
              {message}
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <Upload className="mx-auto mb-4 h-16 w-16 text-success-500" />
            <p className="font-semibold text-dark-900 dark:text-dark-50" aria-live="polite">
              {message}
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <Upload className="mx-auto mb-4 h-16 w-16 text-error-500" />
            <p className="text-error-600 dark:text-error-400" aria-live="assertive">
              {message}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default memo(ShareTargetPage)

/** Promisified FileReader → Data URL */
function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('File read error'))
    reader.readAsDataURL(file)
  })
}
