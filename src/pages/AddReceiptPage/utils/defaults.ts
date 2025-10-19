/**
 * Default value generators for AddReceiptPage forms
 */

import { DEFAULT_DUE_DATE_OFFSET_DAYS } from '../constants'
import type { FiscalReceiptFormData, HouseholdBillFormData } from '../types'
import { formatDateInput, formatTimeInput } from './formatters'

/**
 * Get default billing period start date (first day of current month)
 */
export function getDefaultBillingPeriodStart(): string {
  const date = new Date()
  date.setDate(1) // First day of month
  return formatDateInput(date)
}

/**
 * Get default billing period end date (last day of current month)
 */
export function getDefaultBillingPeriodEnd(): string {
  const date = new Date()
  date.setMonth(date.getMonth() + 1, 0) // Last day of current month
  return formatDateInput(date)
}

/**
 * Get default household bill due date (7 days from now)
 */
export function getDefaultHouseholdDueDate(): string {
  const date = new Date()
  date.setDate(date.getDate() + DEFAULT_DUE_DATE_OFFSET_DAYS)
  return formatDateInput(date)
}

/**
 * Get default fiscal receipt form data
 */
export function getDefaultFiscalReceiptData(): FiscalReceiptFormData {
  const now = new Date()
  return {
    merchantName: '',
    pib: '',
    date: formatDateInput(now),
    time: formatTimeInput(now),
    amount: '',
    category: '',
    notes: '',
  }
}

/**
 * Get default household bill form data
 */
export function getDefaultHouseholdBillData(): HouseholdBillFormData {
  return {
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
  }
}
