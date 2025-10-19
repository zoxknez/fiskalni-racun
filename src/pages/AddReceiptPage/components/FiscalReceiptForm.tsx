import { categoryOptions } from '@lib/categories'
import { useId, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { FiscalReceiptFormData, FiscalValidationErrors } from '../types'
import { sanitizeAmountInput } from '../utils/formatters'
import { isValidPib } from '../utils/validators'

interface FiscalReceiptFormProps {
  formData: FiscalReceiptFormData
  errors: FiscalValidationErrors
  onFieldChange: (field: keyof FiscalReceiptFormData, value: string) => void
  onCategoryChange: (category: string) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  loading: boolean
  isValid: boolean
}

export function FiscalReceiptForm({
  formData,
  errors,
  onFieldChange,
  onCategoryChange,
  onSubmit,
  onCancel,
  loading,
  isValid,
}: FiscalReceiptFormProps) {
  const { t, i18n } = useTranslation()

  const categories = useMemo(() => {
    const locale = i18n.language === 'sr' ? 'sr-Latn' : 'en'
    return categoryOptions(locale)
  }, [i18n.language])

  const idPrefix = useId()
  const sanitizedIdPrefix = useMemo(
    () => idPrefix.replace(/[^a-zA-Z0-9_-]/g, '') || 'fiscal',
    [idPrefix]
  )

  const fieldIds = useMemo(
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

  const preventNumberScroll = (e: React.WheelEvent<HTMLInputElement>) =>
    (e.currentTarget as HTMLInputElement).blur()

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {/* Merchant Name */}
      <div>
        <label
          htmlFor={fieldIds.merchant}
          className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
        >
          {t('addReceipt.vendorRequired')}
        </label>
        <input
          id={fieldIds.merchant}
          type="text"
          value={formData.merchantName}
          onChange={(e) => onFieldChange('merchantName', e.target.value)}
          className="input"
          placeholder="Maxi, Idea, Tehnomanija..."
          required
          minLength={2}
          autoComplete="organization"
          aria-invalid={!!errors['merchantName']}
        />
        {errors['merchantName'] && (
          <p className="mt-1 text-red-600 text-xs dark:text-red-400">{errors['merchantName']}</p>
        )}
      </div>

      {/* PIB */}
      <div>
        <label
          htmlFor={fieldIds.pib}
          className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
        >
          PIB {t('common.required')}
        </label>
        <input
          id={fieldIds.pib}
          type="text"
          value={formData.pib}
          onChange={(e) => onFieldChange('pib', e.target.value.replace(/\D/g, '').slice(0, 9))}
          className="input"
          placeholder="123456789"
          required
          inputMode="numeric"
          pattern="^[0-9]{9}$"
          minLength={9}
          maxLength={9}
          autoComplete="off"
          aria-describedby={fieldIds.pibHelp}
          aria-invalid={formData.pib !== '' && !isValidPib(formData.pib)}
        />
        <p id={fieldIds.pibHelp} className="mt-1 text-dark-500 text-xs">
          {t('addReceipt.pibHelp', {
            defaultValue: 'Unesite 9 cifara (bez razmaka i znakova).',
          })}
        </p>
        {errors['pib'] && (
          <p className="mt-1 text-red-600 text-xs dark:text-red-400">{errors['pib']}</p>
        )}
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor={fieldIds.date}
            className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
          >
            {t('addReceipt.dateRequired')}
          </label>
          <input
            id={fieldIds.date}
            type="date"
            value={formData.date}
            onChange={(e) => onFieldChange('date', e.target.value)}
            className="input"
            required
            max={new Date().toISOString().split('T')[0]}
            aria-invalid={!!errors['date']}
          />
          {errors['date'] && (
            <p className="mt-1 text-red-600 text-xs dark:text-red-400">{errors['date']}</p>
          )}
        </div>

        <div>
          <label
            htmlFor={fieldIds.time}
            className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
          >
            {t('receiptDetail.time')}
          </label>
          <input
            id={fieldIds.time}
            type="time"
            value={formData.time}
            onChange={(e) => onFieldChange('time', e.target.value)}
            className="input"
            aria-invalid={!!errors['time']}
          />
          {errors['time'] && (
            <p className="mt-1 text-red-600 text-xs dark:text-red-400">{errors['time']}</p>
          )}
        </div>
      </div>

      {/* Amount */}
      <div>
        <label
          htmlFor={fieldIds.amount}
          className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
        >
          {t('addReceipt.amountRequired')}
        </label>
        <input
          id={fieldIds.amount}
          type="number"
          value={formData.amount}
          onChange={(e) => onFieldChange('amount', sanitizeAmountInput(e.target.value))}
          onWheel={preventNumberScroll}
          className="input"
          required
          min="0"
          step="0.01"
          placeholder="0.00"
          inputMode="decimal"
          aria-invalid={!!errors['amount']}
        />
        {errors['amount'] && (
          <p className="mt-1 text-red-600 text-xs dark:text-red-400">{errors['amount']}</p>
        )}
      </div>

      {/* Category */}
      <div>
        <label
          htmlFor={fieldIds.category}
          className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
        >
          {t('addReceipt.selectCategory')}
        </label>
        <select
          id={fieldIds.category}
          value={formData.category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="input"
          aria-invalid={!!errors['category']}
        >
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        {errors['category'] && (
          <p className="mt-1 text-red-600 text-xs dark:text-red-400">{errors['category']}</p>
        )}
      </div>

      {/* Notes */}
      <div>
        <label
          htmlFor={fieldIds.notes}
          className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
        >
          {t('receiptDetail.notes')}
        </label>
        <textarea
          id={fieldIds.notes}
          value={formData.notes}
          onChange={(e) => onFieldChange('notes', e.target.value)}
          className="input min-h-[100px] resize-y"
          placeholder={t('addReceipt.addNote')}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary flex-1"
          disabled={loading}
        >
          {t('common.cancel')}
        </button>
        <button type="submit" className="btn-primary flex-1" disabled={loading || !isValid}>
          {loading ? t('common.loading') : t('common.save')}
        </button>
      </div>
    </form>
  )
}
