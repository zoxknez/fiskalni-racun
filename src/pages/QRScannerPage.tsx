/**
 * QR Scanner Page
 *
 * Simple QR code scanner for Serbian fiscal receipts (eRačun).
 * Scans QR, opens link, and optionally saves it for later reference.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageTransition } from '@/components/common/PageTransition'
import { useHaptic } from '@/hooks/useHaptic'
import { useSmoothNavigate } from '@/hooks/useSmoothNavigate'
import { useToast } from '@/hooks/useToast'
import { ArrowLeft, Bookmark, Camera, CameraOff, Check, ExternalLink, QrCode } from '@/lib/icons'
import { logger } from '@/lib/logger'
import { type SavedEReceipt, saveEReceiptLink } from '@/services/savedEReceiptsService'

// QR Scanner library - will be dynamically imported
type QrScannerType = typeof import('qr-scanner').default

function QRScannerPageComponent() {
  const { t } = useTranslation()
  const navigate = useSmoothNavigate()
  const toast = useToast()
  const { impactLight, notificationSuccess, notificationError } = useHaptic()

  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<InstanceType<QrScannerType> | null>(null)

  const [isScanning, setIsScanning] = useState(false)
  const [hasCamera, setHasCamera] = useState(true)
  const [scannedUrl, setScannedUrl] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  // Initialize scanner
  const startScanner = useCallback(async () => {
    if (!videoRef.current) return

    try {
      // Dynamic import of qr-scanner
      const QrScanner = (await import('qr-scanner')).default

      // Check camera availability
      const hasCamera = await QrScanner.hasCamera()
      if (!hasCamera) {
        setHasCamera(false)
        toast.error(t('qrScanner.noCamera'))
        return
      }

      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          const url = result.data
          // Validate it's a valid URL (Serbian fiscal receipts use suf.purs.gov.rs)
          if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            scanner.stop()
            setIsScanning(false)
            setScannedUrl(url)
            // Vibrate on success
            notificationSuccess()
          }
        },
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      )

      await scanner.start()
      scannerRef.current = scanner
      setIsScanning(true)
    } catch (error) {
      logger.error('Failed to start QR scanner:', error)
      setHasCamera(false)
      toast.error(t('qrScanner.cameraError'))
      notificationError()
    }
  }, [t, toast, notificationSuccess, notificationError])

  // Stop scanner
  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.stop()
      scannerRef.current.destroy()
      scannerRef.current = null
    }
    setIsScanning(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [stopScanner])

  // Open link in new tab
  const openLink = useCallback(() => {
    if (scannedUrl) {
      impactLight()
      window.open(scannedUrl, '_blank', 'noopener,noreferrer')
    }
  }, [scannedUrl, impactLight])

  // Save link for later
  const saveLink = useCallback(async () => {
    if (!scannedUrl) return

    setIsSaving(true)
    try {
      const savedReceipt: Omit<SavedEReceipt, 'id'> = {
        url: scannedUrl,
        scannedAt: new Date(),
        // merchantName not available from URL
      }

      await saveEReceiptLink(savedReceipt)
      setIsSaved(true)
      toast.success(t('qrScanner.linkSaved'))
      notificationSuccess()
    } catch (error) {
      logger.error('Failed to save e-receipt link:', error)
      toast.error(t('qrScanner.saveFailed'))
      notificationError()
    } finally {
      setIsSaving(false)
    }
  }, [scannedUrl, t, toast, notificationSuccess, notificationError])

  // Reset to scan again
  const scanAgain = useCallback(() => {
    setScannedUrl(null)
    setIsSaved(false)
    impactLight()
    startScanner()
  }, [startScanner, impactLight])

  return (
    <PageTransition className="flex min-h-screen flex-col bg-dark-900">
      {/* Header */}
      <header className="safe-area-top flex items-center justify-between bg-dark-800 p-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 rounded-lg p-2 text-white transition-colors hover:bg-dark-700"
          aria-label={t('common.back')}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-semibold text-lg text-white">{t('qrScanner.title')}</h1>
        <div className="w-9" /> {/* Spacer for centering */}
      </header>

      {/* Scanner Area */}
      <div className="relative flex flex-1 items-center justify-center bg-black">
        {!scannedUrl ? (
          <>
            {/* Video feed */}
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              playsInline
              muted
              aria-label={t('qrScanner.cameraFeed')}
            />

            {/* Scanning overlay */}
            {isScanning && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-64 w-64">
                  {/* Corner brackets */}
                  <div className="absolute top-0 left-0 h-8 w-8 rounded-tl-lg border-primary-500 border-t-4 border-l-4" />
                  <div className="absolute top-0 right-0 h-8 w-8 rounded-tr-lg border-primary-500 border-t-4 border-r-4" />
                  <div className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-lg border-primary-500 border-b-4 border-l-4" />
                  <div className="absolute right-0 bottom-0 h-8 w-8 rounded-br-lg border-primary-500 border-r-4 border-b-4" />

                  {/* Scanning line animation */}
                  <motion.div
                    className="absolute right-2 left-2 h-0.5 bg-gradient-to-r from-transparent via-primary-500 to-transparent"
                    animate={{ top: ['10%', '90%', '10%'] }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: 'easeInOut',
                    }}
                  />
                </div>
              </div>
            )}

            {/* No camera message */}
            {!hasCamera && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-900 p-8 text-center">
                <CameraOff className="mb-4 h-16 w-16 text-dark-500" />
                <p className="text-dark-300 text-lg">{t('qrScanner.noCamera')}</p>
              </div>
            )}

            {/* Start scanning button (if not yet started) */}
            {!isScanning && hasCamera && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-900/90 p-8">
                <QrCode className="mb-6 h-20 w-20 text-primary-500" />
                <h2 className="mb-2 font-bold text-white text-xl">{t('qrScanner.ready')}</h2>
                <p className="mb-8 max-w-xs text-center text-dark-400">
                  {t('qrScanner.instructions')}
                </p>
                <motion.button
                  type="button"
                  onClick={startScanner}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-3 rounded-xl bg-primary-500 px-8 py-4 font-semibold text-white shadow-lg shadow-primary-500/30"
                >
                  <Camera className="h-6 w-6" />
                  {t('qrScanner.startScan')}
                </motion.button>
              </div>
            )}
          </>
        ) : (
          /* Scanned Result */
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex w-full max-w-md flex-col items-center p-6"
            >
              {/* Success icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.1 }}
                className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500"
              >
                <Check className="h-10 w-10 text-white" />
              </motion.div>

              <h2 className="mb-2 font-bold text-white text-xl">{t('qrScanner.scanned')}</h2>
              <p className="mb-6 text-center text-dark-400">{t('qrScanner.scannedDescription')}</p>

              {/* URL preview */}
              <div className="mb-6 w-full rounded-lg bg-dark-800 p-4">
                <p className="break-all text-dark-300 text-sm">{scannedUrl}</p>
              </div>

              {/* Action buttons */}
              <div className="flex w-full flex-col gap-3">
                {/* Open link */}
                <motion.button
                  type="button"
                  onClick={openLink}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex w-full items-center justify-center gap-3 rounded-xl bg-primary-500 py-4 font-semibold text-white shadow-lg"
                >
                  <ExternalLink className="h-5 w-5" />
                  {t('qrScanner.openLink')}
                </motion.button>

                {/* Save link */}
                <motion.button
                  type="button"
                  onClick={saveLink}
                  disabled={isSaving || isSaved}
                  whileHover={{ scale: isSaved ? 1 : 1.02 }}
                  whileTap={{ scale: isSaved ? 1 : 0.98 }}
                  className={`flex w-full items-center justify-center gap-3 rounded-xl py-4 font-semibold transition-colors ${
                    isSaved
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-dark-700 text-white hover:bg-dark-600'
                  }`}
                >
                  {isSaved ? (
                    <>
                      <Check className="h-5 w-5" />
                      {t('qrScanner.saved')}
                    </>
                  ) : (
                    <>
                      <Bookmark className="h-5 w-5" />
                      {isSaving ? t('addDevice.saving') : t('qrScanner.saveLink')}
                    </>
                  )}
                </motion.button>

                {/* Scan again */}
                <motion.button
                  type="button"
                  onClick={scanAgain}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-dark-600 py-4 font-semibold text-dark-300 hover:bg-dark-800"
                >
                  <QrCode className="h-5 w-5" />
                  {t('qrScanner.scanAgain')}
                </motion.button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Footer hint when scanning */}
      {isScanning && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="safe-area-bottom bg-dark-800 p-4 text-center"
        >
          <p className="text-dark-400 text-sm">{t('qrScanner.hint')}</p>
        </motion.div>
      )}
    </PageTransition>
  )
}

export const QRScannerPage = memo(QRScannerPageComponent)
export default QRScannerPage
