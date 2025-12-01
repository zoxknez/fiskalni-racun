import type { HouseholdBill } from '@lib/db'
import {
  type HouseholdBillStatus,
  type HouseholdBillType,
  type HouseholdConsumptionUnit,
  householdBillStatusOptions,
  householdBillTypeOptions,
  householdConsumptionUnitOptions,
} from '@lib/household'
import { motion, useReducedMotion } from 'framer-motion'
import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageTransition } from '@/components/common/PageTransition'
import QRScanner from '@/components/scanner/QRScanner'
import { addHouseholdBill, addReceipt } from '@/hooks/useDatabase'
import { useToast } from '@/hooks/useToast'
import { classifyCategory } from '@/lib/categories'
import { parseQRCode } from '@/lib/fiscalQRParser'
import { ArrowLeft, Camera, Home, QrCode, Receipt as ReceiptIcon, X } from '@/lib/icons'
import { logger } from '@/lib/logger'
import { sanitizeText } from '@/lib/sanitize'
import type { Receipt } from '@/types'

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_IMAGE_WIDTH = 4096
const MAX_IMAGE_HEIGHT = 4096

const sanitizeAmountInput = (raw: string) => {
  let normalized = raw.replace(/,/g, '.').replace(/[^\d.]/g, '')
  const parts = normalized.split('.')
  normalized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : normalized
  if (normalized.startsWith('.')) normalized = `0${normalized}`
  return normalized
}

const formatDateInput = (date: Date) => date.toISOString().split('T')[0] ?? ''

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

