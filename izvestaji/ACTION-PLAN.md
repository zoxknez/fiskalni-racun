# 🎯 ACTION PLAN - Kritične Izmene

**Prioritet:** KRITIČNO  
**Deadline:** 48h  
**Status:** IN PROGRESS

---

## 📋 TASK CHECKLIST

### 🔴 **KRITIČNO - Day 1 (Danas)**

#### ✅ Task 1: SQL.js Vendor Setup
**Fajl:** `src/services/importService.ts`  
**Procena:** 30 minuta  
**Priority:** P0

```bash
# Steps:
1. npm install sql.js --save
2. Copy WASM files to public/sql-wasm/
3. Update importService.ts locateFile()
4. Add SRI integrity check
5. Test offline import
```

**Acceptance Criteria:**
- [ ] SQL.js radi offline
- [ ] Fallback na CDN ako local fajluje
- [ ] SRI hash dodan
- [ ] Import radi sa i bez interneta

---

#### ✅ Task 2: Transaction Rollback Fix
**Fajl:** `src/services/importService.ts:205`  
**Procena:** 20 minuta  
**Priority:** P0

```typescript
// Current (BAD):
for (const receipt of receiptsToImport) {
  await db.receipts.add(receipt) // Može partially failjovati
}

// Fixed (GOOD):
await db.receipts.bulkAdd(receiptsToImport, { allKeys: true })
// ↑ All-or-nothing transaction
```

**Acceptance Criteria:**
- [ ] Import je atomic (all or nothing)
- [ ] Error message objašnjava šta se desilo
- [ ] Korisnik može retry import

---

#### ✅ Task 3: Idempotent Migrations
**Fajl:** `lib/db.ts:235-260`  
**Procena:** 45 minuta  
**Priority:** P0

```typescript
// Add migration marker check
this.version(3).upgrade(async (tx) => {
  const marker = await tx.table('_migrations').where('version').equals(3).first()
  if (marker) return // Already applied
  
  // ... rest of migration with try/catch
  
  await logMigration(tx, 3, ...)
})
```

**Acceptance Criteria:**
- [ ] Migration može da se pokrene više puta
- [ ] Rollback na error
- [ ] Marker u _migrations tabeli

---

#### ✅ Task 4: OCR Worker Auto-Disposal
**Fajl:** `lib/ocr.ts:142`  
**Procena:** 15 minuta  
**Priority:** P0

```typescript
// Add idle timeout
let workerIdleTimeout: number | null = null
const IDLE_TIME = 5 * 60 * 1000 // 5 min

async function getWorker(...) {
  if (workerIdleTimeout) clearTimeout(workerIdleTimeout)
  workerIdleTimeout = setTimeout(() => {
    disposeOcrWorker()
  }, IDLE_TIME)
  
  return worker
}
```

**Acceptance Criteria:**
- [ ] Worker se dispose-uje posle 5 min inaktivnosti
- [ ] beforeunload event dispose-uje worker
- [ ] Memory leak testiran sa DevTools

---

#### ✅ Task 5: Rate Limiting
**Fajl:** `lib/db.ts:835`  
**Procena:** 25 minuta  
**Priority:** P0

```bash
npm install p-limit
```

```typescript
import pLimit from 'p-limit'

const limit = pLimit(5) // Max 5 concurrent
await Promise.all(pending.map(item => limit(() => syncItem(item))))
```

**Acceptance Criteria:**
- [ ] Max 5 concurrent sync requests
- [ ] No rate limit errors od Supabase
- [ ] Queue ostaje responsive

---

### 🟡 **VAŽNO - Day 2 (Sutra)**

#### ✅ Task 6: Progress Feedback
**Fajl:** `src/pages/ImportPage.tsx` + `src/services/importService.ts`  
**Procena:** 40 minuta  
**Priority:** P1

```typescript
// Add onProgress callback
export async function importFromMojRacun(
  file: File,
  onProgress?: (percent: number, message: string) => void
) {
  onProgress?.(0, 'Učitavam bazu...')
  // ... 
  onProgress?.(40, 'Transformišem podatke...')
  // ...
  onProgress?.(100, 'Gotovo!')
}
```

**UI Komponenta:**
```tsx
{isImporting && (
  <div className="progress-bar">
    <div style={{ width: `${progress.percent}%` }} />
    <span>{progress.message}</span>
  </div>
)}
```

**Acceptance Criteria:**
- [ ] Progress bar prikazuje %
- [ ] Message update u realnom vremenu
- [ ] Smooth animacija

---

#### ✅ Task 7: Exponential Backoff
**Fajl:** `lib/db.ts:835`  
**Procena:** 30 minuta  
**Priority:** P1

```typescript
const delay = BASE_DELAY * Math.pow(2, item.retryCount)
const canRetry = Date.now() - item.createdAt.getTime() > delay

if (!canRetry) continue // Skip if in backoff
```

**Acceptance Criteria:**
- [ ] Backoff: 1s, 2s, 4s, 8s, 16s
- [ ] Max 5 retries
- [ ] Stale entries cleanup (>7 dana)

---

#### ✅ Task 8: Performance Budgets
**Fajl:** `vite.config.ts`  
**Procena:** 20 minuta  
**Priority:** P1

```typescript
build: {
  chunkSizeWarningLimit: 500, // 500KB
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom'],
        'ocr-vendor': ['tesseract.js'],
      },
    },
  },
}
```

