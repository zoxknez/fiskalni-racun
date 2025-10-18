/**
 * Retry Utilities with Exponential Backoff (refined)
 *
 * @module lib/utils/retry
 */

import { logger } from '../logger'

export interface RetryOptions {
  /** Max broj pokušaja (uključujući prvi). Default: 3 */
  maxAttempts?: number
  /** Početni delay (ms) pre prvog retry-a. Default: 1000 */
  initialDelay?: number
  /** Maksimalni delay (ms). Default: 30000 */
  maxDelay?: number
  /** Množilac za exponential backoff. Default: 2 */
  backoffMultiplier?: number
  /** Ako vrati false – prekida retry i prosleđuje grešku dalje */
  shouldRetry?: (error: unknown) => boolean
  /** Callback na svaki retry pokušaj (ne i na prvi). Dobija attempt (1-based), error i planirani delay */
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void
  /** Opciono: signal za otkazivanje kompletne retry sekvence */
  signal?: AbortSignal
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'shouldRetry' | 'onRetry' | 'signal'>> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
    const id = setTimeout(resolve, ms)
    if (signal) {
      const onAbort = () => {
        clearTimeout(id)
        reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
      }
      signal.addEventListener('abort', onAbort, { once: true })
    }
  })
}

function backoffDelay(attemptIndexZeroBased: number, base: number, max: number, mult: number) {
  const raw = base * mult ** attemptIndexZeroBased
  return Math.min(Math.max(50, raw), max) // min 50ms radi stabilnosti
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const hasStatus = (value: unknown): value is { status?: unknown } =>
  isRecord(value) && 'status' in value

/**
 * Retry async funkcije sa exponential backoff-om.
 * `attempt` u onRetry je 1-based (1 = prvi retry posle prvog neuspeha).
 */
export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: unknown

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    // attempt = 0 je prvi pokušaj (bez odlaganja pre poziva)
    try {
      if (opts.signal?.aborted) {
        throw opts.signal.reason ?? new DOMException('Aborted', 'AbortError')
      }
      return await fn()
    } catch (error) {
      lastError = error

      // Prekini odmah za AbortError – ne retry-ujemo otkazane pozive
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error
      }

      // Ako postoji shouldRetry i vrati false – prekid
      if (options.shouldRetry && !options.shouldRetry(error)) {
        throw error
      }

      // Poslednji pokušaj – nema više retry-a
      if (attempt === opts.maxAttempts - 1) {
        throw error
      }

      // Izračunaj delay za SLEDEĆI pokušaj
      const delay = backoffDelay(attempt, opts.initialDelay, opts.maxDelay, opts.backoffMultiplier)
      logger.warn?.(
        `Retry attempt ${attempt + 1}/${opts.maxAttempts - 1} after ${Math.round(delay)}ms`,
        { error }
      )
      options.onRetry?.(attempt + 1, error, delay)

      await sleep(delay, opts.signal)
      // ide sledeći krug
    }
  }

  throw lastError
}

/**
 * Retry sa "full jitter"-om (randomizovan delay između 0 i backoffDelay),
 * smanjuje “thundering herd” efekat kod paralelnih klijenata.
 */
export async function retryWithJitter<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: unknown

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      if (opts.signal?.aborted) {
        throw opts.signal.reason ?? new DOMException('Aborted', 'AbortError')
      }
      return await fn()
    } catch (error) {
      lastError = error

      if (error instanceof DOMException && error.name === 'AbortError') throw error
      if (options.shouldRetry && !options.shouldRetry(error)) throw error
      if (attempt === opts.maxAttempts - 1) throw error

      const cap = backoffDelay(attempt, opts.initialDelay, opts.maxDelay, opts.backoffMultiplier)
      const delay = Math.random() * cap // full jitter: [0, cap)
      logger.warn?.(
        `Retry with jitter: attempt ${attempt + 1}/${opts.maxAttempts - 1} after ${Math.round(delay)}ms`
      )
      options.onRetry?.(attempt + 1, error, delay)

      await sleep(delay, opts.signal)
    }
  }

  throw lastError
}

