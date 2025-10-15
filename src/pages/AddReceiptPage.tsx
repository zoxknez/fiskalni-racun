import { type OCRResult, runOCR } from '@lib/ocr'
import { motion } from 'framer-motion'
import { ArrowLeft, Camera, Loader2, PenSquare, QrCode, Sparkles } from 'lucide-react'
import * as React from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageTransition } from '@/components/common/PageTransition'
import QRScanner from '@/components/scanner/QRScanner'
import { addReceipt } from '@/hooks/useDatabase'
import { categoryOptions, classifyCategory, track } from '@/lib'
import { parseQRCode } from '@/lib/fiscalQRParser'

export default function AddReceiptPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const initialMode = (searchParams.get('mode') as 'qr' | 'photo' | 'manual') || 'qr'
  const [mode, setMode] = React.useState<'qr' | 'photo' | 'manual'>(initialMode)
  const [loading, setLoading] = React.useState(false)

  // NEW: QR modal kontrola
  const [showQRScanner, setShowQRScanner] = React.useState(false)

  // NEW: OCR state
  const [ocrProcessing, setOcrProcessing] = React.useState(false)
  const [ocrResult, setOcrResult] = React.useState<OCRResult | null>(null)
  const [selectedImage, setSelectedImage] = React.useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Cleanup image preview URL on unmount
  React.useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
    }
  }, [imagePreviewUrl])

  // Form state
  const [merchantName, setMerchantName] = React.useState('')
  const [pib, setPib] = React.useState('')
  const [date, setDate] = React.useState(new Date().toISOString().split('T')[0])
  const [time, setTime] = React.useState(new Date().toTimeString().slice(0, 5))
  const [amount, setAmount] = React.useState('')
  const [category, setCategory] = React.useState('hrana')
  const [notes, setNotes] = React.useState('')

  // Use categories from lib/categories.ts with i18n support
  const categories = React.useMemo(() => {
    const locale = i18n.language === 'sr' ? 'sr-Latn' : 'en'
    return categoryOptions(locale)
  }, [i18n.language])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!merchantName || !date || !amount || !pib) {
      toast.error(t('addReceipt.requiredFields'))
      return
    }

    setLoading(true)
    try {
      await addReceipt({
        merchantName,
        pib,
        date: new Date(date),
        time,
        totalAmount: Number.parseFloat(amount),
        category,
        notes: notes || undefined,
      })

      // Analytics tracking
      track('receipt_add_manual_success', {
        category,
        amount: Number.parseFloat(amount),
      })

      toast.success(t('addReceipt.success'))
      navigate('/receipts')
    } catch (error) {
      console.error('Add receipt error:', error)
      toast.error(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  // NEW: zamenjuje stari handleScanQR
  const handleQRScan = (qrData: string) => {
    try {
      // Analytics: QR scan started
      track('receipt_add_qr_start')

      // 1) Log
      // console.log('QR Scanned:', qrData)

      // 2) Parsiranje QR sadržaja → polja
      const parsed = parseQRCode(qrData)

      if (parsed) {
        setMerchantName(parsed.merchantName)
        setPib(parsed.pib)
        setDate(parsed.date.toISOString().split('T')[0])
        setTime(parsed.time)
        setAmount(parsed.totalAmount.toString())

        // Auto-categorization based on merchant name
        const autoCategory = classifyCategory({ merchantName: parsed.merchantName })
        setCategory(autoCategory)

        // Analytics: QR scan success
        track('receipt_add_qr_success', {
          merchantName: parsed.merchantName,
          amount: parsed.totalAmount,
          autoCategory,
        })

        toast.success(t('addReceipt.qrScanned'))
        setShowQRScanner(false)
        setMode('manual') // pregled/izmena pre snimanja
      } else {
        track('receipt_add_qr_fail', { reason: 'parse_error' })
        toast.error(t('addReceipt.qrNotRecognized'))
        setShowQRScanner(false)
        setMode('manual')
      }
    } catch (err) {
      console.error('QR parse error:', err)
      toast.error(t('common.error'))
      setShowQRScanner(false)
      setMode('manual')
    }
  }

  // NEW: error handler iz skenera
  const handleScanError = (error: string) => {
    console.error('QR Scan error:', error)
    toast.error(error)
  }

  // OCR: Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate image type
    if (!file.type.startsWith('image/')) {
      toast.error('Molimo odaberite sliku')
      return
    }

    // Cleanup previous preview URL
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
    }

    // Create new preview URL
    const previewUrl = URL.createObjectURL(file)
    setImagePreviewUrl(previewUrl)
    setSelectedImage(file)
    setOcrProcessing(true)
    setOcrResult(null)

    try {
      track('receipt_add_photo_start', { fileSize: file.size })

      // Run OCR
      const result = await runOCR(file, {
        languages: 'srp+eng',
        enhance: true,
        dpi: 300,
      })

      setOcrResult(result)
      track('receipt_add_photo_success', { fieldsFound: result.fields.length })

      // Auto-fill form with OCR results
      let detectedMerchant = ''

      result.fields.forEach((field) => {
        switch (field.label) {
          case 'prodavac':
            detectedMerchant = field.value
            setMerchantName(field.value)
            break
          case 'pib':
            setPib(field.value)
            break
          case 'datum':
            setDate(field.value)
            break
          case 'vreme':
            setTime(field.value)
            break
          case 'ukupno': {
            // Extract numeric value from amount string
            const numericAmount = field.value.replace(/[^\d.,]/g, '').replace(',', '.')
            setAmount(numericAmount)
            break
          }
          case 'qrLink':
            setNotes((prev) =>
              prev ? `${prev}\n\nQR Link: ${field.value}` : `QR Link: ${field.value}`
            )
            break
        }
      })

      // Auto-classify category based on detected merchant name
      if (detectedMerchant) {
        const autoCategory = classifyCategory(detectedMerchant)
        setCategory(autoCategory)
      }

      toast.success(`✨ Pronađeno ${result.fields.length} polja!`)

      // Switch to manual mode to review/edit
      setMode('manual')
    } catch (error) {
      console.error('OCR error:', error)
      track('receipt_add_photo_fail', { error: String(error) })
      toast.error('Greška pri skeniranju. Pokušajte ponovo.')
    } finally {
      setOcrProcessing(false)
    }
  }

  // OCR: Trigger file input
  const handleTakePhoto = () => {
    fileInputRef.current?.click()
  }

  return (
    <PageTransition className="space-y-6 pb-8">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-purple-900 p-6 sm:p-8 text-white shadow-2xl"
      >
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle at 25px 25px, white 2%, transparent 0%), radial-gradient(circle at 75px 75px, white 2%, transparent 0%)',
              backgroundSize: '100px 100px',
            }}
          />
        </div>

        {/* Floating Orbs */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
          className="absolute -top-24 -right-24 w-96 h-96 bg-white/20 rounded-full blur-3xl"
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="p-2 bg-white/10 backdrop-blur-sm rounded-xl">
              <PenSquare className="w-6 h-6" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black">{t('addReceipt.title')}</h1>
          </div>
        </div>
      </motion.div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Mode Tabs */}
        <div className="flex gap-2 bg-dark-100 dark:bg-dark-800 p-1 rounded-lg">
          {[
            { key: 'qr', icon: QrCode, label: t('addReceipt.scanQR') },
            { key: 'photo', icon: Camera, label: t('addReceipt.photo') },
            { key: 'manual', icon: PenSquare, label: t('addReceipt.manual') },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key as 'qr' | 'photo' | 'manual')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                mode === key
                  ? 'bg-white dark:bg-dark-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-dark-600 dark:text-dark-400 hover:text-dark-900 dark:hover:text-dark-200'
              }`}
              aria-label={label}
              aria-pressed={mode === key}
            >
              <Icon className="w-5 h-5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* QR Mode */}
        {mode === 'qr' && (
          <div className="card">
            <div className="empty-state">
              <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
                <QrCode className="w-10 h-10 text-primary-600 dark:text-primary-400" />
              </div>
              <p className="text-dark-600 dark:text-dark-400 mb-4">{t('addReceipt.scanningQR')}</p>

              {/* NEW: otvori modal sa skenerom */}
              <button type="button" onClick={() => setShowQRScanner(true)} className="btn-primary">
                {t('addReceipt.startScanning')}
              </button>
            </div>
          </div>
        )}

        {/* Photo Mode - OCR */}
        {mode === 'photo' && (
          <div className="card">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
              capture="environment"
              multiple={false}
              onChange={handleImageUpload}
              className="hidden"
              aria-label="Upload receipt image"
            />

            {ocrProcessing ? (
              // Processing state
              <div className="empty-state">
                <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4 animate-pulse">
                  <Loader2 className="w-10 h-10 text-primary-600 dark:text-primary-400 animate-spin" />
                </div>
                <h3 className="text-lg font-semibold text-dark-900 dark:text-dark-50 mb-2">
                  Skeniranje u toku...
                </h3>
                <p className="text-sm text-dark-600 dark:text-dark-400">
                  AI čita račun. Ovo može potrajati 10-30 sekundi.
                </p>
              </div>
            ) : selectedImage && ocrResult ? (
              // Success state with preview
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <Sparkles className="w-6 h-6 text-green-600 dark:text-green-400" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-green-900 dark:text-green-100">
                      Skeniranje uspešno!
                    </h3>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      Pronađeno {ocrResult.fields.length} polja. Proverite podatke ispod.
                    </p>
                  </div>
                </div>

                {/* Image preview */}
                <div className="relative rounded-lg overflow-hidden border border-dark-200 dark:border-dark-700">
                  {imagePreviewUrl && (
                    <img
                      src={imagePreviewUrl}
                      alt="Receipt preview"
                      className="w-full h-auto max-h-64 object-contain bg-dark-50 dark:bg-dark-900"
                    />
                  )}
                </div>

                {/* OCR Fields Found */}
                {ocrResult.fields.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-dark-700 dark:text-dark-300">
                      Pronađeni podaci:
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {ocrResult.fields.map((field, index) => (
                        <div
                          key={index}
                          className="p-2 bg-dark-50 dark:bg-dark-800 rounded-lg text-xs"
                        >
                          <span className="text-dark-500 dark:text-dark-400 capitalize">
                            {field.label}:
                          </span>
                          <span className="ml-1 font-medium text-dark-900 dark:text-dark-50">
                            {field.value}
                          </span>
                          <span className="ml-1 text-dark-400 dark:text-dark-500">
                            ({Math.round(field.confidence * 100)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button type="button" onClick={handleTakePhoto} className="btn btn-secondary flex-1">
                    <Camera className="w-4 h-4" />
                    Nova slika
                  </button>
                  <button type="button" onClick={() => setMode('manual')} className="btn btn-primary flex-1">
                    Nastavi →
                  </button>
                </div>
              </div>
            ) : (
              // Initial state
              <div className="empty-state">
                <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
                  <Camera className="w-10 h-10 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold text-dark-900 dark:text-dark-50 mb-2">
                  Skeniraj račun
                </h3>
                <p className="text-sm text-dark-600 dark:text-dark-400 mb-6">
                  Uslikaj račun i AI će automatski pročitati podatke
                </p>
                <button type="button" onClick={handleTakePhoto} className="btn-primary flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Fotografiši račun
                </button>
              </div>
            )}
          </div>
        )}

        {/* Manual Mode */}
        {mode === 'manual' && (
          <form onSubmit={handleSubmit} className="card space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                {t('addReceipt.vendorRequired')}
              </label>
              <input
                type="text"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                className="input"
                placeholder="Maxi, Idea, Tehnomanija..."
                required
                minLength={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                PIB {t('common.required')}
              </label>
              <input
                type="text"
                value={pib}
                onChange={(e) => setPib(e.target.value)}
                className="input"
                placeholder="123456789"
                required
                inputMode="numeric"
                minLength={8}
                maxLength={9}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                  {t('addReceipt.dateRequired')}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input"
                  required
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                  {t('receiptDetail.time')}
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                {t('addReceipt.amountRequired')}
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input"
                required
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                {t('addReceipt.selectCategory')}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input"
              >
                <option value="">—</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                {t('receiptDetail.notes')}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input min-h-[100px] resize-y"
                placeholder={t('addReceipt.addNote')}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn-secondary flex-1"
                disabled={loading}
              >
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={loading}>
                {loading ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </form>
        )}

        {/* NEW: QR Scanner Modal */}
        {showQRScanner && (
          <QRScanner
            onScan={handleQRScan}
            onError={handleScanError}
            onClose={() => setShowQRScanner(false)}
          />
        )}
      </div>
    </PageTransition>
  )
}