**Acceptance Criteria:**
- [ ] Warning ako chunk > 500KB
- [ ] Vendor chunks odvojeni
- [ ] Build report generisan

---

#### ✅ Task 9: ARIA Labels
**Fajl:** `src/pages/ImportPage.tsx`  
**Procena:** 15 minuta  
**Priority:** P1

```tsx
<div
  role="button"
  tabIndex={0}
  aria-label="Oblast za upload baze"
  aria-describedby="upload-instructions"
  onKeyDown={handleKeyboard}
>
```

**Acceptance Criteria:**
- [ ] Sve interaktivne elemente imaju aria-label
- [ ] Keyboard navigacija radi (Enter, Space)
- [ ] Screen reader testiran

---

#### ✅ Task 10: Test Coverage
**Fajl:** `src/services/__tests__/importService.test.ts`  
**Procena:** 60 minuta  
**Priority:** P1

```typescript
describe('importService', () => {
  it('validates SQLite file', async () => {})
  it('imports valid database', async () => {})
  it('handles empty database', async () => {})
  it('handles corrupt database', async () => {})
  it('reports progress', async () => {})
})
```

**Acceptance Criteria:**
- [ ] 80%+ coverage za importService
- [ ] Edge cases pokriveni
- [ ] CI pipeline pass

---

### 🟢 **NICE-TO-HAVE - Week 2**

#### Task 11: CSRF Protection
**Fajl:** `src/lib/supabase.ts`  
**Procena:** 30 minuta  
**Priority:** P2

#### Task 12: Schema Unification
**Fajl:** `lib/db.ts` + `src/lib/schemas.ts`  
**Procena:** 90 minuta  
**Priority:** P2

#### Task 13: Dynamic Import Limits
**Fajl:** `src/pages/ImportPage.tsx`  
**Procena:** 25 minuta  
**Priority:** P2

---

## 📊 PROGRESS TRACKING

```
Day 1 (Danas):
  Task 1: ⬜ Not Started
  Task 2: ⬜ Not Started
  Task 3: ⬜ Not Started
  Task 4: ⬜ Not Started
  Task 5: ⬜ Not Started

Day 2 (Sutra):
  Task 6: ⬜ Not Started
  Task 7: ⬜ Not Started
  Task 8: ⬜ Not Started
  Task 9: ⬜ Not Started
  Task 10: ⬜ Not Started

Week 2:
  Task 11: ⬜ Not Started
  Task 12: ⬜ Not Started
  Task 13: ⬜ Not Started
```

**Legend:**
- ⬜ Not Started
- 🔵 In Progress
- ✅ Completed
- ❌ Blocked

---

## 🛠️ DEVELOPMENT WORKFLOW

### Pre-Development Checklist:
```bash
# 1. Create feature branch
git checkout -b fix/critical-issues

# 2. Install dependencies
npm install p-limit sql.js

# 3. Run tests
npm test

# 4. Type check
npm run type-check
```

### During Development:
```bash
# Watch mode za instant feedback
npm run dev
npm test -- --watch

# Biome check (linting)
npm run check
```

### Post-Development:
```bash
# 1. Run all tests
npm run test:run

# 2. Type check
npm run type-check

# 3. Build check
npm run build

# 4. Bundle size check
npm run bundle:check

# 5. Commit (Husky will run hooks)
git add .
git commit -m "fix: critical issues - SQL.js vendor, transaction rollback, etc."

# 6. Push & create PR
git push origin fix/critical-issues
```

---

## 🧪 TESTING STRATEGY

### Unit Tests:
```bash
# Import service
npm test src/services/__tests__/importService.test.ts

# OCR worker
npm test lib/__tests__/ocr.test.ts

# DB migrations
npm test lib/__tests__/db.test.ts
```

### Integration Tests:
```bash
# E2E import flow
npm run test:e2e -- import-flow.spec.ts
```

### Manual Testing:
1. **Offline Mode:**
   - Disconnect internet
   - Try import
   - Should work with vendored SQL.js

2. **Large Database:**
   - Test sa 1000+ računa
   - Check memory usage u DevTools
   - Verify no leaks

3. **Error Scenarios:**
   - Corrupt database file
   - Partial import failure
   - Network error during sync

---

## 📞 SUPPORT & ESCALATION

### Ako se zaglaviš:
1. **Check dokumentacija:**
   - `izvestaji/DUBOKA-ANALIZA.md`
   - `izvestaji/IMPORT-FEATURE.md`

2. **Console logs:**
   ```typescript
   import { logger } from '@/lib/logger'
   logger.debug('Debug info', { context })
   ```

3. **Ask for help:**
   - GitHub Issues
   - Team chat
   - Code review

### Known Issues:
- **SQL.js WASM size:** 500KB (ne može se smanjiti)
- **Tesseract.js memory:** Može dostići 200MB za velike slike
- **IndexedDB quota:** Zavisi od browser/OS (obično 1GB+)

---

## 🎉 DEFINITION OF DONE

Zadatak je **DONE** kada:
- ✅ Code review pass
- ✅ All tests pass
- ✅ Type check clean
- ✅ No linting errors
- ✅ Bundle size u limitu
- ✅ Manual testing completed
- ✅ Documentation updated
- ✅ PR merged to main

---

**Next Review:** 20. Oktobar 2025.  
**Responsible:** Development Team  
**Approver:** Tech Lead
