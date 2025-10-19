/**
 * Unit tests for formatters.ts - AddReceiptPage formatting utilities
 *
 * Test Coverage:
 * - sanitizeAmountInput() - Remove non-numeric characters, handle decimals
 * - normalizeDate() - Convert various date formats to ISO (YYYY-MM-DD)
 * - normalizeTime() - Normalize time to HH:MM format with clamping
 * - formatDateInput() - Format Date object to YYYY-MM-DD
 * - formatTimeInput() - Format Date object to HH:MM
 */

import { describe, expect, it } from 'vitest'
import {
  formatDateInput,
  formatTimeInput,
  normalizeDate,
  normalizeTime,
  sanitizeAmountInput,
} from './formatters'

describe('sanitizeAmountInput', () => {
  describe('basic sanitization', () => {
    it('should allow digits only', () => {
      expect(sanitizeAmountInput('12345')).toBe('12345')
    })

    it('should allow decimal point', () => {
      expect(sanitizeAmountInput('123.45')).toBe('123.45')
    })

    it('should convert comma to dot', () => {
      expect(sanitizeAmountInput('123,45')).toBe('123.45')
    })

    it('should handle mixed comma and dot', () => {
      // Note: Comma is converted to dot first, creating multiple dots
      // The function then keeps the first dot: "1,234.56" → "1.234.56" → "1.23456"
      expect(sanitizeAmountInput('1,234.56')).toBe('1.23456')
    })

    it('should remove non-numeric characters', () => {
      expect(sanitizeAmountInput('abc123def')).toBe('123')
      expect(sanitizeAmountInput('$100.50')).toBe('100.50')
      expect(sanitizeAmountInput('1 000,50')).toBe('1000.50')
    })
  })

  describe('multiple decimal points', () => {
    it('should keep first dot and remove others', () => {
      expect(sanitizeAmountInput('1.2.3.4')).toBe('1.234')
    })

    it('should handle multiple dots after conversion', () => {
      expect(sanitizeAmountInput('1..2..3')).toBe('1.23')
    })

    it('should handle only dots', () => {
      expect(sanitizeAmountInput('...')).toBe('0.')
    })
  })

  describe('leading dot', () => {
    it('should add leading zero for single dot', () => {
      expect(sanitizeAmountInput('.50')).toBe('0.50')
    })

    it('should add leading zero for dot with digits', () => {
      expect(sanitizeAmountInput('.123')).toBe('0.123')
    })

    it('should not affect numbers with leading zero', () => {
      expect(sanitizeAmountInput('0.50')).toBe('0.50')
    })
  })

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(sanitizeAmountInput('')).toBe('')
    })

    it('should handle only non-numeric characters', () => {
      expect(sanitizeAmountInput('abc')).toBe('')
    })

    it('should handle single dot', () => {
      expect(sanitizeAmountInput('.')).toBe('0.')
    })

    it('should handle zero', () => {
      expect(sanitizeAmountInput('0')).toBe('0')
      expect(sanitizeAmountInput('0.00')).toBe('0.00')
    })
  })
})

describe('normalizeDate', () => {
  describe('ISO format (YYYY-MM-DD)', () => {
    it('should return valid ISO date as-is', () => {
      expect(normalizeDate('2023-12-25')).toBe('2023-12-25')
    })

    it('should return ISO date with leading zeros', () => {
      expect(normalizeDate('2023-01-05')).toBe('2023-01-05')
    })
  })

  describe('DD.MM.YYYY format', () => {
    it('should convert dot separator', () => {
      expect(normalizeDate('25.12.2023')).toBe('2023-12-25')
    })

    it('should add leading zeros', () => {
      expect(normalizeDate('5.3.2023')).toBe('2023-03-05')
    })

    it('should handle single-digit day and month', () => {
      expect(normalizeDate('1.1.2023')).toBe('2023-01-01')
    })
  })

  describe('DD/MM/YYYY format', () => {
    it('should convert slash separator', () => {
      expect(normalizeDate('25/12/2023')).toBe('2023-12-25')
    })

    it('should add leading zeros', () => {
      expect(normalizeDate('5/3/2023')).toBe('2023-03-05')
    })
  })

  describe('DD-MM-YYYY format', () => {
    it('should convert dash separator (non-ISO)', () => {
      expect(normalizeDate('25-12-2023')).toBe('2023-12-25')
    })

    it('should add leading zeros', () => {
      expect(normalizeDate('5-3-2023')).toBe('2023-03-05')
    })
  })

  describe('invalid formats', () => {
    it('should return invalid format as-is', () => {
      expect(normalizeDate('invalid')).toBe('invalid')
    })

    it('should return partial date as-is', () => {
      expect(normalizeDate('25.12')).toBe('25.12')
    })

    it('should return wrong order as-is', () => {
      expect(normalizeDate('2023.12.25')).toBe('2023.12.25')
    })

    it('should handle empty string', () => {
      expect(normalizeDate('')).toBe('')
    })
  })
})

