// Password hashing and verification utilities
// Node.js compatible crypto implementation

import { webcrypto } from 'node:crypto'

// Use Node.js webcrypto for compatibility with Node.js runtime
const crypto = webcrypto as Crypto

// PBKDF2 Configuration
const PBKDF2_ITERATIONS = 100000
const PBKDF2_KEY_LENGTH = 256
const SALT_LENGTH = 16

export function generateSalt(): string {
  const salt = new Uint8Array(SALT_LENGTH)
  crypto.getRandomValues(salt)
  return Array.from(salt)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function hashPassword(password: string, existingSalt?: string): Promise<string> {
  const salt = existingSalt || generateSalt()
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
      salt: encoder.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    PBKDF2_KEY_LENGTH
  )

  const hashArray = Array.from(new Uint8Array(derivedBits))
  const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

  return `${salt}:${hash}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, _hash] = storedHash.split(':')
  if (!salt || !_hash) {
    // Legacy hash format support if needed, or fail
    return false
  }

  const newHash = await hashPassword(password, salt)
  return newHash === storedHash
}
