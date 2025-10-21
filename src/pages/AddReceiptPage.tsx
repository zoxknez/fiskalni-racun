import {
  type HouseholdBillStatus,
  type HouseholdBillType,
  type HouseholdConsumptionUnit,
  householdBillStatusOptions,
  householdBillTypeOptions,
  householdConsumptionUnitOptions,
} from '@lib/household'
import type { OCRField } from '@lib/ocr'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Camera,
  Home,
  Loader2,
  PenSquare,
  QrCode,
  Receipt as ReceiptIcon,
  Sparkles,
} from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageTransition } from '@/components/common/PageTransition'
import QRScanner from '@/components/scanner/QRScanner'
import { addHouseholdBill, addReceipt } from '@/hooks/useDatabase'
import { useOCR } from '@/hooks/useOCR'
import { useToast } from '@/hooks/useToast'
import { track } from '@/lib/analytics'
import { categoryOptions, classifyCategory } from '@/lib/categories'
import { parseQRCode } from '@/lib/fiscalQRParser'
import { logger } from '@/lib/logger'
import { sanitizeText } from '@/lib/sanitize'

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

const formatDateInput = (date: Date) => date.toISOString().split('T')[0] ?? ''

const isValidPib = (raw: string) => /^\d{9}$/.test(raw)

const getDefaultBillingPeriodStart = () => {
  const date = new Date()
  date.setDate(1)
  return formatDateInput(date)
}

const getDefaultBillingPeriodEnd = () => {
  const date = new Date()
  date.setMonth(date.getMonth() + 1, 0)
  return formatDateInput(date)
}

const getDefaultHouseholdDueDate = () => {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return formatDateInput(date)
}

// ──────────────────────────────────────────────────────────────────────────────

