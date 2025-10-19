# 🗺️ ROADMAP - Fiskalni Račun Projekat

## 📅 Datum kreiranja: 19. Oktobar 2025
## 🎯 Cilj: Dovođenje projekta do produkcijskog nivoa sa 100% pouzdanošću

---

## 🚀 EXECUTIVE SUMMARY

Projekat "Fiskalni Račun" je **trenutno na nivou 8.5/10**. Arhitektura, TypeScript setup, database design, i performance su **vrhunski**. Glavni nedostaci su:

1. **Testing coverage: 4/10** - Kritični nedostatak
2. **Database indexes** - Nedostaju search optimizacije
3. **Transaction safety** - Sync operacije nisu atomic
4. **Bundle size** - Može se smanjiti za 20-30%

Ovaj roadmap definiše **prioritizovane akcije** kroz **4 faze** (Q4 2025 - Q2 2026).

---

## 📊 FAZE IMPLEMENTACIJE

```
Q4 2025: FOUNDATION (Testing & Critical Fixes)
  └─ Sprint 1: Testing Infrastructure
  └─ Sprint 2: Database Optimizations

Q1 2026: RELIABILITY (Production Hardening)
  └─ Sprint 3: Error Handling & Recovery
  └─ Sprint 4: Performance & Bundle Optimization

Q2 2026: EXCELLENCE (Polish & Advanced Features)
  └─ Sprint 5: Accessibility & UX Polish
  └─ Sprint 6: Advanced Features & Analytics

Q3 2026: SCALE (Enterprise Features)
  └─ Sprint 7: Multi-tenant & Teams
  └─ Sprint 8: Advanced Sync & CRDT
```

---

## 🔥 FAZA 1: FOUNDATION (Q4 2025)

**Cilj:** Kritični bugovi + Testing infrastruktura
**Duration:** 6 nedelja (Nov - Dec 2025)

### Sprint 1: Testing Infrastructure (3 nedelje)

#### Week 1: Setup & Unit Tests
- [ ] **Task 1.1: Vitest Configuration Enhancement**
  ```bash
  npm install -D @vitest/coverage-v8 @vitest/ui happy-dom
  ```
  - Konfiguriši coverage thresholds (70% minimum)
  - Setup test reporters (json, html, lcov)
  - Add code coverage badge u README

- [ ] **Task 1.2: Database Tests**
  - `src/lib/__tests__/db.test.ts` - Migracije (v1→v2→v3→v4→v5)
  - Test auto-computation (warranty expiry, status)
  - Test cascade deletes
  - Test hooks (creating, updating, deleting)
  
  **Primer:**
  ```typescript
  describe('Database Migrations', () => {
    it('should migrate from v1 to v5 without data loss', async () => {
      // Create v1 data
      await db.version(1).stores({ receipts: '++id' })
      await db.receipts.add({ merchantName: 'Test' })
      
      // Upgrade to v5
      await db.close()
      await db.open()
      
      // Verify migration
      const receipt = await db.receipts.get(1)
      expect(receipt.syncStatus).toBe('pending')
    })
  })
  ```

- [ ] **Task 1.3: Sync Logic Tests**
  - `src/lib/__tests__/realtimeSync.test.ts`
  - Test conflict resolution (last-write-wins)
  - Test cascade deletes
  - Test remote vs local timestamp comparison
  - Mock Supabase client

#### Week 2: Integration Tests
- [ ] **Task 1.4: Auth Flow Tests**
  - `src/lib/__tests__/auth.test.ts`
  - Test signUp, signIn, signOut
  - Test Google OAuth flow
  - Test demo login
  - Test password validation
  - Test session persistence

- [ ] **Task 1.5: Sync Queue Tests**
  - Test retry logic (exponential backoff)
  - Test max retry limit (5 attempts)
  - Test max age limit (24h)
  - Test processSyncQueue statistics

- [ ] **Task 1.6: OCR Tests**
  - `lib/__tests__/ocr.test.ts`
  - Test heuristic field extraction
  - Test amount parsing (1.234,56 → 1234.56)
  - Test date parsing (01.10.2025)
  - Test PIB extraction (9-digit number)

#### Week 3: E2E Tests
- [ ] **Task 1.7: Playwright Tests Expansion**
  - Test full receipt creation flow (QR → OCR → Save)
  - Test offline mode (disable network, create receipt, enable network)
  - Test sync conflict scenario
  - Test warranty reminder flow

- [ ] **Task 1.8: Visual Regression Tests**
  ```bash
  npm install -D @playwright/test @axe-core/playwright
  ```
  - Screenshot tests za key pages
  - Accessibility tests (axe-core)

**Deliverables:**
- ✅ 70%+ code coverage
- ✅ 50+ unit tests
- ✅ 20+ integration tests
- ✅ 10+ E2E tests
- ✅ CI/CD pipeline sa automated testing

---

### Sprint 2: Database Optimizations (3 nedelje)

