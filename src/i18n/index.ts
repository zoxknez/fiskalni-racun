import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import Backend from 'i18next-http-backend'
import ICU from 'i18next-icu'
import { initReactI18next } from 'react-i18next'
import { translations } from './translations'

// ---- Type-safe keys (optional but recommended) ---------------------------------
// Inference based on the SR shape (SR and EN share the same key structure)
type SrResources = typeof translations.sr.translation

declare module 'i18next' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface CustomTypeOptions {
    defaultNS: 'translation'
    // The resource object for the default namespace
    resources: {
      translation: SrResources
    }
    // Use i18next interpolation, not escaping (React escapes by default)
    returnNull: false
  }
}

// ---- Helpers -------------------------------------------------------------------
const SUPPORTED_LANGS = ['sr', 'en'] as const

const normalizeLng = (lng?: string | null) => {
  if (!lng) return 'sr'
  const lower = lng.toLowerCase()
  // Normalize all Serbian variants to `sr`
  if (lower.startsWith('sr')) return 'sr'
  if (lower.startsWith('en')) return 'en'
  return 'sr'
}

// ---- i18next setup --------------------------------------------------------------
i18n
  // Optional: load from /public/locales if you decide to externalize JSON
  .use(Backend)
  // Detect user's language (query -> cookie -> localStorage -> navigator -> <html lang>)
  .use(LanguageDetector)
  // ICU support (works as pass-through for non-ICU strings; safe to keep)
  .use(ICU)
  // React binding
  .use(initReactI18next)
  .init({
    // Bundled resources (fast, no network)
    resources: translations as any,

    // Limit to language code only ("sr-RS" -> "sr")
    load: 'languageOnly',
    lowerCaseLng: true,
    nonExplicitSupportedLngs: true,
    supportedLngs: [...SUPPORTED_LANGS],

    // Fallback languages (prefer English when missing)
    fallbackLng: {
      default: ['en'],
      sr: ['sr', 'en'],
      en: ['en', 'sr'],
    },

    // Namespaces
    ns: ['translation'],
    defaultNS: 'translation',
    fallbackNS: 'translation',

    // Language detection settings
    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      lookupQuerystring: 'lng',
      lookupCookie: 'i18next',
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage', 'cookie'],
      excludeCacheFor: ['cimode'],
      convertDetectedLanguage: normalizeLng,
    },

    // Interpolation & formatting
    interpolation: {
      escapeValue: false,
      format: (value, format, lng) => {
        const language = normalizeLng(lng)
        if (value == null) return ''

        // Text transforms
        if (typeof value === 'string') {
          if (format === 'uppercase') return value.toUpperCase()
          if (format === 'lowercase') return value.toLowerCase()
          if (format === 'capitalize') return value.charAt(0).toUpperCase() + value.slice(1)
        }

        // Date & time formatting
        if (value instanceof Date) {
          const style = (format as string) || 'medium'
          const optionsMap: Record<string, Intl.DateTimeFormatOptions> = {
            short: { dateStyle: 'short' },
            medium: { dateStyle: 'medium' },
            long: { dateStyle: 'long' },
            time: { timeStyle: 'short' },
            datetime: { dateStyle: 'medium', timeStyle: 'short' },
          }
          const opts = optionsMap[style] || optionsMap['medium']
          return new Intl.DateTimeFormat(language, opts).format(value)
        }

        // Numbers / currency / percent
        if (typeof value === 'number') {
          if (!format) return new Intl.NumberFormat(language).format(value)
          if (format.startsWith('currency')) {
            const currency = format.split(':')[1] || 'RSD'
            return new Intl.NumberFormat(language, { style: 'currency', currency }).format(value)
          }
          if (format === 'percent') {
            return new Intl.NumberFormat(language, { style: 'percent', maximumFractionDigits: 2 }).format(value)
          }
          if (format === 'compact') {
            return new Intl.NumberFormat(language, { notation: 'compact', maximumFractionDigits: 1 }).format(value)
          }
          return new Intl.NumberFormat(language).format(value)
        }

        return String(value)
      },
    },

    // React options
    react: {
      useSuspense: true,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'b', 'p'],
    },

    // Missing keys (only in dev)
    saveMissing: import.meta.env?.DEV ?? false,
    missingKeyHandler: (lng, ns, key) => {
      if (import.meta.env?.DEV) {
        // eslint-disable-next-line no-console
        console.warn(`[i18n] Missing translation → ${lng}.${ns}.${key}`)
      }
    },

    // Debug (dev only)
    debug: import.meta.env?.DEV ?? false,

    // Performance: avoid microtask deferral when bundling resources
    initImmediate: false,
  })

// Keep <html lang="…"> in sync with selected language
const applyHtmlLang = (lng: string) => {
  const normalized = normalizeLng(lng)
  document?.documentElement?.setAttribute('lang', normalized)
  document?.documentElement?.setAttribute('dir', 'ltr')
}

applyHtmlLang(i18n.language)
i18n.on('languageChanged', applyHtmlLang)

// Convenience helper for code: ensure normalized language switch
export const setLanguage = async (lng: string) => {
  const normalized = normalizeLng(lng)
  await i18n.changeLanguage(normalized)
  return normalized
}

export default i18n
