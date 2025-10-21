# Multi-Currency & Multi-Language Implementation Plan

## 🎯 Overview
Dodavanje podrške za:
- **Valute:** RSD, BAM, EUR
- **Jezici:** Srpski (sr), Hrvatski (hr), Slovenački (sl), Engleski (en)

## 📋 Implementation Checklist

### Phase 1: Database & Types ✅
- [x] Extend AppSettings interface with currency
- [x] Add currency type definitions
- [x] Add language type extensions
- [x] Create locale configuration

### Phase 2: Currency Infrastructure ✅
- [x] Refactor formatCurrency to support multiple currencies
- [x] Create currency utilities
- [x] Update all hardcoded RSD references

### Phase 3: i18n - AI Translation 🤖
- [x] Generate Croatian translations (500-700 keys)
- [x] Generate Slovenian translations (500-700 keys)
- [x] Manual review sections marked

### Phase 4: UI Components ✅
- [x] Registration - Currency & Language selector
- [x] Settings - Currency selector
- [x] Language switcher update

### Phase 5: Testing 🧪
- [ ] Manual testing per language/currency combo
- [ ] Translation review by native speakers

## 🔧 Technical Details

### Currency Config
```typescript
{
  RSD: { locale: 'sr-RS', symbol: 'RSD', decimals: 2 },
  BAM: { locale: 'bs-BA', symbol: 'KM', decimals: 2 },
  EUR: { locale: 'de-DE', symbol: '€', decimals: 2 }
}
```

### Language Config
```typescript
{
  sr: { locale: 'sr-RS', name: 'Srpski', flag: '🇷🇸', defaultCurrency: 'RSD' },
  hr: { locale: 'hr-HR', name: 'Hrvatski', flag: '🇭🇷', defaultCurrency: 'EUR' },
  sl: { locale: 'sl-SI', name: 'Slovenački', flag: '🇸🇮', defaultCurrency: 'EUR' },
  en: { locale: 'en-US', name: 'English', flag: '🇬🇧', defaultCurrency: 'EUR' }
}
```

## 📊 AI Translation Strategy

### GPT-4 Bulk Translation
1. Export all Serbian keys (baseline)
2. AI translate SR → HR (Croatian)
3. AI translate SR → SL (Slovenian)
4. Manual review critical sections:
   - Navigation
   - Error messages
   - Button labels
   - Form validations

### Quality Assurance
- Side-by-side comparison SR/HR/SL
- Native speaker review (crowdsource)
- Iterative improvements

## 🚀 Deployment Strategy

### Week 1: Infrastructure
- Currency support
- Refactored formatters
- Database migration

### Week 2: Croatian
- AI translation
- Manual review
- Testing

### Week 3: Slovenian
- AI translation
- Manual review
- Testing

## 📝 Notes for Manual Review

### Critical Sections (High Priority)
- `nav.*` - Navigation labels
- `common.*` - Common buttons/actions
- `errors.*` - Error messages
- `validation.*` - Form validation
- `auth.*` - Authentication

### Medium Priority
- Page titles and descriptions
- Form labels
- Settings options

### Low Priority
- Long descriptions
- Help text
- Marketing copy

## ✅ Success Criteria

- [ ] All 4 languages working
- [ ] All 3 currencies working
- [ ] No hardcoded strings
- [ ] TypeScript errors: 0
- [ ] Build successful
- [ ] Native speaker approval (HR, SL)

---

**Status:** In Progress
**Started:** October 21, 2025
**ETA:** 3 weeks