#### Week 1: Search Indexes
- [ ] **Task 2.1: Multi-Entry Indexes**
  
  **File:** `lib/db.ts`
  
  ```typescript
  // MIGRATION v6: Full-text search indexes
  this.version(6).stores({
    receipts: '++id, merchantName, pib, date, createdAt, category, totalAmount, syncStatus, qrLink, *searchTokens',
    devices: '++id, receiptId, [status+warrantyExpiry], warrantyExpiry, brand, model, category, createdAt, syncStatus, *searchTokens',
    householdBills: '++id, billType, provider, dueDate, status, syncStatus, createdAt, *searchTokens',
  })
  .upgrade(async (tx) => {
    // Generate search tokens for existing data
    const receipts = await tx.table('receipts').toArray()
    for (const receipt of receipts) {
      const tokens = generateSearchTokens([
        receipt.merchantName,
        receipt.pib,
        receipt.category,
        receipt.notes,
      ])
      await tx.table('receipts').update(receipt.id, { searchTokens: tokens })
    }
    
    const devices = await tx.table('devices').toArray()
    for (const device of devices) {
      const tokens = generateSearchTokens([
        device.brand,
        device.model,
        device.serialNumber,
        device.category,
      ])
      await tx.table('devices').update(device.id, { searchTokens: tokens })
    }
  })
  
  // Helper function
  function generateSearchTokens(fields: (string | undefined)[]): string[] {
    const tokens = new Set<string>()
    
    for (const field of fields) {
      if (!field) continue
      
      const normalized = field.toLowerCase().trim()
      
      // Full term
      tokens.add(normalized)
      
      // Words
      normalized.split(/\s+/).forEach(word => {
        if (word.length >= 3) tokens.add(word)
      })
      
      // Prefixes (for startsWith queries)
      for (let i = 3; i <= Math.min(normalized.length, 10); i++) {
        tokens.add(normalized.substring(0, i))
      }
    }
    
    return Array.from(tokens)
  }
  ```

- [ ] **Task 2.2: Update Hooks**
  ```typescript
  this.receipts.hook('creating', (pk, obj) => {
    obj.searchTokens = generateSearchTokens([
      obj.merchantName,
      obj.pib,
      obj.category,
      obj.notes,
    ])
    // ... existing hooks
  })
  
  this.receipts.hook('updating', (mods, pk, current) => {
    if ('merchantName' in mods || 'pib' in mods || 'category' in mods || 'notes' in mods) {
      const next = { ...current, ...mods }
      mods.searchTokens = generateSearchTokens([
        next.merchantName,
        next.pib,
        next.category,
        next.notes,
      ])
    }
    // ... existing hooks
  })
  ```

- [ ] **Task 2.3: Optimize Search Functions**
  
  **File:** `lib/db.ts`
  
  ```typescript
  // OLD (slow - full table scan)
  export async function searchReceipts(query: string): Promise<Receipt[]> {
    const lowerQuery = query.toLowerCase()
    return await db.receipts.filter(receipt => {
      return receipt.merchantName.toLowerCase().includes(lowerQuery)
    }).toArray()
  }
  
  // NEW (fast - indexed lookup)
  export async function searchReceipts(query: string): Promise<Receipt[]> {
    if (!query || query.length < 3) {
      return await db.receipts.orderBy('date').reverse().limit(50).toArray()
    }
    
    const normalized = query.toLowerCase().trim()
    const tokens = normalized.split(/\s+/).filter(t => t.length >= 3)
    
    if (tokens.length === 0) {
      return []
    }
    
    // Use index for first token, then filter in memory
    const candidates = await db.receipts
      .where('searchTokens')
      .startsWithAnyOf(tokens)
      .toArray()
    
    // Rank by relevance
    return candidates
      .map(receipt => ({
        receipt,
        score: calculateRelevanceScore(receipt, tokens),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ receipt }) => receipt)
  }
  
  function calculateRelevanceScore(receipt: Receipt, tokens: string[]): number {
    let score = 0
    const text = [
      receipt.merchantName,
      receipt.pib,
      receipt.category,
      receipt.notes,
    ].join(' ').toLowerCase()
    
    for (const token of tokens) {
      if (text.includes(token)) {
        score += 1
        // Bonus for exact match
        if (receipt.merchantName.toLowerCase().includes(token)) {
          score += 2
        }
      }
    }
    
    return score
  }
  ```

#### Week 2: Transaction Safety
- [ ] **Task 2.4: Atomic Sync Operations**
  
  **File:** `src/lib/realtimeSync.ts`
  
  ```typescript
  // OLD (not atomic)
  export async function syncFromSupabase(): Promise<void> {
    const receipts = await supabase.from('receipts').select('*')
    for (const row of receipts) {
      await db.receipts.put(parseReceiptRow(row))  // ❌ Separate transaction
    }
  }
  
  // NEW (atomic)
  export async function syncFromSupabase(): Promise<void> {
    const { data: remoteReceipts } = await supabase.from('receipts').select('*')
    const { data: remoteDevices } = await supabase.from('devices').select('*')
    const { data: remoteBills } = await supabase.from('household_bills').select('*')
    
    // Single atomic transaction
    await db.transaction('rw', [db.receipts, db.devices, db.householdBills], async () => {
      // Parse and prepare data
      const receiptsToSync = remoteReceipts.map(parseReceiptRow).filter(Boolean)
      const devicesToSync = remoteDevices.map(parseDeviceRow).filter(Boolean)
      const billsToSync = remoteBills.map(parseHouseholdBillRow).filter(Boolean)
      
      // Batch upsert (10x faster than loop)
      await db.receipts.bulkPut(receiptsToSync)
      await db.devices.bulkPut(devicesToSync)
      await db.householdBills.bulkPut(billsToSync)
      
      // Remove stale synced items
      const remoteReceiptIds = new Set(receiptsToSync.map(r => r.id).filter(Boolean))
      const staleReceipts = await db.receipts
        .where('syncStatus').equals('synced')
        .and(r => r.id && !remoteReceiptIds.has(r.id))
        .primaryKeys()
      
      if (staleReceipts.length) {
        await db.receipts.bulkDelete(staleReceipts)
      }
    })
    
    syncLogger.log(`✓ Synced ${remoteReceipts.length} receipts, ${remoteDevices.length} devices, ${remoteBills.length} bills`)
  }
  ```

