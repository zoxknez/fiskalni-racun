import { motion } from 'framer-motion'
import type { ChangeEvent, FormEvent, RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { TagInput } from '@/components/common/TagInput'
import { FormActions, FormInput, FormRow, FormSection, FormTextarea } from '@/components/forms'
import { Calendar, Camera, FileText, Store, Wallet, X } from '@/lib/icons'

interface FiscalReceiptFormProps {
  shareNotice: string | null
  merchantName: string
  amount: string
  date: string
  fiscalNotes: string
  fiscalTags: string[]
  loading: boolean
  isFormValid: boolean
  errors?: {
    merchantName?: string
    amount?: string
    date?: string
    notes?: string
  }
  maxDate: string
  imagePreviewUrl: string | null
  fileInputRef: RefObject<HTMLInputElement>
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onMerchantNameChange: (value: string) => void
  onAmountChange: (value: string) => void
  onDateChange: (value: string) => void
  onFiscalNotesChange: (value: string) => void
  onFiscalTagsChange: (tags: string[]) => void
  onImageUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onRemoveImage: () => void
  onCancel: () => void
}

export function FiscalReceiptForm({
  shareNotice,
  merchantName,
  amount,
  date,
  fiscalNotes,
  fiscalTags,
  loading,
  isFormValid,
  errors,
  maxDate,
  imagePreviewUrl,
  fileInputRef,
  onSubmit,
  onMerchantNameChange,
  onAmountChange,
  onDateChange,
  onFiscalNotesChange,
  onFiscalTagsChange,
  onImageUpload,
  onRemoveImage,
  onCancel,
}: FiscalReceiptFormProps) {
  const { t } = useTranslation()

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-6">
      {shareNotice && (
        <div className="flex items-start gap-3 rounded-xl border border-primary-200/70 bg-primary-50 px-4 py-3 text-primary-900 shadow-sm">
          <div className="mt-1 h-2 w-2 rounded-full bg-primary-500" aria-hidden />
          <p className="text-sm leading-relaxed">{shareNotice}</p>
        </div>
      )}

      <form onSubmit={onSubmit} className="card space-y-6" noValidate>
        <FormSection icon={Store} title={t('addReceipt.basicInfo')}>
          <FormInput
            label={t('addReceipt.storeName')}
            icon={Store}
            value={merchantName}
            onChange={(event) => onMerchantNameChange(event.target.value)}
            placeholder={t('addReceipt.storeNamePlaceholder')}
            error={errors?.merchantName}
            required
          />

          <FormRow>
            <FormInput
              label={t('addReceipt.amount')}
              icon={Wallet}
              type="number"
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
              placeholder={t('addReceipt.amountPlaceholder')}
              error={errors?.amount}
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
              onChange={(event) => onDateChange(event.target.value)}
              error={errors?.date}
              required
              max={maxDate}
            />
          </FormRow>
        </FormSection>

        <FormSection icon={Camera} title={t('addReceipt.addPhoto')} defaultCollapsed>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={onImageUpload}
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
                onClick={onRemoveImage}
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

        <FormSection icon={FileText} title={t('receiptDetail.notes')} defaultCollapsed>
          <FormTextarea
            label={t('addReceipt.addNote')}
            icon={FileText}
            value={fiscalNotes}
            onChange={(event) => onFiscalNotesChange(event.target.value)}
            error={errors?.notes}
            rows={4}
          />
        </FormSection>

        <TagInput tags={fiscalTags} onChange={onFiscalTagsChange} maxTags={5} disabled={loading} />

        <FormActions
          submitLabel={loading ? t('common.loading') : t('common.save')}
          cancelLabel={t('common.cancel')}
          onCancel={onCancel}
          isSubmitting={loading}
          isDisabled={!isFormValid}
        />
      </form>
    </div>
  )
}
