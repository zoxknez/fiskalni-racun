/**
 * Modern Analytics Layer (SSR/CSR safe)
 *
 * - Type-safe-ish events (nema any curenja)
 * - Privacy-first (enable/disable + reset)
 * - Batching (send u rafovima, minimizuje overhead)
 * - Offline support (buffer + flush na 'online' ili visibility change)
 * - GA4 & Plausible loaderi bez dupliranja <script>
 */

import { logger } from '../logger'

/* ---------------------------------- Types ---------------------------------- */

type AnalyticsProperties = Record<string, unknown>

interface AnalyticsWindow extends Window {
  dataLayer?: unknown[]
  gtag?: (...args: unknown[]) => void
  plausible?: (eventName: string, options?: Record<string, unknown>) => void
}

export interface AnalyticsEvent {
  name: string
  properties?: AnalyticsProperties
  timestamp?: number
  userId?: string
  sessionId?: string
  context?: {
    page_url?: string
    page_path?: string
    page_title?: string
    referrer?: string
  }
}

export interface AnalyticsUser {
  id: string
  email?: string
  properties?: AnalyticsProperties
}

export interface AnalyticsProvider {
  name: string
  track: (event: AnalyticsEvent) => void | Promise<void>
  identify?: (user: AnalyticsUser) => void | Promise<void>
  page?: (path: string, properties?: AnalyticsProperties) => void | Promise<void>
  reset?: () => void | Promise<void>
}

/* --------------------------------- Helpers --------------------------------- */

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined'
const BATCH_MS = 250
const LS_KEY = '__analytics_buffer__'

const safeNow = () => Date.now()

function generateId() {
  if (isBrowser() && 'crypto' in window && (window.crypto as Crypto).randomUUID) {
    return (window.crypto as Crypto).randomUUID()
  }
  return `${safeNow()}-${Math.random().toString(36).slice(2, 11)}`
}

/** JSON-friendly sanitizacija */
function toPlain(value: unknown): unknown {
  if (value == null) return value
  if (value instanceof Date) return value.toISOString()
  if (typeof File !== 'undefined' && value instanceof File) return value.name
  if (value instanceof Map) {
    const obj: Record<string, unknown> = {}
    for (const [k, v] of value.entries()) obj[String(k)] = toPlain(v)
    return obj
  }
  if (value instanceof Set) return Array.from(value).map(toPlain)
  if (Array.isArray(value)) return value.map(toPlain)
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = v === undefined ? null : toPlain(v)
    }
    return out
  }
  if (typeof value === 'number' && !Number.isFinite(value)) return null
  if (typeof value === 'function') return undefined
  return value
}

function merge<T extends object, U extends object>(a: T, b: U): T & U {
  return Object.assign({}, a, b)
}

/* ------------------------------ Manager (core) ------------------------------ */

class AnalyticsManager {
  private providers: Set<AnalyticsProvider> = new Set()
  private buffer: AnalyticsEvent[] = []
  private flushTimer: number | null = null
  private isEnabled = true
  private sessionId: string
  private currentUser: AnalyticsUser | null = null
  private initialized = false

  // ⚠️ MEMORY LEAK FIX: Store event handlers for cleanup
  private onlineHandler?: () => void
  private visibilityHandler?: () => void
  private pagehideHandler?: () => void
  private beforeunloadHandler?: () => void

  constructor() {
    this.sessionId = generateId()

    // Učitaj eventualni buffer iz localStorage (samo u browseru)
    if (isBrowser() && !this.initialized) {
      try {
        const raw = localStorage.getItem(LS_KEY)
        if (raw) {
          const arr = JSON.parse(raw) as AnalyticsEvent[]
          if (Array.isArray(arr)) this.buffer.push(...arr)
          localStorage.removeItem(LS_KEY)
        }
      } catch {
        /* ignore */
      }

      // ⚠️ MEMORY LEAK FIX: Store bound handlers for cleanup
      this.onlineHandler = () => this.flushNow()
      this.visibilityHandler = () => {
        if (document.visibilityState === 'visible') this.flushNow()
      }
      this.pagehideHandler = () => this.persistIfNeeded()
      this.beforeunloadHandler = () => this.persistIfNeeded()

      // Flush kada mreža dođe online
      window.addEventListener('online', this.onlineHandler)
      // Flush pri promeni vidljivosti (kad tab ponovo postane aktivan)
      document.addEventListener('visibilitychange', this.visibilityHandler)
      // Flush pre napuštanja
      window.addEventListener('pagehide', this.pagehideHandler)
      window.addEventListener('beforeunload', this.beforeunloadHandler)

      this.initialized = true
      logger.log('Analytics initialized')
    }
  }

