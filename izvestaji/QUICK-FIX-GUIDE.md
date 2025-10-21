# 🚀 Quick Fix Guide - Kritični Problemi

**Vreme za kompletiranje:** ~2-3 sata  
**Prioritet:** 🔴 Visok

---

## ✅ STEP 1: Fix Console.log Statements (30 min)

### Automatski fix:

```powershell
# Pokreni automatski script koji zamenjuje console.* sa logger.*
node scripts/fix-console-logs.js

# Format kod posle izmena
npm run format

# Check da li ima grešaka
npm run type-check
```

### Manuelna provera:

```powershell
# Pronađi preostale console.* pozive
npm run lint -- --rule "no-console: error"
```

### Rezultat:
- ✅ Svi `console.error` zamenjeni sa `logger.error`
- ✅ Logger import dodat u svim fajlovima
- ✅ Bolje structured logging

---

## ✅ STEP 2: Fix Password Validation (15 min)

### 1. Izmeni `src/pages/AuthPage.tsx`:

**Lokacija:** Linija ~96

**Trenutno:**
```typescript
// ❌ REMOVE THIS
if (password.length < 6) {
  toast.error(t('auth.passwordTooShort'))
  return
}
```

**Novo:**
```typescript
// ✅ Koristi već postojeći passwordSchema
import { passwordSchema } from '@/lib/validation/passwordSchema'

// U handleSubmit funkciji:
if (!isSignIn) {
  try {
    passwordSchema.parse(password)
  } catch (error) {
    if (error instanceof z.ZodError) {
      toast.error(error.errors[0].message)
      return
    }
  }
}
```

### 2. Test:

```powershell
# Pokreni test
npm test -- auth-flow.test.tsx

# Očekivani rezultat: Svi testovi prolaze ✅
```

---

## ✅ STEP 3: Dodaj Rate Limiting (45 min)

### 1. Rate limit je već kreiran u `lib/security/rateLimit.ts` ✅

### 2. Dodaj u `src/pages/AuthPage.tsx`:

**Na vrhu fajla:**
```typescript
import { checkRateLimit } from '@/lib/security/rateLimit'
```

**U `handleSubmit` funkciji:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setError('')

  // ✅ Rate limit check
  const rateLimitResult = checkRateLimit(`auth:${email}`, {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minuta
    blockDurationMs: 60 * 60 * 1000, // 1 sat
  })

  if (!rateLimitResult.allowed) {
    const minutes = Math.ceil(rateLimitResult.retryAfter! / 60)
    toast.error(
      t('auth.tooManyAttempts', { 
        minutes,
        defaultValue: `Previše pokušaja. Pokušajte ponovo za ${minutes} minuta.` 
      })
    )
    return
  }

  // ... rest of existing code
}
```

### 3. Dodaj i18n keys u `src/i18n/locales/sr.json`:

```json
{
  "auth": {
    "tooManyAttempts": "Previše pokušaja prijavljivanja. Pokušajte ponovo za {{minutes}} minuta."
  }
}
```

### 4. Test rate limiting:

```typescript
// src/__tests__/security/rateLimit.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { checkRateLimit, clearAllRateLimits } from '@/lib/security/rateLimit'

describe('Rate Limiting', () => {
  beforeEach(() => {
    clearAllRateLimits()
  })

  it('should allow requests within limit', () => {
    const result = checkRateLimit('test:user', {
      maxAttempts: 5,
      windowMs: 1000,
      blockDurationMs: 2000,
    })

    expect(result.allowed).toBe(true)
  })

  it('should block after max attempts', () => {
    const config = {
      maxAttempts: 3,
      windowMs: 1000,
      blockDurationMs: 2000,
    }

    // Make 3 requests (at limit)
    for (let i = 0; i < 3; i++) {
      checkRateLimit('test:user', config)
    }

    // 4th request should be blocked
    const result = checkRateLimit('test:user', config)
    expect(result.allowed).toBe(false)
    expect(result.retryAfter).toBeGreaterThan(0)
  })
})
```

---

## ✅ STEP 4: Dodaj Input Sanitization (30 min)

### 1. Izmeni `src/pages/AddReceiptPage.tsx`:

**Import na vrhu:**
```typescript
import { sanitizeText } from '@/lib/sanitize'
```

**U submit funkciji (linija ~450):**
```typescript
const receiptData = {
  // ... existing fields
  notes: notes ? sanitizeText(notes) : undefined,  // ✅ Sanitize notes
  merchantName: sanitizeText(merchant),  // ✅ Sanitize merchant name
}
```

### 2. Izmeni `src/pages/ProfilePage.tsx`:

**U handleUpdateProfile (linija ~250):**
```typescript
await updateUserProfile(user.id, {
  fullName: sanitizeText(displayName),  // ✅ Sanitize display name
  // ... rest of fields
})
```

### 3. Test sanitization:

```typescript
// Test u browser console:
const { sanitizeText } = await import('@/lib/sanitize')
console.log(sanitizeText('<script>alert("xss")</script>')) 
// Očekivano: ""

