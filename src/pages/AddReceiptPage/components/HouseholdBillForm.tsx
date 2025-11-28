import {
  householdBillStatusOptions,
  householdBillTypeOptions,
  householdConsumptionUnitOptions,
} from '@lib/household'
import { memo, useId, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { HouseholdBillFormData, HouseholdValidationErrors } from '../types'
import { sanitizeAmountInput } from '../utils/formatters'

interface HouseholdBillFormProps {
  formData: HouseholdBillFormData
  errors: HouseholdValidationErrors
  onFieldChange: (field: keyof HouseholdBillFormData, value: string) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  loading: boolean
  isValid: boolean
}

export const HouseholdBillForm = memo(function HouseholdBillForm({
  formData,
  errors,
  onFieldChange,
  onSubmit,
  onCancel,
  loading,
  isValid,
}: HouseholdBillFormProps) {
  const { t, i18n } = useTranslation()

  const billTypeOptions = useMemo(() => householdBillTypeOptions(i18n.language), [i18n.language])
  const statusOptions = useMemo(() => householdBillStatusOptions(i18n.language), [i18n.language])
  const consumptionUnitOptions = useMemo(
    () => householdConsumptionUnitOptions(i18n.language),
    [i18n.language]
  )

  const idPrefix = useId()
  const sanitizedIdPrefix = useMemo(
    () => idPrefix.replace(/[^a-zA-Z0-9_-]/g, '') || 'household',
    [idPrefix]
  )

  const fieldIds = useMemo(
    () => ({
      billType: `${sanitizedIdPrefix}-bill-type`,
      provider: `${sanitizedIdPrefix}-provider`,
      account: `${sanitizedIdPrefix}-account`,
      amount: `${sanitizedIdPrefix}-amount`,
      billingStart: `${sanitizedIdPrefix}-billing-start`,
      billingEnd: `${sanitizedIdPrefix}-billing-end`,
      dueDate: `${sanitizedIdPrefix}-due-date`,
      paymentDate: `${sanitizedIdPrefix}-payment-date`,
      status: `${sanitizedIdPrefix}-status`,
      consumptionValue: `${sanitizedIdPrefix}-consumption-value`,
      consumptionUnit: `${sanitizedIdPrefix}-consumption-unit`,
      notes: `${sanitizedIdPrefix}-notes`,
    }),
    [sanitizedIdPrefix]
  )

  const preventNumberScroll = (e: React.WheelEvent<HTMLInputElement>) =>
    (e.currentTarget as HTMLInputElement).blur()

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {/* Provider */}
      <div>
        <label
          htmlFor={fieldIds.provider}
          className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
        >
          {t('household.provider')}
        </label>
        <input
          id={fieldIds.provider}
          type="text"
          value={formData.provider}
          onChange={(e) => onFieldChange('provider', e.target.value)}
          className="input"
          placeholder={t('addReceipt.household.providerPlaceholder', {
            defaultValue: 'EPS, Infostan, SBB...',
          })}
          required
          aria-invalid={!!errors['provider']}
        />
        {errors['provider'] && (
          <p className="mt-1 text-red-600 text-xs dark:text-red-400">{errors['provider']}</p>
        )}
      </div>

      {/* Bill Type */}
      <div>
        <label
          htmlFor={fieldIds.billType}
          className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
        >
          {t('household.billType')}
        </label>
        <select
          id={fieldIds.billType}
          value={formData.billType}
          onChange={(e) => onFieldChange('billType', e.target.value)}
          className="input"
        >
          {billTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Account Number & Status */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor={fieldIds.account}
            className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
          >
            {t('household.accountNumber')}
          </label>
          <input
            id={fieldIds.account}
            type="text"
            value={formData.accountNumber}
            onChange={(e) => onFieldChange('accountNumber', e.target.value)}
            className="input"
            placeholder={t('addReceipt.household.accountPlaceholder', {
              defaultValue: 'Broj korisničkog naloga (opciono)',
            })}
          />
        </div>
        <div>
          <label
            htmlFor={fieldIds.status}
            className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
          >
            {t('household.status')}
          </label>
          <select
            id={fieldIds.status}
            value={formData.status}
            onChange={(e) => onFieldChange('status', e.target.value)}
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

      {/* Amount */}
      <div>
        <label
          htmlFor={fieldIds.amount}
          className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
        >
          {t('household.amount')}
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

      {/* Billing Period */}
      <div>
        <label className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300">
          {t('household.billingPeriod')}
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <input
              id={fieldIds.billingStart}
              type="date"
              value={formData.billingPeriodStart}
              onChange={(e) => onFieldChange('billingPeriodStart', e.target.value)}
              className="input"
              required
              aria-invalid={!!errors['billingPeriodStart']}
            />
            {errors['billingPeriodStart'] && (
              <p className="mt-1 text-red-600 text-xs dark:text-red-400">
                {errors['billingPeriodStart']}
              </p>
            )}
          </div>
          <div>
            <input
              id={fieldIds.billingEnd}
              type="date"
              value={formData.billingPeriodEnd}
              onChange={(e) => onFieldChange('billingPeriodEnd', e.target.value)}
              className="input"
              required
              aria-invalid={!!errors['billingPeriodEnd']}
            />
            {errors['billingPeriodEnd'] && (
              <p className="mt-1 text-red-600 text-xs dark:text-red-400">
                {errors['billingPeriodEnd']}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Due Date & Payment Date */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor={fieldIds.dueDate}
            className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
          >
            {t('household.dueDate')}
          </label>
          <input
            id={fieldIds.dueDate}
            type="date"
            value={formData.dueDate}
            onChange={(e) => onFieldChange('dueDate', e.target.value)}
            className="input"
            required
            aria-invalid={!!errors['dueDate']}
          />
          {errors['dueDate'] && (
            <p className="mt-1 text-red-600 text-xs dark:text-red-400">{errors['dueDate']}</p>
          )}
        </div>
        <div>
          <label
            htmlFor={fieldIds.paymentDate}
            className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300"
          >
            {t('household.paymentDate')}
          </label>
          <input
            id={fieldIds.paymentDate}
            type="date"
            value={formData.paymentDate}
            onChange={(e) => onFieldChange('paymentDate', e.target.value)}
            className="input"
          />
        </div>
      </div>

      {/* Consumption */}
      <div>
        <label className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300">
          {t('household.consumption')}
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            id={fieldIds.consumptionValue}
            type="number"
            value={formData.consumptionValue}
            onChange={(e) => onFieldChange('consumptionValue', sanitizeAmountInput(e.target.value))}
            onWheel={preventNumberScroll}
            className="input"
            min="0"
            step="0.01"
            placeholder="0.00"
            inputMode="decimal"
          />
          <select
            id={fieldIds.consumptionUnit}
            value={formData.consumptionUnit}
            onChange={(e) => onFieldChange('consumptionUnit', e.target.value)}
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
})