  /**
   * ⚠️ MEMORY LEAK FIX: Cleanup method to remove all event listeners
   * Call this before destroying the Analytics instance
   */
  destroy() {
    if (this.initialized && isBrowser()) {
      if (this.onlineHandler) {
        window.removeEventListener('online', this.onlineHandler)
      }
      if (this.visibilityHandler) {
        document.removeEventListener('visibilitychange', this.visibilityHandler)
      }
      if (this.pagehideHandler) {
        window.removeEventListener('pagehide', this.pagehideHandler)
      }
      if (this.beforeunloadHandler) {
        window.removeEventListener('beforeunload', this.beforeunloadHandler)
      }

      if (this.flushTimer) {
        clearTimeout(this.flushTimer)
        this.flushTimer = null
      }

      this.initialized = false
      logger.log('Analytics destroyed and cleaned up')
    }
  }

  /** Registracija providera; vraća unregister() */
  register(provider: AnalyticsProvider) {
    this.providers.add(provider)
    logger.log('Analytics provider registered:', provider.name)
    this.flushSoon()
    return () => {
      this.providers.delete(provider)
      logger.log('Analytics provider unregistered:', provider.name)
    }
  }

  /** Globalni enable/disable (npr. nakon consent-a) */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled
    logger.log('Analytics enabled:', enabled)
    if (enabled) this.flushSoon()
  }

  /** Identifikacija korisnika (čuva i lokalno za sledeće evente) */
  identify(user: AnalyticsUser) {
    this.currentUser = user
    for (const p of this.providers) {
      try {
        p.identify?.(user)
      } catch (error) {
        logger.error(`Analytics identify failed for ${p.name}:`, error)
      }
    }
  }

  /** Reset (logout) – zove reset kod providera i menja sessionId */
  reset() {
    for (const p of this.providers) {
      try {
        p.reset?.()
      } catch (error) {
        logger.error(`Analytics reset failed for ${p.name}:`, error)
      }
    }
    this.currentUser = null
    this.sessionId = generateId()
  }

  /** Pageview (path je opciono; ako izostane, koristi location.pathname) */
  page(path?: string, properties?: AnalyticsProperties) {
    const finalPath =
      path || (isBrowser() ? window.location.pathname + window.location.search : '/')

    for (const p of this.providers) {
      try {
        const payload = properties ? (toPlain(properties) as AnalyticsProperties) : undefined
        p.page?.(finalPath, payload)
      } catch (error) {
        logger.error(`Analytics page failed for ${p.name}:`, error)
      }
    }
  }

  /** Track – ubacuje u batch; slanje u rafovima i flush na online/visible */
  track(name: string, properties?: AnalyticsProperties) {
    const base: AnalyticsEvent = {
      name,
      timestamp: safeNow(),
      sessionId: this.sessionId,
    }

    if (this.currentUser?.id) {
      base.userId = this.currentUser.id
    }

    if (isBrowser()) {
      const context = {
        page_url: window.location.href,
        page_path: window.location.pathname + window.location.search,
        page_title: document.title,
        ...(document.referrer ? { referrer: document.referrer } : {}),
      }
      base.context = context
    }

    const event: AnalyticsEvent = properties
      ? merge(base, { properties: toPlain(properties) as AnalyticsProperties })
      : base

    this.buffer.push(event)
    this.flushSoon()
  }

  /* ----------------------------- Internal flush ----------------------------- */

  private flushSoon() {
    if (!this.isEnabled) return
    if (!isBrowser()) return
    if (navigator && 'onLine' in navigator && !navigator.onLine) return
    if (this.providers.size === 0) return

    if (this.flushTimer != null) return
    this.flushTimer = window.setTimeout(() => this.flushNow(), BATCH_MS)
  }

  private async flushNow() {
    if (this.flushTimer != null) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    if (!this.isEnabled || this.providers.size === 0) return
    if (this.buffer.length === 0) return
    if (!isBrowser()) return
    if (navigator && 'onLine' in navigator && !navigator.onLine) {
      this.persistIfNeeded()
      return
    }

    const toSend = this.buffer.splice(0, this.buffer.length)

    for (const ev of toSend) {
      for (const p of this.providers) {
        try {
          await p.track(ev)
        } catch (error) {
          logger.error(`Analytics provider ${p.name} failed:`, error)
        }
      }
    }
  }

  /** Ako smo offline, sačuvaj buffer u localStorage */
  private persistIfNeeded() {
    if (!isBrowser()) return
    if (this.buffer.length === 0) return
    try {
      const existing = localStorage.getItem(LS_KEY)
      const arr = existing ? (JSON.parse(existing) as AnalyticsEvent[]) : []
      arr.push(...this.buffer)
      localStorage.setItem(LS_KEY, JSON.stringify(arr))
      logger.debug?.('Analytics buffer persisted:', arr.length)
      // ne čistimo buffer ovde – flushSoon će odlučiti kada može
    } catch {
      /* ignore */
    }
  }

  /* ------------------------------- Accessors -------------------------------- */

  getSessionId() {
    return this.sessionId
  }
  getUser() {
    return this.currentUser
  }
}

// Singleton
export const analytics = new AnalyticsManager()

