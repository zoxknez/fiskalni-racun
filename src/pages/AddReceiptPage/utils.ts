// AddReceiptPage Utility Functions
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Sanitize amount input - normalize decimal separator and remove invalid chars
 */
export const sanitizeAmountInput = (raw: string): string => {
  let normalized = raw.replace(/,/g, '.').replace(/[^\d.]/g, '')
  const parts = normalized.split('.')
  normalized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : normalized
  if (normalized.startsWith('.')) normalized = `0${normalized}`
  return normalized
}

/**
 * Format date for input[type="date"]
 */
export const formatDateInput = (date: Date): string => date.toISOString().split('T')[0] ?? ''

/**
 * Get first day of current month
 */
export const getDefaultBillingPeriodStart = (): string => {
  const date = new Date()
  date.setDate(1)
  return formatDateInput(date)
}

/**
 * Get last day of current month
 */
export const getDefaultBillingPeriodEnd = (): string => {
  const date = new Date()
  date.setMonth(date.getMonth() + 1, 0)
  return formatDateInput(date)
}

/**
 * Get default due date (7 days from now)
 */
export const getDefaultHouseholdDueDate = (): string => {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return formatDateInput(date)
}
