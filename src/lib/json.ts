/**
 * Safe JSON parsing utilities
 *
 * Prevents runtime crashes from corrupt/invalid JSON
 *
 * @module lib/json
 */

import { logger } from './logger'

/**
 * Safely parse JSON with fallback value
 *
 * @param str - JSON string to parse
 * @param fallback - Value to return if parsing fails
 * @returns Parsed value or fallback
 */
export function safeJSONParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T
  } catch (error) {
    logger.warn('JSON parse failed, using fallback', { error, input: str.slice(0, 100) })
    return fallback
  }
}

/**
 * Safely stringify JSON with fallback
 *
 * @param value - Value to stringify
 * @param fallback - Fallback string if stringify fails
 * @returns JSON string or fallback
 */
export function safeJSONStringify<T>(value: T, fallback = '{}'): string {
  try {
    return JSON.stringify(value)
  } catch (error) {
    logger.warn('JSON stringify failed, using fallback', { error })
    return fallback
  }
}

/**
 * Parse JSON or return null
 *
 * @param str - JSON string to parse
 * @returns Parsed value or null
 */
export function tryJSONParse<T>(str: string): T | null {
  try {
    return JSON.parse(str) as T
  } catch {
    return null
  }
}

/**
 * Validate JSON string
 *
 * @param str - String to validate
 * @returns true if valid JSON
 */
export function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}