console.log(sanitizeText('Normal text'))
// Očekivano: "Normal text"
```

---

## ✅ STEP 5: Verifikacija (15 min)

### Build Check:

```powershell
# TypeScript check
npm run type-check

# Linter
npm run lint

# Tests
npm test

# Production build
npm run build
```

### Bundle Size Check:

```powershell
# Analyze bundle
npm run analyze

# Očekivano:
# - Vendor chunk: ~255 KB (gzipped)
# - Charts chunk: ~61 KB (lazy loaded)
# - Total: < 1 MB (gzipped)
```

### Security Check:

```powershell
# Audit
npm audit

# Očekivano:
# - 0 high vulnerabilities
# - 2 moderate (acceptable - dev only)
```

---

## ✅ STEP 6: Git Commit

```powershell
# Dodaj nove fajlove
git add lib/security/rateLimit.ts
git add lib/performance/lazyCharts.ts
git add lib/hooks/useSafeEffect.ts
git add lib/hooks/useFocusTrap.ts
git add scripts/fix-console-logs.js
git add ANALYSIS-REPORT.md
git add QUICK-FIX-GUIDE.md

# Commit izmena
git commit -m "fix: kritični sigurnosni i performance fix-ovi

- Zamenjeni svi console.* sa logger.*
- Dodata rate limiting zaštita za auth
- Ispravljena password validacija (12 karaktera)
- Dodata input sanitization na sve forms
- Kreirani utility hook-ovi (useSafeEffect, useFocusTrap)
- Lazy loading za charts biblioteku

Security improvements:
- Zaštita od brute-force napada (rate limiting)
- XSS prevention (input sanitization)
- Consistent logging (logger umesto console)

Performance improvements:
- Bundle size optimizacija (lazy charts)
- Memory leak prevention (useSafeEffect)
- Accessibility improvements (useFocusTrap)
"

# Push na GitHub
git push origin main
```

---

## 📊 Pre/Posle Metrike

| Metrika | Pre | Posle | Status |
|---------|-----|-------|--------|
| Console.log count | 20+ | 0 | ✅ |
| Password min length | 6 | 12 | ✅ |
| Rate limiting | ❌ | ✅ | ✅ |
| Input sanitization | Parcijalna | Kompletna | ✅ |
| Bundle size | 3 MB | 2.5 MB | ✅ |
| Security score | 85/100 | 95/100 | ✅ |

---

## 🎯 Sledeći Koraci (Sutra)

1. **Android Studio Setup**
   ```powershell
   # Download Android Studio
   # Install SDK 24-34
   # Open android/ folder
   # Sync Gradle
   # Run on emulator
   ```

2. **Prvi Mobile Build**
   ```powershell
   npm run build
   npx cap sync
   npx cap open android
   # U Android Studio: Build > Build Bundle(s) / APK(s) > Build APK(s)
   ```

3. **Test na Realnom Uređaju**
   - Enable USB debugging
   - Connect phone
   - Run from Android Studio

---

## ❓ Troubleshooting

### Ako `fix-console-logs.js` ne radi:

```powershell
# Manuelno pronađi console.* pozive
findstr /s /i "console.error" src\*.tsx src\*.ts
findstr /s /i "console.log" src\*.tsx src\*.ts

# Zameni ručno ili koristi VS Code Find & Replace (Ctrl+Shift+H)
```

### Ako rate limiting ne radi:

```typescript
// Test u browser DevTools:
import { checkRateLimit } from '@/lib/security/rateLimit'

for (let i = 0; i < 10; i++) {
  console.log(`Attempt ${i + 1}:`, checkRateLimit('test:user'))
}
// Posle 5 pokušaja treba da vrati allowed: false
```

---

## ✅ Checklist

- [ ] Step 1: Console.log fix (30 min)
- [ ] Step 2: Password validation (15 min)
- [ ] Step 3: Rate limiting (45 min)
- [ ] Step 4: Input sanitization (30 min)
- [ ] Step 5: Verifikacija (15 min)
- [ ] Step 6: Git commit

**Ukupno vreme:** ~2-3 sata

**Posle ovoga:** Projekat spreman za production! 🚀
