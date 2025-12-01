import {
  type QRScanError,
  type QRScannerStatus,
  type QRScanResult,
  qrScanner,
} from '@lib/qr-scanner'
import clsx from 'clsx'
import { useReducedMotion } from 'framer-motion'
import { AlertCircle, Camera, CheckCircle2, X, Zap, ZapOff } from 'lucide-react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { logger } from '@/lib/logger'

interface QRScannerProps {
  onScan: (data: string) => void
  onError: (error: string) => void
  onClose: () => void
}

/**
 * QR Scanner komponenta koristeći profesionalni ZXing QRScannerService
 * - Multi-camera support
 * - Torch (blic) support
 * - Dedupe & validation
 * - Robust error handling
 */
function QRScanner({ onScan, onError, onClose }: QRScannerProps) {
  const { t } = useTranslation()
  const prefersReducedMotion = useReducedMotion()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<QRScannerStatus>('initializing')
  const [error, setError] = useState<string>('')
  const [scanSuccess, setScanSuccess] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)

  const cleanup = useCallback(
    (propagate = true) => {
      setTorchOn(false)
      setTorchSupported(false)
      qrScanner.teardown().catch((cleanupError) => logger.error('Cleanup error:', cleanupError))
      if (propagate) {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) {
      return
    }

    const initializeScanner = async () => {
      try {
        setStatus('initializing')
        setError('')

        // Initialize scanner with video element
        const initResult = await qrScanner.initialize(videoElement, {
          facingMode: 'environment', // Prefer back camera
          dedupeWindowMs: 1000,
        })
        setTorchSupported(initResult.torchSupported)
        setTorchOn(false)

        // Start continuous scanning
        qrScanner.startContinuous(
          (result: QRScanResult) => {
            logger.debug('QR Code scanned:', result.rawText)
            setScanSuccess(true)

            // Small delay for visual feedback
            setTimeout(() => {
              onScan(result.rawText)
              cleanup()
            }, 500)
          },
          (err: QRScanError) => {
            // Soft errors during scanning (ignore NotFoundException)
            if (err.code !== 'other') {
              logger.error('Scan error:', err.message)
            }
          }
        )

        setStatus('scanning')
      } catch (err: unknown) {
        const qrError = err as QRScanError
        logger.error('Scanner initialization error:', qrError)

        let errorMessage: string = t('scanner.startFailed')

        switch (qrError.code) {
          case 'not-allowed':
            errorMessage = t('scanner.cameraAccessDenied')
            break
          case 'not-readable':
            errorMessage = t('scanner.cameraInUse')
            break
          case 'no-media-devices':
            errorMessage = t('scanner.noCameraFound')
            break
          case 'insecure-context':
            errorMessage = t('scanner.httpsRequired')
            break
        }

        setError(errorMessage)
        setStatus('error')
        onError(errorMessage)
      }
    }

    initializeScanner()

    return () => {
      cleanup(false)
    }
  }, [cleanup, onError, onScan, t])

  const handleTorchToggle = async () => {
    if (!torchSupported) return

    try {
      const newState = !torchOn
      const success = await qrScanner.setTorch(newState)
      if (success) {
        setTorchOn(newState)
      }
    } catch (err) {
      logger.error('Torch toggle error:', err)
    }
  }

  const handleClose = () => {
    cleanup()
  }

  return (
    <div
      className={clsx(
        'fixed inset-0 z-50 flex flex-col bg-black/95',
        !prefersReducedMotion && 'animate-fade-in'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-dark-900/50 p-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <Camera className="h-6 w-6 text-primary-400" />
          <h2 className="font-semibold text-lg text-white">{t('scanner.scanQRCode')}</h2>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="rounded-lg p-2 transition-colors hover:bg-white/10"
        >
          <X className="h-6 w-6 text-white" />
        </button>
      </div>

      {/* Scanner Area */}
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        {error ? (
          <div className="flex max-w-md flex-col items-center gap-4 text-center">
            <AlertCircle className="h-16 w-16 text-red-500" />
            <p className="text-lg text-white">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-primary-600 px-6 py-2 font-medium text-white transition-colors hover:bg-primary-700"
            >
              {t('common.retry')}
            </button>
          </div>
        ) : (
          <>
            {/* Video Container */}
            <section
              className="relative"
              aria-label={t('scanner.cameraFeed', { defaultValue: 'QR Scanner Camera Feed' })}
            >
              <video
                ref={videoRef}
                className="max-w-full overflow-hidden rounded-2xl shadow-2xl"
                style={{ maxHeight: '60vh' }}
                autoPlay
                muted
                playsInline
                aria-hidden="true"
                tabIndex={-1}
              />

              {/* Scan Success Overlay */}
              {scanSuccess && (
                <div
                  className={clsx(
                    'absolute inset-0 flex items-center justify-center rounded-2xl bg-green-500/20',
                    !prefersReducedMotion && 'animate-fade-in'
                  )}
                >
                  <CheckCircle2
                    className={clsx(
                      'h-20 w-20 text-green-500',
                      !prefersReducedMotion && 'animate-bounce'
                    )}
                  />
                </div>
              )}

              {/* Scanning Frame Overlay */}
              {!scanSuccess && status === 'scanning' && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div
                    className={clsx(
                      'h-64 w-64 rounded-2xl border-4 border-primary-400',
                      !prefersReducedMotion && 'animate-pulse'
                    )}
                  />
                </div>
              )}
            </section>

            {/* Instructions */}
            <div className="mt-6 max-w-md text-center text-white/80">
              <p className="text-sm">{t('scanner.instructions')}</p>
            </div>

            {/* Torch Button */}
            {torchSupported && (
              <button
                type="button"
                onClick={handleTorchToggle}
                className="mt-4 flex items-center gap-2 rounded-lg bg-white/10 px-6 py-2 font-medium text-white transition-colors hover:bg-white/20"
              >
                {torchOn ? (
                  <>
                    <Zap className="h-5 w-5" />
                    <span>{t('scanner.torchOff')}</span>
                  </>
                ) : (
                  <>
                    <ZapOff className="h-5 w-5" />
                    <span>{t('scanner.torchOn')}</span>
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* Footer Tip */}
      <div className="bg-dark-900/50 p-4 text-center backdrop-blur">
        <p className="text-sm text-white/60">{t('scanner.tip')}</p>
      </div>
    </div>
  )
}

export default memo(QRScanner)