- [ ] **Task 2.5: Optimistic Updates**
  ```typescript
  export async function addReceiptOptimistic(
    receipt: Omit<Receipt, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>
  ): Promise<number> {
    // 1. Add to local DB immediately (optimistic)
    const localId = await db.receipts.add({
      ...receipt,
      createdAt: new Date(),
      updatedAt: new Date(),
      syncStatus: 'pending',
    })
    
    // 2. Queue for background sync (non-blocking)
    await db.syncQueue.add({
      entityType: 'receipt',
      entityId: localId,
      operation: 'create',
      data: receipt,
      retryCount: 0,
      createdAt: new Date(),
    })
    
    // 3. Return immediately (UI updates instantly)
    return localId
  }
  ```

#### Week 3: Query Optimization
- [ ] **Task 2.6: Compound Index Optimization**
  
  Add more compound indexes for common queries:
  
  ```typescript
  this.version(7).stores({
    receipts: '++id, merchantName, pib, date, createdAt, [category+date], [syncStatus+updatedAt], totalAmount, *searchTokens',
    devices: '++id, receiptId, [status+warrantyExpiry], [brand+model], warrantyExpiry, createdAt, syncStatus, *searchTokens',
  })
  ```

- [ ] **Task 2.7: Pagination & Cursors**
  ```typescript
  export async function getReceiptsPaginated(
    options: {
      cursor?: number  // Last seen ID
      limit?: number   // Items per page
      category?: string
      sortBy?: 'date' | 'amount'
    }
  ): Promise<{ receipts: Receipt[], nextCursor: number | null }> {
    const { cursor, limit = 50, category, sortBy = 'date' } = options
    
    let query = db.receipts.orderBy(sortBy === 'date' ? 'date' : 'totalAmount').reverse()
    
    if (category) {
      query = db.receipts.where('[category+date]').between([category, Dexie.minKey], [category, Dexie.maxKey])
    }
    
    if (cursor) {
      query = query.filter(r => r.id! < cursor)
    }
    
    const receipts = await query.limit(limit + 1).toArray()
    const hasMore = receipts.length > limit
    const items = hasMore ? receipts.slice(0, limit) : receipts
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null
    
    return { receipts: items, nextCursor }
  }
  ```

**Deliverables:**
- ✅ Search je 10x brži (indexed lookup)
- ✅ Sync operacije su atomic (transaction-safe)
- ✅ Pagination za velike liste
- ✅ No more full table scans

---

## 🛡️ FAZA 2: RELIABILITY (Q1 2026)

**Cilj:** Production hardening & Error recovery
**Duration:** 6 nedelja (Jan - Feb 2026)

### Sprint 3: Error Handling & Recovery (3 nedelje)

#### Week 1: OCR Improvements
- [ ] **Task 3.1: OCR Timeout & Retry**
  
  **File:** `lib/ocr.ts`
  
  ```typescript
  export async function runOCR(
    image: File | Blob,
    opts: OcrOptions & {
      timeout?: number
      maxRetries?: number
      onProgress?: (progress: number) => void
    } = {}
  ): Promise<OCRResult> {
    const {
      timeout = 30_000,
      maxRetries = 2,
      onProgress,
      signal,
    } = opts
    
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('OCR timeout')), timeout)
        })
        
        const worker = await getWorker(opts.languages ?? 'srp+eng', opts.dpi ?? 300)
        
        // Progress tracking
        const recognizePromise = worker.recognize(image, {
          logger: (progress) => {
            if (onProgress && typeof progress.progress === 'number') {
              onProgress(Math.round(progress.progress * 100))
            }
          },
        })
        
        const result = await Promise.race([recognizePromise, timeoutPromise])
        
        return {
          rawText: result.data.text,
          fields: extractHeuristicFields(result.data.text),
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        ocrLogger.warn(`OCR attempt ${attempt + 1}/${maxRetries} failed:`, error)
        
        // On timeout, try with inverted image
        if (lastError.message === 'OCR timeout' && attempt === 0) {
          image = await invertImage(image)
        }
      }
    }
    
    throw new Error(`OCR failed after ${maxRetries} attempts: ${lastError?.message}`)
  }
  
  async function invertImage(blob: Blob): Promise<Blob> {
    const source = await loadCanvasSource(blob)
    const { width, height } = getSourceDimensions(source)
    const canvas = createProcessingCanvas(width, height)
    const ctx = get2dContext(canvas)
    
    ctx.drawImage(source, 0, 0)
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data
    
    // Invert colors
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i]       // R
      data[i + 1] = 255 - data[i + 1] // G
      data[i + 2] = 255 - data[i + 2] // B
    }
    
    ctx.putImageData(imageData, 0, 0)
    return await canvasToBlob(canvas, 'image/png', 0.92)
  }
  ```

