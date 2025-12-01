/**
 * Optimized Date Utilities
 *
 * Tree-shakeable wrapper za date-fns funkcije
 * Import samo potrebnih funkcija umesto celog paketa
 *
 * @module lib/utils/dateUtils
 */

import {
  addDays,
  addMonths,
  addYears,
  differenceInDays,
  differenceInHours,
  differenceInMonths,
  differenceInYears,
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  formatDistance,
  formatDistanceToNow,
  isAfter,
  isBefore,
  isEqual,
  isFuture,
  isPast,
  isThisMonth,
  isThisYear,
  isToday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
} from 'date-fns'

// Srpski i Engleski locale
import { enUS, sr } from 'date-fns/locale'

/**
 * Re-export svih funkcija
 */
export {
  format,
  formatDistance,
  formatDistanceToNow,
  parseISO,
  differenceInDays,
  differenceInHours,
  differenceInMonths,
  differenceInYears,
  addDays,
  addMonths,
  addYears,
  subDays,
  subMonths,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isAfter,
  isBefore,
  isEqual,
  isToday,
  isThisMonth,
  isThisYear,
  isFuture,
  isPast,
}

/**
 * Locale helper
 */
export function getLocale(lang: string) {
  return lang === 'sr' ? sr : enUS
}

/**
 * Common date formats
 */
export const DATE_FORMATS = {
  SHORT: 'dd.MM.yyyy',
  LONG: 'dd. MMMM yyyy',
  TIME: 'HH:mm',
  DATETIME: 'dd.MM.yyyy HH:mm',
  ISO: "yyyy-MM-dd'T'HH:mm:ss",
  INPUT: 'yyyy-MM-dd',
} as const

/**
 * Format date za prikaz
 */
export function formatDate(
  date: Date | string,
  formatStr: string = DATE_FORMATS.SHORT,
  lang = 'sr'
): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, formatStr, { locale: getLocale(lang) })
}

/**
 * Format relativno vreme ("pre 2 dana")
 */
export function formatRelative(date: Date | string, lang = 'sr'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { locale: getLocale(lang), addSuffix: true })
}

/**
 * Format za input[type="date"]
 */
export function formatForInput(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, DATE_FORMATS.INPUT)
}

/**
 * Parse date string ili vraća default
 */
export function parseDateSafe(dateStr: string | null | undefined, defaultDate?: Date): Date {
  if (!dateStr) return defaultDate || new Date()

  try {
    return parseISO(dateStr)
  } catch {
    return defaultDate || new Date()
  }
}

/**
 * Proveri da li je datum istekao
 */
export function isExpired(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date
  return isPast(d) && !isToday(d)
}

/**
 * Proveri da li datum ističe uskoro (u narednih N dana)
 */
export function isExpiringSoon(date: Date | string, daysThreshold: number = 30): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date

  if (isPast(d)) return false

  const days = differenceInDays(d, new Date())
  return days <= daysThreshold && days >= 0
}

/**
 * Koliko dana je ostalo do datuma
 */
export function daysUntil(date: Date | string): number {
  const d = typeof date === 'string' ? parseISO(date) : date
  return Math.max(0, differenceInDays(d, new Date()))
}

/**
 * Koliko dana je prošlo od datuma
 */
export function daysSince(date: Date | string): number {
  const d = typeof date === 'string' ? parseISO(date) : date
  return Math.max(0, differenceInDays(new Date(), d))
}

/**
 * Grupiši datume po periodima za analytiku
 */
export function groupByPeriod(dates: Date[], period: 'day' | 'month' | 'year' = 'month') {
  const groups = new Map<string, Date[]>()

  for (const date of dates) {
    let key: string

    switch (period) {
      case 'day':
        key = format(date, 'yyyy-MM-dd')
        break
      case 'month':
        key = format(date, 'yyyy-MM')
        break
      case 'year':
        key = format(date, 'yyyy')
        break
    }

    if (!groups.has(key)) {
      groups.set(key, [])
    }

    groups.get(key)?.push(date)
  }

  return groups
}

/**
 * Generiši niz datuma između dva datuma
 */
export function dateRange(start: Date, end: Date, step: 'day' | 'month' = 'day'): Date[] {
  const dates: Date[] = []
  let current = start

  while (isBefore(current, end) || isEqual(current, end)) {
    dates.push(current)

    current = step === 'day' ? addDays(current, 1) : addMonths(current, 1)
  }

  return dates
}

/**
 * Warranty expiry helpers
 */
export function calculateWarrantyExpiry(purchaseDate: Date, monthsDuration: number): Date {
  return addMonths(purchaseDate, monthsDuration)
}

export function getWarrantyStatus(expiryDate: Date): 'active' | 'expiring' | 'expired' {
  if (isExpired(expiryDate)) {
    return 'expired'
  }

  if (isExpiringSoon(expiryDate, 30)) {
    return 'expiring'
  }

  return 'active'
}

/**
 * Billing period helpers
 */
export function getCurrentBillingPeriod(): { start: Date; end: Date } {
  return {
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  }
}

export function getPreviousBillingPeriod(): { start: Date; end: Date } {
  const lastMonth = subMonths(new Date(), 1)
  return {
    start: startOfMonth(lastMonth),
    end: endOfMonth(lastMonth),
  }
}

/**
 * Time range presets za filtriranje
 */
export const TIME_RANGES = {
  today: () => ({
    start: startOfDay(new Date()),
    end: endOfDay(new Date()),
  }),

  yesterday: () => ({
    start: startOfDay(subDays(new Date(), 1)),
    end: endOfDay(subDays(new Date(), 1)),
  }),

  thisWeek: () => ({
    start: startOfDay(subDays(new Date(), 7)),
    end: endOfDay(new Date()),
  }),

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
}