describe('normalizeTime', () => {
  describe('basic normalization', () => {
    it('should add leading zeros', () => {
      expect(normalizeTime('9:05')).toBe('09:05')
      // Note: Regex requires exactly 2 digits for minutes (\d{2}), so "9:5" doesn't match
      expect(normalizeTime('9:5')).toBe('9:5') // Returns as-is (no match)
    })

    it('should keep valid format', () => {
      expect(normalizeTime('14:30')).toBe('14:30')
      expect(normalizeTime('00:00')).toBe('00:00')
      expect(normalizeTime('23:59')).toBe('23:59')
    })
  })

  describe('clamping out-of-range values', () => {
    it('should clamp hours to 23', () => {
      expect(normalizeTime('25:30')).toBe('23:30')
      expect(normalizeTime('99:00')).toBe('23:00')
    })

    it('should clamp minutes to 59', () => {
      expect(normalizeTime('14:70')).toBe('14:59')
      expect(normalizeTime('10:99')).toBe('10:59')
    })

    it('should clamp both hours and minutes', () => {
      expect(normalizeTime('25:70')).toBe('23:59')
    })
  })

  describe('edge cases', () => {
    it('should handle midnight', () => {
      expect(normalizeTime('0:00')).toBe('00:00')
    })

    it('should handle invalid format', () => {
      expect(normalizeTime('invalid')).toBe('invalid')
      expect(normalizeTime('12')).toBe('12')
      expect(normalizeTime('12:')).toBe('12:')
    })

    it('should require colon separator', () => {
      expect(normalizeTime('1230')).toBe('1230')
    })

    it('should handle empty string', () => {
      expect(normalizeTime('')).toBe('')
    })
  })
})

describe('formatDateInput', () => {
  it('should format Date to YYYY-MM-DD', () => {
    const date = new Date('2023-12-25T00:00:00Z')
    expect(formatDateInput(date)).toBe('2023-12-25')
  })

  it('should handle dates with time component', () => {
    const date = new Date('2023-12-25T14:30:45Z')
    expect(formatDateInput(date)).toBe('2023-12-25')
  })

  it('should handle dates at start of year', () => {
    const date = new Date('2023-01-01T00:00:00Z')
    expect(formatDateInput(date)).toBe('2023-01-01')
  })

  it('should handle dates at end of year', () => {
    const date = new Date('2023-12-31T23:59:59Z')
    expect(formatDateInput(date)).toBe('2023-12-31')
  })

  it('should handle leap year dates', () => {
    const date = new Date('2024-02-29T00:00:00Z')
    expect(formatDateInput(date)).toBe('2024-02-29')
  })
})

describe('formatTimeInput', () => {
  it('should format Date to HH:MM', () => {
    // Note: We need to create date in local timezone to avoid UTC conversion issues
    const date = new Date('2023-12-25T14:30:00')
    const result = formatTimeInput(date)
    expect(result).toMatch(/^\d{2}:\d{2}$/)
    expect(result.split(':')[0]).toBe('14')
    expect(result.split(':')[1]).toBe('30')
  })

  it('should handle midnight', () => {
    const date = new Date('2023-12-25T00:00:00')
    const result = formatTimeInput(date)
    expect(result.split(':')[0]).toBe('00')
    expect(result.split(':')[1]).toBe('00')
  })

  it('should handle end of day', () => {
    const date = new Date('2023-12-25T23:59:00')
    const result = formatTimeInput(date)
    expect(result.split(':')[0]).toBe('23')
    expect(result.split(':')[1]).toBe('59')
  })

  it('should handle single-digit hours', () => {
    const date = new Date('2023-12-25T09:05:00')
    const result = formatTimeInput(date)
    expect(result.split(':')[0]).toBe('09')
    expect(result.split(':')[1]).toBe('05')
  })

  it('should return 5-character string', () => {
    const date = new Date('2023-12-25T14:30:45')
    const result = formatTimeInput(date)
    expect(result.length).toBe(5)
  })
})
