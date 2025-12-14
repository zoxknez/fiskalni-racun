// HouseholdBillForm Component
// ──────────────────────────────────────────────────────────────────────────────

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
import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FormActions,
  FormInput,
  FormRow,
  FormSection,
  FormSelect,
  FormTextarea,
} from '@/components/forms'
import { addHouseholdBill } from '@/hooks/useDatabase'
import { useHaptic } from '@/hooks/useHaptic'
import { useSmoothNavigate } from '@/hooks/useSmoothNavigate'
import { useToast } from '@/hooks/useToast'
import { ArrowLeft, Building, Calendar, CreditCard, FileText, Home, Wallet, Zap } from '@/lib/icons'
import { logger } from '@/lib/logger'
import { sanitizeText } from '@/lib/sanitize'
import {
  getDefaultBillingPeriodEnd,
  getDefaultBillingPeriodStart,
  getDefaultHouseholdDueDate,
  sanitizeAmountInput,
} from '../utils'

interface HouseholdBillFormProps {
  onBack: () => void
}

function HouseholdBillFormComponent({ onBack }: HouseholdBillFormProps) {
  const { t, i18n } = useTranslation()
  const navigate = useSmoothNavigate()
  const toast = useToast()
  const prefersReducedMotion = useReducedMotion()
  const { impactLight, notificationError, notificationSuccess } = useHaptic()

  // Form state
  const [billType, setBillType] = useState<HouseholdBillType>('electricity')
  const [provider, setProvider] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [amount, setAmount] = useState('')
  const [billingPeriodStart, setBillingPeriodStart] = useState(getDefaultBillingPeriodStart)
  const [billingPeriodEnd, setBillingPeriodEnd] = useState(getDefaultBillingPeriodEnd)
  const [dueDate, setDueDate] = useState(getDefaultHouseholdDueDate)
  const [paymentDate, setPaymentDate] = useState('')
  const [status, setStatus] = useState<HouseholdBillStatus>('pending')
  const [consumptionValue, setConsumptionValue] = useState('')
  const [consumptionUnit, setConsumptionUnit] = useState<HouseholdConsumptionUnit>('kWh')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  // Options
  const billTypeOptions = useMemo(() => householdBillTypeOptions(i18n.language), [i18n.language])
  const statusOptions = useMemo(() => householdBillStatusOptions(i18n.language), [i18n.language])
  const unitOptions = useMemo(() => householdConsumptionUnitOptions(i18n.language), [i18n.language])

  // Validation
  const isFormValid = useMemo(() => {
    const amountNum = Number.parseFloat(amount)
    return provider.trim().length > 0 && !Number.isNaN(amountNum) && amountNum > 0
  }, [provider, amount])

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

        const start = new Date(billingPeriodStart)
        const end = new Date(billingPeriodEnd)
        if (start > end) {
          toast.error(t('addReceipt.household.invalidPeriod'))
          setLoading(false)
          notificationError()
          return
        }

        const billData: Omit<HouseholdBill, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'> = {
          billType,
          provider: sanitizeText(provider),
          accountNumber: sanitizeText(accountNumber),
          amount: amountNum,
          billingPeriodStart: start,
          billingPeriodEnd: end,
          dueDate: new Date(dueDate),
          status,
          notes: sanitizeText(notes),
        }

        if (paymentDate) {
          billData.paymentDate = new Date(paymentDate)
        }

        if (consumptionValue) {
          billData.consumption = {
            value: Number.parseFloat(consumptionValue),
            unit: consumptionUnit,
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
      } finally {
        setLoading(false)
      }
    },
    [
      amount,
      billType,
      provider,
      accountNumber,
      billingPeriodStart,
      billingPeriodEnd,
      dueDate,
      paymentDate,
      status,
      consumptionValue,
      consumptionUnit,
      notes,
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
        className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-900 p-8 text-white shadow-2xl"
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
            <Home className="h-7 w-7" />
            <h1 className="font-black text-3xl sm:text-4xl">{t('addReceipt.householdBill')}</h1>
          </div>
        </div>
      </motion.div>

      <div className="mx-auto max-w-2xl space-y-4 px-6">
        <form onSubmit={handleSubmit} className="card space-y-6" noValidate>
          {/* Bill Type & Provider Section */}
          <FormSection
            icon={Building}
            title={t('addReceipt.household.billInfo', { defaultValue: 'Informacije o računu' })}
          >
            <FormSelect
              label={t('household.billType')}
              options={billTypeOptions}
              value={billType}
              onChange={(e) => setBillType(e.target.value as HouseholdBillType)}
              required
            />

            <FormInput
              label={t('household.provider')}
              icon={Building}
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder={t('addReceipt.household.providerPlaceholder')}
              required
            />

            <FormInput
              label={t('household.accountNumber')}
              icon={CreditCard}
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
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
              value={amount}
              onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))}
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
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
              <FormInput
                label={t('household.paymentDate')}
                icon={Calendar}
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </FormRow>

            <FormSelect
              label={t('household.status')}
              options={statusOptions}
              value={status}
              onChange={(e) => setStatus(e.target.value as HouseholdBillStatus)}
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
                options={unitOptions}
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

export const HouseholdBillForm = memo(HouseholdBillFormComponent)
