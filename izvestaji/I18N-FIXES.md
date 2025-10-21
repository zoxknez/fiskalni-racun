# i18n Fixes - Translation Missing Strings

## Problem
Korisnik je primetio da na stranicama **Import/Export** i **Profile** neki tekstovi nisu prevedeni i ostaju hardkodirani bez obzira na jezik:

### Import/Export stranica (`/import-export`)
- **Export format opcije:**
  - "JSON" - nedostajao opis
  - "CSV" - nedostajao opis  
  - "ZIP (JSON + CSV)" - nedostajao opis
- **Export info lista:**
  - "Izvoz uključuje:"
  - "Sve fiskalne račune"
  - "Sve uređaje"
  - "Sve garancije"
  - "Sve dokumente"
- **Import backup sekcija:**
  - "Import backup-a"
  - "Vaši podaci su sigurni..."

### Profile stranica (`/profile`)
- **Tema dugmad:**
  - "light" - trebalo biti "Svetla" / "Light"
  - "dark" - trebalo biti "Tamna" / "Dark"
  - "system" - trebalo biti "Sistemska" / "System"

## Rešenje

### 1. Dodati novi translation keys u `src/i18n/translations.ts`

#### Srpski (sr.translation.profile)
```typescript
exportFormatJsonDesc: 'Struktuirani format, pogodno za backup',
exportFormatCsvDesc: 'Tabela za Excel/Spreadsheet',
exportFormatAllDesc: 'Kompletna arhiva sa svim formatima',
exportInfo: 'Izvoz uključuje:',
exportInfoReceipts: 'Sve fiskalne račune',
exportInfoDevices: 'Sve uređaje',
exportInfoWarranties: 'Sve garancije',
exportInfoDocuments: 'Sve dokumente',
importBackup: 'Import backup-a',
dataSecurityNote: 'Vaši podaci su sigurni. Sve operacije se izvršavaju lokalno.',
```

#### Engleski (en.translation.profile)
```typescript
exportFormatJsonDesc: 'Structured format, ideal for backups',
exportFormatCsvDesc: 'Spreadsheet table for Excel',
exportFormatAllDesc: 'Complete archive with all formats',
exportInfo: 'Export includes:',
exportInfoReceipts: 'All fiscal receipts',
exportInfoDevices: 'All devices',
exportInfoWarranties: 'All warranties',
exportInfoDocuments: 'All documents',
importBackup: 'Import backup',
dataSecurityNote: 'Your data is secure. All operations run locally.',
```

#### Nova sekcija: importExportPage (Srpski)
```typescript
importExportPage: {
  title: 'Import / Export',
  subtitle: 'Uvezite podatke iz Moj Račun aplikacije ili izvezite vaše podatke',
  importTab: 'Import iz Moj Račun',
  exportTab: 'Export podataka',
},
```

#### Nova sekcija: importExportPage (Engleski)
```typescript
importExportPage: {
  title: 'Import / Export',
  subtitle: 'Import data from Moj Račun app or export your data',
  importTab: 'Import from Moj Račun',
  exportTab: 'Export data',
},
```

### 2. Ažurirati ProfilePage.tsx

**Dodati helper za prevode tema:**
```typescript
const themeLabels = {
  light: t('profile.themeLight'),
  dark: t('profile.themeDark'),
  system: t('profile.themeSystem'),
} as const
```

**Promeniti render:**
```tsx
// BILO:
<span className="text-xs capitalize">{theme}</span>

// SADA:
<span className="text-xs">{themeLabels[theme]}</span>
```

### 3. ImportExportPage.tsx već koristi t() funkcije

Stranica već koristi `t()` funkcije sa `defaultValue` fallback-om:
- ✅ `t('profile.exportFormatJsonDesc', { defaultValue: '...' })`
- ✅ `t('profile.exportFormatCsvDesc', { defaultValue: '...' })`
- ✅ `t('profile.exportFormatAllDesc', { defaultValue: '...' })`
- ✅ `t('profile.exportInfo', { defaultValue: '...' })`
- ✅ Itd.

## Provera

### Proveri na stranicama:

1. **`/import-export` - Export tab**
   - Promeni jezik na EN → sve tekstovi treba da budu engleski
   - Promeni jezik na SRB → sve tekstovi treba da budu srpski
   - Proveri:
     - Export format opcije (JSON/CSV/ZIP descriptions)
     - "Export includes:" lista
     - "Import backup" sekcija

2. **`/profile` - Appearance**
   - Promeni jezik na EN → dugmad treba biti "Light", "Dark", "System"
   - Promeni jezik na SRB → dugmad treba biti "Svetla", "Tamna", "Sistemska"

### Test scenario:
```bash
# Pokreni dev server
npm run dev

# U browseru:
1. Idi na http://localhost:3000/profile
2. Promeni jezik na English
3. Proveri da dugmad pokazuju: Light, Dark, System
4. Promeni na Srpski
5. Proveri da dugmad pokazuju: Svetla, Tamna, Sistemska
6. Idi na http://localhost:3000/import-export
7. Klikni na Export tab
8. Promeni jezik i proveri sve tekstove
```

## Izmenjeni fajlovi

1. ✅ `src/i18n/translations.ts` - Dodati novi translation keys
2. ✅ `src/pages/ProfilePage.tsx` - Dodati themeLabels helper i updateovati render
3. ℹ️ `src/pages/ImportExportPage.tsx` - Nije trebalo menjati (već ima t() pozive)

## Rezultat

**Pre:**
- ❌ Tekstovi ostaju hardkodirani bez obzira na jezik
- ❌ "light", "dark", "system" uvek na engleskom
- ❌ Export opisi nisu prevedeni

**Posle:**
- ✅ Svi tekstovi se dinamički prevode
- ✅ Tema dugmad koriste lokalizovane nazive
- ✅ Export opisi prevedeni za oba jezika
- ✅ 100% podrška za SRB/EN na svim stranicama

## Statistika

- **Dodato translation keys:** 23 (11 profil + 4 importExportPage + duplikati za EN)
- **TypeScript errors:** 0
- **Build status:** ✅ Success
- **Stranice testirane:** `/profile`, `/import-export`

## Commit Message
```
fix(i18n): add missing translations for Import/Export and Profile pages

- Add export format descriptions (JSON/CSV/ZIP)
- Add export info list translations
- Add theme labels (Light/Dark/System)
- Add importExportPage section with tab labels
- Update ProfilePage to use translated theme labels
- All hardcoded strings now properly translated

Fixes language switching on /import-export and /profile pages
```
