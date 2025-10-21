/**
 * Currency Formatting Utilities
 *
 * Dynamic currency formatting based on user settings
 */

import type { Currency, Language } from '@/config/locales'
import { CURRENCIES, getLocale } from '@/config/locales'

// ═══════════════════════════════════════════════════════════
// CURRENCY FORMATTING
// ═══════════════════════════════════════════════════════════

export interface FormatCurrencyOptions {
  currency?: Currency
  language?: Language
  locale?: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  showSymbol?: boolean
}

/**
 * Format amount as currency
 *
 * @param amount - The numeric amount to format
 * @param options - Formatting options
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1234.56, { currency: 'RSD', language: 'sr' })
 * // => "1.234,56 RSD"
 *
 * formatCurrency(1234.56, { currency: 'EUR', language: 'en' })
 * // => "€1,234.56"
 */
export function formatCurrency(amount: number, options: FormatCurrencyOptions = {}): string {
  const {
    currency = 'RSD',
    language = 'sr',
    locale,
    minimumFractionDigits,
    maximumFractionDigits,
    showSymbol = true,
  } = options

  const currencyConfig = CURRENCIES[currency]
  const localeString = locale || getLocale(language, currency)

  const formatOptions: Intl.NumberFormatOptions = {
    style: showSymbol ? 'currency' : 'decimal',
    currency: currencyConfig.code,
    minimumFractionDigits:
      minimumFractionDigits !== undefined ? minimumFractionDigits : currencyConfig.decimals,
    maximumFractionDigits:
      maximumFractionDigits !== undefined ? maximumFractionDigits : currencyConfig.decimals,
  }

  try {
    return new Intl.NumberFormat(localeString, formatOptions).format(amount)
  } catch (error) {
    // Fallback to basic formatting if locale is not supported
    console.warn(`Currency formatting failed for locale ${localeString}:`, error)
    return `${amount.toFixed(currencyConfig.decimals)} ${currencyConfig.symbol}`
  }
}

/**
 * Format amount with explicit currency code
 * Always shows the 3-letter currency code
 *
 * @example
 * formatCurrencyWithCode(1234.56, 'RSD', 'sr')
 * // => "1.234,56 RSD"
 */
export function formatCurrencyWithCode(
  amount: number,
  currency: Currency = 'RSD',
  language: Language = 'sr'
): string {
  return formatCurrency(amount, {
    currency,
    language,
    showSymbol: true,
  })
}

/**
 * Format amount without currency symbol
 * Useful for input fields
 *
 * @example
 * formatAmount(1234.56, 'RSD', 'sr')
 * // => "1.234,56"
 */
export function formatAmount(
  amount: number,
  currency: Currency = 'RSD',
  language: Language = 'sr'
): string {
  return formatCurrency(amount, {
    currency,
    language,
    showSymbol: false,
  })
}

/**
 * Parse currency string to number
 * Handles different locale formats (comma vs dot)
 *
 * @example
 * parseCurrency("1.234,56") // => 1234.56
 * parseCurrency("1,234.56") // => 1234.56
 * parseCurrency("1234.56 RSD") // => 1234.56
 */
export function parseCurrency(value: string): number {
  // Remove currency symbols and letters
  let cleaned = value
    .replace(/[A-Z]{3}/g, '') // Remove currency codes (RSD, BAM, EUR)
    .replace(/[€$£¥₹KM]/g, '') // Remove currency symbols
    .trim()

  // Detect format based on last separator
  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')

  if (lastComma > lastDot) {
    // European format: 1.234,56
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  } else {
    // US format: 1,234.56
    cleaned = cleaned.replace(/,/g, '')
  }

  const parsed = Number.parseFloat(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * Get currency symbol
 *
 * @example
 * getCurrencySymbol('RSD') // => "RSD"
 * getCurrencySymbol('EUR') // => "€"
 */
export function getCurrencySymbol(currency: Currency): string {
  return CURRENCIES[currency].symbol
}

/**
 * Get currency name
 *
 * @example
 * getCurrencyName('RSD', 'sr') // => "Srpski dinar"
 * getCurrencyName('RSD', 'en') // => "Serbian Dinar"
 */
export function getCurrencyName(currency: Currency, language: Language = 'sr'): string {
  const config = CURRENCIES[currency]
  return language === 'sr' ? config.nameSr : config.name
}

/**
 * Format currency for display in tables/lists
 * Compact format without decimals for large amounts
 *
 * @example
 * formatCurrencyCompact(1234567, 'RSD', 'sr')
 * // => "1,2M RSD"
 */
export function formatCurrencyCompact(
  amount: number,
  currency: Currency = 'RSD',
  language: Language = 'sr'
): string {
  const localeString = getLocale(language, currency)

  const formatOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }

  try {
    return new Intl.NumberFormat(localeString, formatOptions).format(amount)
  } catch (_error) {
    // Fallback
    return formatCurrency(amount, { currency, language })
  }
}

/**
 * Format multiple amounts with total
 * Useful for analytics/summaries
 *
 * @example
 * formatCurrencyGroup([100, 200, 300], 'RSD', 'sr')
 * // => {
 * //   items: ["100,00 RSD", "200,00 RSD", "300,00 RSD"],
 * //   total: "600,00 RSD"
 * // }
 */
export function formatCurrencyGroup(
  amounts: number[],
  currency: Currency = 'RSD',
  language: Language = 'sr'
): { items: string[]; total: string } {
  const items = amounts.map((amount) => formatCurrency(amount, { currency, language }))
  const total = formatCurrency(
    amounts.reduce((sum, amount) => sum + amount, 0),
    { currency, language }
  )

  return { items, total }
}

// ═══════════════════════════════════════════════════════════
// LEGACY SUPPORT
// ═══════════════════════════════════════════════════════════

/**
 * @deprecated Use formatCurrency with options instead
 * Kept for backward compatibility
 */
export function formatCurrencyLegacy(amount: number): string {
  return formatCurrency(amount, { currency: 'RSD', language: 'sr' })
}
