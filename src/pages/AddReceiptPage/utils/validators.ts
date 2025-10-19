/**
 * Validation utilities for AddReceiptPage
 */

import { PIB_REGEX } from '../constants'
import type {
  FiscalReceiptFormData,
  FiscalValidationErrors,
  HouseholdBillFormData,
  HouseholdValidationErrors,
} from '../types'

/**
 * Validate PIB (Tax Identification Number)
 * Must be exactly 9 digits
 */
export function isValidPib(pib: string): boolean {
  return PIB_REGEX.test(pib)
}

/**
 * Validate amount string
 * Must be a valid number greater than 0
 */
export function isValidAmount(amount: string): boolean {
  if (!amount.trim()) return false
  const num = Number.parseFloat(amount)
  return !Number.isNaN(num) && num > 0
}

/**
 * Validate date string
 * Must be in YYYY-MM-DD format
 */
export function isValidDate(date: string): boolean {
  const isoFormat = /^\d{4}-\d{2}-\d{2}$/
  if (!isoFormat.test(date)) return false

  const parsed = new Date(date)
  return !Number.isNaN(parsed.getTime())
}

/**
 * Validate fiscal receipt form data
 * Returns validation errors object
 */
export function validateFiscalReceipt(data: FiscalReceiptFormData): FiscalValidationErrors {
  const errors: FiscalValidationErrors = {}

  // Merchant name is required
  if (!data.merchantName.trim()) {
    errors['merchantName'] = 'Naziv prodavca je obavezan'
  }

  // PIB validation (optional but if provided must be valid)
  if (data.pib && !isValidPib(data.pib)) {
    errors['pib'] = 'PIB mora biti 9 cifara'
  }

  // Date is required and must be valid
  if (!data.date) {
    errors['date'] = 'Datum je obavezan'
  } else if (!isValidDate(data.date)) {
    errors['date'] = 'Neispravan format datuma'
  }

  // Time validation (optional but if provided must be valid)
  if (data.time && !/^\d{2}:\d{2}$/.test(data.time)) {
    errors['time'] = 'Vreme mora biti u formatu HH:MM'
  }

  // Amount is required and must be valid
  if (!data.amount) {
    errors['amount'] = 'Iznos je obavezan'
  } else if (!isValidAmount(data.amount)) {
    errors['amount'] = 'Iznos mora biti veći od 0'
  }

  // Category is required
  if (!data.category.trim()) {
    errors['category'] = 'Kategorija je obavezna'
  }

  return errors
}

/**
 * Validate household bill form data
 * Returns validation errors object
 */
export function validateHouseholdBill(data: HouseholdBillFormData): HouseholdValidationErrors {
  const errors: HouseholdValidationErrors = {}

  // Provider is required
  if (!data.provider.trim()) {
    errors['provider'] = 'Provajder je obavezan'
  }

  // Amount is required and must be valid
  if (!data.amount) {
    errors['amount'] = 'Iznos je obavezan'
  } else if (!isValidAmount(data.amount)) {
    errors['amount'] = 'Iznos mora biti veći od 0'
  }

  // Billing period start is required
  if (!data.billingPeriodStart) {
    errors['billingPeriodStart'] = 'Početak perioda je obavezan'
  } else if (!isValidDate(data.billingPeriodStart)) {
    errors['billingPeriodStart'] = 'Neispravan format datuma'
  }

  // Billing period end is required
  if (!data.billingPeriodEnd) {
    errors['billingPeriodEnd'] = 'Kraj perioda je obavezan'
  } else if (!isValidDate(data.billingPeriodEnd)) {
    errors['billingPeriodEnd'] = 'Neispravan format datuma'
  }

  // Validate period range
  if (
    data.billingPeriodStart &&
    data.billingPeriodEnd &&
    isValidDate(data.billingPeriodStart) &&
    isValidDate(data.billingPeriodEnd)
  ) {
    const start = new Date(data.billingPeriodStart)
    const end = new Date(data.billingPeriodEnd)
    if (start >= end) {
      errors['billingPeriodEnd'] = 'Kraj perioda mora biti posle početka'
    }
  }

  // Due date is required
  if (!data.dueDate) {
    errors['dueDate'] = 'Datum dospeća je obavezan'
  } else if (!isValidDate(data.dueDate)) {
    errors['dueDate'] = 'Neispravan format datuma'
  }

  // Payment date validation (optional but if provided must be valid)
  if (data.paymentDate && !isValidDate(data.paymentDate)) {
    errors['paymentDate'] = 'Neispravan format datuma'
  }

  // Consumption value validation (optional but if provided must be valid)
  if (data.consumptionValue && !isValidAmount(data.consumptionValue)) {
    errors['consumptionValue'] = 'Potrošnja mora biti broj veći od 0'
  }

  return errors
}
