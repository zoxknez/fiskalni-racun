/**
 * Default values and constants for AddReceiptPage
 */

/**
 * Default form mode on page load
 */
export const DEFAULT_FORM_MODE = 'photo' as const

/**
 * Default manual form type
 */
export const DEFAULT_MANUAL_TYPE = 'fiscal' as const

/**
 * Days to add for default household due date
 */
export const DEFAULT_DUE_DATE_OFFSET_DAYS = 7

/**
 * PIB (Tax Identification Number) validation regex
 */
export const PIB_REGEX = /^\d{9}$/

/**
 * Amount validation regex (allows digits, comma, and dot)
 */
export const AMOUNT_REGEX = /^[\d.,]+$/
