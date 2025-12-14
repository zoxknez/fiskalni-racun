// FiscalReceiptForm Component
// ──────────────────────────────────────────────────────────────────────────────

import { motion, useReducedMotion } from 'framer-motion'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TagInput } from '@/components/common/TagInput'
import { FormActions, FormInput, FormRow, FormSection, FormTextarea } from '@/components/forms'
import { addReceipt } from '@/hooks/useDatabase'
import { useHaptic } from '@/hooks/useHaptic'
import { useSmoothNavigate } from '@/hooks/useSmoothNavigate'
import { useToast } from '@/hooks/useToast'
import { classifyCategory } from '@/lib/categories'
import {
  ArrowLeft,
  Calendar,
  Camera,
  FileText,
  Receipt as ReceiptIcon,
  Store,
  Wallet,
  X,
} from '@/lib/icons'
import { logger } from '@/lib/logger'
import { sanitizeText } from '@/lib/sanitize'
import { uploadImageWithCompression } from '@/services/imageUploadService'
import type { Receipt } from '@/types'
import { AUTH_TOKEN_KEY, MAX_FILE_SIZE, MAX_IMAGE_HEIGHT, MAX_IMAGE_WIDTH } from '../constants'
import { formatDateInput, sanitizeAmountInput } from '../utils'

interface FiscalReceiptFormProps {
  onBack: () => void
  shareNotice?: string | null
}

