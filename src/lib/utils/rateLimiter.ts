/**
 * Client-Side Rate Limiter (refined)
 *
 * Sliding-window limiter sa opcijom cross-tab deljenja stanja.
 *
 * @module lib/utils/rateLimiter
 */

import { logger } from '../logger'

export interface RateLimiterOptions {
  /** Max broj dozvoljenih zahteva u prozoru */
  maxRequests: number
  /** Veličina prozora u ms */
  windowMs: number
  /** Prefiks za ključeve (npr. "api") */
  keyPrefix?: string
  /**
   * Ako je true – koristi localStorage za deljenje stanja između tabova.
   * Zadato: false (in-memory per tab).
   */
  crossTab?: boolean
  /**
   * Naziv LS prostora za crossTab režim (po difoltu "rateLimiter").
   * Svaki ključ biće snimljen pod `${lsNamespace}:${fullKey}`.
   */
  lsNamespace?: string
}

type Timestamps = number[]

/** Bezbedno parsiranje iz localStorage */
function parseTS(raw: string | null): Timestamps {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw) as unknown
    return Array.isArray(arr) ? (arr.filter((x) => Number.isFinite(x)) as number[]) : []
  } catch {
    return []
  }
}

function now() {
  return Date.now()
}

export class RateLimiter {
  private requests: Map<string, Timestamps> = new Map()

  constructor(private options: RateLimiterOptions) {
    if (this.options.crossTab && typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        const ns = this.options.lsNamespace ?? 'rateLimiter'
        const namespacePrefix = `${ns}:`
        if (!e.key || !e.key.startsWith(namespacePrefix)) return
        const key = e.key.slice(namespacePrefix.length)
        const arr = parseTS(e.newValue)
        // Osveži lokalni cache
        this.requests.set(key, arr)
      })
    }
  }

  /** Interno: puni ključ prefiksom */
  private fullKey(key: string): string {
    const trimmed = key.trim()
    return this.options.keyPrefix ? `${this.options.keyPrefix}:${trimmed}` : trimmed
  }

  /** Interno: LS ključ (za crossTab) */
  private lsKey(fullKey: string): string {
    return `${this.options.lsNamespace ?? 'rateLimiter'}:${fullKey}`
  }

  /** Interno: učitaj timestamps (crossTab ili memory) */
  private load(fullKey: string): Timestamps {
    if (this.options.crossTab && typeof localStorage !== 'undefined') {
      return parseTS(localStorage.getItem(this.lsKey(fullKey)))
    }
    return this.requests.get(fullKey) ?? []
  }

  /** Interno: sačuvaj timestamps (crossTab ili memory) */
  private save(fullKey: string, ts: Timestamps) {
    // Očisti istekle iz opsega window-a pre snimanja
    const cutoff = now() - this.options.windowMs
    const pruned = ts.filter((t) => t > cutoff)
    if (this.options.crossTab && typeof localStorage !== 'undefined') {
      if (pruned.length) {
        localStorage.setItem(this.lsKey(fullKey), JSON.stringify(pruned))
      } else {
        localStorage.removeItem(this.lsKey(fullKey))
      }
    } else if (pruned.length) this.requests.set(fullKey, pruned)
    else this.requests.delete(fullKey)
  }

  /** Interno: vrati (pruned) redosled timestamps-a za dati ključ */
  private getQueue(fullKey: string): Timestamps {
    const cutoff = now() - this.options.windowMs
    const list = this.load(fullKey)
    const pruned = list.filter((t) => t > cutoff)
    // Ako se nešto promenilo – sačuvaj
    if (pruned.length !== list.length) this.save(fullKey, pruned)
    return pruned
  }

  /**
   * Provera da li je zahtev dozvoljen.
   * Dodaje timestamp kad dozvoli.
   */
  check(key: string): boolean {
    const fullKey = this.fullKey(key)
    const list = this.getQueue(fullKey)

    if (list.length >= this.options.maxRequests) {
      const remaining = Math.max(0, this.options.maxRequests - list.length)
      logger.warn?.(`Rate limit exceeded for ${fullKey}`, {
        current: list.length,
        max: this.options.maxRequests,
        remaining,
        retryAfter: this.getRetryAfter(key),
      })
      return false
    }

    // Dozvoli i snimi trenutni timestamp
    list.push(now())
    this.save(fullKey, list)
    return true
  }

  /**
   * Sačekaj dok slot ne bude dostupan (precizan, bez busy-loop-a).
   * @throws Error ako istekne timeout
   */
  async waitForSlot(key: string, timeoutMs = 60_000): Promise<void> {
    const start = now()
    // Brza staza
    if (this.check(key)) return

    while (true) {
      const remainingTime = timeoutMs - (now() - start)
      if (remainingTime <= 0) {
        throw new Error('Rate limiter timeout')
      }

      const retryAfter = this.getRetryAfter(key)
      const sleepMs = Math.min(Math.max(1, retryAfter + 1), remainingTime)
      await new Promise((r) => setTimeout(r, sleepMs))

      if (this.check(key)) return
    }
  }

  /** Resetuj limiter za ključ ili sve ključeve */
  reset(key?: string) {
    if (!key) {
      // sve
      if (this.options.crossTab && typeof localStorage !== 'undefined') {
        const ns = this.options.lsNamespace ?? 'rateLimiter'
        const namespacePrefix = `${ns}:`
        const toDelete: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key?.startsWith(namespacePrefix)) {
            toDelete.push(key)
          }
        }
        for (const key of toDelete) {
          localStorage.removeItem(key)
        }
      }
      this.requests.clear()
      return
    }

    const fullKey = this.fullKey(key)
    this.requests.delete(fullKey)
    if (this.options.crossTab && typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.lsKey(fullKey))
    }
  }

  /** Koliko je preostalo zahteva u tekućem prozoru */
  getRemaining(key: string): number {
    const fullKey = this.fullKey(key)
    const list = this.getQueue(fullKey)
    return Math.max(0, this.options.maxRequests - list.length)
  }

  /**
   * Za koliko ms će sledeći slot biti dostupan (0 ako ima mesta).
   * Računa se prema najstarijem timestamp-u u prozoru.
   */
  getRetryAfter(key: string): number {
    const fullKey = this.fullKey(key)
    const list = this.getQueue(fullKey)
    if (list.length < this.options.maxRequests) return 0
    const oldest = list[0]
    if (oldest == null) return 0
    const until = oldest + this.options.windowMs - now()
    return Math.max(0, until)
  }

  /** Broj različitih ključeva u memoriji (telemetrija/debug) */
  size(): number {
    return this.requests.size
  }

  /** Vraća grubi snapshot stanja za ključ (telemetrija/debug) */
  getState(key: string) {
    const fullKey = this.fullKey(key)
    const list = this.getQueue(fullKey)
    return {
      key: fullKey,
      count: list.length,
      remaining: this.getRemaining(key),
      retryAfter: this.getRetryAfter(key),
      windowMs: this.options.windowMs,
      maxRequests: this.options.maxRequests,
    }
  }
}

