// Password hashing and verification utilities
// Node.js compatible crypto implementation using PBKDF2
// Format: "pbkdf2:<salt_hex>:<hash_hex>"

import { webcrypto } from 'node:crypto'

// Use Node.js webcrypto for compatibility with Node.js runtime
const crypto = webcrypto as Crypto

// PBKDF2 Configuration
const PBKDF2_ITERATIONS = 100000
const PBKDF2_KEY_LENGTH = 256
const SALT_LENGTH = 16
const HASH_PREFIX = 'pbkdf2'

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function fromHex(hex: string): Uint8Array {
  return new Uint8Array(hex.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) || [])
}

/**
 * Hash a password using PBKDF2 with SHA-256
 * Returns format: "pbkdf2:<salt_hex>:<hash_hex>"
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const saltHex = toHex(salt)
  const encoder = new TextEncoder()

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    PBKDF2_KEY_LENGTH
  )

  const hashHex = toHex(new Uint8Array(derivedBits))
  return `${HASH_PREFIX}:${saltHex}:${hashHex}`
}

/**
 * Verify a password against a stored hash
 * Supports format: "pbkdf2:<salt_hex>:<hash_hex>"
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(':')
  if (parts[0] !== HASH_PREFIX || parts.length !== 3) {
    return false
  }

  const saltHex = parts[1]
  const hashHex = parts[2]
  if (!saltHex || !hashHex) return false

  const salt = fromHex(saltHex)
  const encoder = new TextEncoder()

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    PBKDF2_KEY_LENGTH
  )

  const computedHashHex = toHex(new Uint8Array(derivedBits))

  // Use timing-safe comparison to prevent timing attacks
  if (computedHashHex.length !== hashHex.length) return false
  let result = 0
  for (let i = 0; i < computedHashHex.length; i++) {
    result |= computedHashHex.charCodeAt(i) ^ hashHex.charCodeAt(i)
  }
  return result === 0
}
