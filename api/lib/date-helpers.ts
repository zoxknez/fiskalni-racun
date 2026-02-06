/**
 * Shared Date Helper Utilities for Sync Operations
 *
 * Centralizes date conversion logic used across all sync handlers.
 * Prevents code duplication between individual handlers and batch sync.
 *
 * @module api/lib/date-helpers
 */

/**
 * Convert Date object or ISO string to PostgreSQL DATE format (YYYY-MM-DD)
 */
export function toDateString(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') {
    return value.split('T')[0] ?? null
  }
  if (value instanceof Date) {
    return value.toISOString().split('T')[0] ?? null
  }
  return null
}

/**
 * Convert Date object or string to ISO timestamp.
 * Falls back to current time if no value is provided.
 */
export function toTimestamp(value: unknown): string {
  if (!value) return new Date().toISOString()
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  return new Date().toISOString()
}
