import { zodResolver } from '@hookform/resolvers/zod'
import type { HouseholdBill, Receipt } from '@lib/db'
import {
  type HouseholdBillStatus,
  type HouseholdBillType,
  type HouseholdConsumptionUnit,
  householdBillStatusOptions,
  householdBillTypeOptions,
  householdConsumptionUnitOptions,
} from '@lib/household'
import { useReducedMotion } from 'framer-motion'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type Resolver, type SubmitHandler, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { PageTransition } from '@/components/common/PageTransition'
import { addHouseholdBill, addReceipt } from '@/hooks/useDatabase'
import { useHaptic } from '@/hooks/useHaptic'
import { useSmoothNavigate } from '@/hooks/useSmoothNavigate'
import { useToast } from '@/hooks/useToast'
import { classifyCategory } from '@/lib/categories'
import { Home, Receipt as ReceiptIcon } from '@/lib/icons'
import { logger } from '@/lib/logger'
import { sanitizeText } from '@/lib/sanitize'
import { uploadImageWithCompression } from '@/services/imageUploadService'
import { useAppStore } from '@/store/useAppStore'
import { FiscalReceiptForm } from './AddReceiptPageSimplified/components/FiscalReceiptForm'
import { HouseholdBillForm } from './AddReceiptPageSimplified/components/HouseholdBillForm'
import { ReceiptHeader } from './AddReceiptPageSimplified/components/ReceiptHeader'
import { ReceiptTypeSelection } from './AddReceiptPageSimplified/components/ReceiptTypeSelection'

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

type FiscalFormValues = {
  merchantName: string
  amount: string
  date: string
  notes: string
}

type HouseholdFormValues = {
  billType: HouseholdBillType
  provider: string
  accountNumber: string
  amount: string
  billingPeriodStart: string
  billingPeriodEnd: string
  dueDate: string
  paymentDate: string
  status: HouseholdBillStatus
  consumptionValue: string
  consumptionUnit: HouseholdConsumptionUnit
  notes: string
}

// ──────────────────────────────────────────────────────────────────────────────

