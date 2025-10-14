import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'
import { Camera, X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface QRScannerProps {
  onScan: (data: string) => void
  onError: (error: string) => void
  onClose: () => void
}

/**
 * Savršeni QR Scanner sa:
 * - Camera permission handling
 * - Multi-camera support (front/back)
 * - Real-time scanning feedback
 * - Error recovery
 * - Smooth animations
 */
export default function QRScanner({ onScan, onError, onClose }: QRScannerProps) {
  const { t } = useTranslation()
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [scanSuccess, setScanSuccess] = useState(false)

  // Request camera permission and get available cameras
  useEffect(() => {
    const requestCameraPermission = async () => {
      try {
        // First, explicitly request camera permission
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } // Request back camera
        })
        
        // Permission granted! Stop the stream immediately
        stream.getTracks().forEach(track => track.stop())
        
        // Now get the list of cameras
        const devices = await Html5Qrcode.getCameras()
        
        if (devices && devices.length > 0) {
          setCameras(devices)
          // Prefer back camera on mobile
          const backCamera = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear')
          )
          setSelectedCamera(backCamera?.id || devices[0].id)
        } else {
          setError(t('scanner.noCameraFound'))
          onError(t('scanner.noCameraFound'))
        }
      } catch (err: any) {
        console.error('Camera permission error:', err)
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError(t('scanner.cameraAccessDenied'))
          onError(t('scanner.cameraAccessDenied'))
        } else if (err.name === 'NotFoundError') {
          setError(t('scanner.noCameraFound'))
          onError(t('scanner.noCameraFound'))
        } else {
          setError(t('scanner.startFailed'))
          onError(t('scanner.startFailed'))
        }
      }
    }

    requestCameraPermission()

    return () => {
      stopScanner()
    }
  }, [])

  // Start scanning when camera is selected
  useEffect(() => {
    if (selectedCamera && !isScanning) {
      startScanner()
    }
  }, [selectedCamera])

  const startScanner = async () => {
    if (!selectedCamera || isScanning) return

    try {
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner

      await scanner.start(
        selectedCamera,
        {
          fps: 10, // Scanning frequency
          qrbox: { width: 250, height: 250 }, // Scanning box size
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Success callback
          console.log('QR Code scanned:', decodedText)
          setScanSuccess(true)
          
          // Small delay for visual feedback
          setTimeout(() => {
            onScan(decodedText)
            stopScanner()
          }, 500)
        },
        () => {
          // Error callback (called frequently during scanning, ignore)
        }
      )

      setIsScanning(true)
      setError('')
    } catch (err: any) {
      console.error('Scanner start error:', err)
      setError(err.message || t('scanner.startFailed'))
      onError(err.message || t('scanner.startFailed'))
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch (err) {
        console.error('Scanner stop error:', err)
      }
    }
    setIsScanning(false)
  }

  const handleCameraSwitch = async () => {
    const currentIndex = cameras.findIndex(c => c.id === selectedCamera)
    const nextIndex = (currentIndex + 1) % cameras.length
    
    await stopScanner()
    setSelectedCamera(cameras[nextIndex].id)
  }

  const handleClose = async () => {
    await stopScanner()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-dark-900/50 backdrop-blur">
        <div className="flex items-center gap-3">
          <Camera className="w-6 h-6 text-primary-400" />
          <h2 className="text-lg font-semibold text-white">
            {t('scanner.scanQRCode')}
          </h2>
        </div>
        
        <button
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
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
            >
              {t('common.retry')}
            </button>
          </div>
        ) : (
          <>
            {/* QR Code Scanner Container */}
            <div className="relative">
              <div 
                id="qr-reader" 
                className="rounded-2xl overflow-hidden shadow-2xl"
              />
              
              {/* Success Overlay */}
              {scanSuccess && (
                <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 rounded-2xl animate-fade-in">
                  <CheckCircle2 className="w-20 h-20 text-green-500 animate-bounce" />
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="mt-6 text-center text-white/80 max-w-md">
              <p className="text-sm">
                {t('scanner.instructions')}
              </p>
            </div>

            {/* Camera Switch Button */}
            {cameras.length > 1 && (
              <button
                onClick={handleCameraSwitch}
                disabled={!isScanning}
                className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('scanner.switchCamera')}
              </button>
            )}
          </>
        )}
      </div>

      {/* Footer Tip */}
      <div className="p-4 bg-dark-900/50 backdrop-blur text-center">
        <p className="text-white/60 text-sm">
          {t('scanner.tip')}
        </p>
      </div>
    </div>
  )
}