- [ ] **Task 3.2: OCR Fallback UI**
  ```typescript
  // Component: AddReceiptPage.tsx
  const handleOCR = async () => {
    try {
      setOcrProgress(0)
      const result = await runOCR(image, {
        timeout: 30_000,
        maxRetries: 2,
        onProgress: setOcrProgress,
      })
      
      // Auto-fill form
      fillFormFromOCR(result)
    } catch (error) {
      toast.error('OCR nije uspeo. Molimo unesite podatke ručno.')
      setShowManualForm(true)  // Fallback to manual entry
    }
  }
  ```

#### Week 2: Granular Error Boundaries
- [ ] **Task 3.3: Per-Route Error Boundaries**
  
  **File:** `src/App.tsx`
  
  ```typescript
  // Create reusable error boundary component
  const RouteErrorBoundary = ({ 
    children, 
    fallback 
  }: { 
    children: React.ReactNode
    fallback: (props: { error: Error, reset: () => void }) => JSX.Element
  }) => {
    return (
      <ErrorBoundary
        fallback={fallback}
        onError={(error, errorInfo) => {
          logger.error('Route error:', error, { errorInfo })
        }}
      >
        {children}
      </ErrorBoundary>
    )
  }
  
  // Apply to routes
  <Routes>
    <Route path="/" element={
      <RouteErrorBoundary fallback={HomePageError}>
        <HomePage />
      </RouteErrorBoundary>
    } />
    
    <Route path="/receipts" element={
      <RouteErrorBoundary fallback={ReceiptsPageError}>
        <ReceiptsPage />
      </RouteErrorBoundary>
    } />
  </Routes>
  
  // Custom error pages
  const HomePageError = ({ error, reset }: { error: Error, reset: () => void }) => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Greška na početnoj strani</h1>
        <p className="text-gray-600 mb-6">{error.message}</p>
        <div className="flex gap-4 justify-center">
          <button onClick={reset} className="btn-primary">
            Pokušaj ponovo
          </button>
          <Link to="/receipts" className="btn-secondary">
            Idi na račune
          </Link>
        </div>
      </div>
    </div>
  )
  ```

- [ ] **Task 3.4: Global Error Handler**
  ```typescript
  // src/lib/errorHandler.ts
  export class AppError extends Error {
    constructor(
      message: string,
      public code: string,
      public recoverable: boolean = true,
      public userMessage?: string
    ) {
      super(message)
      this.name = 'AppError'
    }
  }
  
  export function handleError(error: unknown): {
    userMessage: string
    recoverable: boolean
  } {
    if (error instanceof AppError) {
      return {
        userMessage: error.userMessage ?? error.message,
        recoverable: error.recoverable,
      }
    }
    
    if (error instanceof Error) {
      // Map common errors
      if (error.message.includes('network')) {
        return {
          userMessage: 'Greška u konekciji. Proveri internet i pokušaj ponovo.',
          recoverable: true,
        }
      }
      
      if (error.message.includes('quota')) {
        return {
          userMessage: 'Nema dovoljno prostora. Oslobodi prostor na uređaju.',
          recoverable: true,
        }
      }
    }
    
    return {
      userMessage: 'Došlo je do neočekivane greške.',
      recoverable: false,
    }
  }
  ```

#### Week 3: Offline Recovery
- [ ] **Task 3.5: Service Worker Sync API**
  
  **File:** `public/sw-custom.js`
  
  ```javascript
  // Register background sync
  self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-receipts') {
      event.waitUntil(syncPendingReceipts())
    }
  })
  
  async function syncPendingReceipts() {
    const db = await openIndexedDB()
    const syncQueue = await db.getAll('syncQueue')
    
    for (const item of syncQueue) {
      try {
        await fetch('/api/sync', {
          method: 'POST',
          body: JSON.stringify(item),
        })
        
        await db.delete('syncQueue', item.id)
      } catch (error) {
        console.error('Sync failed:', error)
        // Will retry on next sync event
      }
    }
  }
  
  // Trigger from app
  navigator.serviceWorker.ready.then((registration) => {
    registration.sync.register('sync-receipts')
  })
  ```

- [ ] **Task 3.6: Conflict Resolution UI**
  ```typescript
  // Show conflicts to user
  const ConflictResolver = ({ local, remote }: { local: Receipt, remote: Receipt }) => (
    <div className="modal">
      <h2>Konflikt pri sinhronizaciji</h2>
      <p>Isti račun je izmenjen na više uređaja. Izaberi verziju:</p>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <h3>Lokalna verzija</h3>
          <ReceiptPreview receipt={local} />
          <button onClick={() => resolveConflict('local')}>
            Zadrži lokalnu
          </button>
        </div>
        
        <div className="card">
          <h3>Server verzija</h3>
          <ReceiptPreview receipt={remote} />
          <button onClick={() => resolveConflict('remote')}>
            Preuzmi sa servera
          </button>
        </div>
      </div>
    </div>
  )
  ```

**Deliverables:**
- ✅ OCR success rate povećan za 30%
- ✅ 0 full-app crashes (isolated failures)
- ✅ Graceful degradation svugde
- ✅ Background Sync API implemented

---

### Sprint 4: Performance & Bundle Optimization (3 nedelje)

