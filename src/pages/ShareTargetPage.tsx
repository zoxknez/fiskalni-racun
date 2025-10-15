/**
 * Share Target Page
 *
 * Handles files shared to the PWA via Share Target API
 *
 * @module pages/ShareTargetPage
 */

import { db, type Receipt } from '@lib/db'
import { Loader2, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logger } from '@/lib/logger'

export function ShareTargetPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('Obrađujem fajl...')

  useEffect(() => {
    handleSharedData()
  }, [])

  async function handleSharedData() {
    try {
      // Get form data from URL
      const searchParams = new URLSearchParams(window.location.search)

      // Parse shared data
      const title = searchParams.get('title')
      const text = searchParams.get('text')
      const url = searchParams.get('url')

      logger.info('Share Target data:', { title, text, url })

      // Handle shared files (from POST request body)
      const request = await fetch(window.location.href, {
        method: 'POST',
      })

      if (request.ok) {
        const data = await request.formData()
        const files = data.getAll('media') as File[]

        if (files.length > 0) {
          // Process shared images
          for (const file of files) {
            if (file.type.startsWith('image/')) {
              // Convert to base64
              const reader = new FileReader()
              reader.readAsDataURL(file)

              reader.onload = async () => {
                const imageData = reader.result as string

                // Save to database (temporary)
                const now = new Date()
                const receiptRecord: Omit<Receipt, 'id'> = {
                  merchantName: title || 'Shared Receipt',
                  pib: '',
                  date: now,
                  time: now.toTimeString().slice(0, 5),
                  totalAmount: 0,
                  vatAmount: 0,
                  items: [],
                  category: 'other',
                  imageUrl: imageData,
                  createdAt: now,
                  updatedAt: now,
                  syncStatus: 'pending',
                }

                if (text) {
                  receiptRecord.notes = text
                }

                if (url) {
                  receiptRecord.qrLink = url
                }

                await db.receipts.add(receiptRecord)

                setStatus('success')
                setMessage('Račun dodat! Prebacujem te na OCR...')

                // Redirect to add receipt page with OCR
                setTimeout(() => {
                  navigate('/add?mode=ocr&shared=true')
                }, 1500)
              }
            } else if (file.type === 'application/pdf') {
              // Handle PDF
              setStatus('success')
              setMessage('PDF fajl primljen!')
              setTimeout(() => {
                navigate('/receipts')
              }, 1500)
            }
          }
        } else {
          // No files, just text/URL
          setStatus('success')
          setMessage('Podaci primljeni!')
          setTimeout(() => {
            navigate('/add', { state: { title, text, url } })
          }, 1500)
        }
      } else {
        throw new Error('Failed to fetch shared data')
      }
    } catch (error) {
      logger.error('Share Target error:', error)
      setStatus('error')
      setMessage('Greška pri obradi fajla')

      setTimeout(() => {
        navigate('/')
      }, 2000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-50 dark:bg-dark-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-dark-800 rounded-lg shadow-xl p-8 text-center">
        {status === 'processing' && (
          <>
            <Loader2 className="w-16 h-16 text-primary-500 mx-auto mb-4 animate-spin" />
            <p className="text-dark-600 dark:text-dark-400">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <Upload className="w-16 h-16 text-success-500 mx-auto mb-4" />
            <p className="text-dark-900 dark:text-dark-50 font-semibold">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <Upload className="w-16 h-16 text-error-500 mx-auto mb-4" />
            <p className="text-error-600 dark:text-error-400">{message}</p>
          </>
        )}
      </div>
    </div>
  )
}
