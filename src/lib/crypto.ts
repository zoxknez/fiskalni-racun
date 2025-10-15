/**
 * Modern Web Crypto API
 *
 * Encrypt sensitive data before storing in IndexedDB
 * Uses AES-GCM encryption (authenticated encryption)
 *
 * Use cases:
 * - Encrypt PIB numbers
 * - Encrypt personal notes
 * - Encrypt payment info
 *
 * Supported: All modern browsers
 */

import { logger } from './logger'

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 12 // 96 bits for GCM

/**
 * Generate encryption key from password
 * Uses PBKDF2 for key derivation
 */
export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(password)

  // Import password as key
  const baseKey = await crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, [
    'deriveBits',
    'deriveKey',
  ])

  // Derive AES key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000, // OWASP recommendation
      hash: 'SHA-256',
    },
    baseKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false, // not extractable
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt data
 */
export async function encrypt(
  data: string,
  password: string
): Promise<{
  encrypted: ArrayBuffer
  iv: Uint8Array
  salt: Uint8Array
}> {
  try {
    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))

    // Derive key
    const key = await deriveKey(password, salt)

    // Encrypt
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)

    const encrypted = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv,
      },
      key,
      dataBuffer
    )

    return { encrypted, iv, salt }
  } catch (error) {
    logger.error('Encryption failed:', error)
    throw new Error('Encryption failed')
  }
}

/**
 * Decrypt data
 */
export async function decrypt(
  encrypted: ArrayBuffer,
  password: string,
  iv: Uint8Array,
  salt: Uint8Array
): Promise<string> {
  try {
    // Derive key
    const key = await deriveKey(password, salt)

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv,
      },
      key,
      encrypted
    )

    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  } catch (error) {
    logger.error('Decryption failed:', error)
    throw new Error('Decryption failed - wrong password?')
  }
}

/**
 * Hash data (for checksums, integrity checks)
 */
export async function hash(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)

  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate random ID
 * Cryptographically secure
 */
export function generateId(length: number = 16): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate UUID v4
 */
export function generateUUID(): string {
  if ('randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Secure random number between min and max
 */
export function secureRandom(min: number, max: number): number {
  const range = max - min
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return min + (array[0] % range)
}

// Example usage:
/*
// Encrypt sensitive data before storing
const { encrypted, iv, salt } = await encrypt('123456789', userPassword)
await db.receipts.add({
  ...receipt,
  encryptedPIB: encrypted,
  iv,
  salt
})

// Decrypt when displaying
const decryptedPIB = await decrypt(
  receipt.encryptedPIB,
  userPassword,
  receipt.iv,
  receipt.salt
)

// Hash for integrity check
const checksum = await hash(JSON.stringify(receipt))
// Store checksum, verify on read

// Generate secure IDs
const sessionId = generateUUID()
const nonce = generateId(32)
*/