#### Week 1: Bundle Size Reduction
- [ ] **Task 4.1: Analyze Current Bundle**
  ```bash
  npm run build:analyze
  # Opens dist/stats.html
  ```
  
  Target reductions:
  - `date-fns`: -50KB (selective imports)
  - `framer-motion`: -30KB (tree-shake unused features)
  - `recharts`: -200KB (replace with lighter alternative)

- [ ] **Task 4.2: Replace Heavy Dependencies**
  
  **date-fns → Native Intl API**
  ```typescript
  // OLD
  import { format } from 'date-fns'
  const formatted = format(new Date(), 'dd.MM.yyyy')
  
  // NEW (0 bytes)
  const formatted = new Intl.DateTimeFormat('sr-Latn', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date())
  ```
  
  **recharts → visx**
  ```bash
  npm uninstall recharts
  npm install @visx/shape @visx/axis @visx/scale
  ```
  
  Visx je **tree-shakeable** (samo uključuješ šta koristiš).

- [ ] **Task 4.3: Dynamic Imports for Heavy Features**
  ```typescript
  // Lazy load charts
  const AnalyticsChart = lazy(() => import('./components/AnalyticsChart'))
  
  // Lazy load image editor
  const ImageEditor = lazy(() => import('./components/ImageEditor'))
  
  // Lazy load export utilities
  const exportToPDF = () => import('./lib/exportUtils').then(m => m.exportToPDF)
  ```

#### Week 2: Performance Audits
- [ ] **Task 4.4: Lighthouse CI**
  
  **File:** `.github/workflows/lighthouse.yml`
  
  ```yaml
  name: Lighthouse CI
  on: [push, pull_request]
  
  jobs:
    lighthouse:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        - uses: actions/setup-node@v3
        - run: npm ci
        - run: npm run build
        
        - name: Run Lighthouse
          uses: treosh/lighthouse-ci-action@v9
          with:
            urls: |
              http://localhost:4173
              http://localhost:4173/receipts
            uploadArtifacts: true
            temporaryPublicStorage: true
  ```

- [ ] **Task 4.5: Core Web Vitals Monitoring**
  ```typescript
  // Enhanced Web Vitals tracking
  import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals'
  
  const vitalsThresholds = {
    CLS: { good: 0.1, poor: 0.25 },
    INP: { good: 200, poor: 500 },
    LCP: { good: 2500, poor: 4000 },
    FCP: { good: 1800, poor: 3000 },
    TTFB: { good: 800, poor: 1800 },
  }
  
  function sendToAnalytics(metric) {
    const { name, value, rating } = metric
    const threshold = vitalsThresholds[name]
    
    // Alert on poor metrics
    if (rating === 'poor') {
      Sentry.captureMessage(`Poor ${name}: ${Math.round(value)}ms`, {
        level: 'warning',
        extra: { metric },
      })
    }
    
    // Send to analytics
    window.va?.('event', {
      name: `vitals.${name}`,
      data: { value, rating },
    })
  }
  ```

#### Week 3: Image Optimization
- [ ] **Task 4.6: Image Compression Pipeline**
  
  **File:** `src/lib/imageCompression.ts`
  
  ```typescript
  import { compress } from 'browser-image-compression'
  
  export async function optimizeImage(file: File): Promise<File> {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/webp',  // Modern format
    }
    
    try {
      return await compress(file, options)
    } catch (error) {
      logger.warn('Image compression failed, using original', error)
      return file
    }
  }
  
  // Usage
  const compressedImage = await optimizeImage(uploadedFile)
  ```

- [ ] **Task 4.7: Lazy Image Loading**
  ```typescript
  const LazyImage = ({ src, alt, ...props }) => {
    const [imageSrc, setImageSrc] = useState(placeholderSrc)
    const imgRef = useRef()
    
    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setImageSrc(src)
            observer.disconnect()
          }
        },
        { rootMargin: '50px' }
      )
      
      if (imgRef.current) {
        observer.observe(imgRef.current)
      }
      
      return () => observer.disconnect()
    }, [src])
    
    return <img ref={imgRef} src={imageSrc} alt={alt} {...props} />
  }
  ```

**Deliverables:**
- ✅ Bundle size reduced by 30%
- ✅ LCP < 2.5s (good)
- ✅ INP < 200ms (good)
- ✅ CLS < 0.1 (good)
- ✅ Lighthouse score > 95

---

## 🎨 FAZA 3: EXCELLENCE (Q2 2026)

**Cilj:** UX polish & Advanced features
**Duration:** 6 nedelja (Mar - Apr 2026)

### Sprint 5: Accessibility & UX Polish (3 nedelje)

#### Week 1: Keyboard Navigation
- [ ] **Task 5.1: Roving Tab Index**
  
  **File:** `src/hooks/useRovingTabIndex.ts`
  
  Already exists! Just implement it:
  
  ```typescript
  // Apply to receipt list
  const ReceiptList = ({ receipts }) => {
    const { currentIndex, handleKeyDown } = useRovingTabIndex(receipts.length)
    
    return (
      <div role="list" onKeyDown={handleKeyDown}>
        {receipts.map((receipt, index) => (
          <div
            key={receipt.id}
            role="listitem"
            tabIndex={index === currentIndex ? 0 : -1}
            onClick={() => navigate(`/receipts/${receipt.id}`)}
          >
            <ReceiptCard receipt={receipt} />
          </div>
        ))}
      </div>
    )
  }
  ```

