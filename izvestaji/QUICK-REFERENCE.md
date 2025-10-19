# ⚡ QUICK REFERENCE - Brza Navigacija

**Za:** Developere koji žure  
**Format:** Bullet points, code snippets, checklists

---

## 🚨 TOP 5 KRITIČNIH PROBLEMA

### 1. **SQL.js CDN (SPOF)**
```typescript
// ❌ BAD
const SQL = await initSqlJs({
  locateFile: (file) => `https://sql.js.org/dist/${file}`, // Single point of failure
})

// ✅ FIXED
const SQL = await initSqlJs({
  locateFile: (file) => {
    const localPath = `/sql-wasm/${file}`
    return fetch(localPath, { method: 'HEAD' })
      .then(() => localPath)
      .catch(() => `https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/${file}`)
  },
})
```
**Fajl:** `src/services/importService.ts:55`  
**Fix Time:** 30min

---

### 2. **Non-Atomic Import**
```typescript
// ❌ BAD
for (const receipt of receiptsToImport) {
  await db.receipts.add(receipt) // Partial failure possible
}

// ✅ FIXED
await db.receipts.bulkAdd(receiptsToImport, { allKeys: true })
// All-or-nothing transaction
```
**Fajl:** `src/services/importService.ts:205`  
**Fix Time:** 20min

---

### 3. **Migration Nije Idempotentna**
```typescript
// ❌ BAD
this.version(3).upgrade(async (tx) => {
  await tx.table('settings').clear() // DANGEROUS
  // ... add new data
})

// ✅ FIXED
this.version(3).upgrade(async (tx) => {
  const marker = await tx.table('_migrations').where('version').equals(3).first()
  if (marker) return // Already applied
  
  try {
    // ... migration logic
    await logMigration(tx, 3, ...)
  } catch (error) {
    throw error // Rollback
  }
})
```
**Fajl:** `lib/db.ts:235-260`  
**Fix Time:** 45min

---

### 4. **OCR Memory Leak**
```typescript
// ❌ BAD
export async function disposeOcrWorker() {
  // Never called automatically
}

// ✅ FIXED
let workerIdleTimeout: number | null = null
const IDLE_TIME = 5 * 60 * 1000

async function getWorker(...) {
  if (workerIdleTimeout) clearTimeout(workerIdleTimeout)
  workerIdleTimeout = setTimeout(() => disposeOcrWorker(), IDLE_TIME)
  return worker
}

window.addEventListener('beforeunload', () => disposeOcrWorker())
```
**Fajl:** `lib/ocr.ts:142`  
**Fix Time:** 15min

---

### 5. **No Rate Limiting**
```typescript
// ❌ BAD
for (const item of pending) {
  await syncItem(item) // Unlimited
}

