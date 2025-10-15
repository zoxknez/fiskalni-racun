/**
 * Modern Date Utilities
 *
 * Using date-fns for reliable date manipulation
 * Locale-aware, timezone-safe, immutable
 */

import {
  addDays,
  addMonths,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  formatDistance,
  formatRelative,
  isAfter,
  isBefore,
  isToday,
  isYesterday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
} from 'date-fns'
import { enUS, srLatn } from 'date-fns/locale'

export type Locale = 'sr' | 'en'

const localeMap = {
  sr: srLatn,
  en: enUS,
}

/**
 * Get locale for date-fns
 */
export function getDateLocale(locale: Locale = 'sr') {
  return localeMap[locale]
}

/**
 * Format date with locale
 */
export function formatDate(
  date: Date | string,
  formatString: string = 'dd.MM.yyyy',
  locale: Locale = 'sr'
): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, formatString, { locale: getDateLocale(locale) })
}

/**
 * Format date and time
 */
export function formatDateTime(
  date: Date | string,
  formatString: string = 'dd.MM.yyyy HH:mm',
  locale: Locale = 'sr'
): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, formatString, { locale: getDateLocale(locale) })
}

/**
 * Format time only
 */
export function formatTime(
  date: Date | string,
  formatString: string = 'HH:mm',
  locale: Locale = 'sr'
): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, formatString, { locale: getDateLocale(locale) })
}

/**
 * Relative time (e.g., "pre 2 dana", "za 3 sata")
 */
export function formatRelativeTime(
  date: Date | string,
  baseDate: Date = new Date(),
  locale: Locale = 'sr'
): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatRelative(d, baseDate, { locale: getDateLocale(locale) })
}

/**
 * Distance in words (e.g., "oko 2 meseca")
 */
export function formatDistanceToNow(
  date: Date | string,
  locale: Locale = 'sr',
  addSuffix: boolean = true
): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistance(d, new Date(), {
    locale: getDateLocale(locale),
    addSuffix,
  })
}

/**
 * Smart date formatter
 * - Today: "Danas u HH:mm"
 * - Yesterday: "Juče u HH:mm"
 * - This week: "Ponedeljak u HH:mm"
 * - Older: "dd.MM.yyyy u HH:mm"
 */
export function formatSmart(date: Date | string, locale: Locale = 'sr'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  const loc = getDateLocale(locale)

  if (isToday(d)) {
    return `${locale === 'sr' ? 'Danas' : 'Today'} u ${format(d, 'HH:mm', { locale: loc })}`
  }

  if (isYesterday(d)) {
    return `${locale === 'sr' ? 'Juče' : 'Yesterday'} u ${format(d, 'HH:mm', { locale: loc })}`
  }

  const daysDiff = differenceInDays(new Date(), d)

  if (daysDiff < 7) {
    return `${format(d, 'EEEE', { locale: loc })} u ${format(d, 'HH:mm', { locale: loc })}`
  }

  return format(d, 'dd.MM.yyyy u HH:mm', { locale: loc })
}

/**
 * Calculate warranty expiry date
 */
export function calculateWarrantyExpiry(purchaseDate: Date, warrantyMonths: number): Date {
  return addMonths(purchaseDate, warrantyMonths)
}

/**
 * Check if warranty is active
 */
export function isWarrantyActive(expiryDate: Date): boolean {
  return isAfter(expiryDate, new Date())
}

/**
 * Check if warranty is expiring soon
 */
export function isWarrantyExpiringSoon(expiryDate: Date, daysThreshold: number = 30): boolean {
  const now = new Date()
  const thresholdDate = addDays(now, daysThreshold)
  return isAfter(expiryDate, now) && isBefore(expiryDate, thresholdDate)
}

/**
 * Get days until date
 */
export function getDaysUntil(date: Date | string): number {
  const d = typeof date === 'string' ? parseISO(date) : date
  return differenceInDays(d, new Date())
}

/**
 * Get hours until date
 */
export function getHoursUntil(date: Date | string): number {
  const d = typeof date === 'string' ? parseISO(date) : date
  return differenceInHours(d, new Date())
}

/**
 * Get minutes until date
 */
export function getMinutesUntil(date: Date | string): number {
  const d = typeof date === 'string' ? parseISO(date) : date
  return differenceInMinutes(d, new Date())
}

/**
 * Date range helpers
 */
export const dateRanges = {
  today: () => ({
    start: startOfDay(new Date()),
    end: endOfDay(new Date()),
  }),

  yesterday: () => ({
    start: startOfDay(subDays(new Date(), 1)),
    end: endOfDay(subDays(new Date(), 1)),
  }),

  thisWeek: () => ({
    start: startOfWeek(new Date(), { weekStartsOn: 1 }), // Monday
    end: endOfWeek(new Date(), { weekStartsOn: 1 }),
  }),

  lastWeek: () => {
    const lastWeek = subDays(new Date(), 7)
    return {
      start: startOfWeek(lastWeek, { weekStartsOn: 1 }),
      end: endOfWeek(lastWeek, { weekStartsOn: 1 }),
    }
  },

  thisMonth: () => ({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  }),

  lastMonth: () => {
    const lastMonth = subMonths(new Date(), 1)
    return {
      start: startOfMonth(lastMonth),
      end: endOfMonth(lastMonth),
    }
  },

  thisYear: () => ({
    start: startOfYear(new Date()),
    end: endOfYear(new Date()),
  }),

  last30Days: () => ({
    start: startOfDay(subDays(new Date(), 30)),
    end: endOfDay(new Date()),
  }),

  last90Days: () => ({
    start: startOfDay(subDays(new Date(), 90)),
    end: endOfDay(new Date()),
  }),

  custom: (startDate: Date, endDate: Date) => ({
    start: startOfDay(startDate),
    end: endOfDay(endDate),
  }),
}

/**
 * Parse ISO date string
 */
export function parseISODate(str: string): Date | null {
  try {
    const date = new Date(str)
    return Number.isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

/**
 * Format currency with date context
 * Useful for comparing prices over time
 */
export function formatCurrencyWithDate(amount: number, date: Date, locale: Locale = 'sr'): string {
  const formattedAmount = new Intl.NumberFormat(locale === 'sr' ? 'sr-RS' : 'en-US', {
    style: 'currency',
    currency: 'RSD',
  }).format(amount)

  const formattedDate = formatDate(date, 'dd.MM.yyyy', locale)

  return `${formattedAmount} (${formattedDate})`
}