- [ ] **Task 5.2: Skip Links**
  ```typescript
  // Add to MainLayout
  <a href="#main-content" className="skip-link">
    Skip to main content
  </a>
  
  <main id="main-content" tabIndex={-1}>
    {children}
  </main>
  
  // CSS
  .skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: var(--color-primary);
    color: white;
    padding: 8px;
    z-index: 100;
  }
  
  .skip-link:focus {
    top: 0;
  }
  ```

- [ ] **Task 5.3: Focus Management**
  ```typescript
  // Modal focus trap (already have @radix-ui/react-focus-scope)
  import { FocusTrap } from '@radix-ui/react-focus-scope'
  
  const Modal = ({ children, onClose }) => {
    return (
      <FocusTrap asChild>
        <div role="dialog" aria-modal="true">
          {children}
          <button onClick={onClose}>Close</button>
        </div>
      </FocusTrap>
    )
  }
  ```

#### Week 2: Screen Reader Support
- [ ] **Task 5.4: ARIA Labels & Live Regions**
  ```typescript
  // Toast notifications
  <div
    role="alert"
    aria-live="polite"
    aria-atomic="true"
  >
    {message}
  </div>
  
  // Loading states
  <div
    role="status"
    aria-live="polite"
    aria-busy={isLoading}
  >
    {isLoading ? 'Učitavanje...' : `${receipts.length} računa`}
  </div>
  
  // Progress bars
  <div
    role="progressbar"
    aria-valuenow={progress}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-label="OCR napredak"
  >
    {progress}%
  </div>
  ```

- [ ] **Task 5.5: Semantic HTML Audit**
  ```typescript
  // Replace divs with semantic elements
  <nav aria-label="Primary navigation">
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/receipts">Receipts</a></li>
    </ul>
  </nav>
  
  <main>
    <h1>Page Title</h1>
    
    <article>
      <header>
        <h2>Receipt from {merchant}</h2>
        <time dateTime={date.toISOString()}>
          {format(date, 'dd.MM.yyyy')}
        </time>
      </header>
      
      <section>
        <h3>Items</h3>
        <ul>...</ul>
      </section>
    </article>
  </main>
  ```

#### Week 3: Visual Polish
- [ ] **Task 5.6: Micro-interactions**
  ```typescript
  // Button haptic feedback (mobile)
  import { Haptics, ImpactStyle } from '@capacitor/haptics'
  
  const Button = ({ onClick, children }) => {
    const handleClick = () => {
      // Haptic feedback on mobile
      if (Capacitor.isNativePlatform()) {
        Haptics.impact({ style: ImpactStyle.Light })
      }
      
      onClick()
    }
    
    return (
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleClick}
      >
        {children}
      </motion.button>
    )
  }
  ```

- [ ] **Task 5.7: Loading Skeletons**
  ```typescript
  const ReceiptSkeleton = () => (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
    </div>
  )
  
  const ReceiptsList = () => {
    const receipts = useReceipts()
    
    if (!receipts) {
      return (
        <div>
          {Array.from({ length: 5 }).map((_, i) => (
            <ReceiptSkeleton key={i} />
          ))}
        </div>
      )
    }
    
    return <div>{/* ... */}</div>
  }
  ```

**Deliverables:**
- ✅ WCAG 2.1 AA compliance
- ✅ Keyboard navigation radi 100%
- ✅ Screen reader tested (NVDA/JAWS)
- ✅ Lighthouse Accessibility score: 100

---

### Sprint 6: Advanced Features & Analytics (3 nedelje)

#### Week 1: Advanced Analytics
- [ ] **Task 6.1: Spending Insights**
  ```typescript
  // Calculate spending trends
  export function calculateSpendingTrends(receipts: Receipt[]): {
    weekOverWeek: number
    monthOverMonth: number
    topCategories: Array<{ category: string, total: number, percentage: number }>
    averagePerDay: number
  } {
    const now = new Date()
    const thisWeek = startOfWeek(now)
    const lastWeek = subWeeks(thisWeek, 1)
    const thisMonth = startOfMonth(now)
    const lastMonth = subMonths(thisMonth, 1)
    
    const thisWeekSpending = receipts
      .filter(r => r.date >= thisWeek)
      .reduce((sum, r) => sum + r.totalAmount, 0)
    
    const lastWeekSpending = receipts
      .filter(r => r.date >= lastWeek && r.date < thisWeek)
      .reduce((sum, r) => sum + r.totalAmount, 0)
    
    const weekOverWeek = lastWeekSpending > 0
      ? ((thisWeekSpending - lastWeekSpending) / lastWeekSpending) * 100
      : 0
    
    // ... similar for month, categories, average
    
    return {
      weekOverWeek,
      monthOverMonth,
      topCategories,
      averagePerDay,
    }
  }
  ```

- [ ] **Task 6.2: Predictive Analytics**
  ```typescript
  // Predict next month's spending based on trends
  export function predictNextMonthSpending(receipts: Receipt[]): number {
    const last3Months = receipts.filter(r => 
      r.date >= subMonths(new Date(), 3)
    )
    
    const monthlyTotals = groupBy(last3Months, r => 
      format(r.date, 'yyyy-MM')
    ).map(group => 
      group.reduce((sum, r) => sum + r.totalAmount, 0)
    )
    
    // Linear regression
    const average = monthlyTotals.reduce((a, b) => a + b, 0) / monthlyTotals.length
    const trend = (monthlyTotals[monthlyTotals.length - 1] - monthlyTotals[0]) / monthlyTotals.length
    
    return average + trend
  }
  ```

