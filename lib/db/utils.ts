/**
 * Database Utility Functions
 *
 * Helper functions used across database operations.
 *
 * @module lib/db/utils
 */

import type { Device, SupportedLanguage } from './types'

/**
 * Compute warranty expiry date from purchase date and warranty duration
 */
export function computeWarrantyExpiry(purchaseDate: Date, months: number): Date {
  const d = new Date(purchaseDate)
  d.setMonth(d.getMonth() + months)
  return d
}

/**
 * Compute warranty status based on expiry date
 */
export function computeWarrantyStatus(expiry: Date): Device['status'] {
  return expiry && expiry.getTime() >= Date.now() ? 'active' : 'expired'
}

/**
 * Coerce amount to 2 decimal places
 */
export function coerceAmount(value: number): number {
  const n = Number.isFinite(value) ? value : 0
  return Math.round(n * 100) / 100
}

/**
 * Normalize language code to supported language
 */
export function normalizeLanguage(lng: string | undefined): SupportedLanguage {
  if (!lng) return 'sr'
  const low = lng.toLowerCase()
  if (low.startsWith('sr')) return 'sr'
  if (low.startsWith('hr')) return 'hr'
  if (low.startsWith('sl')) return 'sl'
  if (low.startsWith('en')) return 'en'
  return 'sr'
}

/**
 * Check if a date is within a given number of days from now
 */
export function isWithinDays(date: Date, days: number): boolean {
  const now = Date.now()
  const threshold = now + days * 24 * 60 * 60 * 1000
  return date.getTime() <= threshold && date.getTime() >= now
}

/**
 * Get days until a date (negative if past)
 */
export function daysUntil(date: Date): number {
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  return Math.floor(diff / (24 * 60 * 60 * 1000))
}
