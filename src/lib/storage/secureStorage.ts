/**
 * Secure localStorage wrapper
 *
 * Enkriptuje osetljive podatke pre čuvanja u localStorage
 * Koristi Web Crypto API za AES-GCM enkripciju
 *
 * @module lib/storage/secureStorage
 */

import { useCallback, useEffect, useState } from 'react'
import { logger } from '../logger'

// Enkriptovani storage key prefix
const SECURE_PREFIX = 'secure_'

// Inicijalizacioni vektor cache
let encryptionKey: CryptoKey | null = null

/**
 * Generiše ili učitava encryption key iz IndexedDB
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  if (encryptionKey) {
    return encryptionKey
  }

  try {
    // Pokušaj da učitaš postojeći key iz IndexedDB
    const db = await openKeyDatabase()
    const storedKey = await getStoredKey(db)

    if (storedKey) {
      encryptionKey = storedKey
      return storedKey
    }

    // Generiši novi key ako ne postoji
    const key = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true, // extractable
      ['encrypt', 'decrypt']
    )

    // Sačuvaj key u IndexedDB
    await storeKey(db, key)

    encryptionKey = key
    return key
  } catch (error) {
    logger.error('Failed to get encryption key:', error)
    throw new Error('Encryption key generation failed')
  }
}

/**
 * Otvori IndexedDB za čuvanje encryption key-a
 */
function openKeyDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SecureStorageKeys', 1)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('keys')) {
        db.createObjectStore('keys')
      }
    }
  })
}

/**
 * Učitaj key iz IndexedDB
 */
async function getStoredKey(db: IDBDatabase): Promise<CryptoKey | null> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['keys'], 'readonly')
    const store = transaction.objectStore('keys')
    const request = store.get('encryption-key')

    request.onerror = () => reject(request.error)
    request.onsuccess = async () => {
      if (!request.result) {
        resolve(null)
        return
      }

      try {
        const key = await crypto.subtle.importKey(
          'jwk',
          request.result,
          {
            name: 'AES-GCM',
            length: 256,
          },
          true,
          ['encrypt', 'decrypt']
        )
        resolve(key)
      } catch (error) {
        reject(error)
      }
    }
  })
}

/**
 * Sačuvaj key u IndexedDB
 */
async function storeKey(db: IDBDatabase, key: CryptoKey): Promise<void> {
  const exported = await crypto.subtle.exportKey('jwk', key)

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['keys'], 'readwrite')
    const store = transaction.objectStore('keys')
    const request = store.put(exported, 'encryption-key')

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * Enkriptuje string podatke
 */
async function encrypt(data: string): Promise<string> {
  try {
    const key = await getEncryptionKey()

    // Generiši random IV (initialization vector)
    const iv = crypto.getRandomValues(new Uint8Array(12))

    // Enkriptuj podatke
    const encoder = new TextEncoder()
    const encodedData = encoder.encode(data)

    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      encodedData
    )

    // Kombinuj IV i encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(encryptedData), iv.length)

    // Convert to base64
    return btoa(String.fromCharCode(...combined))
  } catch (error) {
    logger.error('Encryption failed:', error)
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Dekriptuje string podatke
 */
async function decrypt(encryptedData: string): Promise<string> {
  try {
    const key = await getEncryptionKey()

    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0))

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12)
    const data = combined.slice(12)

    // Dekriptuj
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      data
    )

    // Convert to string
    const decoder = new TextDecoder()
    return decoder.decode(decryptedData)
  } catch (error) {
    logger.error('Decryption failed:', error)
    throw new Error('Failed to decrypt data')
  }
}

/**
 * Secure Storage API
 */
export const secureStorage = {
  /**
   * Sačuvaj enkriptovan podatak
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      const encrypted = await encrypt(value)
      localStorage.setItem(`${SECURE_PREFIX}${key}`, encrypted)
    } catch (error) {
      logger.error('secureStorage.setItem failed:', error)
      throw error
    }
  },

  /**
   * Učitaj i dekriptuj podatak
   */
  async getItem(key: string): Promise<string | null> {
    try {
      const encrypted = localStorage.getItem(`${SECURE_PREFIX}${key}`)
      if (!encrypted) return null

      return await decrypt(encrypted)
    } catch (error) {
      logger.error('secureStorage.getItem failed:', error)
      // Ako dekriptovanje ne uspe, obriši corrupt podatke
      localStorage.removeItem(`${SECURE_PREFIX}${key}`)
      return null
    }
  },

  /**
   * Obriši podatak
   */
  removeItem(key: string): void {
    localStorage.removeItem(`${SECURE_PREFIX}${key}`)
  },

  /**
   * Obriši sve secure podatke
   */
  clear(): void {
    const keys = Object.keys(localStorage)
    for (const key of keys) {
      if (key.startsWith(SECURE_PREFIX)) {
        localStorage.removeItem(key)
      }
    }
  },

  /**
   * Proveri da li postoji key
   */
  has(key: string): boolean {
    return localStorage.getItem(`${SECURE_PREFIX}${key}`) !== null
  },

  /**
   * Sačuvaj objekat (JSON)
   */
  async setObject<T>(key: string, value: T): Promise<void> {
    await this.setItem(key, JSON.stringify(value))
  },

  /**
   * Učitaj objekat (JSON)
   */
  async getObject<T>(key: string): Promise<T | null> {
    const json = await this.getItem(key)
    if (!json) return null

    try {
      return JSON.parse(json) as T
    } catch {
      return null
    }
  },
}

/**
 * Migriraj postojeće podatke iz običnog localStorage u secure storage
 */
export async function migrateToSecureStorage(keys: string[]): Promise<void> {
  logger.info('Migrating to secure storage:', keys)

  for (const key of keys) {
    const value = localStorage.getItem(key)
    if (value) {
      await secureStorage.setItem(key, value)
      localStorage.removeItem(key)
    }
  }

  logger.info('Migration completed')
}

/**
 * Hook za React komponente
 */
export function useSecureStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    secureStorage
      .getObject<T>(key)
      .then((stored) => {
        if (stored !== null) {
          setValue(stored)
        }
      })
      .finally(() => setLoading(false))
  }, [key])

  const updateValue = useCallback(
    async (newValue: T) => {
      setValue(newValue)
      await secureStorage.setObject(key, newValue)
    },
    [key]
  )

  return { value, updateValue, loading }
}