/**
 * Retry samo mrežne greške (ne i AbortError).
 * Upotreba: `await retryNetworkErrors(() => fetch(...))`
 */
export function retryNetworkErrors<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  signal?: AbortSignal
): Promise<T> {
  const networkMessages = [
    'Failed to fetch',
    'Network request failed',
    'NetworkError',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'EAI_AGAIN',
    'EHOSTUNREACH',
    'ECONNRESET',
  ]
  return retry(fn, {
    maxAttempts,
    ...(signal ? { signal } : {}),
    shouldRetry: (error) => {
      if (error instanceof DOMException && error.name === 'AbortError') return false
      if (error instanceof Error) {
        return networkMessages.some((msg) => error.message.includes(msg))
      }
      return false
    },
  })
}

/**
 * Retry za HTTP 5xx odgovore.
 * Važno: wrapper BACA Response za 5xx kako bi retry mehanizam proradio.
 */
export function retryServerErrors(
  fn: () => Promise<Response>,
  maxAttempts = 3,
  signal?: AbortSignal
): Promise<Response> {
  return retry(
    async () => {
      const res = await fn()
      if (res.status >= 500) {
        // bacamo Response da bi retry() ušao u catch granu
        throw res
      }
      return res
    },
    {
      maxAttempts,
      ...(signal ? { signal } : {}),
      shouldRetry: (error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return false
        if (error instanceof Response) return error.status >= 500
        // Ako neko baci "error" sa {status}, podrži i to
        if (hasStatus(error)) {
          const statusValue = Number(error.status)
          return Number.isFinite(statusValue) && statusValue >= 500
        }
        // ostale greške (npr. mrežne) – ne retry ovim helperom
        return false
      },
      onRetry: (attempt, error, delay) => {
        const status =
          error instanceof Response ? error.status : hasStatus(error) ? error.status : undefined
        logger.warn?.(
          `Server error retry #${attempt} (status: ${status ?? 'unknown'}) in ~${Math.round(delay)}ms`
        )
      },
    }
  )
}

/**
 * Circuit breaker pattern
 * Sprečava kaskadne padove. Otvara se posle `threshold` uzastopnih neuspeha.
 * Posle timeout-a prelazi u "half-open" i testira jedan poziv.
 */
export class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'

  constructor(
    private threshold = 5,
    private timeout = 60_000 // 1 min
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Ako je OPEN, proveri da li je prošao timeout
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open'
        logger.info?.('Circuit breaker: half-open (testing)')
      } else {
        throw new Error('Circuit breaker is OPEN - too many failures')
      }
    }

    try {
      const result = await fn()

      // Uspeh: resetuj brojač i zatvori ako je bio half-open
      this.failures = 0
      if (this.state === 'half-open') {
        this.state = 'closed'
        logger.info?.('Circuit breaker: closed (recovered)')
      }
      return result
    } catch (error) {
      this.failures++
      this.lastFailureTime = Date.now()

      // Ako pređe prag – otvori
      if (this.failures >= this.threshold) {
        this.state = 'open'
        logger.error?.(`Circuit breaker: OPEN after ${this.failures} failures`)
      }

      throw error
    }
  }

  /** Ručno resetovanje na CLOSED */
  reset() {
    this.state = 'closed'
    this.failures = 0
    logger.info?.('Circuit breaker: manually reset')
  }

  /** (Opcionalno) silom otvori na određeno vreme */
  forceOpen(forMs = this.timeout) {
    this.state = 'open'
    this.failures = this.threshold
    this.lastFailureTime = Date.now() - (this.timeout - forMs)
    logger.warn?.(`Circuit breaker: force OPEN for ~${forMs}ms`)
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailureTime ? new Date(this.lastFailureTime) : null,
      threshold: this.threshold,
      timeoutMs: this.timeout,
    }
  }
}