function AddReceiptPageSimplified() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()
  const prefersReducedMotion = useReducedMotion()

  // Unique IDs for form elements
  const formId = useId()
  const storeNameId = `${formId}-storeName`
  const amountId = `${formId}-amount`
  const dateId = `${formId}-date`
  const notesId = `${formId}-notes`
  const billTypeId = `${formId}-billType`
  const providerId = `${formId}-provider`
  const accountNumberId = `${formId}-accountNumber`
  const householdAmountId = `${formId}-householdAmount`
  const periodStartId = `${formId}-periodStart`
  const periodEndId = `${formId}-periodEnd`
  const dueDateId = `${formId}-dueDate`
  const paymentDateId = `${formId}-paymentDate`
  const statusId = `${formId}-status`
  const householdNotesId = `${formId}-householdNotes`

  // Type selection
  const initialType = useMemo(
    () => (searchParams.get('type') as 'fiscal' | 'household') || null,
    [searchParams]
  )
  const [receiptType, setReceiptType] = useState<'fiscal' | 'household' | null>(initialType)
  const [loading, setLoading] = useState(false)

  // Set type in URL
  const selectType = useCallback(
    (type: 'fiscal' | 'household') => {
      setReceiptType(type)
      setSearchParams({ type }, { replace: true })
    },
    [setSearchParams]
  )

  // ──────────── FISCAL RECEIPT STATE ────────────
  const [merchantName, setMerchantName] = useState('')
  const [date, setDate] = useState(() => formatDateInput(new Date()))
  const [amount, setAmount] = useState('')
  const [fiscalNotes, setFiscalNotes] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [qrLink, setQrLink] = useState<string | null>(null)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ──────────── HOUSEHOLD BILL STATE ────────────
  const [householdBillType, setHouseholdBillType] = useState<HouseholdBillType>('electricity')
  const [householdProvider, setHouseholdProvider] = useState<string>('')
  const [householdAccountNumber, setHouseholdAccountNumber] = useState<string>('')
  const [householdAmount, setHouseholdAmount] = useState<string>('')
  const [billingPeriodStart, setBillingPeriodStart] = useState<string>(getDefaultBillingPeriodStart)
  const [billingPeriodEnd, setBillingPeriodEnd] = useState<string>(getDefaultBillingPeriodEnd)
  const [householdDueDate, setHouseholdDueDate] = useState<string>(getDefaultHouseholdDueDate)
  const [householdPaymentDate, setHouseholdPaymentDate] = useState<string>('')
  const [householdStatus, setHouseholdStatus] = useState<HouseholdBillStatus>('pending')
  const [consumptionValue, setConsumptionValue] = useState<string>('')
  const [consumptionUnit, setConsumptionUnit] = useState<HouseholdConsumptionUnit>('kWh')
  const [householdNotes, setHouseholdNotes] = useState<string>('')

  // ──────────── CATEGORY OPTIONS ────────────
  const billTypeOptions = useMemo(() => householdBillTypeOptions(i18n.language), [i18n.language])
  const statusOptions = useMemo(() => householdBillStatusOptions(i18n.language), [i18n.language])
  const consumptionUnitOptions = useMemo(
    () => householdConsumptionUnitOptions(i18n.language),
    [i18n.language]
  )

  // ──────────── COMPUTED VALIDATIONS ────────────
  const isFiscalFormValid = useMemo(() => {
    const amountNum = Number.parseFloat(amount)
    return merchantName.trim().length > 0 && !Number.isNaN(amountNum) && amountNum > 0
  }, [merchantName, amount])

  const isHouseholdFormValid = useMemo(() => {
    const amountNum = Number.parseFloat(householdAmount)
    const startDate = new Date(billingPeriodStart)
    const endDate = new Date(billingPeriodEnd)
    return (
      householdProvider.trim().length > 0 &&
      !Number.isNaN(amountNum) &&
      amountNum > 0 &&
      startDate <= endDate
    )
  }, [householdProvider, householdAmount, billingPeriodStart, billingPeriodEnd])

  // Image upload with compression
  const uploadImage = useCallback(async (file: File): Promise<string> => {
    try {
      // Dynamic import za image compressor
      const { optimizeForUpload, validateImageFile } = await import('@/lib/images/compressor')

      // 1. Validacija
      const validation = validateImageFile(file)
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid image file')
      }

      // 2. Optimizuj sliku i generiši thumbnail
      const { main, thumbnail, stats } = await optimizeForUpload(file)

      logger.info('Image optimized:', {
        original: `${(stats.originalSize / 1024).toFixed(2)} KB`,
        compressed: `${(stats.mainSize / 1024).toFixed(2)} KB`,
        reduction: `${stats.totalReduction}%`,
      })

      // 3. Kreiraj jedinstveno ime fajla
      const timestamp = Date.now()
      const fileName = `receipt_${timestamp}.webp`
      const thumbFileName = `thumb_${timestamp}.webp`

      // 4. Upload glavne slike na Supabase Storage
      const { supabase } = await import('@/lib/supabase')

      const { error: mainError } = await supabase.storage
        .from('receipts')
        .upload(`images/${fileName}`, main, {
          contentType: 'image/webp',
          cacheControl: '31536000', // 1 year
        })

      if (mainError) {
        logger.error('Main image upload failed:', mainError)
        throw new Error('Failed to upload image')
      }

      // 5. Upload thumbnail-a (ne blokiraj ako ne uspe)
      supabase.storage
        .from('receipts')
        .upload(`thumbnails/${thumbFileName}`, thumbnail, {
          contentType: 'image/webp',
          cacheControl: '31536000',
        })
        .catch((err) => logger.warn('Thumbnail upload failed:', err))

      // 6. Vrati public URL
      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(`images/${fileName}`)

      return urlData.publicUrl
    } catch (error) {
      logger.error('Image upload error:', error)
      // Fallback na blob URL za dev mode
      if (import.meta.env.DEV) {
        return URL.createObjectURL(file)
      }
      throw error
    }
  }, [])

  // Cleanup image preview
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    }
  }, [imagePreviewUrl])

  // ──────────── FISCAL HANDLERS ────────────
  const handleImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      // ⭐ ADDED: Type validation
      if (!file.type.startsWith('image/')) {
        toast.error(
          t('addReceipt.errors.unsupportedFileType', {
            defaultValue: 'Nepodržan tip fajla. Molimo koristite slike.',
          })
        )
        return
      }

      // ⭐ ADDED: Size validation
      if (file.size > MAX_FILE_SIZE) {
        toast.error(
          t('addReceipt.errors.fileTooLarge', {
            defaultValue: 'Fajl je prevelik. Maksimalna veličina je 10MB.',
          })
        )
        return
      }

      // ⭐ ENHANCED: Dimensions validation with comprehensive error handling
      try {
        const img = new Image()
        const objectUrl = URL.createObjectURL(file)

        // ⭐ FIXED: Race condition - use flag to prevent both timeout and load/error firing
        let handled = false

        // ⭐ ADDED: Timeout to prevent hanging
        const loadTimeout = setTimeout(() => {
          if (handled) return
          handled = true
          URL.revokeObjectURL(objectUrl)
          toast.error(
            t('addReceipt.errors.loadTimeout', { defaultValue: 'Vrijeme učitavanja slike isteklo' })
          )
        }, 10000) // 10 seconds timeout

        img.onload = () => {
          if (handled) return
          handled = true
          clearTimeout(loadTimeout)
          URL.revokeObjectURL(objectUrl)

          if (img.width > MAX_IMAGE_WIDTH || img.height > MAX_IMAGE_HEIGHT) {
            toast.error(
              t('addReceipt.errors.imageTooLarge', {
                defaultValue: `Slika je prevelika. Maksimalne dimenzije: ${MAX_IMAGE_WIDTH}x${MAX_IMAGE_HEIGHT}px`,
                width: MAX_IMAGE_WIDTH,
                height: MAX_IMAGE_HEIGHT,
              })
            )
            return
          }

          // Validation passed - set image
          if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)

          try {
            const previewUrl = URL.createObjectURL(file)
            setImagePreviewUrl(previewUrl)
            setSelectedImage(file)
          } catch (error) {
            logger.error('Failed to create preview URL:', error)
            toast.error(
              t('addReceipt.errors.previewFailed', {
                defaultValue: 'Greška pri kreiranju pregleda slike',
              })
            )
          }
        }

        img.onerror = () => {
          if (handled) return
          handled = true
          clearTimeout(loadTimeout)
          URL.revokeObjectURL(objectUrl)
          toast.error(
            t('addReceipt.errors.imageCorrupted', {
              defaultValue: 'Greška pri učitavanju slike. Fajl je možda oštećen.',
            })
          )
        }

        img.src = objectUrl
      } catch (error) {
        logger.error('Image upload error:', error)
        toast.error(
          t('addReceipt.errors.processingFailed', { defaultValue: 'Greška pri obradi slike' })
        )
      }
    },
    [imagePreviewUrl, toast, t]
  )

  const handleRemoveImage = useCallback(() => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    setImagePreviewUrl(null)
    setSelectedImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [imagePreviewUrl])

  const handleQRScan = useCallback(
    (qrData: string) => {
      try {
        const parsed = parseQRCode(qrData)

        if (parsed) {
          // Save just the link, don't autofill fields
          setQrLink(qrData)
          toast.success(t('addReceipt.qrLinkSaved'))
        } else {
          toast.info(t('addReceipt.qrNotRecognized'))
        }
        setShowQRScanner(false)
      } catch (err) {
        logger.error('QR error:', err)
        toast.error(t('common.error'))
        setShowQRScanner(false)
      }
    },
    [t, toast]
  )

  const handleScanError = useCallback(
    (error: string) => {
      logger.error('QR Scan error:', error)
      toast.error(error)
    },
    [toast]
  )

  // ──────────── SUBMIT HANDLERS ────────────
  const handleFiscalSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!isFiscalFormValid) {
        toast.error(t('addReceipt.requiredFields'))
        return
      }

      setLoading(true)

      try {
        const amountNum = Number.parseFloat(amount)
        if (Number.isNaN(amountNum) || amountNum <= 0) {
          toast.error(t('common.error'))
          setLoading(false)
          return
        }

        const autoCategory = classifyCategory({ merchantName })

        let notes = fiscalNotes
        if (qrLink) {
          notes = notes ? `${notes}\n\nQR Link: ${qrLink}` : `QR Link: ${qrLink}`
        }

        const receiptData: Omit<Receipt, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'> = {
          merchantName: sanitizeText(merchantName),
          pib: '',
          date: new Date(date),
          time: '',
          totalAmount: amountNum,
          category: autoCategory,
          notes: sanitizeText(notes),
          items: [],
        }

        if (selectedImage) {
          receiptData.imageUrl = await uploadImage(selectedImage)
        }

        await addReceipt(receiptData)
        toast.success(t('addReceipt.success'))
        navigate('/receipts')
      } catch (error) {
        logger.error('Add fiscal receipt error:', error)
        toast.error(t('common.error'))
      } finally {
        setLoading(false)
      }
    },
    [
      merchantName,
      amount,
      date,
      fiscalNotes,
      qrLink,
      selectedImage,
      t,
      toast,
      navigate,
      uploadImage,
      isFiscalFormValid,
    ]
  )

  const handleHouseholdSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!isHouseholdFormValid) {
        toast.error(t('addReceipt.household.requiredFields'))
        return
      }

      setLoading(true)

      try {
        const amountNum = Number.parseFloat(householdAmount)
        if (Number.isNaN(amountNum) || amountNum <= 0) {
          toast.error(t('common.error'))
          setLoading(false)
          return
        }

        const start = new Date(billingPeriodStart)
        const end = new Date(billingPeriodEnd)
        if (start > end) {
          toast.error(t('addReceipt.household.invalidPeriod'))
          setLoading(false)
          return
        }

        const billData: Omit<HouseholdBill, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'> = {
          billType: householdBillType,
          provider: sanitizeText(householdProvider),
          accountNumber: sanitizeText(householdAccountNumber),
          amount: amountNum,
          billingPeriodStart: start,
          billingPeriodEnd: end,
          dueDate: new Date(householdDueDate),
          status: householdStatus,
          notes: sanitizeText(householdNotes),
        }

        if (householdPaymentDate) {
          billData.paymentDate = new Date(householdPaymentDate)
        }

        if (consumptionValue) {
          billData.consumption = {
            value: Number.parseFloat(consumptionValue),
            unit: consumptionUnit,
          }
        }

        await addHouseholdBill(billData)
        toast.success(t('addReceipt.household.success'))
        navigate('/receipts')
      } catch (error) {
        logger.error('Add household bill error:', error)
        toast.error(t('common.error'))
      } finally {
        setLoading(false)
      }
    },
    [
      householdProvider,
      householdAmount,
      householdBillType,
      householdAccountNumber,
      billingPeriodStart,
      billingPeriodEnd,
      householdDueDate,
      householdPaymentDate,
      householdStatus,
      consumptionValue,
      consumptionUnit,
      householdNotes,
      t,
      toast,
      navigate,
      isHouseholdFormValid,
    ]
  )

  // ──────────── RENDER ────────────
  if (!receiptType) {
    // Type Selection Screen
    return (
      <PageTransition>
        <motion.div
          className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-purple-900 p-8 text-white shadow-2xl"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
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
            transition={
              prefersReducedMotion ? {} : { duration: 4, repeat: Number.POSITIVE_INFINITY }
            }
            className="-top-24 -right-24 absolute h-96 w-96 rounded-full bg-white/20 blur-2xl"
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
              <ReceiptIcon className="h-7 w-7" />
              <h1 className="font-black text-3xl sm:text-4xl">{t('addReceipt.typeSelectTitle')}</h1>
            </div>
          </div>
        </motion.div>

        <div className="mx-auto max-w-2xl space-y-4 px-6">
          {/* Fiscal Receipt Card */}
          <button
            type="button"
            onClick={() => selectType('fiscal')}
            className="card group w-full p-6 text-left transition-all hover:scale-[1.02] hover:shadow-lg"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-primary-100 p-3 dark:bg-primary-900/30">
                <ReceiptIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1">
                <h3 className="mb-1 font-bold text-dark-900 text-lg dark:text-dark-50">
                  {t('addReceipt.fiscalReceipt')}
                </h3>
                <p className="text-dark-600 text-sm dark:text-dark-400">
                  {t('addReceipt.fiscalDescription')}
                </p>
              </div>
              <ArrowLeft className="h-5 w-5 rotate-180 text-dark-400 transition-transform group-hover:translate-x-1" />
            </div>
          </button>

          {/* Household Bill Card */}
          <button
            type="button"
            onClick={() => selectType('household')}
            className="card group w-full p-6 text-left transition-all hover:scale-[1.02] hover:shadow-lg"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-blue-100 p-3 dark:bg-blue-900/30">
                <Home className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="mb-1 font-bold text-dark-900 text-lg dark:text-dark-50">
                  {t('addReceipt.householdBill')}
                </h3>
                <p className="text-dark-600 text-sm dark:text-dark-400">
                  {t('addReceipt.householdDescription')}
                </p>
              </div>
              <ArrowLeft className="h-5 w-5 rotate-180 text-dark-400 transition-transform group-hover:translate-x-1" />
            </div>
          </button>
        </div>
      </PageTransition>
    )
  }

  // ──────────── FISCAL FORM ────────────
  if (receiptType === 'fiscal') {
    return (
      <PageTransition>
        <motion.div
          className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-purple-900 p-8 text-white shadow-2xl"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
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
            transition={
              prefersReducedMotion ? {} : { duration: 4, repeat: Number.POSITIVE_INFINITY }
            }
            className="-top-24 -right-24 absolute h-96 w-96 rounded-full bg-white/20 blur-2xl"
          />

          <div className="relative z-10">
            <div className="mb-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setReceiptType(null)}
                className="rounded-lg p-2 transition-colors hover:bg-white/10"
                aria-label={t('common.back')}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <ReceiptIcon className="h-7 w-7" />
              <h1 className="font-black text-3xl sm:text-4xl">{t('addReceipt.fiscalReceipt')}</h1>
            </div>
          </div>
        </motion.div>

        <div className="mx-auto max-w-2xl px-6">
          <form onSubmit={handleFiscalSubmit} className="card space-y-6" noValidate>
            {/* Store Name */}
            <div>
              <label
                htmlFor={storeNameId}
                className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
              >
                {t('addReceipt.storeName')} <span className="text-red-600">*</span>
              </label>
              <input
                id={storeNameId}
                type="text"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                className="input"
                placeholder={t('addReceipt.storeNamePlaceholder')}
                required
              />
            </div>

            {/* Amount */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor={amountId}
                  className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
                >
                  {t('addReceipt.amount')} <span className="text-red-600">*</span>
                </label>
                <input
                  id={amountId}
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))}
                  className="input"
                  placeholder={t('addReceipt.amountPlaceholder')}
                  min="0"
                  step="0.01"
                  required
                  inputMode="decimal"
                />
              </div>

              <div>
                <label
                  htmlFor={dateId}
                  className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
                >
                  {t('addReceipt.dateRequired')}
                </label>
                <input
                  id={dateId}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input"
                  required
                  max={formatDateInput(new Date())}
                />
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300">
                {t('addReceipt.addPhoto')}
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleImageUpload}
                className="hidden"
              />
              {imagePreviewUrl ? (
                <div className="relative">
                  <img
                    src={imagePreviewUrl}
                    alt="Preview"
                    className="h-48 w-full rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 rounded-full bg-dark-900/80 p-2 text-white hover:bg-dark-900"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary flex w-full items-center justify-center gap-2"
                >
                  <Camera className="h-5 w-5" />
                  {t('addReceipt.addPhoto')}
                </button>
              )}
            </div>

            {/* QR Scanner */}
            <div>
              <label className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300">
                {t('addReceipt.scanQROptional')}
              </label>
              {qrLink ? (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
                  <p className="text-green-800 text-sm dark:text-green-200">
                    ✓ {t('addReceipt.qrLinkSaved')}
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowQRScanner(true)}
                  className="btn-secondary flex w-full items-center justify-center gap-2"
                >
                  <QrCode className="h-5 w-5" />
                  {t('addReceipt.scanQROptional')}
                </button>
              )}
            </div>

            {/* Notes */}
            <div>
              <label
                htmlFor={notesId}
                className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
              >
                {t('receiptDetail.notes')}
              </label>
              <textarea
                id={notesId}
                value={fiscalNotes}
                onChange={(e) => setFiscalNotes(e.target.value)}
                className="input min-h-[100px] resize-y"
                placeholder={t('addReceipt.addNote')}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setReceiptType(null)}
                className="btn-secondary flex-1"
                disabled={loading}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={loading || !isFiscalFormValid}
              >
                {loading ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </form>
        </div>

        {/* QR Scanner Modal */}
        {showQRScanner && (
          <QRScanner
            onScan={handleQRScan}
            onError={handleScanError}
            onClose={() => setShowQRScanner(false)}
          />
        )}
      </PageTransition>
    )
  }

  // ──────────── HOUSEHOLD FORM ────────────
  // (Keep existing household form from original AddReceiptPage)
  return (
    <PageTransition>
      <motion.div
        className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-purple-900 p-8 text-white shadow-2xl"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
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
          className="-top-24 -right-24 absolute h-96 w-96 rounded-full bg-white/20 blur-2xl"
        />

        <div className="relative z-10">
          <div className="mb-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setReceiptType(null)}
              className="rounded-lg p-2 transition-colors hover:bg-white/10"
              aria-label={t('common.back')}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Home className="h-7 w-7" />
            <h1 className="font-black text-3xl sm:text-4xl">{t('addReceipt.householdBill')}</h1>
          </div>
        </div>
      </motion.div>

      <div className="mx-auto max-w-2xl px-6">
        <form onSubmit={handleHouseholdSubmit} className="card space-y-6" noValidate>
          {/* Bill Type */}
          <div>
            <label
              htmlFor={billTypeId}
              className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
            >
              {t('household.billType')} <span className="text-red-600">*</span>
            </label>
            <select
              id={billTypeId}
              value={householdBillType}
              onChange={(e) => setHouseholdBillType(e.target.value as HouseholdBillType)}
              className="input"
              required
            >
              {billTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Provider */}
          <div>
            <label
              htmlFor={providerId}
              className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
            >
              {t('household.provider')} <span className="text-red-600">*</span>
            </label>
            <input
              id={providerId}
              type="text"
              value={householdProvider}
              onChange={(e) => setHouseholdProvider(e.target.value)}
              className="input"
              placeholder={t('addReceipt.household.providerPlaceholder')}
              required
            />
          </div>

          {/* Account Number */}
          <div>
            <label
              htmlFor={accountNumberId}
              className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
            >
              {t('household.accountNumber')}
            </label>
            <input
              id={accountNumberId}
              type="text"
              value={householdAccountNumber}
              onChange={(e) => setHouseholdAccountNumber(e.target.value)}
              className="input"
              placeholder={t('addReceipt.household.accountPlaceholder')}
            />
          </div>

          {/* Amount */}
          <div>
            <label
              htmlFor={householdAmountId}
              className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
            >
              {t('addReceipt.amount')} <span className="text-red-600">*</span>
            </label>
            <input
              id={householdAmountId}
              type="number"
              value={householdAmount}
              onChange={(e) => setHouseholdAmount(sanitizeAmountInput(e.target.value))}
              className="input"
              min="0"
              step="0.01"
              required
              inputMode="decimal"
            />
          </div>

          {/* Billing Period */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={periodStartId}
                className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
              >
                {t('household.billingPeriodStart')}
              </label>
              <input
                id={periodStartId}
                type="date"
                value={billingPeriodStart}
                onChange={(e) => setBillingPeriodStart(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label
                htmlFor={periodEndId}
                className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
              >
                {t('household.billingPeriodEnd')}
              </label>
              <input
                id={periodEndId}
                type="date"
                value={billingPeriodEnd}
                onChange={(e) => setBillingPeriodEnd(e.target.value)}
                className="input"
                required
              />
            </div>
          </div>

          {/* Due Date & Payment Date */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={dueDateId}
                className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
              >
                {t('household.dueDate')}
              </label>
              <input
                id={dueDateId}
                type="date"
                value={householdDueDate}
                onChange={(e) => setHouseholdDueDate(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label
                htmlFor={paymentDateId}
                className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
              >
                {t('household.paymentDate')}
              </label>
              <input
                id={paymentDateId}
                type="date"
                value={householdPaymentDate}
                onChange={(e) => setHouseholdPaymentDate(e.target.value)}
                className="input"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor={statusId}
              className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
            >
              {t('household.status')}
            </label>
            <select
              id={statusId}
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

          {/* Consumption */}
          <div>
            <label className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300">
              {t('household.consumption')}
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
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
                value={consumptionUnit}
                onChange={(e) => setConsumptionUnit(e.target.value as HouseholdConsumptionUnit)}
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

          {/* Notes */}
          <div>
            <label
              htmlFor={householdNotesId}
              className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
            >
              {t('receiptDetail.notes')}
            </label>
            <textarea
              id={householdNotesId}
              value={householdNotes}
              onChange={(e) => setHouseholdNotes(e.target.value)}
              className="input min-h-[100px] resize-y"
              placeholder={t('addReceipt.addNote')}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setReceiptType(null)}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading || !isHouseholdFormValid}
            >
              {loading ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </PageTransition>
  )
}

export default memo(AddReceiptPageSimplified)
