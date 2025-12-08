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
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { PageTransition } from '@/components/common/PageTransition'
import { TagInput } from '@/components/common/TagInput'
import {
  FormActions,
  FormInput,
  FormRow,
  FormSection,
  FormSelect,
  FormTextarea,
} from '@/components/forms'
import { addHouseholdBill, addReceipt } from '@/hooks/useDatabase'
import { useSmoothNavigate } from '@/hooks/useSmoothNavigate'
import { useToast } from '@/hooks/useToast'
import { classifyCategory } from '@/lib/categories'
import {
  ArrowLeft,
  Building,
  Calendar,
  Camera,
  CreditCard,
  FileText,
  Home,
  Receipt as ReceiptIcon,
  Store,
  Wallet,
  X,
  Zap,
} from '@/lib/icons'
import { logger } from '@/lib/logger'
import { sanitizeText } from '@/lib/sanitize'
import { uploadImageWithCompression } from '@/services/imageUploadService'
import { useAppStore } from '@/store/useAppStore'
import type { Receipt } from '@/types'

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
const MAX_FILE_SIZE = 4.5 * 1024 * 1024 // 4.5MB
const MAX_IMAGE_WIDTH = 4096
const MAX_IMAGE_HEIGHT = 4096
const AUTH_TOKEN_KEY = 'neon_auth_token'

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
  const navigate = useSmoothNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()
  const prefersReducedMotion = useReducedMotion()

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
  const [fiscalTags, setFiscalTags] = useState<string[]>([])
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [shareNotice, setShareNotice] = useState<string | null>(null)
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

  // Handle Web Share Target payload (title/text/url/file cached by SW)
  useEffect(() => {
    const source = searchParams.get('source')
    if (source !== 'share-target') return

    // Default to fiscal form for shared receipts
    setReceiptType('fiscal')

    const title = searchParams.get('title')
    const text = searchParams.get('text')
    const sharedUrl = searchParams.get('url')
    const fileKey = searchParams.get('file')

    // Prefill notes with shared text/url if empty
    if (!fiscalNotes) {
      const parts = [title, text, sharedUrl].filter(Boolean)
      if (parts.length > 0) {
        setFiscalNotes(parts.join('\n'))
      }
    }

    // Load shared file from cache if present
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
          setFiscalNotes((prev) => (prev ? `${prev}\n${note}` : note))
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
        const notice = t('addReceipt.sharedLoaded', { defaultValue: 'Deljeni sadržaj je učitan.' })
        setShareNotice(notice)
        toast.success(notice)
      } catch (error) {
        logger.error('[ShareTarget] Failed to load shared file', error)
      }
    }

    loadFileFromCache()

    // Clean query params to avoid reprocessing
    const next = new URLSearchParams(searchParams)
    next.delete('source')
    next.delete('title')
    next.delete('text')
    next.delete('url')
    next.delete('file')
    setSearchParams(next, { replace: true })
  }, [fiscalNotes, searchParams, setSearchParams, t, toast])

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

  // Get auth state
  const { isAuthenticated } = useAppStore()

  // Image upload - uses Vercel Blob for authenticated users, base64 for offline
  const uploadImage = useCallback(
    async (file: File): Promise<string> => {
      // If user is authenticated, upload to Vercel Blob
      const token = localStorage.getItem(AUTH_TOKEN_KEY)
      if (isAuthenticated && token) {
        try {
          const result = await uploadImageWithCompression(file, token)
          logger.info('Image uploaded to Vercel Blob:', { url: result.url, size: result.size })
          return result.url
        } catch (error) {
          logger.error('Vercel Blob upload failed, falling back to base64:', error)
          // Fall through to base64 fallback
        }
      }

      // Fallback: Store as base64 locally (for offline or failed uploads)
      try {
        const { optimizeForUpload, validateImageFile } = await import('@/lib/images/compressor')

        const validation = validateImageFile(file)
        if (!validation.valid) {
          throw new Error(validation.error || 'Invalid image file')
        }

        const { main, stats } = await optimizeForUpload(file)

        logger.info('Image optimized for local storage:', {
          original: `${(stats.originalSize / 1024).toFixed(2)} KB`,
          compressed: `${(stats.mainSize / 1024).toFixed(2)} KB`,
          reduction: `${stats.totalReduction}%`,
        })

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(main)
        })

        return base64
      } catch (error) {
        logger.error('Image processing error:', error)
        // Last resort fallback - raw base64
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      }
    },
    [isAuthenticated]
  )

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
            defaultValue: 'Fajl je prevelik. Maksimalna veličina je 4.5MB.',
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

        const notes = fiscalNotes

        const receiptData: Omit<Receipt, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'> = {
          merchantName: sanitizeText(merchantName),
          pib: '',
          date: new Date(date),
          time: '',
          totalAmount: amountNum,
          category: autoCategory,
          ...(fiscalTags.length > 0 && { tags: fiscalTags }),
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
      fiscalTags,
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

        <div className="mx-auto max-w-2xl space-y-4 px-6">
          {shareNotice && (
            <div className="flex items-start gap-3 rounded-xl border border-primary-200/70 bg-primary-50 px-4 py-3 text-primary-900 shadow-sm">
              <div className="mt-1 h-2 w-2 rounded-full bg-primary-500" aria-hidden />
              <p className="text-sm leading-relaxed">{shareNotice}</p>
            </div>
          )}

          <form onSubmit={handleFiscalSubmit} className="card space-y-6" noValidate>
            {/* Basic Info Section */}
            <FormSection
              icon={Store}
              title={t('addReceipt.basicInfo', { defaultValue: 'Osnovne informacije' })}
            >
              <FormInput
                label={t('addReceipt.storeName')}
                icon={Store}
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                placeholder={t('addReceipt.storeNamePlaceholder')}
                required
              />

              <FormRow>
                <FormInput
                  label={t('addReceipt.amount')}
                  icon={Wallet}
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))}
                  placeholder={t('addReceipt.amountPlaceholder')}
                  min="0"
                  step="0.01"
                  required
                  inputMode="decimal"
                  suffix="RSD"
                />

                <FormInput
                  label={t('addReceipt.dateRequired')}
                  icon={Calendar}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  max={formatDateInput(new Date())}
                />
              </FormRow>
            </FormSection>

            {/* Image Upload Section */}
            <FormSection icon={Camera} title={t('addReceipt.addPhoto')} defaultCollapsed>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleImageUpload}
                className="hidden"
              />
              {imagePreviewUrl ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative overflow-hidden rounded-xl"
                >
                  <img src={imagePreviewUrl} alt="Preview" className="h-48 w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-3 right-3 rounded-full bg-dark-900/80 p-2 text-white shadow-lg transition-all hover:scale-110 hover:bg-dark-900"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dark-200 border-dashed bg-dark-50/50 px-6 py-8 text-dark-500 transition-colors hover:border-primary-300 hover:bg-primary-50/50 hover:text-primary-600 dark:border-dark-600 dark:bg-dark-800/50 dark:hover:border-primary-500 dark:hover:bg-primary-900/20"
                >
                  <Camera className="h-6 w-6" />
                  <span className="font-medium">{t('addReceipt.addPhoto')}</span>
                </motion.button>
              )}
            </FormSection>

            {/* Notes Section */}
            <FormSection icon={FileText} title={t('receiptDetail.notes')} defaultCollapsed>
              <FormTextarea
                label={t('addReceipt.addNote')}
                icon={FileText}
                value={fiscalNotes}
                onChange={(e) => setFiscalNotes(e.target.value)}
                rows={4}
              />
            </FormSection>

            {/* Tags */}
            <TagInput tags={fiscalTags} onChange={setFiscalTags} maxTags={5} disabled={loading} />

            {/* Actions */}
            <FormActions
              submitLabel={loading ? t('common.loading') : t('common.save')}
              cancelLabel={t('common.cancel')}
              onCancel={() => setReceiptType(null)}
              isSubmitting={loading}
              isDisabled={!isFiscalFormValid}
            />
          </form>
        </div>
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
          {/* Provider Info Section */}
          <FormSection
            icon={Building}
            title={t('addReceipt.household.providerInfo', {
              defaultValue: 'Informacije o dobavljaču',
            })}
          >
            <FormSelect
              label={t('household.billType')}
              icon={Zap}
              options={billTypeOptions}
              value={householdBillType}
              onChange={(e) => setHouseholdBillType(e.target.value as HouseholdBillType)}
              required
            />

            <FormInput
              label={t('household.provider')}
              icon={Building}
              value={householdProvider}
              onChange={(e) => setHouseholdProvider(e.target.value)}
              placeholder={t('addReceipt.household.providerPlaceholder')}
              required
            />

            <FormInput
              label={t('household.accountNumber')}
              icon={CreditCard}
              value={householdAccountNumber}
              onChange={(e) => setHouseholdAccountNumber(e.target.value)}
              placeholder={t('addReceipt.household.accountPlaceholder')}
            />
          </FormSection>

          {/* Amount & Period Section */}
          <FormSection
            icon={Wallet}
            title={t('addReceipt.household.amountPeriod', { defaultValue: 'Iznos i period' })}
          >
            <FormInput
              label={t('addReceipt.amount')}
              icon={Wallet}
              type="number"
              value={householdAmount}
              onChange={(e) => setHouseholdAmount(sanitizeAmountInput(e.target.value))}
              min="0"
              step="0.01"
              required
              inputMode="decimal"
              suffix="RSD"
            />

            <FormRow>
              <FormInput
                label={t('household.billingPeriodStart')}
                icon={Calendar}
                type="date"
                value={billingPeriodStart}
                onChange={(e) => setBillingPeriodStart(e.target.value)}
                required
              />
              <FormInput
                label={t('household.billingPeriodEnd')}
                icon={Calendar}
                type="date"
                value={billingPeriodEnd}
                onChange={(e) => setBillingPeriodEnd(e.target.value)}
                required
              />
            </FormRow>
          </FormSection>

          {/* Due Date & Status Section */}
          <FormSection
            icon={Calendar}
            title={t('addReceipt.household.dueStatus', { defaultValue: 'Rok i status' })}
          >
            <FormRow>
              <FormInput
                label={t('household.dueDate')}
                icon={Calendar}
                type="date"
                value={householdDueDate}
                onChange={(e) => setHouseholdDueDate(e.target.value)}
                required
              />
              <FormInput
                label={t('household.paymentDate')}
                icon={Calendar}
                type="date"
                value={householdPaymentDate}
                onChange={(e) => setHouseholdPaymentDate(e.target.value)}
              />
            </FormRow>

            <FormSelect
              label={t('household.status')}
              options={statusOptions}
              value={householdStatus}
              onChange={(e) => setHouseholdStatus(e.target.value as HouseholdBillStatus)}
            />
          </FormSection>

          {/* Consumption Section */}
          <FormSection icon={Zap} title={t('household.consumption')} defaultCollapsed>
            <FormRow>
              <FormInput
                label={t('household.consumptionValue', { defaultValue: 'Vrednost' })}
                type="number"
                value={consumptionValue}
                onChange={(e) => setConsumptionValue(sanitizeAmountInput(e.target.value))}
                min="0"
                step="0.01"
                placeholder="0.00"
                inputMode="decimal"
              />
              <FormSelect
                label={t('household.consumptionUnit', { defaultValue: 'Jedinica' })}
                options={consumptionUnitOptions}
                value={consumptionUnit}
                onChange={(e) => setConsumptionUnit(e.target.value as HouseholdConsumptionUnit)}
              />
            </FormRow>
          </FormSection>

          {/* Notes Section */}
          <FormSection icon={FileText} title={t('receiptDetail.notes')} defaultCollapsed>
            <FormTextarea
              label={t('addReceipt.addNote')}
              icon={FileText}
              value={householdNotes}
              onChange={(e) => setHouseholdNotes(e.target.value)}
              rows={4}
            />
          </FormSection>

          {/* Actions */}
          <FormActions
            submitLabel={loading ? t('common.loading') : t('common.save')}
            cancelLabel={t('common.cancel')}
            onCancel={() => setReceiptType(null)}
            isSubmitting={loading}
            isDisabled={!isHouseholdFormValid}
          />
        </form>
      </div>
    </PageTransition>
  )
}

export default memo(AddReceiptPageSimplified)
