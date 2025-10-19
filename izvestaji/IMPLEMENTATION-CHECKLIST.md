# ✅ IMPLEMENTATION CHECKLIST

**Projekat:** Fiskalni Račun  
**Faza:** Critical Fixes (48h)  
**Status:** 🔴 Not Started

---

## 🔴 DAY 1 - KRITIČNO (Danas)

### Task 1: SQL.js Vendor Setup ⬜
**Fajl:** `src/services/importService.ts:55`  
**Effort:** 30 minuta  
**Priority:** P0

#### Subtasks:
- [ ] `npm install sql.js --save`
- [ ] Kreiraj folder `public/sql-wasm/`
- [ ] Kopiraj `node_modules/sql.js/dist/*.wasm` u `public/sql-wasm/`
- [ ] Update `importService.ts` locateFile():
  ```typescript
  locateFile: (file) => {
    const localPath = `/sql-wasm/${file}`
    return fetch(localPath, { method: 'HEAD' })
      .then(() => localPath)
      .catch(() => `https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/${file}`)
  }
  ```
- [ ] Test import offline (disconnect internet)
- [ ] Test import online (verify fallback ne triggere)
- [ ] Add integrity check (optional, ali recommended)

#### Acceptance Criteria:
- [ ] Import radi offline
- [ ] Fallback na CDN ako local failjuje
- [ ] No console errors
- [ ] Performance isti ili bolji

#### Testing:
```bash
# 1. Build
npm run build

# 2. Serve locally
npm run preview

# 3. Test offline
# Disconnect internet
# Try import

# 4. Test online with CDN blocked
# DevTools → Network → Block URL pattern: sql.js.org
# Verify local version works
```

---

### Task 2: Transaction Rollback Fix ⬜
**Fajl:** `src/services/importService.ts:205`  
**Effort:** 20 minuta  
**Priority:** P0

#### Subtasks:
- [ ] Replace sequential `add()` sa `bulkAdd()`:
  ```typescript
  // Before
  for (const receipt of receiptsToImport) {
    await db.receipts.add(receipt as Receipt)
    stats.receiptsImported++
  }
  
  // After
  const receiptIds = await db.receipts.bulkAdd(
    receiptsToImport as Receipt[],
    { allKeys: true }
  )
  stats.receiptsImported = receiptIds.length
  ```
- [ ] Dodaj try/catch u transaction:
  ```typescript
  await db.transaction('rw', db.receipts, db.devices, async () => {
    try {
      const receiptIds = await db.receipts.bulkAdd(...)
      const deviceIds = await db.devices.bulkAdd(...)
    } catch (error) {
      console.error('Import failed, rolling back:', error)
      throw new Error(`Import prekinut: ${error}`)
    }
  })
  ```
- [ ] Update error handling u ImportPage.tsx
- [ ] Test sa corrupt data (simulate failure)

#### Acceptance Criteria:
- [ ] Import je atomic (all or nothing)
- [ ] Error message jasan i koristan
- [ ] Korisnik može retry import
- [ ] Database state konsistentan after error

#### Testing:
```typescript
// Test corrupt data
it('should rollback on partial failure', async () => {
  const validReceipts = [/* ... */]
  const invalidReceipt = { /* missing required field */ }
  const allReceipts = [...validReceipts, invalidReceipt]
  
  await expect(importReceipts(allReceipts)).rejects.toThrow()
  
  const count = await db.receipts.count()
  expect(count).toBe(0) // Nothing imported
})
```

---

### Task 3: Idempotent Migrations ⬜
**Fajl:** `lib/db.ts:235-260`  
**Effort:** 45 minuta  
**Priority:** P0

#### Subtasks:
- [ ] Add migration marker check:
  ```typescript
  this.version(3).upgrade(async (tx) => {
    // 1. Check if already applied
    const marker = await tx.table('_migrations')
      .where('version').equals(3)
      .first()
    if (marker) {
      console.log('Migration v3 already applied')
      return
    }
    
    // 2. Wrap u try/catch
    try {
      // ... existing migration logic
      
      // 3. Mark as applied
      await logMigration(tx, 3, 'settings-uniq-lang', 'Description')
    } catch (error) {
      console.error('Migration v3 failed:', error)
      throw error // Triggers rollback
    }
  })
  ```
