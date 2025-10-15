/**
 * Modern TypeScript - Branded Types
 *
 * Prevents mixing similar primitive types at compile time
 * Example: Can't accidentally pass PIB where Email is expected
 *
 * Benefits:
 * - Compile-time safety
 * - Self-documenting code
 * - Prevents logical errors
 */

declare const __brand: unique symbol
type Brand<T, TBrand extends string> = T & { [__brand]: TBrand }

/**
 * Branded string types for type safety
 */
export type Email = Brand<string, 'Email'>
export type PIB = Brand<string, 'PIB'>
export type PhoneNumber = Brand<string, 'PhoneNumber'>
export type URL = Brand<string, 'URL'>
export type ISODateString = Brand<string, 'ISODateString'>
export type HexColor = Brand<string, 'HexColor'>
export type UserId = Brand<string, 'UserId'>
export type ReceiptId = Brand<number, 'ReceiptId'>
export type DeviceId = Brand<number, 'DeviceId'>

/**
 * Branded number types
 */
export type PositiveNumber = Brand<number, 'PositiveNumber'>
export type Percentage = Brand<number, 'Percentage'> // 0-100
export type Currency = Brand<number, 'Currency'>

/**
 * Validators for branded types
 */

export function isValidEmail(email: string): email is Email {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isValidPIB(pib: string): pib is PIB {
  return /^\d{9}$/.test(pib)
}

export function isValidPhoneNumber(phone: string): phone is PhoneNumber {
  return /^[\d\s+()-]{6,20}$/.test(phone)
}

export function isValidURL(url: string): url is URL {
  try {
    new globalThis.URL(url)
    return true
  } catch {
    return false
  }
}

export function isValidHexColor(color: string): color is HexColor {
  return /^#([0-9A-F]{3}){1,2}$/i.test(color)
}

export function isPositiveNumber(n: number): n is PositiveNumber {
  return n > 0
}

export function isPercentage(n: number): n is Percentage {
  return n >= 0 && n <= 100
}

/**
 * Constructors for branded types
 */

export function Email(email: string): Email {
  if (!isValidEmail(email)) {
    throw new TypeError(`Invalid email: ${email}`)
  }
  return email as Email
}

export function PIB(pib: string): PIB {
  if (!isValidPIB(pib)) {
    throw new TypeError(`Invalid PIB: ${pib}`)
  }
  return pib as PIB
}

export function PhoneNumber(phone: string): PhoneNumber {
  if (!isValidPhoneNumber(phone)) {
    throw new TypeError(`Invalid phone: ${phone}`)
  }
  return phone as PhoneNumber
}

export function HexColor(color: string): HexColor {
  if (!isValidHexColor(color)) {
    throw new TypeError(`Invalid hex color: ${color}`)
  }
  return color as HexColor
}

export function PositiveNumber(n: number): PositiveNumber {
  if (!isPositiveNumber(n)) {
    throw new TypeError(`Not a positive number: ${n}`)
  }
  return n as PositiveNumber
}

export function Percentage(n: number): Percentage {
  if (!isPercentage(n)) {
    throw new TypeError(`Not a percentage (0-100): ${n}`)
  }
  return n as Percentage
}

/**
 * Safe constructors (return undefined instead of throwing)
 */

export function safeEmail(email: string): Email | undefined {
  return isValidEmail(email) ? (email as Email) : undefined
}

export function safePIB(pib: string): PIB | undefined {
  return isValidPIB(pib) ? (pib as PIB) : undefined
}

export function safePhoneNumber(phone: string): PhoneNumber | undefined {
  return isValidPhoneNumber(phone) ? (phone as PhoneNumber) : undefined
}

// Example usage:
/*
interface User {
  id: UserId
  email: Email
  phone?: PhoneNumber
}

// ✅ Type-safe:
const user: User = {
  id: 'user-123' as UserId,
  email: Email('test@example.com'),
  phone: PhoneNumber('+381 11 123 4567')
}

// ❌ Compile error:
const user: User = {
  id: 'user-123' as UserId,
  email: 'test@example.com', // Error: Type 'string' is not assignable to type 'Email'
}

// ❌ Compile error (can't mix PIB and Email):
function sendEmail(email: Email) { ... }
const pib: PIB = PIB('123456789')
sendEmail(pib) // Error!
*/