#### Week 2: Export Features
- [ ] **Task 6.3: Advanced PDF Export**
  
  **File:** `src/lib/exportUtils.ts`
  
  Already exists! Enhance it:
  
  ```typescript
  export async function exportReceiptsPDF(
    receipts: Receipt[],
    options: {
      groupBy?: 'category' | 'date' | 'merchant'
      includeCharts?: boolean
      includeStats?: boolean
    } = {}
  ): Promise<void> {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    
    const doc = new jsPDF()
    
    // Cover page
    doc.setFontSize(20)
    doc.text('Fiskalni Računi - Izveštaj', 20, 20)
    doc.setFontSize(12)
    doc.text(`Generisan: ${new Date().toLocaleDateString('sr-Latn')}`, 20, 30)
    
    // Summary stats
    if (options.includeStats) {
      const total = receipts.reduce((sum, r) => sum + r.totalAmount, 0)
      doc.text(`Ukupno: ${formatCurrency(total)}`, 20, 40)
      doc.text(`Broj računa: ${receipts.length}`, 20, 50)
    }
    
    // Group receipts
    const grouped = options.groupBy
      ? groupBy(receipts, r => r[options.groupBy])
      : { 'Svi računi': receipts }
    
    // Generate table for each group
    let yOffset = 60
    for (const [groupName, groupReceipts] of Object.entries(grouped)) {
      doc.addPage()
      doc.setFontSize(16)
      doc.text(groupName, 20, 20)
      
      autoTable(doc, {
        startY: 30,
        head: [['Datum', 'Prodavac', 'Iznos', 'Kategorija']],
        body: groupReceipts.map(r => [
          format(r.date, 'dd.MM.yyyy'),
          r.merchantName,
          formatCurrency(r.totalAmount),
          r.category,
        ]),
      })
    }
    
    // Charts (if requested)
    if (options.includeCharts) {
      // Generate chart as canvas, convert to image, add to PDF
      // ... implementation
    }
    
    doc.save('receipts-export.pdf')
  }
  ```

- [ ] **Task 6.4: Excel Export**
  ```bash
  npm install xlsx
  ```
  
  ```typescript
  import * as XLSX from 'xlsx'
  
  export function exportReceiptsExcel(receipts: Receipt[]): void {
    const worksheet = XLSX.utils.json_to_sheet(
      receipts.map(r => ({
        'Datum': format(r.date, 'dd.MM.yyyy'),
        'Prodavac': r.merchantName,
        'PIB': r.pib,
        'Iznos': r.totalAmount,
        'PDV': r.vatAmount ?? 0,
        'Kategorija': r.category,
        'Napomene': r.notes ?? '',
      }))
    )
    
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Računi')
    
    // Auto-size columns
    const maxWidth = 50
    worksheet['!cols'] = [
      { wch: 12 }, // Datum
      { wch: 30 }, // Prodavac
      { wch: 12 }, // PIB
      { wch: 12 }, // Iznos
      { wch: 10 }, // PDV
      { wch: 15 }, // Kategorija
      { wch: maxWidth }, // Napomene
    ]
    
    XLSX.writeFile(workbook, 'receipts-export.xlsx')
  }
  ```

#### Week 3: Notifications & Reminders
- [ ] **Task 6.5: Smart Warranty Reminders**
  ```typescript
  // Cron-like scheduler (runs daily)
  export async function checkWarrantyReminders(): Promise<void> {
    const now = new Date()
    const devices = await db.devices
      .where('status')
      .equals('active')
      .toArray()
    
    for (const device of devices) {
      const daysUntilExpiry = Math.ceil(
        (device.warrantyExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      
      // Reminder thresholds: 30, 14, 7, 1 day
      const thresholds = [30, 14, 7, 1]
      
      for (const threshold of thresholds) {
        if (daysUntilExpiry === threshold) {
          await sendWarrantyReminder(device, daysUntilExpiry)
        }
      }
    }
  }
  
  async function sendWarrantyReminder(device: Device, daysLeft: number): Promise<void> {
    // Check if already sent
    const existing = await db.reminders
      .where('[deviceId+type]')
      .equals([device.id, 'warranty'])
      .and(r => r.daysBeforeExpiry === daysLeft)
      .first()
    
    if (existing && existing.status === 'sent') {
      return // Already sent
    }
    
    // Send push notification
    if (Notification.permission === 'granted') {
      new Notification(`Garancija ističe za ${daysLeft} dana`, {
        body: `${device.brand} ${device.model}`,
        icon: '/logo.svg',
        tag: `warranty-${device.id}-${daysLeft}`,
        data: { deviceId: device.id, url: `/warranties/${device.id}` },
      })
    }
    
    // Mark as sent
    await db.reminders.add({
      deviceId: device.id,
      type: 'warranty',
      daysBeforeExpiry: daysLeft,
      status: 'sent',
      sentAt: new Date(),
      createdAt: new Date(),
    })
    
    track('warranty_reminder_sent', {
      deviceId: device.id,
      daysLeft,
    })
  }
  ```

**Deliverables:**
- ✅ Advanced analytics dashboard
- ✅ PDF & Excel export
- ✅ Smart warranty reminders
- ✅ Predictive spending insights

