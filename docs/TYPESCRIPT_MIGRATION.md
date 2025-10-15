# TypeScript Strict Mode Migration

## 📊 Status

**Total Errors**: ~256 u 79 fajlova  
**Priority**: Medium (postojeći kod radi, ali treba postepeno popraviti)

## 🎯 Strategy

Poš to je već postojeći, funkcionalan kod, migracija na strict mode se radi **postupno**:

1. ✅ Phase 1: Setup strict TypeScript (DONE)
2. 🔄 Phase 2: Fix critical errors (IN PROGRESS)
3. ⏳ Phase 3: Fix remaining errors (PLANNED)
4. ⏳ Phase 4: Enable all strict options (PLANNED)

## 🔍 Common Error Types

### 1. `noUncheckedIndexedAccess` Errors (150+)

**Problem**: Property access from index signatures
```typescript
// ❌ Error
const value = import.meta.env.VITE_SUPABASE_URL

// ✅ Fix
const value = import.meta.env['VITE_SUPABASE_URL']
// ili
const value = import.meta.env.VITE_SUPABASE_URL ?? ''
```

**Bulk Fix**:
```bash
# Find all occurrences
grep -r "import.meta.env\." src/

# Replace pattern
import.meta.env.KEY  →  import.meta.env['KEY']
```

### 2. `exactOptionalPropertyTypes` Errors (50+)

**Problem**: `undefined` nije kompatibilno sa optional properties

```typescript
// ❌ Error
interface User {
  name?: string
}
const user: User = {
  name: undefined  // Error!
}

// ✅ Fix 1: Omit the property
const user: User = {}

// ✅ Fix 2: Change type definition
interface User {
  name?: string | undefined
}

// ✅ Fix 3: Use null instead
interface User {
  name?: string | null
}
const user: User = {
  name: null
}
```

### 3. MSW Import Errors

**Problem**: MSW v2 changed imports

```typescript
// ❌ Old (MSW v1)
import { setupWorker } from 'msw/browser'
import { setupServer } from 'msw/node'

// ✅ New (MSW v2)
import { setupWorker } from 'msw/browser'  // This is correct
import { setupServer } from 'msw/node'     // This is correct
```

**Fix**: Upgrade MSW to v2
```bash
npm install -D msw@latest
```

### 4. Zustand Store Errors

**Problem**: Store selector required

```typescript
// ❌ Error
const { user } = useAppStore()

// ✅ Fix
const user = useAppStore(state => state.user)
const { user, logout } = useAppStore(state => ({ 
  user: state.user, 
  logout: state.logout 
}))
```

### 5. Sentry Type Errors

**Problem**: Sentry API changes

```typescript
// ❌ Old API
Sentry.startTransaction({ name: 'route' })

// ✅ New API (Sentry v8+)
const transaction = Sentry.startSpan({ 
  name: 'route',
  op: 'navigation'
}, () => {
  // transaction code
})
```

### 6. Web Vitals `onFID` Removed

**Problem**: FID replaced with INP

```typescript
// ❌ Old
import { onFID } from 'web-vitals'
onFID(callback)

// ✅ New
import { onINP } from 'web-vitals'
onINP(callback) // INP replaced FID
```

## 🛠️ Postupna Popravka

### Faza 1: Kritični fajlovi (Hitno)

1. `src/lib/monitoring/webVitals.ts` - ✅ FIXED
2. `src/lib/dev/debugTools.tsx` - ✅ FIXED
3. `src/lib/env.ts` - Property access
4. `src/store/useAppStore.ts` - Selector pattern
5. `src/lib/supabase.ts` - Env access

### Faza 2: Store & Pages (Visok prioritet)

6. `src/pages/AuthPage.tsx`
7. `src/pages/ProfilePage.tsx`
8. `src/pages/AuthCallbackPage.tsx`
9. `src/components/auth/ProtectedRoute.tsx`
10. `src/hoc/withAuth.tsx`

### Faza 3: Monitoring & API (Srednji prioritet)

11. `src/lib/monitoring/sentry.ts`
12. `src/lib/api.ts`
13. `src/lib/realtimeSync.ts`
14. `src/lib/logger.ts`

### Faza 4: Ostalo (Nizak prioritet)

15. MSW mocks
16. Test fajlovi
17. Utility fajlovi

## 📝 Quick Fixes

### Fix 1: Environment Variables

```bash
# Find and replace pattern
sed -i 's/import\.meta\.env\.\([A-Z_]*\)/import.meta.env["\1"]/g' src/**/*.ts
```

### Fix 2: Zustand Store Usage

Create helper hook:
```typescript
// src/hooks/useStore.ts
export function useUser() {
  return useAppStore(state => state.user)
}

export function useSettings() {
  return useAppStore(state => state.settings)
}

// Usage
const user = useUser()
const settings = useSettings()
```

### Fix 3: Optional Properties

Update type definitions:
```typescript
// types/receipt.ts
interface Receipt {
  // Before
  notes?: string
  
  // After (with exactOptionalPropertyTypes)
  notes?: string | undefined
  // or
  notes: string | null
}
```

## 🚀 Temporary Workaround

Za brzi build tokom developmenta, koristite relaxed config:

```bash
# Use relaxed TypeScript config
npx tsc --noEmit --project tsconfig.temp.json

# Or update package.json
"type-check": "tsc --noEmit --project tsconfig.temp.json"
```

`tsconfig.temp.json`:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noUncheckedIndexedAccess": false,
    "exactOptionalPropertyTypes": false
  }
}
```

## 📊 Progress Tracking

- [ ] Fix MSW imports (upgrade to v2)
- [ ] Fix Zustand store usage pattern
- [x] Fix Web Vitals FID → INP
- [x] Fix Profiler import
- [ ] Fix environment variable access (150+ occurrences)
- [ ] Fix exact optional properties (50+ occurrences)
- [ ] Fix Sentry API usage
- [ ] Fix logger type signatures

## 🎯 Target

**Goal**: 0 TypeScript errors sa full strict mode  
**Timeline**: 2-3 sedmice postupne popravke  
**Approach**: 10-20 errors fixed per day

## 📚 Resources

- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)
- [MSW v2 Migration](https://mswjs.io/docs/migrations/1.x-to-2.x)
- [Sentry v8 Migration](https://docs.sentry.io/platforms/javascript/migration/v7-to-v8/)
- [Zustand Best Practices](https://docs.pmnd.rs/zustand/guides/typescript)
- [Web Vitals](https://web.dev/articles/vitals)

---

**Note**: App radi perfektno sa postojećim kodom. Ove greške su TypeScript type safety improvements, ne runtime bugs!

