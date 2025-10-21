/**
 * Multi-Currency & Multi-Language Configuration
 *
 * Centralized config for all supported currencies and languages
 */

// ═══════════════════════════════════════════════════════════
// CURRENCY TYPES & CONFIG
// ═══════════════════════════════════════════════════════════

export type Currency = 'RSD' | 'BAM' | 'EUR'

export interface CurrencyConfig {
  code: Currency
  symbol: string
  name: string
  nameSr: string
  locale: string
  decimals: number
  flag?: string
}

export const CURRENCIES: Record<Currency, CurrencyConfig> = {
  RSD: {
    code: 'RSD',
    symbol: 'RSD',
    name: 'Serbian Dinar',
    nameSr: 'Srpski dinar',
    locale: 'sr-RS',
    decimals: 2,
    flag: '🇷🇸',
  },
  BAM: {
    code: 'BAM',
    symbol: 'KM',
    name: 'Bosnia and Herzegovina Convertible Mark',
    nameSr: 'Bosanska marka',
    locale: 'bs-BA',
    decimals: 2,
    flag: '🇧🇦',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    nameSr: 'Euro',
    locale: 'de-DE',
    decimals: 2,
    flag: '🇪🇺',
  },
} as const

// ═══════════════════════════════════════════════════════════
// LANGUAGE TYPES & CONFIG
// ═══════════════════════════════════════════════════════════

export type Language = 'sr' | 'hr' | 'sl' | 'en'

export interface LanguageConfig {
  code: Language
  name: string
  nativeName: string
  locale: string
  flag: string
  defaultCurrency: Currency
  direction: 'ltr' | 'rtl'
}

export const LANGUAGES: Record<Language, LanguageConfig> = {
  sr: {
    code: 'sr',
    name: 'Serbian',
    nativeName: 'Srpski',
    locale: 'sr-RS',
    flag: '🇷🇸',
    defaultCurrency: 'RSD',
    direction: 'ltr',
  },
  hr: {
    code: 'hr',
    name: 'Croatian',
    nativeName: 'Hrvatski',
    locale: 'hr-HR',
    flag: '🇭🇷',
    defaultCurrency: 'EUR',
    direction: 'ltr',
  },
  sl: {
    code: 'sl',
    name: 'Slovenian',
    nativeName: 'Slovenščina',
    locale: 'sl-SI',
    flag: '🇸🇮',
    defaultCurrency: 'EUR',
    direction: 'ltr',
  },
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    locale: 'en-US',
    flag: '🇬🇧',
    defaultCurrency: 'EUR',
    direction: 'ltr',
  },
} as const

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Get currency config by code
 */
export function getCurrencyConfig(code: Currency): CurrencyConfig {
  return CURRENCIES[code]
}

/**
 * Get language config by code
 */
export function getLanguageConfig(code: Language): LanguageConfig {
  return LANGUAGES[code]
}

/**
 * Get default currency for a language
 */
export function getDefaultCurrency(language: Language): Currency {
  return LANGUAGES[language].defaultCurrency
}

/**
 * Get locale string for language + currency combination
 */
export function getLocale(language: Language, currency?: Currency): string {
  if (currency) {
    return CURRENCIES[currency].locale
  }
  return LANGUAGES[language].locale
}

/**
 * Check if currency is valid
 */
export function isValidCurrency(code: string): code is Currency {
  return code in CURRENCIES
}

/**
 * Check if language is valid
 */
export function isValidLanguage(code: string): code is Language {
  return code in LANGUAGES
}

/**
 * Get all currency codes
 */
export function getAllCurrencies(): Currency[] {
  return Object.keys(CURRENCIES) as Currency[]
}

/**
 * Get all language codes
 */
export function getAllLanguages(): Language[] {
  return Object.keys(LANGUAGES) as Language[]
}