---

## 🚀 FAZA 4: SCALE (Q3 2026)

**Cilj:** Enterprise features
**Duration:** 6 nedelja (May - Jun 2026)

### Sprint 7: Multi-tenant & Teams (3 nedelje)

- [ ] **Task 7.1: Household/Family Sharing**
  ```typescript
  // Schema changes
  interface Household {
    id: string
    name: string
    ownerId: string
    members: Array<{
      userId: string
      role: 'owner' | 'admin' | 'member'
      joinedAt: Date
    }>
    createdAt: Date
  }
  
  // Share receipts within household
  interface Receipt {
    // ... existing fields
    householdId?: string
    sharedWith: string[]  // User IDs
  }
  ```

- [ ] **Task 7.2: Permissions System**
  ```typescript
  export function canEditReceipt(receipt: Receipt, user: User): boolean {
    // Owner can always edit
    if (receipt.userId === user.id) return true
    
    // Check household permissions
    if (receipt.householdId) {
      const household = getHousehold(receipt.householdId)
      const member = household.members.find(m => m.userId === user.id)
      
      return member?.role === 'owner' || member?.role === 'admin'
    }
    
    // Check explicit sharing
    return receipt.sharedWith?.includes(user.id) ?? false
  }
  ```

### Sprint 8: Advanced Sync & CRDT (3 nedelje)

- [ ] **Task 8.1: Conflict-free Replicated Data Types**
  ```bash
  npm install yjs y-indexeddb
  ```
  
  ```typescript
  import * as Y from 'yjs'
  import { IndexeddbPersistence } from 'y-indexeddb'
  
  // CRDT-based receipt
  const ydoc = new Y.Doc()
  const receiptsMap = ydoc.getMap('receipts')
  
  // Local persistence
  const persistence = new IndexeddbPersistence('fiskalni-racun', ydoc)
  
  // Observe changes
  receiptsMap.observe((event) => {
    // Automatic conflict resolution
    syncToSupabase(event.changes)
  })
  ```

**Deliverables:**
- ✅ Multi-user support
- ✅ Household sharing
- ✅ Advanced conflict resolution (CRDT)

---

## 📈 SUCCESS METRICS

### Technical KPIs
- **Test Coverage:** 70% → 90%
- **Bundle Size:** 400KB → 280KB (-30%)
- **Lighthouse Score:** 85 → 95+
- **LCP:** 3.5s → 2.0s
- **INP:** 300ms → 150ms
- **Error Rate:** <0.1%

### Business KPIs
- **User Retention:** Track 30-day retention
- **Feature Adoption:** Track feature usage
- **Performance:** Real User Monitoring (RUM)
- **Reliability:** 99.9% uptime

---

## 🛠️ TOOLS & RESOURCES

### Development
- **Testing:** Vitest, Playwright, Testing Library
- **Monitoring:** Sentry, Vercel Analytics, PostHog
- **Performance:** Lighthouse CI, WebPageTest
- **A11Y:** axe DevTools, NVDA/JAWS
- **Bundle Analysis:** webpack-bundle-analyzer, source-map-explorer

### CI/CD
- **GitHub Actions:** Automated testing, Lighthouse CI
- **Dependabot:** Dependency updates
- **CodeQL:** Security scanning

### Documentation
- **Storybook:** Component documentation
- **TypeDoc:** API documentation
- **MDX:** Interactive docs

---

## 👥 TEAM & RESPONSIBILITIES

### Solo Developer (Current)
- **Phase 1:** Testing & DB optimizations (6 weeks)
- **Phase 2:** Reliability & Performance (6 weeks)
- **Phase 3:** UX Polish & Features (6 weeks)
- **Phase 4:** Scale & Advanced (6 weeks)

### With Team (Future)
- **Frontend Dev:** UI/UX, Components
- **Backend Dev:** Sync, APIs, Database
- **QA Engineer:** Testing, Automation
- **DevOps:** CI/CD, Monitoring

---

## 🎯 NEXT STEPS (IMMEDIATE)

### Week 1 (Starting NOW)
1. ✅ Create `src/lib/__tests__/` folder
2. ✅ Write first 10 unit tests (database)
3. ✅ Setup Vitest coverage reporting
4. ✅ Add coverage badge to README

### Week 2
1. ✅ Implement search indexes (v6 migration)
2. ✅ Write sync queue tests
3. ✅ Fix transaction safety in realtimeSync

### Week 3
1. ✅ OCR timeout & retry
2. ✅ Granular error boundaries
3. ✅ Complete Sprint 1

---

## 📝 NOTES

- **Prioritizacija:** Testing je najvažniji (kritični nedostatak)
- **Kompatibilnost:** Sve izmene moraju biti backward-compatible
- **Performance:** Ne žrtvuj performance za feature-e
- **Security:** Svaka izmena mora proći security review

---

## 🔗 REFERENCES

- [Dexie Best Practices](https://dexie.org/docs/Tutorial/Best-Practices)
- [Offline-First Design](https://offlinefirst.org/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Web Vitals](https://web.dev/vitals/)
- [CRDT Overview](https://crdt.tech/)

---

**Last Updated:** 19. Oktobar 2025
**Version:** 1.0.0
**Status:** 🟢 Active Development

---

© 2025 Fiskalni Račun - All Rights Reserved

