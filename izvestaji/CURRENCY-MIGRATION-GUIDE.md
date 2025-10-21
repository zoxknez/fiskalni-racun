# Multi-Currency & Multi-Language Migration Guide

## 🎯 Overview

This guide documents the database migration needed to add multi-currency and multi-language support to existing data.

## 📊 Database Changes

### 1. User Settings Migration

#### Add Currency Field

**Current Schema:**
```typescript
interface AppSettings {
  language: 'sr' | 'en'
  theme: 'light' | 'dark' | 'system'
  // ... other settings
}
```

**New Schema:**
```typescript
interface AppSettings {
  language: 'sr' | 'en' | 'hr' | 'sl'
  currency: 'RSD' | 'BAM' | 'EUR'
  theme: 'light' | 'dark' | 'system'
  // ... other settings
}
```

#### Migration Strategy

**Option A: Default for All Users (Simplest)**
```typescript
// All existing users get:
{
  language: 'sr', // Keep existing
  currency: 'RSD', // New default
}
```

**Option B: Smart Defaults Based on Language**
```typescript
// Map language to likely currency:
{
  sr: 'RSD',
  hr: 'EUR',
  sl: 'EUR',
  en: 'EUR',
}
```

**Recommended:** Option A for simplicity

### 2. Receipt Currency Migration

**Current:** No currency field on receipts (assumed RSD)

**Options:**

#### Option 1: Add Currency to All Receipts (RECOMMENDED)
```typescript
// Add currency field with default RSD for existing receipts
interface Receipt {
  // ... existing fields
  currency: 'RSD' | 'BAM' | 'EUR'
}

// Migration:
// UPDATE receipts SET currency = 'RSD' WHERE currency IS NULL
```

**Pros:**
- ✅ Future-proof
- ✅ Supports multi-currency receipts
- ✅ Analytics can group by currency

**Cons:**
- ⚠️ Database migration required
- ⚠️ Backwards compatibility needed

#### Option 2: Use User Default Currency (Simpler)
```typescript
// No receipt-level currency
// Use user's default currency when displaying

// Pros:
// - No database migration
// - Simpler implementation

// Cons:
// - Can't track receipts in foreign currency
// - Wrong if user changes default
```

**Recommended:** Option 1 (add currency to receipts)

## 🔧 Implementation Steps

### Phase 1: Infrastructure (DONE ✅)

1. ✅ Create `src/config/locales.ts` - Currency & language config
2. ✅ Create `src/lib/currency.ts` - Format utilities
3. ✅ Update `src/types/index.ts` - AppSettings interface
4. ✅ Create `src/i18n/translations-hr.ts` - Croatian template
5. ✅ Create `src/i18n/translations-sl.ts` - Slovenian template
6. ✅ Update `src/i18n/index.ts` - Register new languages

### Phase 2: Database Migration (TODO)

#### Step 1: Add Currency to AppSettings

**File:** `lib/db.ts` or wherever your database schema is

```typescript
// Add to settings schema
export interface UserSettings {
  // ... existing
  currency?: 'RSD' | 'BAM' | 'EUR' // Optional for migration
}
```

**Migration Code:**
```typescript
// In your migration or app init:
async function migrateUserSettings() {
  const settings = await getUserSettings()
  
  if (!settings.currency) {
    await updateUserSettings({
      ...settings,
      currency: 'RSD', // Default
    })
  }
}
```

#### Step 2: Add Currency to Receipts (Optional but recommended)

```typescript
export interface Receipt {
  // ... existing fields
  currency?: 'RSD' | 'BAM' | 'EUR'
}

// Migration
async function migrateReceipts() {
  const receipts = await getAllReceipts()
  
  for (const receipt of receipts) {
    if (!receipt.currency) {
      await updateReceipt(receipt.id, {
        ...receipt,
        currency: 'RSD',
      })
    }
  }
}
```

### Phase 3: UI Components (TODO)

#### Registration Flow

**File:** Create or update registration component

```tsx
// Add to registration form:
<CurrencySelector 
  value={currency}
  onChange={setCurrency}
/>

<LanguageSelector
  value={language}
  onChange={setLanguage}
/>
```

#### Settings Page

**File:** `src/pages/ProfilePage.tsx`

