/**
 * Modern Test Example - Date Utils
 *
 * Demonstrates modern testing practices:
 * - Descriptive test names
 * - Arrange-Act-Assert pattern
 * - Edge case coverage
 * - Type-safe mocks
 */

import { describe, expect, it } from 'vitest'
import {
  calculateWarrantyExpiry,
  formatDate,
  formatDateTime,
  getDaysUntil,
  isWarrantyActive,
  isWarrantyExpiringSoon,
} from '../dateUtils'

describe('dateUtils', () => {
  describe('formatDate', () => {
    it('should format date in Serbian locale by default', () => {
      const date = new Date('2025-01-15T10:30:00')
      const result = formatDate(date)
      expect(result).toBe('15.01.2025')
    })

    it('should format date in English locale', () => {
      const date = new Date('2025-01-15T10:30:00')
      const result = formatDate(date, 'dd.MM.yyyy', 'en')
      expect(result).toBe('15.01.2025')
    })

    it('should handle string dates', () => {
      const result = formatDate('2025-01-15')
      expect(result).toContain('15.01.2025')
    })
  })

  describe('formatDateTime', () => {
    it('should include time in format', () => {
      const date = new Date('2025-01-15T10:30:00')
      const result = formatDateTime(date)
      expect(result).toBe('15.01.2025 10:30')
    })
  })

  describe('calculateWarrantyExpiry', () => {
    it('should add months correctly', () => {
      const purchase = new Date('2025-01-15')
      const expiry = calculateWarrantyExpiry(purchase, 24)

      expect(expiry.getFullYear()).toBe(2027)
      expect(expiry.getMonth()).toBe(0) // January
      expect(expiry.getDate()).toBe(15)
    })

    it('should handle month overflow', () => {
      const purchase = new Date('2025-01-31')
      const expiry = calculateWarrantyExpiry(purchase, 1)

      // Should go to last day of February
      expect(expiry.getMonth()).toBe(1) // February
    })
  })

  describe('isWarrantyActive', () => {
    it('should return true for future dates', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      expect(isWarrantyActive(futureDate)).toBe(true)
    })

    it('should return false for past dates', () => {
      const pastDate = new Date()
      pastDate.setFullYear(pastDate.getFullYear() - 1)

      expect(isWarrantyActive(pastDate)).toBe(false)
    })
  })

  describe('isWarrantyExpiringSoon', () => {
    it('should return true when expiring within threshold', () => {
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + 15) // 15 days

      expect(isWarrantyExpiringSoon(expiryDate, 30)).toBe(true)
    })

    it('should return false when expiring beyond threshold', () => {
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + 45) // 45 days

      expect(isWarrantyExpiringSoon(expiryDate, 30)).toBe(false)
    })

    it('should return false for expired warranties', () => {
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() - 1) // Yesterday

      expect(isWarrantyExpiringSoon(expiryDate, 30)).toBe(false)
    })
  })

  describe('getDaysUntil', () => {
    it('should return positive days for future dates', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 10)

      const days = getDaysUntil(futureDate)
      expect(days).toBeGreaterThanOrEqual(9)
      expect(days).toBeLessThanOrEqual(10)
    })

    it('should return negative days for past dates', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 10)

      const days = getDaysUntil(pastDate)
      expect(days).toBeLessThanOrEqual(-9)
    })
  })
})
