import type { OCRField } from '@lib/ocr'
import { motion } from 'framer-motion'
import { ArrowLeft, Camera, Loader2, PenSquare, QrCode, Sparkles } from 'lucide-react'
import * as React from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageTransition } from '@/components/common/PageTransition'
import QRScanner from '@/components/scanner/QRScanner'
import { addReceipt } from '@/hooks/useDatabase'
import { useOCR } from '@/hooks/useOCR'
import { categoryOptions, classifyCategory, track } from '@/lib'
import { parseQRCode } from '@/lib/fiscalQRParser'

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
const sanitizeAmountInput = (raw: string) => {
  // allow comma or dot, strip others
  let normalized = raw.replace(/,/g, '.').replace(/[^\d.]/g, '')
  // prevent multiple dots
  const parts = normalized.split('.')
  normalized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : normalized
  // handle leading dot => 0.xx
  if (normalized.startsWith('.')) normalized = `0${normalized}`
  return normalized
}

const normalizeDate = (raw: string) => {
  // returns "YYYY-MM-DD" or original if already valid
  const isoLike = /^\d{4}-\d{2}-\d{2}$/
  if (isoLike.test(raw)) return raw
  const m = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/)
  if (!m) return raw
  const [_, d = '', mo = '', y = ''] = m
  const dd = d.padStart(2, '0')
  const mm = mo.padStart(2, '0')
  return `${y}-${mm}-${dd}`
}

const normalizeTime = (raw: string) => {
  // returns "HH:MM"
  const hhmm = raw.match(/^(\d{1,2}):(\d{2})/)
  if (!hhmm) return raw
  const hh = String(Math.min(23, Number(hhmm[1]))).padStart(2, '0')
  const mm = String(Math.min(59, Number(hhmm[2]))).padStart(2, '0')
  return `${hh}:${mm}`
}

const isValidPib = (raw: string) => /^\d{9}$/.test(raw)

// ──────────────────────────────────────────────────────────────────────────────

