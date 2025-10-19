/**
 * Formatting utilities for AddReceiptPage
 */

/**
 * Sanitize amount input - allows only digits, comma, and dot
 * Converts comma to dot, removes multiple dots
 *
 * @example
 * sanitizeAmountInput("1,234.56") // "1234.56"
 * sanitizeAmountInput("1..2..3") // "1.23"
 * sanitizeAmountInput(".50") // "0.50"
 */
export function sanitizeAmountInput(raw: string): string {
  // Allow comma or dot, strip others
  let normalized = raw.replace(/,/g, '.').replace(/[^\d.]/g, '')

  // Prevent multiple dots
  const parts = normalized.split('.')
  normalized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : normalized

  // Handle leading dot => 0.xx
  if (normalized.startsWith('.')) {
    normalized = `0${normalized}`
  }

  return normalized
}

/**
 * Normalize date string to ISO format (YYYY-MM-DD)
 * Handles DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY formats
 *
 * @example
 * normalizeDate("25.12.2023") // "2023-12-25"
 * normalizeDate("25/12/2023") // "2023-12-25"
 * normalizeDate("2023-12-25") // "2023-12-25" (already valid)
 */
export function normalizeDate(raw: string): string {
  // Already in ISO format
  const isoLike = /^\d{4}-\d{2}-\d{2}$/
  if (isoLike.test(raw)) return raw

  // Parse DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY
  const match = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/)
  if (!match) return raw

  const [_, day = '', month = '', year = ''] = match
  const dd = day.padStart(2, '0')
  const mm = month.padStart(2, '0')

  return `${year}-${mm}-${dd}`
}

/**
 * Normalize time string to HH:MM format
 * Ensures hours are 0-23 and minutes are 0-59
 *
 * @example
 * normalizeTime("9:5") // "09:05"
 * normalizeTime("25:70") // "23:59" (clamped)
 */
export function normalizeTime(raw: string): string {
  const match = raw.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return raw

  const hours = Math.min(23, Number(match[1]))
  const minutes = Math.min(59, Number(match[2]))

  const hh = String(hours).padStart(2, '0')
  const mm = String(minutes).padStart(2, '0')

  return `${hh}:${mm}`
}

/**
 * Format Date object to input-compatible date string (YYYY-MM-DD)
 *
 * @example
 * formatDateInput(new Date("2023-12-25")) // "2023-12-25"
 */
export function formatDateInput(date: Date): string {
  return date.toISOString().split('T')[0] ?? ''
}

/**
 * Format Date object to input-compatible time string (HH:MM)
 *
 * @example
 * formatTimeInput(new Date("2023-12-25T14:30:00")) // "14:30"
 */
export function formatTimeInput(date: Date): string {
  return date.toTimeString().slice(0, 5)
}
