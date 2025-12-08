import { translations } from './translations'

/**
 * Croatian (Hrvatski) Translations
 *
 * Inherits from Serbian (sr) and overrides specific keys.
 * This ensures no missing keys while allowing gradual translation.
 */
export const translationsHr = {
  hr: {
    translation: {
      ...translations.sr.translation,

      // Navigation
      nav: {
        ...translations.sr.translation.nav,
        warranties: 'Jamstva',
        documents: 'Dokumenti',
      },

      home: {
        ...translations.sr.translation.home,
        monthSpending: 'Potrošnja ovog mjeseca',
      },

      // Common
      common: {
        ...translations.sr.translation.common,
        currency: 'EUR',
        months_one: '{{count}} mjesec',
        months_few: '{{count}} mjeseca',
        months_other: '{{count}} mjeseci',
        success: 'Uspjeh',
        error: 'Greška',
      },
    },
  },
} as const