/**
 * Predefined rate limiters (isti API kao ranije)
 */

// OCR - skupo, 10/min
export const ocrRateLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000,
  keyPrefix: 'ocr',
})

// API - 100/min
export const apiRateLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60 * 1000,
  keyPrefix: 'api',
})

// Auth - 5/5min
export const authRateLimiter = new RateLimiter({
  maxRequests: 5,
  windowMs: 5 * 60 * 1000,
  keyPrefix: 'auth',
})

// QR - 30/min
export const qrRateLimiter = new RateLimiter({
  maxRequests: 30,
  windowMs: 60 * 1000,
  keyPrefix: 'qr',
})

/**
 * Rate limit dekorator – baca grešku ako je prebačen limit (kao original)
 */
export function rateLimit<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  limiter: RateLimiter,
  key: string
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs) => {
    const isAllowed = limiter.check(key)
    if (!isAllowed) {
      const retryAfter = limiter.getRetryAfter(key)
      throw new Error(`Rate limit exceeded. Retry after ${Math.ceil(retryAfter / 1000)}s`)
    }
    return await fn(...args)
  }
}

/**
 * Novi helper: dekorator koji SAM čeka slot (umesto da baca grešku).
 * Zgodno za pozadinske/ponovljive operacije.
 */
export function rateLimitWait<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  limiter: RateLimiter,
  key: string,
  timeoutMs = 60_000
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs) => {
    await limiter.waitForSlot(key, timeoutMs)
    return fn(...args)
  }
}
