/**
 * Slovenian (Slovenščina) Translations
 *
 * Status: TEMPLATE - Needs manual translation
 *
 * TODO: Translate all keys from Serbian to Slovenian
 * Priority sections to translate first:
 * 1. nav.* (Navigation)
 * 2. common.* (Common buttons/actions)
 * 3. errors.* (Error messages)
 * 4. auth.* (Authentication)
 * 5. Rest of the sections
 *
 * Instructions:
 * - Copy structure from translations.ts (sr section)
 * - Translate each value to Slovenian
 * - Keep keys the same as Serbian version
 * - Preserve placeholders like {count}, {{value}}, etc.
 */

export const translationsSl = {
  sl: {
    translation: {
      // ═══════════════════════════════════════════════════════════
      // TODO: TRANSLATE FROM SERBIAN
      // ═══════════════════════════════════════════════════════════

      // Navigation - PRIORITET 1
      nav: {
        home: 'Početna', // TODO: Translate to Slovenian
        receipts: 'Računi', // TODO
        warranties: 'Garancije', // TODO
        analytics: 'Analitika', // TODO
        documents: 'Dokumenta', // TODO
        import: 'Uvoz podataka', // TODO
        importExport: 'Uvoz / Izvoz', // TODO
        add: 'Dodaj', // TODO
        search: 'Pretraga', // TODO
        profile: 'Profil', // TODO
        about: 'O aplikaciji', // TODO
        closeMenu: 'Zatvori meni', // TODO
      },

      // Common - PRIORITET 2
      common: {
        save: 'Sačuvaj', // TODO
        cancel: 'Otkaži', // TODO
        delete: 'Obriši', // TODO
        edit: 'Izmeni', // TODO
        close: 'Zatvori', // TODO
        back: 'Nazad', // TODO
        next: 'Dalje', // TODO
        previous: 'Prethodno', // TODO
        confirm: 'Potvrdi', // TODO
        yes: 'Da', // TODO
        no: 'Ne', // TODO
        ok: 'U redu', // TODO
        loading: 'Učitavanje...', // TODO
        error: 'Greška', // TODO
        success: 'Uspeh', // TODO
        warning: 'Upozorenje', // TODO
        info: 'Informacija', // TODO
        currency: 'EUR', // Slovenian uses Euro
        // ... TODO: Add all other common keys
      },

      // TODO: Add all other sections from Serbian translation
      // Copy entire structure from src/i18n/translations.ts (sr section)
      // and translate to Slovenian

      // Sections to add:
      // - home: { ... }
      // - receipts: { ... }
      // - receiptDetail: { ... }
      // - warranties: { ... }
      // - analytics: { ... }
      // - profile: { ... }
      // - auth: { ... }
      // - importPage: { ... }
      // - importExportPage: { ... }
      // - about: { ... }
      // - errors: { ... }
      // - ... etc.
    },
  },
} as const

// Export type for type safety
export type TranslationsSl = typeof translationsSl
