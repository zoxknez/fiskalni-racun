/**
 * Sync Progress Indicator
 *
 * Shows real-time sync status with progress indication
 * Displays when sync is active and shows success/failure
 *
 * @module components/common/SyncProgress
 */

import { db } from '@lib/db'
import { useLiveQuery } from 'dexie-react-hooks'
import { CheckCircle, Cloud, Loader2, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

export function SyncProgress() {
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [visible, setVisible] = useState(false)

  // Monitor sync queue in real-time
  const pendingItems = useLiveQuery(() => db.syncQueue.count(), [])

  useEffect(() => {
    if (pendingItems === undefined || pendingItems === 0) {
      if (status === 'syncing') {
        // Sync just finished
        setStatus('success')
        setMessage('Sinhronizovano')
        setProgress(100)
        setVisible(true)

        // Hide after 2 seconds
        const timer = setTimeout(() => {
          setVisible(false)
          setStatus('idle')
        }, 2000)

        return () => clearTimeout(timer)
      }
    } else if (pendingItems > 0) {
      setStatus('syncing')
      setMessage(`Sinhronizacija... (${pendingItems})`)
      setVisible(true)

      // Simulate progress (real progress would need event tracking)
      const interval = setInterval(() => {
        setProgress((prev) => {
          const next = prev + 5
          return next > 90 ? 90 : next // Cap at 90% until actually done
        })
      }, 300)

      return () => clearInterval(interval)
    }
  }, [pendingItems, status])

  if (!visible) return null

  return (
    <div className="pointer-events-none fixed right-4 bottom-20 z-50 md:bottom-4">
      <div
        className={cn(
          'pointer-events-auto flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg transition-all',
          status === 'syncing' && 'bg-blue-500 text-white',
          status === 'success' && 'bg-green-500 text-white',
          status === 'error' && 'bg-red-500 text-white',
          status === 'idle' && 'bg-gray-500 text-white'
        )}
      >
        {/* Icon */}
        {status === 'syncing' && <Loader2 className="h-5 w-5 animate-spin" />}
        {status === 'success' && <CheckCircle className="h-5 w-5" />}
        {status === 'error' && <XCircle className="h-5 w-5" />}
        {status === 'idle' && <Cloud className="h-5 w-5" />}

        {/* Message */}
        <div className="flex flex-col">
          <span className="font-medium text-sm">{message}</span>

          {/* Progress bar for syncing */}
          {status === 'syncing' && (
            <div className="mt-1 h-1 w-32 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Close button for errors */}
        {status === 'error' && (
          <button
            onClick={() => setVisible(false)}
            className="ml-2 rounded p-1 hover:bg-red-600"
            aria-label="Zatvori"
          >
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