export default function AddReceiptPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Mode
  const initialMode = (searchParams.get('mode') as 'qr' | 'photo' | 'manual') || 'qr'
  const [mode, setMode] = React.useState<'qr' | 'photo' | 'manual'>(initialMode)
  const [loading, setLoading] = React.useState(false)

  // Keep mode in URL (refresh safe)
  const setModeAndUrl = (m: 'qr' | 'photo' | 'manual') => {
    setMode(m)
    const params = new URLSearchParams(searchParams)
    params.set('mode', m)
    navigate({ search: params.toString() }, { replace: true })
  }

  // QR modal kontrola
  const [showQRScanner, setShowQRScanner] = React.useState(false)

  // OCR state
  const {
    processImage,
    cancel: cancelOcr,
    reset: resetOcr,
    isProcessing: ocrProcessing,
    result: ocrResult,
    error: ocrError,
  } = useOCR()
  const [selectedImage, setSelectedImage] = React.useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const lastOcrErrorRef = React.useRef<string | null>(null)

  // Cleanup image preview URL on unmount
  React.useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    }
  }, [imagePreviewUrl])

  React.useEffect(() => {
    lastOcrErrorRef.current = ocrError
  }, [ocrError])

  React.useEffect(() => {
    return () => {
      cancelOcr()
    }
  }, [cancelOcr])

  // Form state
  const [merchantName, setMerchantName] = React.useState('')
  const [pib, setPib] = React.useState('')
  const [date, setDate] = React.useState(() => new Date().toISOString().split('T')[0])
  const [time, setTime] = React.useState(() => new Date().toTimeString().slice(0, 5))
  const [amount, setAmount] = React.useState('')
  const [category, setCategory] = React.useState('')
  const [notes, setNotes] = React.useState('')

  // Track if user manually changed category (so autos won't override)
  const [userEditedCategory, setUserEditedCategory] = React.useState(false)

  type CategoryOption = { value: string; label: string }
  // Use categories from lib/categories.ts with i18n support
  const categories = React.useMemo<CategoryOption[]>(() => {
    const locale = i18n.language === 'sr' ? 'sr-Latn' : 'en'
    return categoryOptions(locale)
  }, [i18n.language])

  // If default category empty, prefill with first available option
  React.useEffect(() => {
    const firstCategory = categories[0]
    if (!category && firstCategory) {
      setCategory(firstCategory.value)
    }
  }, [categories, category])

  const idPrefix = React.useId()
  const sanitizedIdPrefix = React.useMemo(
    () => idPrefix.replace(/[^a-zA-Z0-9_-]/g, '') || 'receipt',
    [idPrefix]
  )
  const fieldIds = React.useMemo(
    () => ({
      merchant: `${sanitizedIdPrefix}-merchant`,
      pib: `${sanitizedIdPrefix}-pib`,
      date: `${sanitizedIdPrefix}-date`,
      time: `${sanitizedIdPrefix}-time`,
      amount: `${sanitizedIdPrefix}-amount`,
      category: `${sanitizedIdPrefix}-category`,
      notes: `${sanitizedIdPrefix}-notes`,
      pibHelp: `${sanitizedIdPrefix}-pib-help`,
    }),
    [sanitizedIdPrefix]
  )

  // Derived validity + submit
  const parsedAmount = Number.parseFloat(sanitizeAmountInput(amount))
  const canSave =
    !!merchantName && !!date && isValidPib(pib) && !Number.isNaN(parsedAmount) && !!category

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      const amt = Number.parseFloat(sanitizeAmountInput(amount))
      if (!merchantName || !date || Number.isNaN(amt) || !isValidPib(pib) || !category) {
        toast.error(t('addReceipt.requiredFields'))
        return
      }

      setLoading(true)
      try {
        const receiptPayload: Parameters<typeof addReceipt>[0] = {
          merchantName,
          pib,
          date: new Date(date),
          time,
          totalAmount: amt,
          category,
          ...(notes ? { notes } : {}),
        }

        await addReceipt(receiptPayload)

        // Analytics tracking
        track('receipt_add_manual_success', { category, amount: amt })

        toast.success(t('addReceipt.success'))
        navigate('/receipts')
      } catch (error) {
        console.error('Add receipt error:', error)
        const errorMessage = error instanceof Error ? error.message : t('common.error')
        toast.error(`${t('common.error')}: ${String(errorMessage)}`)
      } finally {
        setLoading(false)
      }
    },
    [amount, category, date, merchantName, navigate, notes, pib, t, time]
  )

  // QR scan handler
  const handleQRScan = React.useCallback(
    (qrData: string) => {
      try {
        track('receipt_add_qr_start')
        const parsed = parseQRCode(qrData)

        if (parsed) {
          setMerchantName(parsed.merchantName)
          setPib(parsed.pib.replace(/\D/g, '').slice(0, 9))
          setDate(parsed.date ? parsed.date.toISOString().split('T')[0] : date)
          setTime(parsed.time ? normalizeTime(parsed.time) : time)
          setAmount(String(parsed.totalAmount))

          const autoCategory = classifyCategory({ merchantName: parsed.merchantName })
          if (!userEditedCategory) setCategory(autoCategory)

          track('receipt_add_qr_success', {
            merchantName: parsed.merchantName,
            amount: parsed.totalAmount,
            autoCategory,
          })

          toast.success(t('addReceipt.qrScanned'))
          setShowQRScanner(false)
          setModeAndUrl('manual') // review & save
        } else {
          track('receipt_add_qr_fail', { reason: 'parse_error' })
          toast.error(t('addReceipt.qrNotRecognized'))
          setShowQRScanner(false)
          setModeAndUrl('manual')
        }
      } catch (err) {
        console.error('QR parse error:', err)
        toast.error(t('common.error'))
        setShowQRScanner(false)
        setModeAndUrl('manual')
      }
    },
    [date, time, t, userEditedCategory]
  )

  const handleScanError = React.useCallback((error: string) => {
    console.error('QR Scan error:', error)
    toast.error(error)
  }, [])

  // OCR: Handle image upload
  const handleImageUpload = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      if (!file.type.startsWith('image/')) {
        toast.error(t('common.error'))
        return
      }

      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)

      const previewUrl = URL.createObjectURL(file)
      setImagePreviewUrl(previewUrl)
      setSelectedImage(file)
      resetOcr()

      try {
        track('receipt_add_photo_start', { fileSize: file.size })
        const result = await processImage(file)
        if (!result) {
          const errorMessage = lastOcrErrorRef.current ?? t('common.error')
          track('receipt_add_photo_fail', { error: errorMessage })
          toast.error(String(errorMessage))
          setModeAndUrl('manual')
          return
        }

        track('receipt_add_photo_success', { fieldsFound: result.fields.length })

        let detectedMerchant = ''
        result.fields.forEach((field: OCRField) => {
          switch (field.label) {
            case 'prodavac':
              detectedMerchant = field.value
              setMerchantName(field.value)
              break
            case 'pib':
              setPib(field.value.replace(/\D/g, '').slice(0, 9))
              break
            case 'datum':
              setDate(normalizeDate(field.value))
              break
            case 'vreme':
              setTime(normalizeTime(field.value))
              break
            case 'ukupno': {
              const numericAmount = sanitizeAmountInput(field.value)
              setAmount(numericAmount)
              break
            }
            case 'qrLink': {
              const label = t('receiptDetail.qrLink', { defaultValue: 'QR Link' })
              setNotes((prev) => (prev ? `${prev}\n\n${label}: ${field.value}` : `${label}: ${field.value}`))
              break
            }
          }
        })

        if (detectedMerchant) {
          const autoCategory = classifyCategory({ merchantName: detectedMerchant })
          if (!userEditedCategory) setCategory(autoCategory)
        }

        toast.success(t('common.success'))
        setModeAndUrl('manual')
      } catch (error) {
        console.error('OCR error:', error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        track('receipt_add_photo_fail', { error: errorMessage })
        toast.error(t('common.error'))
      } finally {
        // allow selecting the same file again
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [imagePreviewUrl, processImage, resetOcr, t, userEditedCategory]
  )

  const handleTakePhoto = React.useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // Prevent wheel changing number input value (UX)
  const preventNumberScroll = (e: React.WheelEvent<HTMLInputElement>) =>
    (e.currentTarget as HTMLInputElement).blur()

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
              aria-label={t('common.back')}
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
        <div
          className="flex gap-2 bg-dark-100 dark:bg-dark-800 p-1 rounded-lg"
          role="tablist"
          aria-label="Add receipt modes"
        >
          {[
            { key: 'qr', icon: QrCode, label: t('addReceipt.scanQR') },
            { key: 'photo', icon: Camera, label: t('addReceipt.photo') },
            { key: 'manual', icon: PenSquare, label: t('addReceipt.manual') },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setModeAndUrl(key as 'qr' | 'photo' | 'manual')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                mode === key
                  ? 'bg-white dark:bg-dark-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-dark-600 dark:text-dark-400 hover:text-dark-900 dark:hover:text-dark-200'
              }`}
              aria-label={label}
              aria-pressed={mode === key}
              role="tab"
              aria-selected={mode === key}
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
              <button
                type="button"
                onClick={() => setShowQRScanner(true)}
                className="btn-primary"
              >
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
              aria-label={t('addReceipt.photo')}
            />

            {ocrProcessing ? (
              <div className="empty-state" aria-live="polite">
                <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4 animate-pulse">
                  <Loader2 className="w-10 h-10 text-primary-600 dark:text-primary-400 animate-spin" />
                </div>
                <h3 className="text-lg font-semibold text-dark-900 dark:text-dark-50 mb-2">
                  {t('addReceipt.processingOCR')}
                </h3>
                <p className="text-sm text-dark-600 dark:text-dark-400">{t('common.loading')}</p>
              </div>
            ) : selectedImage && ocrResult ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <Sparkles className="w-6 h-6 text-green-600 dark:text-green-400" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-green-900 dark:text-green-100">
                      {t('common.success')}
                    </h3>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      {t('analytics.statsCount')}: {ocrResult.fields.length}
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
                      {t('receiptDetail.items')}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ocrResult.fields.map((field: OCRField) => (
                        <div
                          key={`${field.label}-${field.value}`}
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

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleTakePhoto}
                    className="btn btn-secondary flex-1"
                  >
                    <Camera className="w-4 h-4" /> {t('addReceipt.photo')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModeAndUrl('manual')}
                    className="btn btn-primary flex-1"
                  >
                    {t('common.next')} →
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
                  <Camera className="w-10 h-10 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold text-dark-900 dark:text-dark-50 mb-2">
                  {t('addReceipt.photo')}
                </h3>
                <p className="text-sm text-dark-600 dark:text-dark-400 mb-6">
                  {t('addReceipt.processingOCR')}
                </p>
                <button
                  type="button"
                  onClick={handleTakePhoto}
                  className="btn-primary flex items-center gap-2"
                >
                  <Camera className="w-5 h-5" /> {t('addReceipt.photo')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Manual Mode */}
        {mode === 'manual' && (
          <form onSubmit={handleSubmit} className="card space-y-4" noValidate>
            <div>
              <label
                htmlFor={fieldIds.merchant}
                className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2"
              >
                {t('addReceipt.vendorRequired')}
              </label>
              <input
                id={fieldIds.merchant}
                type="text"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                className="input"
                placeholder="Maxi, Idea, Tehnomanija..."
                required
                minLength={2}
                autoComplete="organization"
              />
            </div>

            <div>
              <label
                htmlFor={fieldIds.pib}
                className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2"
              >
                PIB {t('common.required')}
              </label>
              <input
                id={fieldIds.pib}
                type="text"
                value={pib}
                onChange={(e) => setPib(e.target.value.replace(/\D/g, '').slice(0, 9))}
                className="input"
                placeholder="123456789"
                required
                inputMode="numeric"
                pattern="^\d{9}$"
                minLength={9}
                maxLength={9}
                autoComplete="off"
                aria-describedby={fieldIds.pibHelp}
                aria-invalid={pib !== '' && !isValidPib(pib)}
              />
              <p id={fieldIds.pibHelp} className="mt-1 text-xs text-dark-500">
                {t('addReceipt.pibHelp', { defaultValue: 'Unesite 9 cifara (bez razmaka i znakova).' })}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor={fieldIds.date}
                  className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2"
                >
                  {t('addReceipt.dateRequired')}
                </label>
                <input
                  id={fieldIds.date}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input"
                  required
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label
                  htmlFor={fieldIds.time}
                  className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2"
                >
                  {t('receiptDetail.time')}
                </label>
                <input
                  id={fieldIds.time}
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor={fieldIds.amount}
                className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2"
              >
                {t('addReceipt.amountRequired')}
              </label>
              <input
                id={fieldIds.amount}
                type="number"
                value={amount}
                onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))}
                onWheel={preventNumberScroll}
                className="input"
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                inputMode="decimal"
              />
            </div>

            <div>
              <label
                htmlFor={fieldIds.category}
                className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2"
              >
                {t('addReceipt.selectCategory')}
              </label>
              <select
                id={fieldIds.category}
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value)
                  setUserEditedCategory(true)
                }}
                className="input"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor={fieldIds.notes}
                className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2"
              >
                {t('receiptDetail.notes')}
              </label>
              <textarea
                id={fieldIds.notes}
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
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={loading || !canSave}
              >
                {loading ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </form>
        )}

        {/* QR Scanner Modal */}
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
