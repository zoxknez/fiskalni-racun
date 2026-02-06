import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FormActions,
  FormInput,
  FormRow,
  FormSection,
  FormSelect,
  FormTextarea,
} from '@/components/forms'
import { Building, Calendar, CreditCard, FileText, Wallet, Zap } from '@/lib/icons'

interface FormSelectOption {
  value: string
  label: string
}

interface HouseholdBillFormProps {
  billTypeOptions: FormSelectOption[]
  statusOptions: FormSelectOption[]
  consumptionUnitOptions: FormSelectOption[]
  householdBillType: string
  householdProvider: string
  householdAccountNumber: string
  householdAmount: string
  billingPeriodStart: string
  billingPeriodEnd: string
  householdDueDate: string
  householdPaymentDate: string
  householdStatus: string
  consumptionValue: string
  consumptionUnit: string
  householdNotes: string
  loading: boolean
  isFormValid: boolean
  errors?: {
    billType?: string
    provider?: string
    accountNumber?: string
    amount?: string
    billingPeriodStart?: string
    billingPeriodEnd?: string
    dueDate?: string
    paymentDate?: string
    status?: string
    consumptionValue?: string
    consumptionUnit?: string
    notes?: string
  }
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onBillTypeChange: (value: string) => void
  onProviderChange: (value: string) => void
  onAccountNumberChange: (value: string) => void
  onAmountChange: (value: string) => void
  onBillingPeriodStartChange: (value: string) => void
  onBillingPeriodEndChange: (value: string) => void
  onDueDateChange: (value: string) => void
  onPaymentDateChange: (value: string) => void
  onStatusChange: (value: string) => void
  onConsumptionValueChange: (value: string) => void
  onConsumptionUnitChange: (value: string) => void
  onNotesChange: (value: string) => void
  onCancel: () => void
}

export function HouseholdBillForm({
  billTypeOptions,
  statusOptions,
  consumptionUnitOptions,
  householdBillType,
  householdProvider,
  householdAccountNumber,
  householdAmount,
  billingPeriodStart,
  billingPeriodEnd,
  householdDueDate,
  householdPaymentDate,
  householdStatus,
  consumptionValue,
  consumptionUnit,
  householdNotes,
  loading,
  isFormValid,
  errors,
  onSubmit,
  onBillTypeChange,
  onProviderChange,
  onAccountNumberChange,
  onAmountChange,
  onBillingPeriodStartChange,
  onBillingPeriodEndChange,
  onDueDateChange,
  onPaymentDateChange,
  onStatusChange,
  onConsumptionValueChange,
  onConsumptionUnitChange,
  onNotesChange,
  onCancel,
}: HouseholdBillFormProps) {
  const { t } = useTranslation()

  return (
    <div className="mx-auto max-w-2xl px-6">
      <form onSubmit={onSubmit} className="card space-y-6" noValidate>
        <FormSection icon={Building} title={t('addReceipt.household.providerInfo')}>
          <FormSelect
            label={t('household.billType')}
            icon={Zap}
            options={billTypeOptions}
            value={householdBillType}
            onChange={(event) => onBillTypeChange(event.target.value)}
            error={errors?.billType}
            required
          />

          <FormInput
            label={t('household.provider')}
            icon={Building}
            value={householdProvider}
            onChange={(event) => onProviderChange(event.target.value)}
            placeholder={t('addReceipt.household.providerPlaceholder')}
            error={errors?.provider}
            required
          />

          <FormInput
            label={t('household.accountNumber')}
            icon={CreditCard}
            value={householdAccountNumber}
            onChange={(event) => onAccountNumberChange(event.target.value)}
            placeholder={t('addReceipt.household.accountPlaceholder')}
            error={errors?.accountNumber}
          />
        </FormSection>

        <FormSection icon={Wallet} title={t('addReceipt.household.amountPeriod')}>
          <FormInput
            label={t('addReceipt.amount')}
            icon={Wallet}
            type="number"
            value={householdAmount}
            onChange={(event) => onAmountChange(event.target.value)}
            error={errors?.amount}
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
              onChange={(event) => onBillingPeriodStartChange(event.target.value)}
              error={errors?.billingPeriodStart}
              required
            />
            <FormInput
              label={t('household.billingPeriodEnd')}
              icon={Calendar}
              type="date"
              value={billingPeriodEnd}
              onChange={(event) => onBillingPeriodEndChange(event.target.value)}
              error={errors?.billingPeriodEnd}
              required
            />
          </FormRow>
        </FormSection>

        <FormSection icon={Calendar} title={t('addReceipt.household.dueStatus')}>
          <FormRow>
            <FormInput
              label={t('household.dueDate')}
              icon={Calendar}
              type="date"
              value={householdDueDate}
              onChange={(event) => onDueDateChange(event.target.value)}
              error={errors?.dueDate}
              required
            />
            <FormInput
              label={t('household.paymentDate')}
              icon={Calendar}
              type="date"
              value={householdPaymentDate}
              onChange={(event) => onPaymentDateChange(event.target.value)}
              error={errors?.paymentDate}
            />
          </FormRow>

          <FormSelect
            label={t('household.status')}
            options={statusOptions}
            value={householdStatus}
            onChange={(event) => onStatusChange(event.target.value)}
            error={errors?.status}
          />
        </FormSection>

        <FormSection icon={Zap} title={t('household.consumption')} defaultCollapsed>
          <FormRow>
            <FormInput
              label={t('household.consumptionValue', { defaultValue: 'Vrednost' })}
              type="number"
              value={consumptionValue}
              onChange={(event) => onConsumptionValueChange(event.target.value)}
              error={errors?.consumptionValue}
              min="0"
              step="0.01"
              placeholder="0.00"
              inputMode="decimal"
            />
            <FormSelect
              label={t('household.consumptionUnit', { defaultValue: 'Jedinica' })}
              options={consumptionUnitOptions}
              value={consumptionUnit}
              onChange={(event) => onConsumptionUnitChange(event.target.value)}
              error={errors?.consumptionUnit}
            />
          </FormRow>
        </FormSection>

        <FormSection icon={FileText} title={t('receiptDetail.notes')} defaultCollapsed>
          <FormTextarea
            label={t('addReceipt.addNote')}
            icon={FileText}
            value={householdNotes}
            onChange={(event) => onNotesChange(event.target.value)}
            error={errors?.notes}
            rows={4}
          />
        </FormSection>

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