- [ ] Apply pattern na SVE postojeće migrations
- [ ] Test repeated migration run
- [ ] Test migration failure + retry

#### Acceptance Criteria:
- [ ] Migration može da se pokrene više puta bez side effects
- [ ] Rollback na error
- [ ] _migrations tabela prati status
- [ ] No data duplication

#### Testing:
```typescript
// Manually test
async function testMigration() {
  // 1. Apply migration
  await db.version(3).upgrade(/* ... */)
  
  // 2. Check marker
  const marker = await db._migrations.where('version').equals(3).first()
  console.assert(marker !== undefined, 'Marker should exist')
  
  // 3. Re-run migration
  await db.version(3).upgrade(/* ... */)
  
  // 4. Verify no duplicates
  const count = await db.settings.count()
  console.assert(count === 1, 'Should have only 1 setting entry')
}
```

---

### Task 4: OCR Worker Auto-Disposal ⬜
**Fajl:** `lib/ocr.ts:142`  
**Effort:** 15 minuta  
**Priority:** P0

#### Subtasks:
- [ ] Add idle timeout u `getWorker()`:
  ```typescript
  let workerIdleTimeout: number | null = null
  const WORKER_IDLE_TIME = 5 * 60 * 1000 // 5 minutes
  
  async function getWorker(languages: string, dpi: number) {
    // ... existing code
    
    // Reset idle timer
    if (workerIdleTimeout) clearTimeout(workerIdleTimeout)
    
    workerIdleTimeout = window.setTimeout(() => {
      console.log('[OCR] Worker idle, disposing...')
      disposeOcrWorker()
    }, WORKER_IDLE_TIME)
    
    return worker
  }
  ```
- [ ] Add beforeunload listener:
  ```typescript
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      disposeOcrWorker()
    })
  }
  ```
- [ ] Test u DevTools Performance profiler
- [ ] Verify no memory growth after 5 min idle

#### Acceptance Criteria:
- [ ] Worker dispose-uje posle 5 min inaktivnosti
- [ ] Worker dispose-uje na page unload
- [ ] Memory usage stabilna
- [ ] No console errors

#### Testing:
```javascript
// Manual test
// 1. Open DevTools → Performance → Memory
// 2. Take heap snapshot
// 3. Run OCR 10 times
// 4. Wait 5 minutes (idle)
// 5. Take another snapshot
// 6. Compare - memory should be reclaimed
```

---

### Task 5: Rate Limiting ⬜
**Fajl:** `lib/db.ts:835`  
**Effort:** 25 minuta  
**Priority:** P0

#### Subtasks:
- [ ] Install dependency: `npm install p-limit`
- [ ] Update `processSyncQueue()`:
  ```typescript
  import pLimit from 'p-limit'
  
  async function processSyncQueue() {
    const limit = pLimit(5) // Max 5 concurrent
    const pending = await db.syncQueue.where('retryCount').below(5).toArray()
    
    await Promise.all(
      pending.map(item => 
        limit(() => syncItem(item))
      )
    )
  }
  ```
- [ ] Add logging za rate limit hits
- [ ] Test sa 100+ pending items
- [ ] Monitor Supabase dashboard za rate limit errors

#### Acceptance Criteria:
- [ ] Max 5 concurrent sync requests
- [ ] No rate limit errors od Supabase-a
- [ ] Queue procesira efficiently
- [ ] Logs pokazuju concurrent limit

