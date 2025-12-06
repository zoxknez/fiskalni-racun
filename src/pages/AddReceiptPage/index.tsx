import { track } from '@lib/analytics'
import { classifyCategory } from '@lib/categories'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, PenSquare } from 'lucide-react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageTransition } from '@/components/common/PageTransition'
import QRScanner from '@/components/scanner/QRScanner'
import { addHouseholdBill, addReceipt } from '@/hooks/useDatabase'
import { useOCR } from '@/hooks/useOCR'
import { parseQRCode } from '@/lib/fiscalQRParser'
import { logger } from '@/lib/logger'
import {
  FiscalReceiptForm,
  HouseholdBillForm,
  ManualTypeSelector,
  ModeSelector,
  OCRPreview,
  PhotoUploadPrompt,
  QRScanPrompt,
} from './components'
import { useFiscalReceiptForm } from './hooks/useFiscalReceiptForm'
import { useHouseholdBillForm } from './hooks/useHouseholdBillForm'
import { useReceiptFormMode } from './hooks/useReceiptFormMode'
import { normalizeDate, normalizeTime, sanitizeAmountInput } from './utils/formatters'

function AddReceiptPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const prefersReducedMotion = useReducedMotion()

  // Mode management
  const { mode, manualType, loading, setMode, setManualType, setLoading } = useReceiptFormMode()

  // Fiscal receipt form
  const {
    formData: fiscalData,
    errors: fiscalErrors,
    isValid: fiscalValid,
    updateField: updateFiscalField,
    updateMultipleFields: updateFiscalMultiple,
    userEditedCategory,
  } = useFiscalReceiptForm()

  const [userCategoryEdited, setUserCategoryEdited] = useState(userEditedCategory)

  // Household bill form
  const {
    formData: householdData,
    errors: householdErrors,
    isValid: householdValid,
    updateField: updateHouseholdField,
  } = useHouseholdBillForm()

  // OCR integration
  const {
    processImage,
    cancel: cancelOcr,
    reset: resetOcr,
    isProcessing: ocrProcessing,
    result: ocrResult,
    error: ocrError,
  } = useOCR()

  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [shareNotice, setShareNotice] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastOcrErrorRef = useRef<string | null>(null)

  // QR Scanner
  const [showQRScanner, setShowQRScanner] = useState(false)

  // Handle Web Share Target payload (title/text/url/file cached by SW)
  useEffect(() => {
    const source = searchParams.get('source')
    if (source !== 'share-target') return

    const title = searchParams.get('title')
    const text = searchParams.get('text')
    const sharedUrl = searchParams.get('url')
    const fileKey = searchParams.get('file')

    if (!fiscalData.notes) {
      const parts = [title, text, sharedUrl].filter(Boolean)
      if (parts.length > 0) {
        updateFiscalField('notes', parts.join('\n'))
      }
    }

    const loadFileFromCache = async () => {
      if (!fileKey) return
      if (!('caches' in window)) return
      try {
        const cache = await caches.open('shared-media')
        const res = await cache.match(fileKey)
        if (!res) return
        const blob = await res.blob()
        const fallbackName = fileKey.split('/').pop() || 'shared-file'
        const filename = res.headers.get('x-filename') || fallbackName
        if (blob.type && !blob.type.startsWith('image/')) {
          const note = `${t('addReceipt.sharedFile', { defaultValue: 'Podeljeni fajl' })}: ${filename}`
          updateFiscalField('notes', fiscalData.notes ? `${fiscalData.notes}\n${note}` : note)
          setShareNotice(
            t('addReceipt.sharedSavedAsNote', {
              defaultValue: 'Deljeni fajl je dodat u napomenu (pregled nije moguć).',
            })
          )
          toast.error(
            t('addReceipt.unsupportedFile', {
              defaultValue: 'PDF nije podržan za prikaz, sačuvan je kao napomena.',
            })
          )
          return
        }

        const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' })
        setSelectedImage(file)
        const url = URL.createObjectURL(file)
        setImagePreviewUrl((prev) => {
          if (prev && prev !== url) URL.revokeObjectURL(prev)
          return url
        })
        setMode('photo')
        const notice = t('addReceipt.sharedLoaded', { defaultValue: 'Deljeni sadržaj je učitan.' })
        setShareNotice(notice)
        toast.success(notice)
      } catch (error) {
        logger.error('[ShareTarget] Failed to load shared file', error)
      }
    }

    loadFileFromCache()

    const next = new URLSearchParams(searchParams)
    next.delete('source')
    next.delete('title')
    next.delete('text')
    next.delete('url')
    next.delete('file')
    setSearchParams(next, { replace: true })
  }, [
    fiscalData.notes,
    searchParams,
    setShareNotice,
    setImagePreviewUrl,
    setMode,
    setSearchParams,
    setSelectedImage,
    updateFiscalField,
  ])

  // Cleanup image preview URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    }
  }, [imagePreviewUrl])

  useEffect(() => {
    lastOcrErrorRef.current = ocrError
  }, [ocrError])

  useEffect(() => {
    return () => {
      cancelOcr()
    }
  }, [cancelOcr])

  // Handle QR scan
  const handleQRScan = useCallback(
    (qrData: string) => {
      try {
        track('receipt_add_qr_start')
        const parsed = parseQRCode(qrData)

        if (parsed) {
          updateFiscalMultiple({
            merchantName: parsed.merchantName,
            pib: parsed.pib,
            date: parsed.date.toISOString().split('T')[0] ?? '',
            time: parsed.time,
            amount: String(parsed.totalAmount),
          })

          if (!userCategoryEdited) {
            const autoCategory = classifyCategory({ merchantName: parsed.merchantName })
            updateFiscalField('category', autoCategory)
          }

          track('receipt_add_qr_success', {
            merchantName: parsed.merchantName,
            amount: parsed.totalAmount,
          })

          toast.success(t('addReceipt.qrScanned'))
          setShowQRScanner(false)
          setMode('manual')
        } else {
          track('receipt_add_qr_fail', { reason: 'parse_error' })
          toast.error(t('addReceipt.qrNotRecognized'))
          setShowQRScanner(false)
          setMode('manual')
        }
      } catch (err) {
        logger.error('QR parse error:', err)
        toast.error(t('common.error'))
        setShowQRScanner(false)
        setMode('manual')
      }
    },
    [t, userCategoryEdited, updateFiscalMultiple, updateFiscalField, setMode]
  )

  const handleScanError = useCallback((error: string) => {
    logger.error('QR Scan error:', error)
    toast.error(error)
  }, [])

  // Handle image upload (OCR)
  const handleImageUpload = useCallback(
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
          setMode('manual')
          return
        }

        track('receipt_add_photo_success', { fieldsFound: result.fields.length })

        // Extract OCR data
        const ocrData: Partial<typeof fiscalData> = {}
        let detectedMerchant = ''

        for (const field of result.fields) {
          switch (field.label) {
            case 'prodavac':
              detectedMerchant = field.value
              ocrData.merchantName = field.value
              break
            case 'pib':
              ocrData.pib = field.value.replace(/\D/g, '').slice(0, 9)
              break
            case 'datum':
              ocrData.date = normalizeDate(field.value)
              break
            case 'vreme':
              ocrData.time = normalizeTime(field.value)
              break
            case 'ukupno':
              ocrData.amount = sanitizeAmountInput(field.value)
              break
            case 'qrLink': {
              const label = t('receiptDetail.qrLink', { defaultValue: 'QR Link' })
              ocrData.notes = fiscalData.notes
                ? `${fiscalData.notes}\n\n${label}: ${field.value}`
                : `${label}: ${field.value}`
              break
            }
          }
        }

        // Update form with OCR data
        updateFiscalMultiple(ocrData)

        // Auto-classify category if merchant detected
        if (detectedMerchant && !userCategoryEdited) {
          const autoCategory = classifyCategory({ merchantName: detectedMerchant })
          updateFiscalField('category', autoCategory)
        }

        toast.success(t('common.success'))
        setMode('manual')
      } catch (error) {
        logger.error('OCR error:', error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        track('receipt_add_photo_fail', { error: errorMessage })
        toast.error(t('common.error'))
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [
      imagePreviewUrl,
      processImage,
      resetOcr,
      t,
      userCategoryEdited,
      fiscalData.notes,
      updateFiscalMultiple,
      updateFiscalField,
      setMode,
    ]
  )

  const handleTakePhoto = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // Handle fiscal receipt submission
  const handleFiscalSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      const amt = Number.parseFloat(sanitizeAmountInput(fiscalData.amount))
      if (
        !fiscalData.merchantName ||
        !fiscalData.date ||
        Number.isNaN(amt) ||
        !fiscalData.category
      ) {
        toast.error(t('addReceipt.requiredFields'))
        return
      }

      setLoading(true)
      try {
        const receiptPayload: Parameters<typeof addReceipt>[0] = {
          merchantName: fiscalData.merchantName,
          pib: fiscalData.pib,
          date: new Date(fiscalData.date),
          time: fiscalData.time,
          totalAmount: amt,
          category: fiscalData.category,
          ...(fiscalData.notes ? { notes: fiscalData.notes } : {}),
        }

        await addReceipt(receiptPayload)

        track('receipt_add_manual_success', { category: fiscalData.category, amount: amt })

        toast.success(t('addReceipt.success'))
        navigate('/receipts')
      } catch (error) {
        logger.error('Add receipt error:', error)
        const errorMessage = error instanceof Error ? error.message : t('common.error')
        toast.error(`${t('common.error')}: ${String(errorMessage)}`)
      } finally {
        setLoading(false)
      }
    },
    [fiscalData, t, setLoading, navigate]
  )

  // Handle household bill submission
  const handleHouseholdSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      const amt = Number.parseFloat(sanitizeAmountInput(householdData.amount))
      if (!householdData.provider || Number.isNaN(amt)) {
        toast.error(t('addReceipt.household.requiredFields'))
        return
      }

      const startDate = new Date(householdData.billingPeriodStart)
      const endDate = new Date(householdData.billingPeriodEnd)
      if (startDate > endDate) {
        toast.error(t('addReceipt.household.invalidPeriod'))
        return
      }

      setLoading(true)
      try {
        const consumptionNumber = Number.parseFloat(
          sanitizeAmountInput(householdData.consumptionValue)
        )

        const billPayload: Parameters<typeof addHouseholdBill>[0] = {
          billType: householdData.billType,
          provider: householdData.provider,
          amount: amt,
          billingPeriodStart: startDate,
          billingPeriodEnd: endDate,
          dueDate: new Date(householdData.dueDate),
          status: householdData.status,
          ...(householdData.accountNumber ? { accountNumber: householdData.accountNumber } : {}),
          ...(householdData.paymentDate
            ? { paymentDate: new Date(householdData.paymentDate) }
            : {}),
          ...(householdData.notes ? { notes: householdData.notes } : {}),
        }

        if (householdData.consumptionValue && !Number.isNaN(consumptionNumber)) {
          billPayload.consumption = {
            value: consumptionNumber,
            unit: householdData.consumptionUnit,
          }
        }

        await addHouseholdBill(billPayload)

        track('household_bill_add_manual_success', {
          billType: householdData.billType,
          amount: amt,
          status: householdData.status,
        })

        toast.success(t('addReceipt.household.success'))
        navigate('/receipts?tab=household')
      } catch (error) {
        logger.error('Add household bill error:', error)
        const errorMessage = error instanceof Error ? error.message : t('common.error')
        toast.error(`${t('common.error')}: ${String(errorMessage)}`)
      } finally {
        setLoading(false)
      }
    },
    [householdData, t, setLoading, navigate]
  )

  return (
    <PageTransition className="space-y-6 pb-8">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-purple-900 p-6 text-white shadow-2xl sm:p-8"
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
          animate={prefersReducedMotion ? {} : { scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={prefersReducedMotion ? {} : { duration: 4, repeat: Number.POSITIVE_INFINITY }}
          className="-top-24 -right-24 absolute h-96 w-96 rounded-full bg-white/20 blur-3xl"
        />

        <div className="relative z-10">
          <div className="mb-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-lg p-2 transition-colors hover:bg-white/10"
              aria-label={t('common.back')}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="rounded-xl bg-white/10 p-2 backdrop-blur-sm">
              <PenSquare className="h-6 w-6" />
            </div>
            <h1 className="font-black text-3xl sm:text-4xl">{t('addReceipt.title')}</h1>
          </div>
        </div>
      </motion.div>

      <div className="mx-auto max-w-2xl space-y-6">
        {shareNotice && (
          <div className="flex items-start gap-3 rounded-xl border border-primary-200/70 bg-primary-50 px-4 py-3 text-primary-900 shadow-sm">
            <div className="mt-1 h-2 w-2 rounded-full bg-primary-500" aria-hidden />
            <p className="text-sm leading-relaxed">{shareNotice}</p>
          </div>
        )}

        {/* Mode Tabs */}
        <ModeSelector mode={mode} onModeChange={setMode} />

        {/* QR Mode */}
        {mode === 'qr' && <QRScanPrompt onStartScanning={() => setShowQRScanner(true)} />}

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

            {ocrProcessing || (selectedImage && ocrResult) ? (
              <OCRPreview
                isProcessing={ocrProcessing}
                selectedImage={selectedImage}
                imagePreviewUrl={imagePreviewUrl}
                ocrFields={ocrResult?.fields ?? []}
                onRetakePhoto={handleTakePhoto}
                onContinue={() => setMode('manual')}
              />
            ) : (
              <PhotoUploadPrompt onTakePhoto={handleTakePhoto} />
            )}
          </div>
        )}

        {/* Manual Mode */}
        {mode === 'manual' && (
          <div className="card space-y-6">
            <ManualTypeSelector type={manualType} onTypeChange={setManualType} />

            {manualType === 'fiscal' ? (
              <FiscalReceiptForm
                formData={fiscalData}
                errors={fiscalErrors}
                onFieldChange={updateFiscalField}
                onCategoryChange={(category) => {
                  updateFiscalField('category', category)
                  setUserCategoryEdited(true)
                }}
                onSubmit={handleFiscalSubmit}
                onCancel={() => navigate(-1)}
                loading={loading}
                isValid={fiscalValid}
              />
            ) : (
              <HouseholdBillForm
                formData={householdData}
                errors={householdErrors}
                onFieldChange={updateHouseholdField}
                onSubmit={handleHouseholdSubmit}
                onCancel={() => navigate(-1)}
                loading={loading}
                isValid={householdValid}
              />
            )}
          </div>
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

export default memo(AddReceiptPage)
