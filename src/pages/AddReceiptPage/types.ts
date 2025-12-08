import type {
  HouseholdBillStatus,
  HouseholdBillType,
  HouseholdConsumptionUnit,
} from '@lib/household'

/**
 * Form modes
 */
export type FormMode = 'photo' | 'manual'
export type ManualFormType = 'fiscal' | 'household'

/**
 * Fiscal receipt form data
 */
export interface FiscalReceiptFormData {
  merchantName: string
  pib: string
  date: string
  time: string
  amount: string
  category: string
  notes: string
}

/**
 * Household bill form data
 */
export interface HouseholdBillFormData {
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

/**
 * Fiscal receipt validation errors
 */
export type FiscalValidationErrors = {
  merchantName?: string
  pib?: string
  date?: string
  time?: string
  amount?: string
  category?: string
  notes?: string
}

/**
 * Household bill validation errors
 */
export type HouseholdValidationErrors = {
  provider?: string
  billType?: string
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

/**
 * Form validation errors (union type)
 */
export type ValidationErrors = FiscalValidationErrors | HouseholdValidationErrors

/**
 * QR Code parsed data (from fiscal receipt)
 */
export interface ParsedQRData {
  merchantName: string
  pib: string
  date: string
  time: string
  amount: string
}