#### Testing:
```typescript
// Test concurrent limit
it('should limit concurrent requests', async () => {
  const items = Array(100).fill(null).map((_, i) => ({
    entityType: 'receipt',
    entityId: i,
    operation: 'create',
    data: {},
    retryCount: 0,
    createdAt: new Date(),
  }))
  
  await db.syncQueue.bulkAdd(items)
  
  let maxConcurrent = 0
  let currentConcurrent = 0
  
  const originalSync = syncItem
  syncItem = async (item) => {
    currentConcurrent++
    maxConcurrent = Math.max(maxConcurrent, currentConcurrent)
    await originalSync(item)
    currentConcurrent--
  }
  
  await processSyncQueue()
  
  expect(maxConcurrent).toBeLessThanOrEqual(5)
})
```

---

## 📊 PROGRESS TRACKING

### Overall Progress:
```
Day 1 (Critical):     0 / 5 tasks completed (0%)
```

### Time Tracking:
```
Estimated Total:      2h 15min
Time Spent:           0h 0min
Remaining:            2h 15min
```

### Status Legend:
- ⬜ Not Started
- 🔵 In Progress
- ✅ Completed
- ❌ Blocked
- ⏸️ Paused

---

## 🧪 TESTING CHECKLIST

### Pre-Commit:
- [ ] `npm run type-check` passes
- [ ] `npm run check` passes (Biome)
- [ ] `npm run test:run` passes
- [ ] `npm run build` succeeds
- [ ] Manual testing completed

### Post-Commit:
- [ ] CI pipeline green
- [ ] Code review approved
- [ ] QA sign-off
- [ ] Merged to main

---

## 📝 COMMIT MESSAGES

### Task 1:
```
fix(import): vendor SQL.js lokalno sa CDN fallback

- Dodao SQL.js u public/sql-wasm/
- Implementiran fallback na CDN
- Import sada radi offline
- Performanse poboljšane (no external request)

Closes: #123
```

### Task 2:
```
fix(import): atomic transactions sa bulkAdd

- Zamenio sequential add() sa bulkAdd()
- Dodao rollback na error
- Improved error messages
- All-or-nothing import garantovan

Closes: #124
```

### Task 3:
```
fix(db): idempotent migrations sa marker check

- Dodao _migrations marker tracking
- Try/catch wrapper za rollback
- Ponovljene migracije safe
- No data duplication

Closes: #125
```

### Task 4:
```
fix(ocr): auto-disposal workera posle idle

- Dodao 5min idle timeout
- beforeunload listener
- Memory leak resolved
- Performanse stabilne

Closes: #126
```

### Task 5:
```
fix(sync): rate limiting sa p-limit

- Max 5 concurrent sync requests
- No Supabase rate limit errors
- Efficient queue processing

Closes: #127
```

---

## 🚀 DEPLOYMENT

### Pre-Deployment Checklist:
- [ ] All tasks ✅ completed
- [ ] Tests passing
- [ ] Code reviewed
- [ ] QA approved
- [ ] Backup plan ready

### Deployment Steps:
```bash
# 1. Final check
npm run type-check
npm run test:run
npm run build

# 2. Version bump
npm version patch  # 1.0.0 → 1.0.1

# 3. Tag release
git tag -a v1.0.1 -m "Critical fixes: SQL.js vendor, transactions, migrations"

# 4. Push
git push origin main --tags

# 5. Deploy (Vercel auto-deploys on push)
# Monitor: https://vercel.com/dashboard

# 6. Smoke test production
# - Test import flow
# - Check Sentry for errors
# - Verify performance metrics
```

### Rollback Plan:
```bash
# If issues detected:
git revert HEAD~5..HEAD  # Revert last 5 commits
git push origin main

# Or: Deploy previous tag
vercel --prod --force v1.0.0
```

---

## 📞 ESCALATION

### If Blocked:
1. **Check dokumentacija:** DUBOKA-ANALIZA.md
2. **Ask team:** Slack #dev-help
3. **Escalate:** Tech Lead (email)

### Known Risks:
- **SQL.js WASM size:** 500KB (acceptable)
- **Migration conflict:** Unlikely, ali testirati
- **OCR memory:** Monitor u production

---

**Last Updated:** 19. Oktobar 2025.  
**Next Review:** 20. Oktobar 2025.  
**Responsible:** Development Team