```tsx
// Add currency selector (similar to theme selector)
<div className="currency-selector">
  {['RSD', 'BAM', 'EUR'].map((curr) => (
    <button
      key={curr}
      onClick={() => handleCurrencyChange(curr)}
      className={currency === curr ? 'active' : ''}
    >
      {getCurrencySymbol(curr)} {curr}
    </button>
  ))}
</div>
```

### Phase 4: Update Formatters (TODO)

Replace all hardcoded formatCurrency calls:

**Before:**
```tsx
import { formatCurrency } from '@lib/utils'

<div>{formatCurrency(amount)}</div>
// Always shows: "1.234,56 RSD"
```

**After:**
```tsx
import { formatCurrency } from '@/lib/currency'
import { useAppStore } from '@/store/useAppStore'

const { settings } = useAppStore()

<div>
  {formatCurrency(amount, {
    currency: settings.currency,
    language: settings.language,
  })}
</div>
// Shows: "1.234,56 RSD" or "1,234.56 €" based on settings
```

**Files to Update:**
- [ ] `src/pages/HomePage.tsx`
- [ ] `src/pages/ReceiptsPage.tsx`
- [ ] `src/pages/ReceiptDetailPage.tsx`
- [ ] `src/pages/AnalyticsPage.tsx`
- [ ] `src/pages/ProfilePage.tsx`
- [ ] `src/components/**/*.tsx` (any components showing amounts)

## 🧪 Testing Checklist

### Unit Tests
- [ ] Test `formatCurrency` with all currencies
- [ ] Test currency parsing
- [ ] Test locale detection

### Integration Tests
- [ ] User can change currency in settings
- [ ] Currency persists across sessions
- [ ] Receipts display in correct currency
- [ ] Analytics totals respect currency

### Manual Testing Matrix

| Language | Currency | Test |
|----------|----------|------|
| sr | RSD | ✅ Default combo |
| sr | BAM | ⚠️ Edge case |
| sr | EUR | ⚠️ Edge case |
| hr | EUR | ✅ Expected combo |
| hr | RSD | ⚠️ Edge case |
| sl | EUR | ✅ Expected combo |
| en | EUR | ✅ Expected combo |

## 📝 Translation Status

### Serbian (sr) ✅
- Status: Complete (baseline)
- Keys: ~700

### English (en) ✅
- Status: Complete
- Keys: ~700

### Croatian (hr) ⏳
- Status: Template created, needs translation
- Keys: ~700 TODO
- Priority:
  1. nav.* (Navigation)
  2. common.* (Buttons/Actions)
  3. errors.* (Error messages)
  4. Rest of sections

### Slovenian (sl) ⏳
- Status: Template created, needs translation
- Keys: ~700 TODO
- Priority: Same as Croatian

## 🚀 Deployment Plan

### Week 1: Database & Core
- [ ] Implement database migration
- [ ] Add currency to user settings
- [ ] Add currency to receipts (optional)
- [ ] Test migration with staging data

### Week 2: UI & Integration
- [ ] Update all formatCurrency calls
- [ ] Add currency selector to settings
- [ ] Add registration currency/language picker
- [ ] Test all pages with different currencies

### Week 3: Translations
- [ ] Croatian translation (manual or AI-assisted)
- [ ] Slovenian translation (manual or AI-assisted)
- [ ] Native speaker review
- [ ] Fix translation issues

## ⚠️ Breaking Changes

### For Existing Users

**No breaking changes if you:**
1. Default all existing users to RSD
2. Keep legacy formatCurrency as fallback
3. Make currency field optional initially

**Breaking changes if you:**
1. Remove old formatCurrency without deprecation
2. Make currency required immediately
3. Change existing RSD values

### Backward Compatibility Strategy

```typescript
// Keep old function working
// lib/utils.ts
export function formatCurrency(amount: number): string {
  // Falls back to RSD if no settings
  const settings = useAppStore.getState().settings
  return formatCurrencyNew(amount, {
    currency: settings?.currency || 'RSD',
    language: settings?.language || 'sr',
  })
}
```

## 🎯 Success Criteria

- [x] Currency config created
- [x] Format utilities refactored
- [x] Translation templates created
- [ ] Database migration complete
- [ ] UI components updated
- [ ] All pages showing correct currency
- [ ] Settings page currency selector
- [ ] Croatian translations complete
- [ ] Slovenian translations complete
- [ ] Native speaker approval
- [ ] Zero TypeScript errors
- [ ] All tests passing

---

**Created:** October 21, 2025  
**Status:** Phase 1 Complete ✅  
**Next:** Phase 2 - Database Migration