// ✅ FIXED
import pLimit from 'p-limit'
const limit = pLimit(5)
await Promise.all(pending.map(item => limit(() => syncItem(item))))
```
**Fajl:** `lib/db.ts:835`  
**Fix Time:** 25min  
**Dependency:** `npm install p-limit`

---

## 📁 FAJL MAPA

### Import Feature:
```
src/services/importService.ts       ← Main import logic (300 LOC)
src/pages/ImportPage.tsx            ← UI komponenta (255 LOC)
lib/db.ts                           ← Database layer (885 LOC)
```

### Database:
```
lib/db.ts                           ← Dexie setup + migrations
lib/db/migrations.ts                ← Migration utilities
```

### OCR:
```
lib/ocr.ts                          ← Tesseract.js wrapper (320 LOC)
src/hooks/useOCR.ts                 ← React hook
src/hooks/useOCRCleanup.ts          ← Cleanup logic
```

### Security:
```
src/lib/security/csp.ts             ← Content Security Policy
src/lib/monitoring/sentry.ts        ← Error tracking
src/lib/crypto.ts                   ← Encryption utils
```

### Performance:
```
src/lib/performance.ts              ← Performance utilities
src/lib/monitoring/webVitals.ts     ← Web Vitals tracking
vite.config.ts                      ← Build config (348 LOC)
```

### Testing:
```
vitest.config.ts                    ← Unit test config
playwright.config.ts                ← E2E test config
src/__tests__/e2e/*.spec.ts         ← E2E tests
src/**/__tests__/*.test.ts          ← Unit tests
```

---

## 🛠️ COMMON COMMANDS

### Development:
```bash
npm run dev              # Start dev server
npm run dev:inspect      # With Vite inspector
npm test                 # Run tests (watch mode)
npm run type-check       # TypeScript validation
npm run check            # Biome linter
```

### Testing:
```bash
npm run test:run         # Run all tests once
npm run test:ui          # Vitest UI mode
npm run test:coverage    # Coverage report
npm run test:e2e         # Playwright E2E
```

### Build & Deploy:
```bash
npm run build            # Production build
npm run build:analyze    # With bundle analyzer
npm run preview          # Preview build
npm run bundle:check     # Check bundle size
```

### Database:
```bash
npm run seed             # Seed test data
npm run analyze:db       # Analyze external DB
npm run import:db        # CLI import
```

---

## 🔍 DEBUGGING

### 1. **Import Failing?**
```typescript
// Check SQL.js loading
console.log('SQL.js loading from:', locateFile('sql-wasm.wasm'))

// Check file validation
const isValid = await validateSQLiteFile(file)
console.log('SQLite valid?', isValid)

// Check transaction
db.transaction('rw', db.receipts, async () => {
  console.log('Transaction started')
  // ... your code
  console.log('Transaction committing')
})
```

### 2. **OCR Not Working?**
```typescript
// Check worker status
console.log('Worker promise:', _workerPromise)
console.log('Loaded language:', _loadedLang)

// Check image preprocessing
const blob = await preprocessImage(file)
console.log('Preprocessed size:', blob.size)
```

### 3. **Memory Leak?**
```javascript
// Chrome DevTools → Performance → Memory
// Take heap snapshot before/after OCR
// Look for detached DOM nodes or growing arrays
```

### 4. **Sync Queue Growing?**
```typescript
// Check pending items
const pending = await db.syncQueue.toArray()
console.log('Pending sync items:', pending.length)

// Check failed items
const failed = await db.syncQueue.where('retryCount').above(3).toArray()
console.log('Failed items:', failed)
```

---

## 📊 PERFORMANCE CHECKLIST

### Bundle Size:
- [ ] index.js < 500KB
- [ ] Vendor chunks separated
- [ ] Lazy routes implemented
- [ ] Dynamic imports for heavy libs

### Load Time:
- [ ] FCP < 2s
- [ ] TTI < 3s
- [ ] LCP < 2.5s
- [ ] CLS < 0.1

### Runtime:
- [ ] No memory leaks (OCR worker)
- [ ] Efficient re-renders (React.memo)
- [ ] Virtualized lists (react-virtuoso)
- [ ] Debounced search

---

## 🔐 SECURITY CHECKLIST

- [ ] CSP headers enabled
- [ ] Trusted Types policy
- [ ] Sentry error tracking
- [ ] Input sanitization (DOMPurify)
- [ ] Rate limiting (p-limit)
- [ ] CSRF protection
- [ ] No sensitive data in logs
- [ ] Secrets in .env (not committed)

---

## ♿ ACCESSIBILITY CHECKLIST

- [ ] Semantic HTML
- [ ] ARIA labels on interactive elements
- [ ] Keyboard navigation (Tab, Enter, Space)
- [ ] Focus indicators visible
- [ ] Color contrast 4.5:1+
- [ ] Screen reader tested
- [ ] Skip to main content link
- [ ] Error messages announced

---

## 🧪 TESTING PRIORITIES

### Must Test:
1. **Import flow:**
   - Valid SQLite file
   - Invalid file (reject)
   - Large file (50MB+)
   - Corrupt database
   - Empty database

2. **OCR flow:**
   - Serbian text
   - Amount extraction
   - Date parsing
   - Long-running OCR (abort)

3. **Sync flow:**
   - Online → offline → online
   - Retry with backoff
   - Rate limiting
   - Error recovery

### Nice to Test:
4. Database migrations
5. Service worker caching
6. PWA install prompt
7. Dark mode toggle

---

## 💡 QUICK FIXES

### Add Progress Feedback:
```typescript
// 1. Add state
const [progress, setProgress] = useState({ percent: 0, message: '' })

// 2. Pass callback
await importFromMojRacun(file, (percent, message) => {
  setProgress({ percent, message })
})

// 3. Show UI
{isImporting && (
  <div className="progress-bar">
    <div style={{ width: `${progress.percent}%` }} />
    <span>{progress.message}</span>
  </div>
)}
```

### Add ARIA Labels:
```tsx
// Before
<div onClick={handleClick}>Upload</div>

// After
<div
  role="button"
  tabIndex={0}
  aria-label="Upload database file"
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
>
  Upload
</div>
```

### Add Error Boundary:
```tsx
import { ErrorBoundary } from 'react-error-boundary'

function ErrorFallback({ error }) {
  return <div>Greška: {error.message}</div>
}

<ErrorBoundary FallbackComponent={ErrorFallback}>
  <ImportPage />
</ErrorBoundary>
```

---

## 📞 NEED HELP?

### Quick Links:
- **Full Analysis:** `izvestaji/DUBOKA-ANALIZA.md`
- **Action Plan:** `izvestaji/ACTION-PLAN.md`
- **Executive Summary:** `izvestaji/EXECUTIVE-SUMMARY.md`

### Contacts:
- **Slack:** #fiskalni-racun-dev
- **Email:** tech-lead@example.com
- **GitHub:** Label: `code-review`

### Resources:
- **Dexie Docs:** https://dexie.org/
- **React Query:** https://tanstack.com/query/latest
- **Vite Docs:** https://vitejs.dev/
- **Biome:** https://biomejs.dev/

---

## 🎯 TODAY'S TODO

```
[ ] Read DUBOKA-ANALIZA.md (10 min)
[ ] Review ACTION-PLAN.md (5 min)
[ ] Fix Task 1: SQL.js vendor (30 min)
[ ] Fix Task 2: Transaction rollback (20 min)
[ ] Fix Task 3: Idempotent migrations (45 min)
[ ] Fix Task 4: OCR auto-disposal (15 min)
[ ] Fix Task 5: Rate limiting (25 min)
[ ] Run tests (npm run test:run)
[ ] Type check (npm run type-check)
[ ] Commit & push
```

**Total Time:** ~3 hours

---

**Last Updated:** 19. Oktobar 2025.  
**Version:** 1.0  
**Format:** Quick Reference
