import {
  type QRScanError,
  type QRScannerStatus,
  type QRScanResult,
  qrScanner,
} from '@lib/qr-scanner'
import { AlertCircle, Camera, CheckCircle2, X, Zap, ZapOff } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

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
export default function QRScanner({ onScan, onError, onClose }: QRScannerProps) {
  const { t } = useTranslation()
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
      qrScanner.teardown().catch((cleanupError) => console.error('Cleanup error:', cleanupError))
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
            console.log('QR Code scanned:', result.rawText)
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
              console.error('Scan error:', err.message)
            }
          }
        )

        setStatus('scanning')
      } catch (err: unknown) {
        const qrError = err as QRScanError
        console.error('Scanner initialization error:', qrError)

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
      console.error('Torch toggle error:', err)
    }
  }

  const handleClose = () => {
    cleanup()
  }

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-dark-900/50 backdrop-blur">
        <div className="flex items-center gap-3">
          <Camera className="w-6 h-6 text-primary-400" />
          <h2 className="text-lg font-semibold text-white">{t('scanner.scanQRCode')}</h2>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Scanner Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {error ? (
          <div className="flex flex-col items-center gap-4 text-center max-w-md">
            <AlertCircle className="w-16 h-16 text-red-500" />
            <p className="text-white text-lg">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
            >
              {t('common.retry')}
            </button>
          </div>
        ) : (
          <>
            {/* Video Container */}
            <div className="relative">
              <video
                ref={videoRef}
                className="rounded-2xl overflow-hidden shadow-2xl max-w-full"
                style={{ maxHeight: '60vh' }}
                autoPlay
                muted
                playsInline
                aria-hidden="true"
                tabIndex={-1}
              />

              {/* Scan Success Overlay */}
              {scanSuccess && (
                <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 rounded-2xl animate-fade-in">
                  <CheckCircle2 className="w-20 h-20 text-green-500 animate-bounce" />
                </div>
              )}

              {/* Scanning Frame Overlay */}
              {!scanSuccess && status === 'scanning' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-64 border-4 border-primary-400 rounded-2xl animate-pulse" />
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="mt-6 text-center text-white/80 max-w-md">
              <p className="text-sm">{t('scanner.instructions')}</p>
            </div>

            {/* Torch Button */}
            {torchSupported && (
              <button
                type="button"
                onClick={handleTorchToggle}
                className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {torchOn ? (
                  <>
                    <Zap className="w-5 h-5" />
                    <span>Ugasi Blic</span>
                  </>
                ) : (
                  <>
                    <ZapOff className="w-5 h-5" />
                    <span>Upali Blic</span>
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* Footer Tip */}
      <div className="p-4 bg-dark-900/50 backdrop-blur text-center">
        <p className="text-white/60 text-sm">{t('scanner.tip')}</p>
      </div>
    </div>
  )
}
