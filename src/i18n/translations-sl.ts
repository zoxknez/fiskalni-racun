import { translations } from './translations'

/**
 * Slovenian (Slovenščina) Translations
 *
 * Inherits from Serbian (sr) and overrides specific keys.
 * This ensures no missing keys while allowing gradual translation.
 */
export const translationsSl = {
  sl: {
    translation: {
      ...translations.sr.translation,

      // Navigation
      nav: {
        ...translations.sr.translation.nav,
        home: 'Domov',
        receipts: 'Računi',
        warranties: 'Garancije',
        documents: 'Dokumenti',
        search: 'Iskanje',
        about: 'O aplikaciji',
        closeMenu: 'Zapri meni',
      },

      home: {
        ...translations.sr.translation.home,
        monthSpending: 'Poraba ta mesec',
      },

      // Common
      common: {
        ...translations.sr.translation.common,
        currency: 'EUR',
        save: 'Shrani',
        cancel: 'Prekliči',
        delete: 'Izbriši',
        edit: 'Uredi',
        close: 'Zapri',
        back: 'Nazaj',
        next: 'Naprej',
        previous: 'Nazaj',
        confirm: 'Potrdi',
        yes: 'Da',
        no: 'Ne',
        loading: 'Nalaganje...',
        error: 'Napaka',
        success: 'Uspeh',
        warning: 'Opozorilo',
        info: 'Informacije',
      },
    },
  },
} as const