// ⚠️ MEMORY LEAK FIX: Disable analytics in test mode
if (typeof process !== 'undefined' && process.env?.['VITE_TEST_MODE'] === 'true') {
  analytics.setEnabled(false)
  logger.log('Analytics disabled in test mode')
}

/* ---------------------------- Providers: GA4/PA ----------------------------- */

/**
 * Google Analytics 4 Provider (SSR safe)
 * - Ne duplira <script>; koristi dataLayer/gtag stub odmah
 * - send_page_view: false (ručno šaljemo page view)
 */
export function createGAProvider(measurementId: string): AnalyticsProvider {
  if (!isBrowser()) {
    return {
      name: 'Google Analytics (ssr-noop)',
      track: () => {},
      identify: () => {},
      page: () => {},
      reset: () => {},
    }
  }

  const w = window as AnalyticsWindow
  w.dataLayer = w.dataLayer || []

  // Ako nema gtag, kreiraj stub koji puni dataLayer
  if (!w.gtag) {
    w.gtag = function gtag(...args: unknown[]) {
      w.dataLayer?.push(args)
    }
  }

  // Učitaj skriptu samo jednom
  const existing = document.querySelector<HTMLScriptElement>(
    `script[src*="googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}"]`
  )
  if (!existing) {
    const s = document.createElement('script')
    s.async = true
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
    s.setAttribute('data-ga-id', measurementId)
    document.head.appendChild(s)
  }

  // Init config
  w.gtag('js', new Date())
  w.gtag('config', measurementId, { send_page_view: false })

  return {
    name: 'Google Analytics',
    track: (event) => {
      w.gtag?.('event', event.name, event.properties)
    },
    identify: (user) => {
      w.gtag?.('set', { user_id: user.id })
      if (user.properties && typeof user.properties === 'object') {
        w.gtag?.('set', 'user_properties', user.properties as Record<string, unknown>)
      }
    },
    page: (path, properties) => {
      w.gtag?.('event', 'page_view', {
        page_path: path,
        ...(properties || {}),
      })
    },
    reset: () => {
      // GA4 nema jasan reset, ali nova sessionId će se promeniti na našoj strani.
      // Ako koristiš Consent Mode ili user_id, možeš ovde očistiti:
      // w.gtag?.('set', 'user_properties', undefined as any)
    },
  }
}

/**
 * Plausible Analytics Provider
 * - Defer skripta; bez dupliranja
 * - Interni queue dok se plausible ne inicijalizuje
 */
export function createPlausibleProvider(domain: string): AnalyticsProvider {
  if (!isBrowser()) {
    return {
      name: 'Plausible (ssr-noop)',
      track: () => {},
      page: () => {},
      reset: () => {},
    }
  }

  let ready = typeof (window as AnalyticsWindow).plausible === 'function'
  const q: Array<() => void> = []

  const ensureFlush = () => {
    if (!ready && typeof (window as AnalyticsWindow).plausible === 'function') {
      ready = true
      while (q.length) q.shift()?.()
    }
  }

  // Učitaj skriptu samo jednom
  const existing = document.querySelector<HTMLScriptElement>(
    'script[src="https://plausible.io/js/script.js"]'
  )
  if (!existing) {
    const s = document.createElement('script')
    s.defer = true
    s.setAttribute('data-domain', domain)
    s.src = 'https://plausible.io/js/script.js'
    s.addEventListener('load', ensureFlush)
    document.head.appendChild(s)
  } else {
    // Ako je već tu – pokušaj flush kad se load završi
    if (existing.getAttribute('data-domain') !== domain) {
      existing.setAttribute('data-domain', domain)
    }
    ensureFlush()
    existing.addEventListener('load', ensureFlush)
  }

  const callOrQueue = (fn: () => void) => {
    if (ready) fn()
    else q.push(fn)
  }

  return {
    name: 'Plausible',
    track: (event) => {
      callOrQueue(() => {
        const win = window as AnalyticsWindow
        win.plausible?.(event.name, { props: event.properties })
      })
    },
    page: (path) => {
      callOrQueue(() => {
        const win = window as AnalyticsWindow
        win.plausible?.('pageview', { url: path })
      })
    },
    reset: () => {
      // Plausible nema state po korisniku; ništa posebno
    },
  }
}

/* ---------------------------------- Usage -----------------------------------
import { analytics, createGAProvider, createPlausibleProvider } from '@/lib/analytics'

// u bootstrap-u (client):
if (import.meta.env?.VITE_GA_MEASUREMENT_ID) {
  analytics.register(createGAProvider(import.meta.env.VITE_GA_MEASUREMENT_ID))
}
if (import.meta.env?.VITE_PLAUSIBLE_DOMAIN) {
  analytics.register(createPlausibleProvider(import.meta.env.VITE_PLAUSIBLE_DOMAIN))
}

// track
analytics.track('receipt_added', { category: 'hrana', amount: 1000 })

// identify
analytics.identify({ id: user.id, email: user.email })

// page
analytics.page() // ili analytics.page('/receipts')
-------------------------------------------------------------------------------*/
