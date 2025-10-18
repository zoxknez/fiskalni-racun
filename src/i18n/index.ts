import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import Backend from 'i18next-http-backend'
import ICU from 'i18next-icu'
import { initReactI18next } from 'react-i18next'
import { translations } from './translations'

/* -----------------------------------------------------------------------------
 * Type-safe keys (resources shape preuzet iz sr – en mora deliti isti shape)
 * ---------------------------------------------------------------------------*/
type SrResources = typeof translations.sr.translation

declare module 'i18next' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: {
      translation: SrResources
    }
    // i18next ponašanje – nemoj vraćati null za missing keys
    returnNull: false
  }
}

/* -----------------------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------------------*/
const SUPPORTED_LANGS = ['sr', 'en'] as const
export type SupportedLang = (typeof SUPPORTED_LANGS)[number]

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined'

const importMetaEnv =
  typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined'
    ? import.meta.env
    : undefined

const readProcessEnv = (key: string): string | undefined => {
  if (typeof process === 'undefined' || typeof process.env === 'undefined') {
    return undefined
  }
  return process.env[key]
}

const isDev =
  // Vite/Next (ESM) okruženja
  Boolean(importMetaEnv?.DEV) ||
  // Fallback na NODE_ENV
  readProcessEnv('NODE_ENV') !== 'production'

const normalizeLng = (lng?: string | null): SupportedLang => {
  if (!lng) return 'sr'
  const lower = lng.toLowerCase()
  if (lower.startsWith('sr')) return 'sr'
  if (lower.startsWith('en')) return 'en'
  return 'sr'
}

// Sync <html lang="…"> samo u browseru
function applyHtmlLang(lng: string) {
  if (!isBrowser()) return
  const normalized = normalizeLng(lng)
  document.documentElement.setAttribute('lang', normalized)
  document.documentElement.setAttribute('dir', 'ltr')
}

/* -----------------------------------------------------------------------------
 * i18next init
 * Napomena: koristimo bundle-ovane resources + backend kao fallback za eksterne JSON-ove.
 * ---------------------------------------------------------------------------*/
i18n
  .use(Backend) // /public/locales/{{lng}}/{{ns}}.json ako odlučiš da externalizuješ delove
  .use(LanguageDetector)
  .use(ICU) // ICU message format (radi kao passthrough za obične stringove)
  .use(initReactI18next)
  .init({
    // Bundled resources – bez mrežnih poziva
    resources: translations as typeof translations,

    // Jezičke postavke
    load: 'languageOnly', // "sr-RS" -> "sr"
    lowerCaseLng: true,
    nonExplicitSupportedLngs: true,
    supportedLngs: [...SUPPORTED_LANGS],
    cleanCode: true,

    fallbackLng: {
      default: ['en'],
      sr: ['sr', 'en'],
      en: ['en', 'sr'],
    },

    ns: ['translation'],
    defaultNS: 'translation',
    fallbackNS: 'translation',

    // Detekcija jezika
    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      lookupQuerystring: 'lng',
      lookupCookie: 'i18next',
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage', 'cookie'],
      excludeCacheFor: ['cimode'],
      convertDetectedLanguage: normalizeLng,
    },

    // Interpolacija i formatiranje
    interpolation: {
      escapeValue: false, // React već escapuje
      format: (value, format, lng) => {
        const language = normalizeLng(lng)
        if (value == null) return ''

        // Tekstualne transformacije
        if (typeof value === 'string') {
          switch (format) {
            case 'uppercase':
              return value.toUpperCase()
            case 'lowercase':
              return value.toLowerCase()
            case 'capitalize':
              return value.charAt(0).toUpperCase() + value.slice(1)
            default:
              break
          }
        }

        // Datum/vreme
        if (value instanceof Date) {
          const style = (format as string) || 'medium'
          const optionsMap = {
            short: { dateStyle: 'short' },
            medium: { dateStyle: 'medium' },
            long: { dateStyle: 'long' },
            time: { timeStyle: 'short' },
            datetime: { dateStyle: 'medium', timeStyle: 'short' },
          } satisfies Record<string, Intl.DateTimeFormatOptions>
          const defaultOptions = optionsMap.medium
          const opts =
            style && style in optionsMap
              ? optionsMap[style as keyof typeof optionsMap]
              : defaultOptions
          return new Intl.DateTimeFormat(language, opts).format(value)
        }

        // Brojevi / valuta / procenat
        if (typeof value === 'number') {
          if (!format) return new Intl.NumberFormat(language).format(value)
          if (format.startsWith('currency')) {
            const currency = format.split(':')[1] || 'RSD'
            try {
              return new Intl.NumberFormat(language, {
                style: 'currency',
                currency,
              }).format(value)
            } catch {
              // fallback ako je nevalidan kod valute
              return new Intl.NumberFormat(language).format(value)
            }
          }
          if (format === 'percent') {
            return new Intl.NumberFormat(language, {
              style: 'percent',
              maximumFractionDigits: 2,
            }).format(value)
          }
          if (format === 'compact') {
            return new Intl.NumberFormat(language, {
              notation: 'compact',
              maximumFractionDigits: 1,
            }).format(value)
          }
          return new Intl.NumberFormat(language).format(value)
        }

        return String(value)
      },
    },

    // React integracija
    react: {
      useSuspense: true,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'b', 'p'],
    },

    // Debug/missing keys – samo u dev
    saveMissing: isDev,
    missingKeyHandler: (lng, ns, key) => {
      if (isDev) {
        // eslint-disable-next-line no-console
        console.warn(`[i18n] Missing translation → ${lng}.${ns}.${key}`)
      }
    },
    debug: isDev,

    // Performanse: sinhrono init kad su resursi bundlovani
    initImmediate: false,

    // Jasno ponašanje za undefined/null vrednosti
    returnNull: false,
  })

// Sync lang atributa na <html> kada je init gotov + na svaku promenu jezika
if (isBrowser()) applyHtmlLang(i18n.language)
i18n.on('languageChanged', (lng) => applyHtmlLang(lng))

/* -----------------------------------------------------------------------------
 * Helpers za kod
 * ---------------------------------------------------------------------------*/
export const setLanguage = async (lng: string | SupportedLang) => {
  const normalized = normalizeLng(lng)
  await i18n.changeLanguage(normalized)
  return normalized
}

export const getLanguage = (): SupportedLang => normalizeLng(i18n.language)

export default i18n