function AddReceiptPageSimplified() {
  const { t, i18n } = useTranslation()
  const navigate = useSmoothNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()
  const { impactLight, impactMedium, notificationError, notificationSuccess } = useHaptic()
  const prefersReducedMotion = useReducedMotion()

  // Type selection
  const initialType = useMemo(
    () => (searchParams.get('type') as 'fiscal' | 'household') || null,
    [searchParams]
  )
  const [receiptType, setReceiptType] = useState<'fiscal' | 'household' | null>(initialType)

  // Set type in URL
  const selectType = useCallback(
    (type: 'fiscal' | 'household') => {
      setReceiptType(type)
      setSearchParams({ type }, { replace: true })
      impactLight()
    },
    [setSearchParams, impactLight]
  )

  const fiscalSchema = useMemo(
    () =>
      z.object({
        merchantName: z
          .string()
          .min(1, t('validation.merchantNameRequired', { defaultValue: 'Naziv je obavezan' }))
          .max(200, t('validation.merchantNameMaxLength', { defaultValue: 'Predugačak naziv' })),
        amount: z.string().refine(
          (value) => {
            const parsed = Number.parseFloat(value)
            return !Number.isNaN(parsed) && parsed > 0
          },
          t('validation.amountPositive', { defaultValue: 'Iznos mora biti pozitivan' })
        ),
        date: z
          .string()
          .min(1, t('validation.dateRequired', { defaultValue: 'Datum je obavezan' })),
        notes: z
          .string()
          .max(
            500,
            t('validation.notesMaxLength', { max: 500, defaultValue: 'Napomena je predugačka' })
          )
          .optional()
          .or(z.literal('')),
      }),
    [t]
  )

  const fiscalResolver = zodResolver(fiscalSchema) as Resolver<FiscalFormValues>
  const {
    handleSubmit: handleFiscalSubmit,
    getValues: getFiscalValues,
    setValue: setFiscalValue,
    watch: watchFiscal,
    reset: resetFiscalForm,
    formState: {
      errors: fiscalErrors,
      isSubmitting: isFiscalSubmitting,
      isValid: isFiscalFormValid,
    },
  } = useForm<FiscalFormValues>({
    resolver: fiscalResolver,
    mode: 'onChange',
    defaultValues: {
      merchantName: '',
      amount: '',
      date: formatDateInput(new Date()),
      notes: '',
    },
  })

  const merchantName = watchFiscal('merchantName')
  const amount = watchFiscal('amount')
  const date = watchFiscal('date')
  const fiscalNotes = watchFiscal('notes')
  const [fiscalTags, setFiscalTags] = useState<string[]>([])
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [shareNotice, setShareNotice] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const householdSchema = useMemo(
    () =>
      z
        .object({
          billType: z.enum([
            'electricity',
            'water',
            'gas',
            'heating',
            'internet',
            'phone',
            'trash',
            'other',
          ]),
          provider: z
            .string()
            .min(
              1,
              t('validation.providerRequired', { defaultValue: 'Pružalac usluge je obavezan' })
            ),
          accountNumber: z.string().optional().or(z.literal('')),
          amount: z.string().refine(
            (value) => {
              const parsed = Number.parseFloat(value)
              return !Number.isNaN(parsed) && parsed > 0
            },
            t('validation.amountPositive', { defaultValue: 'Iznos mora biti pozitivan' })
          ),
          billingPeriodStart: z
            .string()
            .min(1, t('validation.dateRequired', { defaultValue: 'Datum je obavezan' })),
          billingPeriodEnd: z
            .string()
            .min(1, t('validation.dateRequired', { defaultValue: 'Datum je obavezan' })),
          dueDate: z
            .string()
            .min(1, t('validation.dateRequired', { defaultValue: 'Datum je obavezan' })),
          paymentDate: z.string().optional().or(z.literal('')),
          status: z.enum(['pending', 'paid', 'overdue', 'partial']),
          consumptionValue: z
            .string()
            .refine((value) => !value || Number.isFinite(Number.parseFloat(value)), {
              message: t('validation.amountPositive', { defaultValue: 'Neispravna vrednost' }),
            })
            .optional()
            .or(z.literal('')),
          consumptionUnit: z.enum(['kWh', 'm3', 'm2', 'gb']),
          notes: z
            .string()
            .max(
              500,
              t('validation.notesMaxLength', { max: 500, defaultValue: 'Napomena je predugačka' })
            )
            .optional()
            .or(z.literal('')),
        })
        .refine(
          (data) => {
            const start = new Date(data.billingPeriodStart)
            const end = new Date(data.billingPeriodEnd)
            return start <= end
          },
          {
            message: t('addReceipt.household.invalidPeriod'),
            path: ['billingPeriodEnd'],
          }
        ),
    [t]
  )

  const householdResolver = zodResolver(householdSchema) as Resolver<HouseholdFormValues>
  const {
    handleSubmit: handleHouseholdSubmit,
    setValue: setHouseholdValue,
    watch: watchHousehold,
    reset: resetHouseholdForm,
    formState: {
      errors: householdErrors,
      isSubmitting: isHouseholdSubmitting,
      isValid: isHouseholdFormValid,
    },
  } = useForm<HouseholdFormValues>({
    resolver: householdResolver,
    mode: 'onChange',
    defaultValues: {
      billType: 'electricity',
      provider: '',
      accountNumber: '',
      amount: '',
      billingPeriodStart: getDefaultBillingPeriodStart(),
      billingPeriodEnd: getDefaultBillingPeriodEnd(),
      dueDate: getDefaultHouseholdDueDate(),
      paymentDate: '',
      status: 'pending',
      consumptionValue: '',
      consumptionUnit: 'kWh',
      notes: '',
    },
  })

  const householdBillType = watchHousehold('billType')
  const householdProvider = watchHousehold('provider')
  const householdAccountNumber = watchHousehold('accountNumber')
  const householdAmount = watchHousehold('amount')
  const billingPeriodStart = watchHousehold('billingPeriodStart')
  const billingPeriodEnd = watchHousehold('billingPeriodEnd')
  const householdDueDate = watchHousehold('dueDate')
  const householdPaymentDate = watchHousehold('paymentDate')
  const householdStatus = watchHousehold('status')
  const consumptionValue = watchHousehold('consumptionValue')
  const consumptionUnit = watchHousehold('consumptionUnit')
  const householdNotes = watchHousehold('notes')

  const clearTypeParam = useCallback(() => {
    const next = new URLSearchParams(searchParams)
    next.delete('type')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const resetFiscalState = useCallback(() => {
    resetFiscalForm({
      merchantName: '',
      amount: '',
      date: formatDateInput(new Date()),
      notes: '',
    })
    setFiscalTags([])
    setShareNotice(null)
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    setImagePreviewUrl(null)
    setSelectedImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [imagePreviewUrl, resetFiscalForm])

  const resetHouseholdState = useCallback(() => {
    resetHouseholdForm({
      billType: 'electricity',
      provider: '',
      accountNumber: '',
      amount: '',
      billingPeriodStart: getDefaultBillingPeriodStart(),
      billingPeriodEnd: getDefaultBillingPeriodEnd(),
      dueDate: getDefaultHouseholdDueDate(),
      paymentDate: '',
      status: 'pending',
      consumptionValue: '',
      consumptionUnit: 'kWh',
      notes: '',
    })
  }, [resetHouseholdForm])

  const exitFiscalFlow = useCallback(() => {
    resetFiscalState()
    setReceiptType(null)
    clearTypeParam()
    impactLight()
  }, [clearTypeParam, impactLight, resetFiscalState])

  const exitHouseholdFlow = useCallback(() => {
    resetHouseholdState()
    setReceiptType(null)
    clearTypeParam()
    impactLight()
  }, [clearTypeParam, impactLight, resetHouseholdState])

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
        setFiscalValue('notes', parts.join('\n'), { shouldDirty: true })
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
          const note = `${t('addReceipt.sharedFile')}: ${filename}`
          const currentNotes = getFiscalValues('notes')
          const nextNotes = currentNotes ? `${currentNotes}\n${note}` : note
          setFiscalValue('notes', nextNotes, { shouldDirty: true })
          setShareNotice(t('addReceipt.sharedSavedAsNote'))
          toast.error(t('addReceipt.unsupportedFile'))
          return
        }

        const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' })
        setSelectedImage(file)
        const url = URL.createObjectURL(file)
        setImagePreviewUrl((prev) => {
          if (prev && prev !== url) URL.revokeObjectURL(prev)
          return url
        })
        const notice = t('addReceipt.sharedLoaded')
        setShareNotice(notice)
        toast.success(notice)
        notificationSuccess()
      } catch (error) {
        logger.error('[ShareTarget] Failed to load shared file', error)
        notificationError()
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
  }, [
    fiscalNotes,
    getFiscalValues,
    searchParams,
    setFiscalValue,
    setSearchParams,
    t,
    toast,
    notificationSuccess,
    notificationError,
  ])

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
        toast.error(t('addReceipt.errors.unsupportedFileType'))
        return
      }

      // ⭐ ADDED: Size validation
      if (file.size > MAX_FILE_SIZE) {
        toast.error(t('addReceipt.errors.fileTooLarge'))
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
          toast.error(t('addReceipt.errors.loadTimeout'))
          notificationError()
        }, 10000) // 10 seconds timeout

        img.onload = () => {
          if (handled) return
          handled = true
          clearTimeout(loadTimeout)
          URL.revokeObjectURL(objectUrl)

          if (img.width > MAX_IMAGE_WIDTH || img.height > MAX_IMAGE_HEIGHT) {
            toast.error(
              t('addReceipt.errors.imageTooLarge', {
                width: MAX_IMAGE_WIDTH,
                height: MAX_IMAGE_HEIGHT,
              })
            )
            notificationError()
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
            toast.error(t('addReceipt.errors.previewFailed'))
          }
        }

        img.onerror = () => {
          if (handled) return
          handled = true
          clearTimeout(loadTimeout)
          URL.revokeObjectURL(objectUrl)
          toast.error(t('addReceipt.errors.imageCorrupted'))
          notificationError()
        }

        img.src = objectUrl
      } catch (error) {
        logger.error('Image upload error:', error)
        toast.error(t('addReceipt.errors.processingFailed'))
        notificationError()
      }
    },
    [imagePreviewUrl, toast, t, notificationError]
  )

  const handleRemoveImage = useCallback(() => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    setImagePreviewUrl(null)
    setSelectedImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    impactMedium()
  }, [imagePreviewUrl, impactMedium])

  // ──────────── SUBMIT HANDLERS ────────────
  const onFiscalSubmit: SubmitHandler<FiscalFormValues> = useCallback(
    async (data) => {
      try {
        const amountNum = Number.parseFloat(data.amount)
        if (Number.isNaN(amountNum) || amountNum <= 0) {
          toast.error(t('common.error'))
          notificationError()
          return
        }

        const autoCategory = classifyCategory({ merchantName: data.merchantName })

        const receiptData: Omit<Receipt, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'> = {
          merchantName: sanitizeText(data.merchantName),
          pib: '',
          date: new Date(data.date),
          time: '',
          totalAmount: amountNum,
          category: autoCategory,
          ...(fiscalTags.length > 0 && { tags: fiscalTags }),
          notes: sanitizeText(data.notes ?? ''),
          items: [],
        }

        if (selectedImage) {
          receiptData.imageUrl = await uploadImage(selectedImage)
        }

        await addReceipt(receiptData)
        toast.success(t('addReceipt.success'))
        notificationSuccess()
        navigate('/receipts')
      } catch (error) {
        logger.error('Add fiscal receipt error:', error)
        toast.error(t('common.error'))
        notificationError()
      }
    },
    [
      fiscalTags,
      navigate,
      notificationError,
      notificationSuccess,
      selectedImage,
      t,
      toast,
      uploadImage,
    ]
  )

  const onHouseholdSubmit: SubmitHandler<HouseholdFormValues> = useCallback(
    async (data) => {
      try {
        const amountNum = Number.parseFloat(data.amount)
        if (Number.isNaN(amountNum) || amountNum <= 0) {
          toast.error(t('common.error'))
          notificationError()
          return
        }

        const billData: Omit<HouseholdBill, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'> = {
          billType: data.billType,
          provider: sanitizeText(data.provider),
          accountNumber: sanitizeText(data.accountNumber ?? ''),
          amount: amountNum,
          billingPeriodStart: new Date(data.billingPeriodStart),
          billingPeriodEnd: new Date(data.billingPeriodEnd),
          dueDate: new Date(data.dueDate),
          status: data.status,
          notes: sanitizeText(data.notes ?? ''),
        }

        if (data.paymentDate) {
          billData.paymentDate = new Date(data.paymentDate)
        }

        if (data.consumptionValue) {
          billData.consumption = {
            value: Number.parseFloat(data.consumptionValue),
            unit: data.consumptionUnit,
          }
        }

        await addHouseholdBill(billData)
        toast.success(t('addReceipt.household.success'))
        notificationSuccess()
        navigate('/receipts')
      } catch (error) {
        logger.error('Add household bill error:', error)
        toast.error(t('common.error'))
        notificationError()
      }
    },
    [navigate, notificationError, notificationSuccess, t, toast]
  )

  // ──────────── RENDER ────────────
  if (!receiptType) {
    return (
      <PageTransition>
        <ReceiptTypeSelection
          title={t('addReceipt.typeSelectTitle')}
          fiscalTitle={t('addReceipt.fiscalReceipt')}
          fiscalDescription={t('addReceipt.fiscalDescription')}
          householdTitle={t('addReceipt.householdBill')}
          householdDescription={t('addReceipt.householdDescription')}
          backLabel={t('common.back')}
          prefersReducedMotion={prefersReducedMotion}
          onBack={() => navigate(-1)}
          onSelectFiscal={() => selectType('fiscal')}
          onSelectHousehold={() => selectType('household')}
        />
      </PageTransition>
    )
  }

  // ──────────── FISCAL FORM ────────────
  if (receiptType === 'fiscal') {
    return (
      <PageTransition>
        <ReceiptHeader
          title={t('addReceipt.fiscalReceipt')}
          icon={ReceiptIcon}
          onBack={exitFiscalFlow}
          backLabel={t('common.back')}
          prefersReducedMotion={prefersReducedMotion}
        />

        <FiscalReceiptForm
          shareNotice={shareNotice}
          merchantName={merchantName}
          amount={amount}
          date={date}
          fiscalNotes={fiscalNotes}
          fiscalTags={fiscalTags}
          loading={isFiscalSubmitting}
          isFormValid={isFiscalFormValid}
          errors={{
            merchantName: fiscalErrors.merchantName?.message as string | undefined,
            amount: fiscalErrors.amount?.message as string | undefined,
            date: fiscalErrors.date?.message as string | undefined,
            notes: fiscalErrors.notes?.message as string | undefined,
          }}
          maxDate={formatDateInput(new Date())}
          imagePreviewUrl={imagePreviewUrl}
          fileInputRef={fileInputRef}
          onSubmit={handleFiscalSubmit(onFiscalSubmit)}
          onMerchantNameChange={(value) =>
            setFiscalValue('merchantName', value, { shouldDirty: true, shouldValidate: true })
          }
          onAmountChange={(value) =>
            setFiscalValue('amount', sanitizeAmountInput(value), {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          onDateChange={(value) =>
            setFiscalValue('date', value, { shouldDirty: true, shouldValidate: true })
          }
          onFiscalNotesChange={(value) =>
            setFiscalValue('notes', value, { shouldDirty: true, shouldValidate: true })
          }
          onFiscalTagsChange={setFiscalTags}
          onImageUpload={handleImageUpload}
          onRemoveImage={handleRemoveImage}
          onCancel={exitFiscalFlow}
        />
      </PageTransition>
    )
  }

  // ──────────── HOUSEHOLD FORM ────────────
  // (Keep existing household form from original AddReceiptPage)
  return (
    <PageTransition>
      <ReceiptHeader
        title={t('addReceipt.householdBill')}
        icon={Home}
        onBack={exitHouseholdFlow}
        backLabel={t('common.back')}
        prefersReducedMotion={prefersReducedMotion}
      />

      <HouseholdBillForm
        billTypeOptions={billTypeOptions}
        statusOptions={statusOptions}
        consumptionUnitOptions={consumptionUnitOptions}
        householdBillType={householdBillType}
        householdProvider={householdProvider}
        householdAccountNumber={householdAccountNumber}
        householdAmount={householdAmount}
        billingPeriodStart={billingPeriodStart}
        billingPeriodEnd={billingPeriodEnd}
        householdDueDate={householdDueDate}
        householdPaymentDate={householdPaymentDate}
        householdStatus={householdStatus}
        consumptionValue={consumptionValue}
        consumptionUnit={consumptionUnit}
        householdNotes={householdNotes}
        loading={isHouseholdSubmitting}
        isFormValid={isHouseholdFormValid}
        errors={{
          billType: householdErrors.billType?.message as string | undefined,
          provider: householdErrors.provider?.message as string | undefined,
          accountNumber: householdErrors.accountNumber?.message as string | undefined,
          amount: householdErrors.amount?.message as string | undefined,
          billingPeriodStart: householdErrors.billingPeriodStart?.message as string | undefined,
          billingPeriodEnd: householdErrors.billingPeriodEnd?.message as string | undefined,
          dueDate: householdErrors.dueDate?.message as string | undefined,
          paymentDate: householdErrors.paymentDate?.message as string | undefined,
          status: householdErrors.status?.message as string | undefined,
          consumptionValue: householdErrors.consumptionValue?.message as string | undefined,
          consumptionUnit: householdErrors.consumptionUnit?.message as string | undefined,
          notes: householdErrors.notes?.message as string | undefined,
        }}
        onSubmit={handleHouseholdSubmit(onHouseholdSubmit)}
        onBillTypeChange={(value) =>
          setHouseholdValue('billType', value as HouseholdBillType, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
        onProviderChange={(value) =>
          setHouseholdValue('provider', value, { shouldDirty: true, shouldValidate: true })
        }
        onAccountNumberChange={(value) =>
          setHouseholdValue('accountNumber', value, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
        onAmountChange={(value) =>
          setHouseholdValue('amount', sanitizeAmountInput(value), {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
        onBillingPeriodStartChange={(value) =>
          setHouseholdValue('billingPeriodStart', value, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
        onBillingPeriodEndChange={(value) =>
          setHouseholdValue('billingPeriodEnd', value, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
        onDueDateChange={(value) =>
          setHouseholdValue('dueDate', value, { shouldDirty: true, shouldValidate: true })
        }
        onPaymentDateChange={(value) =>
          setHouseholdValue('paymentDate', value, { shouldDirty: true, shouldValidate: true })
        }
        onStatusChange={(value) =>
          setHouseholdValue('status', value as HouseholdBillStatus, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
        onConsumptionValueChange={(value) =>
          setHouseholdValue('consumptionValue', sanitizeAmountInput(value), {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
        onConsumptionUnitChange={(value) =>
          setHouseholdValue('consumptionUnit', value as HouseholdConsumptionUnit, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
        onNotesChange={(value) =>
          setHouseholdValue('notes', value, { shouldDirty: true, shouldValidate: true })
        }
        onCancel={exitHouseholdFlow}
      />
    </PageTransition>
  )
}

export default memo(AddReceiptPageSimplified)