export default function AddReceiptPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()

  // Mode
  const initialMode = (searchParams.get('mode') as 'qr' | 'photo' | 'manual') || 'qr'
  const [mode, setMode] = React.useState<'qr' | 'photo' | 'manual'>(initialMode)
  const [manualType, setManualType] = React.useState<'fiscal' | 'household'>('fiscal')
  const [loading, setLoading] = React.useState(false)

  // Keep mode in URL (refresh safe)
  const setModeAndUrl = React.useCallback(
    (m: 'qr' | 'photo' | 'manual') => {
      setMode(m)
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          params.set('mode', m)
          return params
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

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
  const [fiscalNotes, setFiscalNotes] = React.useState('')

  // Household form state
  const [householdBillType, setHouseholdBillType] = React.useState<HouseholdBillType>('electricity')
  const [householdProvider, setHouseholdProvider] = React.useState<string>('')
  const [householdAccountNumber, setHouseholdAccountNumber] = React.useState<string>('')
  const [householdAmount, setHouseholdAmount] = React.useState<string>('')
  const [billingPeriodStart, setBillingPeriodStart] = React.useState<string>(
    getDefaultBillingPeriodStart
  )
  const [billingPeriodEnd, setBillingPeriodEnd] = React.useState<string>(getDefaultBillingPeriodEnd)
  const [householdDueDate, setHouseholdDueDate] = React.useState<string>(getDefaultHouseholdDueDate)
  const [householdPaymentDate, setHouseholdPaymentDate] = React.useState<string>('')
  const [householdStatus, setHouseholdStatus] = React.useState<HouseholdBillStatus>('pending')
  const [consumptionValue, setConsumptionValue] = React.useState<string>('')
  const [consumptionUnit, setConsumptionUnit] = React.useState<HouseholdConsumptionUnit>('kWh')
  const [householdNotes, setHouseholdNotes] = React.useState<string>('')

  // Track if user manually changed category (so autos won't override)
  const [userEditedCategory, setUserEditedCategory] = React.useState(false)

  type CategoryOption = { value: string; label: string }
  // Use categories from lib/categories.ts with i18n support
  const categories = React.useMemo<CategoryOption[]>(() => {
    const locale = i18n.language === 'sr' ? 'sr-Latn' : 'en'
    return categoryOptions(locale)
  }, [i18n.language])

  const billTypeOptions = React.useMemo(
    () => householdBillTypeOptions(i18n.language),
    [i18n.language]
  )
  const statusOptions = React.useMemo(
    () => householdBillStatusOptions(i18n.language),
    [i18n.language]
  )
  const consumptionUnitOptions = React.useMemo(
    () => householdConsumptionUnitOptions(i18n.language),
    [i18n.language]
  )

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
  const fiscalFieldIds = React.useMemo(
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

  const householdFieldIds = React.useMemo(
    () => ({
      billType: `${sanitizedIdPrefix}-bill-type`,
      provider: `${sanitizedIdPrefix}-provider`,
      account: `${sanitizedIdPrefix}-account`,
      amount: `${sanitizedIdPrefix}-household-amount`,
      billingStart: `${sanitizedIdPrefix}-billing-start`,
      billingEnd: `${sanitizedIdPrefix}-billing-end`,
      dueDate: `${sanitizedIdPrefix}-due-date`,
      paymentDate: `${sanitizedIdPrefix}-payment-date`,
      status: `${sanitizedIdPrefix}-status`,
      consumptionValue: `${sanitizedIdPrefix}-consumption-value`,
      consumptionUnit: `${sanitizedIdPrefix}-consumption-unit`,
      notes: `${sanitizedIdPrefix}-household-notes`,
    }),
    [sanitizedIdPrefix]
  )

  // Derived validity + submit
  const parsedAmount = Number.parseFloat(sanitizeAmountInput(amount))
  const canSaveFiscal =
    !!merchantName && !!date && isValidPib(pib) && !Number.isNaN(parsedAmount) && !!category

  const parsedHouseholdAmount = Number.parseFloat(sanitizeAmountInput(householdAmount))
  const consumptionNumber = Number.parseFloat(sanitizeAmountInput(consumptionValue))
  const canSaveHousehold =
    manualType === 'household'
      ? !!householdProvider &&
        !!billingPeriodStart &&
        !!billingPeriodEnd &&
        !!householdDueDate &&
        !Number.isNaN(parsedHouseholdAmount)
      : false

  const canSave = manualType === 'fiscal' ? canSaveFiscal : canSaveHousehold

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (manualType === 'fiscal') {
        const amt = Number.parseFloat(sanitizeAmountInput(amount))
        if (!merchantName || !date || Number.isNaN(amt) || !isValidPib(pib) || !category) {
          toast.error(t('addReceipt.requiredFields'))
          return
        }

        setLoading(true)
        try {
          const receiptPayload: Parameters<typeof addReceipt>[0] = {
            merchantName: sanitizeText(merchantName),
            pib,
            date: new Date(date),
            time,
            totalAmount: amt,
            category,
            ...(fiscalNotes ? { notes: sanitizeText(fiscalNotes) } : {}),
          }

          await addReceipt(receiptPayload)

          track('receipt_add_manual_success', { category, amount: amt })

          toast.success(t('addReceipt.success'))
          navigate('/receipts')
        } catch (error) {
          logger.error('Add receipt error:', error)
          const errorMessage = error instanceof Error ? error.message : t('common.error')
          toast.error(`${t('common.error')}: ${String(errorMessage)}`)
        } finally {
          setLoading(false)
        }
        return
      }

      if (!householdProvider || Number.isNaN(parsedHouseholdAmount)) {
        toast.error(t('addReceipt.household.requiredFields'))
        return
      }

      const startDate = new Date(billingPeriodStart)
      const endDate = new Date(billingPeriodEnd)
      if (startDate > endDate) {
        toast.error(t('addReceipt.household.invalidPeriod'))
        return
      }

      setLoading(true)
      try {
        const billPayload: Parameters<typeof addHouseholdBill>[0] = {
          billType: householdBillType,
          provider: sanitizeText(householdProvider),
          amount: parsedHouseholdAmount,
          billingPeriodStart: startDate,
          billingPeriodEnd: endDate,
          dueDate: new Date(householdDueDate),
          status: householdStatus,
          ...(householdAccountNumber
            ? { accountNumber: sanitizeText(householdAccountNumber) }
            : {}),
          ...(householdPaymentDate ? { paymentDate: new Date(householdPaymentDate) } : {}),
          ...(householdNotes ? { notes: sanitizeText(householdNotes) } : {}),
        }

        if (consumptionValue && !Number.isNaN(consumptionNumber)) {
          billPayload.consumption = {
            value: consumptionNumber,
            unit: consumptionUnit,
          }
        }

        await addHouseholdBill(billPayload)

        track('household_bill_add_manual_success', {
          billType: householdBillType,
          amount: parsedHouseholdAmount,
          status: householdStatus,
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
    [
      amount,
      billingPeriodEnd,
      billingPeriodStart,
      category,
      consumptionNumber,
      consumptionUnit,
      consumptionValue,
      date,
      fiscalNotes,
      householdAccountNumber,
      householdBillType,
      householdDueDate,
      householdNotes,
      householdPaymentDate,
      householdProvider,
      householdStatus,
      manualType,
      merchantName,
      navigate,
      parsedHouseholdAmount,
      pib,
      t,
      time,
    ]
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
        logger.error('QR parse error:', err)
        toast.error(t('common.error'))
        setShowQRScanner(false)
        setModeAndUrl('manual')
      }
    },
    [date, time, t, userEditedCategory, setModeAndUrl]
  )

  const handleScanError = React.useCallback((error: string) => {
    logger.error('QR Scan error:', error)
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
              setFiscalNotes((prev) =>
                prev ? `${prev}\n\n${label}: ${field.value}` : `${label}: ${field.value}`
              )
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
        logger.error('OCR error:', error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        track('receipt_add_photo_fail', { error: errorMessage })
        toast.error(t('common.error'))
      } finally {
        // allow selecting the same file again
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [imagePreviewUrl, processImage, resetOcr, t, userEditedCategory, setModeAndUrl]
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
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
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
        {/* Mode Tabs */}
        <div
          className="flex gap-2 rounded-lg bg-dark-100 p-1 dark:bg-dark-800"
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
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 font-medium transition-all ${
                mode === key
                  ? 'bg-white text-primary-600 shadow-sm dark:bg-dark-700 dark:text-primary-400'
                  : 'text-dark-600 hover:text-dark-900 dark:text-dark-400 dark:hover:text-dark-200'
              }`}
              aria-label={label}
              role="tab"
              aria-selected={mode === key}
            >
              <Icon className="h-5 w-5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* QR Mode */}
        {mode === 'qr' && (
          <div className="card">
            <div className="empty-state">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
                <QrCode className="h-10 w-10 text-primary-600 dark:text-primary-400" />
              </div>
              <p className="mb-4 text-dark-600 dark:text-dark-400">{t('addReceipt.scanningQR')}</p>
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
              aria-label={t('addReceipt.photo')}
            />

            {ocrProcessing ? (
              <div className="empty-state" aria-live="polite">
                <div className="mb-4 flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
                  <Loader2 className="h-10 w-10 animate-spin text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="mb-2 font-semibold text-dark-900 text-lg dark:text-dark-50">
                  {t('addReceipt.processingOCR')}
                </h3>
                <p className="text-dark-600 text-sm dark:text-dark-400">{t('common.loading')}</p>
              </div>
            ) : selectedImage && ocrResult ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
                  <Sparkles className="h-6 w-6 text-green-600 dark:text-green-400" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900 text-sm dark:text-green-100">
                      {t('common.success')}
                    </h3>
                    <p className="text-green-700 text-xs dark:text-green-300">
                      {t('analytics.statsCount')}: {ocrResult.fields.length}
                    </p>
                  </div>
                </div>

                {/* Image preview */}
                <div className="relative overflow-hidden rounded-lg border border-dark-200 dark:border-dark-700">
                  {imagePreviewUrl && (
                    <img
                      src={imagePreviewUrl}
                      alt="Receipt preview"
                      className="h-auto max-h-64 w-full bg-dark-50 object-contain dark:bg-dark-900"
                    />
                  )}
                </div>

                {/* OCR Fields Found */}
                {ocrResult.fields.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-dark-700 text-sm dark:text-dark-300">
                      {t('receiptDetail.items')}
                    </h4>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {ocrResult.fields.map((field: OCRField) => (
                        <div
                          key={`${field.label}-${field.value}`}
                          className="rounded-lg bg-dark-50 p-2 text-xs dark:bg-dark-800"
                        >
                          <span className="text-dark-500 capitalize dark:text-dark-400">
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
                    <Camera className="h-4 w-4" /> {t('addReceipt.photo')}
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
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
                  <Camera className="h-10 w-10 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="mb-2 font-semibold text-dark-900 text-lg dark:text-dark-50">
                  {t('addReceipt.photo')}
                </h3>
                <p className="mb-6 text-dark-600 text-sm dark:text-dark-400">
                  {t('addReceipt.processingOCR')}
                </p>
                <button
                  type="button"
                  onClick={handleTakePhoto}
                  className="btn-primary flex items-center gap-2"
                >
                  <Camera className="h-5 w-5" /> {t('addReceipt.photo')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Manual Mode */}
        {mode === 'manual' && (
          <form onSubmit={handleSubmit} className="card space-y-6" noValidate>
            <div
              className="flex gap-2 rounded-lg bg-dark-100 p-1 dark:bg-dark-800"
              role="tablist"
              aria-label={t('addReceipt.manualTypeSwitch')}
            >
              {[
                { key: 'fiscal', icon: ReceiptIcon, label: t('addReceipt.manualFiscal') },
                { key: 'household', icon: Home, label: t('addReceipt.manualHousehold') },
              ].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setManualType(key as 'fiscal' | 'household')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 font-medium transition-all ${
                    manualType === key
                      ? 'bg-white text-primary-600 shadow-sm dark:bg-dark-700 dark:text-primary-400'
                      : 'text-dark-600 hover:text-dark-900 dark:text-dark-400 dark:hover:text-dark-200'
                  }`}
                  role="tab"
                  aria-selected={manualType === key}
                >
                  <Icon className="h-5 w-5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {manualType === 'fiscal' ? (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor={fiscalFieldIds.merchant}
                    className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
                  >
                    {t('addReceipt.vendorRequired')}
                  </label>
                  <input
                    id={fiscalFieldIds.merchant}
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
                    htmlFor={fiscalFieldIds.pib}
                    className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
                  >
                    PIB {t('common.required')}
                  </label>
                  <input
                    id={fiscalFieldIds.pib}
                    type="text"
                    value={pib}
                    onChange={(e) => setPib(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    className="input"
                    placeholder="123456789"
                    required
                    inputMode="numeric"
                    pattern="^[0-9]{9}$"
                    minLength={9}
                    maxLength={9}
                    autoComplete="off"
                    aria-describedby={fiscalFieldIds.pibHelp}
                    aria-invalid={pib !== '' && !isValidPib(pib)}
                  />
                  <p id={fiscalFieldIds.pibHelp} className="mt-1 text-dark-500 text-xs">
                    {t('addReceipt.pibHelp', {
                      defaultValue: 'Unesite 9 cifara (bez razmaka i znakova).',
                    })}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor={fiscalFieldIds.date}
                      className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
                    >
                      {t('addReceipt.dateRequired')}
                    </label>
                    <input
                      id={fiscalFieldIds.date}
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
                      htmlFor={fiscalFieldIds.time}
                      className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
                    >
                      {t('receiptDetail.time')}
                    </label>
                    <input
                      id={fiscalFieldIds.time}
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor={fiscalFieldIds.amount}
                    className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
                  >
                    {t('addReceipt.amountRequired')}
                  </label>
                  <input
                    id={fiscalFieldIds.amount}
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
                    htmlFor={fiscalFieldIds.category}
                    className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
                  >
                    {t('addReceipt.selectCategory')}
                  </label>
                  <select
                    id={fiscalFieldIds.category}
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
                    htmlFor={fiscalFieldIds.notes}
                    className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
                  >
                    {t('receiptDetail.notes')}
                  </label>
                  <textarea
                    id={fiscalFieldIds.notes}
                    value={fiscalNotes}
                    onChange={(e) => setFiscalNotes(e.target.value)}
                    className="input min-h-[100px] resize-y"
                    placeholder={t('addReceipt.addNote')}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor={householdFieldIds.provider}
                    className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
                  >
                    {t('household.provider')}
                  </label>
                  <input
                    id={householdFieldIds.provider}
                    type="text"
                    value={householdProvider}
                    onChange={(e) => setHouseholdProvider(e.target.value)}
                    className="input"
                    placeholder={t('addReceipt.household.providerPlaceholder', {
                      defaultValue: 'EPS, Infostan, SBB...',
                    })}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor={householdFieldIds.billType}
                    className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
                  >
                    {t('household.billType')}
                  </label>
                  <select
                    id={householdFieldIds.billType}
                    value={householdBillType}
                    onChange={(e) => setHouseholdBillType(e.target.value as HouseholdBillType)}
                    className="input"
                  >
                    {billTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor={householdFieldIds.account}
                      className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
                    >
                      {t('household.accountNumber')}
                    </label>
                    <input
                      id={householdFieldIds.account}
                      type="text"
                      value={householdAccountNumber}
                      onChange={(e) => setHouseholdAccountNumber(e.target.value)}
                      className="input"
                      placeholder={t('addReceipt.household.accountPlaceholder', {
                        defaultValue: 'Broj korisničkog naloga (opciono)',
                      })}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={householdFieldIds.status}
                      className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
                    >
                      {t('household.status')}
                    </label>
                    <select
                      id={householdFieldIds.status}
                      value={householdStatus}
                      onChange={(e) => setHouseholdStatus(e.target.value as HouseholdBillStatus)}
                      className="input"
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor={householdFieldIds.amount}
                    className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
                  >
                    {t('household.amount')}
                  </label>
                  <input
                    id={householdFieldIds.amount}
                    type="number"
                    value={householdAmount}
                    onChange={(e) => setHouseholdAmount(sanitizeAmountInput(e.target.value))}
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
                  <label className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300">
                    {t('household.billingPeriod')}
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      id={householdFieldIds.billingStart}
                      type="date"
                      value={billingPeriodStart}
                      onChange={(e) => setBillingPeriodStart(e.target.value)}
                      className="input"
                      required
                    />
                    <input
                      id={householdFieldIds.billingEnd}
                      type="date"
                      value={billingPeriodEnd}
                      onChange={(e) => setBillingPeriodEnd(e.target.value)}
                      className="input"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor={householdFieldIds.dueDate}
                      className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
                    >
                      {t('household.dueDate')}
                    </label>
                    <input
                      id={householdFieldIds.dueDate}
                      type="date"
                      value={householdDueDate}
                      onChange={(e) => setHouseholdDueDate(e.target.value)}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={householdFieldIds.paymentDate}
                      className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
                    >
                      {t('household.paymentDate')}
                    </label>
                    <input
                      id={householdFieldIds.paymentDate}
                      type="date"
                      value={householdPaymentDate}
                      onChange={(e) => setHouseholdPaymentDate(e.target.value)}
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300">
                    {t('household.consumption')}
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      id={householdFieldIds.consumptionValue}
                      type="number"
                      value={consumptionValue}
                      onChange={(e) => setConsumptionValue(sanitizeAmountInput(e.target.value))}
                      className="input"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      inputMode="decimal"
                    />
                    <select
                      id={householdFieldIds.consumptionUnit}
                      value={consumptionUnit}
                      onChange={(e) =>
                        setConsumptionUnit(e.target.value as HouseholdConsumptionUnit)
                      }
                      className="input"
                    >
                      {consumptionUnitOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor={householdFieldIds.notes}
                    className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
                  >
                    {t('receiptDetail.notes')}
                  </label>
                  <textarea
                    id={householdFieldIds.notes}
                    value={householdNotes}
                    onChange={(e) => setHouseholdNotes(e.target.value)}
                    className="input min-h-[100px] resize-y"
                    placeholder={t('addReceipt.addNote')}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn-secondary flex-1"
                disabled={loading}
              >
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={loading || !canSave}>
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