function FiscalReceiptFormComponent({ onBack, shareNotice }: FiscalReceiptFormProps) {
  const { t } = useTranslation()
  const navigate = useSmoothNavigate()
  const toast = useToast()
  const prefersReducedMotion = useReducedMotion()
  const { impactLight, notificationError, notificationSuccess } = useHaptic()

  // Form state
  const [merchantName, setMerchantName] = useState('')
  const [date, setDate] = useState(() => formatDateInput(new Date()))
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Validation
  const isFormValid = useMemo(() => {
    const amountNum = Number.parseFloat(amount)
    return merchantName.trim().length > 0 && !Number.isNaN(amountNum) && amountNum > 0
  }, [merchantName, amount])

  // Cleanup image preview on unmount
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    }
  }, [imagePreviewUrl])

  // Image upload handler
  const handleImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      if (!file.type.startsWith('image/')) {
        toast.error(
          t('addReceipt.errors.unsupportedFileType', { defaultValue: 'Nepodržan tip fajla.' })
        )
        return
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error(
          t('addReceipt.errors.fileTooLarge', { defaultValue: 'Fajl je prevelik. Max 4.5MB.' })
        )
        return
      }

      // Validate dimensions
      const img = new Image()
      const objectUrl = URL.createObjectURL(file)
      let handled = false

      const loadTimeout = setTimeout(() => {
        if (handled) return
        handled = true
        URL.revokeObjectURL(objectUrl)
        toast.error(t('addReceipt.errors.loadTimeout', { defaultValue: 'Timeout pri učitavanju.' }))
        notificationError()
      }, 10000)

      img.onload = () => {
        if (handled) return
        handled = true
        clearTimeout(loadTimeout)
        URL.revokeObjectURL(objectUrl)

        if (img.width > MAX_IMAGE_WIDTH || img.height > MAX_IMAGE_HEIGHT) {
          toast.error(t('addReceipt.errors.imageTooLarge', { defaultValue: 'Slika je prevelika.' }))
          notificationError()
          return
        }

        if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
        const previewUrl = URL.createObjectURL(file)
        setImagePreviewUrl(previewUrl)
        setSelectedImage(file)
      }

      img.onerror = () => {
        if (handled) return
        handled = true
        clearTimeout(loadTimeout)
        URL.revokeObjectURL(objectUrl)
        toast.error(
          t('addReceipt.errors.imageCorrupted', { defaultValue: 'Greška pri učitavanju slike.' })
        )
        notificationError()
      }

      img.src = objectUrl
    },
    [imagePreviewUrl, toast, t, notificationError]
  )

  const handleRemoveImage = useCallback(() => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    setImagePreviewUrl(null)
    setSelectedImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    impactLight()
  }, [imagePreviewUrl, impactLight])

  // Submit handler
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!isFormValid || loading) return
      setLoading(true)

      try {
        const amountNum = Number.parseFloat(amount)
        if (Number.isNaN(amountNum) || amountNum <= 0) {
          toast.error(t('common.error'))
          setLoading(false)
          return
        }

        let imageUrl: string | undefined
        if (selectedImage) {
          const token = localStorage.getItem(AUTH_TOKEN_KEY)
          if (token) {
            const result = await uploadImageWithCompression(selectedImage, token)
            if (result.url) imageUrl = result.url
          }
        }

        const category = classifyCategory({ merchantName })

        const receiptData: Omit<Receipt, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'> = {
          merchantName: sanitizeText(merchantName),
          pib: '',
          date: new Date(date),
          time: new Date().toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' }),
          totalAmount: amountNum,
          category,
          ...(tags.length > 0 && { tags }),
          ...(notes && { notes: sanitizeText(notes) }),
          ...(imageUrl && { imageUrl }),
        }

        await addReceipt(receiptData)
        toast.success(t('addReceipt.success'))
        notificationSuccess()
        navigate('/receipts')
      } catch (error) {
        logger.error('Add fiscal receipt error:', error)
        toast.error(t('common.error'))
        notificationError()
      } finally {
        setLoading(false)
      }
    },
    [
      amount,
      date,
      merchantName,
      notes,
      tags,
      selectedImage,
      isFormValid,
      loading,
      t,
      toast,
      navigate,
      notificationError,
      notificationSuccess,
    ]
  )

  return (
    <>
      {/* Header */}
      <motion.div
        className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-purple-900 p-8 text-white shadow-2xl"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
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

        <motion.div
          animate={prefersReducedMotion ? {} : { y: [0, -20, 0], rotate: [0, 360] }}
          transition={
            prefersReducedMotion
              ? {}
              : { duration: 10, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }
          }
          className="-top-16 -left-16 absolute h-64 w-64 rounded-full bg-white/10 blur-2xl"
        />
        <motion.div
          animate={prefersReducedMotion ? {} : { y: [0, 15, 0], rotate: [0, -360] }}
          transition={
            prefersReducedMotion
              ? {}
              : { duration: 12, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }
          }
          className="-top-24 -right-24 absolute h-96 w-96 rounded-full bg-white/20 blur-2xl"
        />

        <div className="relative z-10">
          <div className="mb-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onBack()
                impactLight()
              }}
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

        <form onSubmit={handleSubmit} className="card space-y-6" noValidate>
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
                whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dark-300 border-dashed bg-dark-50 p-8 text-dark-600 transition-all hover:border-primary-400 hover:bg-primary-50 hover:text-primary-600 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-400 dark:hover:border-primary-500 dark:hover:bg-dark-700 dark:hover:text-primary-400"
              >
                <Camera className="h-10 w-10" />
                <span className="font-medium">{t('addReceipt.addPhoto')}</span>
              </motion.button>
            )}
          </FormSection>

          {/* Tags Section */}
          <FormSection icon={FileText} title={t('tags.label')} defaultCollapsed>
            <TagInput tags={tags} onChange={setTags} />
          </FormSection>

          {/* Notes Section */}
          <FormSection icon={FileText} title={t('receiptDetail.notes')} defaultCollapsed>
            <FormTextarea
              label={t('addReceipt.addNote')}
              icon={FileText}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </FormSection>

          {/* Actions */}
          <FormActions
            submitLabel={loading ? t('common.loading') : t('common.save')}
            cancelLabel={t('common.cancel')}
            onCancel={onBack}
            isSubmitting={loading}
            isDisabled={!isFormValid}
          />
        </form>
      </div>
    </>
  )
}

export const FiscalReceiptForm = memo(FiscalReceiptFormComponent)
