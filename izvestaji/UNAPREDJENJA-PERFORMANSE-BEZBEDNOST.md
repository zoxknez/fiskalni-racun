# 🚀 UNAPREĐENJA - FISKALNI RAČUN 
## Analiza i preporuke za performanse i bezbednost (Oktobar 2025)

---

## 📋 SADRŽAJ
1. [Bezbednost](#bezbednost)
2. [Performanse](#performanse)
3. [Optimizacija Bundle Size](#bundle-size)
4. [Database Optimizacije](#database)
5. [Error Handling](#error-handling)
6. [Monitoring i Analytics](#monitoring)

---

## 🔒 BEZBEDNOST

### ✅ Trenutno stanje - ODLIČNO!
- DOMPurify za XSS zaštitu
- CSP headers implementirani
- Trusted Types podrška
- HSTS, X-Frame-Options, X-Content-Type-Options
- Sanitizacija svih user inputa
- Bezbedna autentifikacija preko Supabase

### 🎯 Moguća unapređenja:

#### 1. localStorage Encryption za osetljive podatke
```typescript
// lib/storage/secureStorage.ts
import { encrypt, decrypt } from '@/lib/crypto'

export const secureStorage = {
  setItem: (key: string, value: string): void => {
    const encrypted = encrypt(value)
    localStorage.setItem(`secure_${key}`, encrypted)
  },
  
  getItem: (key: string): string | null => {
    const encrypted = localStorage.getItem(`secure_${key}`)
    if (!encrypted) return null
    return decrypt(encrypted)
  },
  
  removeItem: (key: string): void => {
    localStorage.removeItem(`secure_${key}`)
  }
}
```

#### 2. Rate Limiting - Globalni Level
Već imate `rateLimiter.ts`, ali dodati:
```typescript
// lib/api/globalRateLimiter.ts
class GlobalAPILimiter {
  private limiter = new SlidingWindowRateLimiter({
    maxRequests: 100,  // max 100 zahteva
    windowMs: 60000    // u minuti
  })
  
  async checkLimit(endpoint: string): Promise<boolean> {
    const key = `api:${endpoint}`
    return this.limiter.tryConsume(key)
  }
}
```

#### 3. Subresource Integrity (SRI) za eksterne skripte
U `index.html`, dodati integrity atribute za Google Fonts i druge CDN resurse:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=..." 
      integrity="sha384-..." crossorigin="anonymous">
```

#### 4. API Key Rotation System
```typescript
// lib/security/keyRotation.ts
export class APIKeyRotation {
  private readonly ROTATION_INTERVAL = 30 * 24 * 60 * 60 * 1000 // 30 dana
  
  async rotateIfNeeded(): Promise<void> {
    const lastRotation = localStorage.getItem('last_key_rotation')
    if (!lastRotation || Date.now() - parseInt(lastRotation) > this.ROTATION_INTERVAL) {
      await this.rotateKeys()
      localStorage.setItem('last_key_rotation', Date.now().toString())
    }
  }
}
```

---

## ⚡ PERFORMANSE

### ✅ Trenutno stanje - VRLO DOBRO!
- Code splitting ✅
- Chunk optimization ✅  
- Compression (gzip + brotli) ✅
- PWA caching ✅
- useMemo/useCallback optimizacije ✅

### 🎯 Moguća unapređenja:

#### 1. Image Compression Pre Upload-a
**Trenutno:** Upload bez kompresije
```typescript
// AddReceiptPageSimplified.tsx
const uploadImage = async (file: File): Promise<string> => {
  // TODO: Implement actual image upload
  return URL.createObjectURL(file)
}
```

**Preporuka:**
```typescript
// lib/images/compressor.ts
import { optimizeImage } from '@/lib/images/optimizer'

export async function compressAndUpload(file: File): Promise<string> {
  // 1. Optimizuj sliku (max 1920x1920, kvalitet 0.8)
  const optimized = await optimizeImage(file, {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.8,
    format: 'webp' // WebP format - najbolja kompresija
  })
  
  // 2. Generiši thumbnail (200x200)
  const thumbnail = await optimizeImage(file, {
    maxWidth: 200,
    maxHeight: 200,
    quality: 0.7,
    format: 'webp'
  })
  
  // 3. Upload na Supabase Storage
  const { data: mainImage } = await supabase.storage
    .from('receipts')
    .upload(`${Date.now()}_${file.name}`, optimized)
  
  const { data: thumbImage } = await supabase.storage
    .from('receipts/thumbnails')
    .upload(`thumb_${Date.now()}_${file.name}`, thumbnail)
  
  return mainImage.path
}
```

**Benefit:** 
- Smanjenje upload veličine za 60-80%
- Brže učitavanje
- Manja potrošnja bandwidth-a
- Bolja UX

#### 2. Virtualizacija Velikih Lista
Već koristite `react-virtuoso` - ODLIČNO! Ali možete optimizovati dalje:

```typescript
// pages/ReceiptsPage.tsx
import { Virtuoso } from 'react-virtuoso'

// Dodati overscan za smooth scrolling
<Virtuoso
  data={receipts}
  overscan={200}  // Render 200px izvan viewport-a
  itemContent={(index, receipt) => <ReceiptCard receipt={receipt} />}
  increaseViewportBy={{ top: 200, bottom: 200 }}
/>
```

#### 3. Prefetch za česte navigacije
```typescript
// components/common/SmartLink.tsx
import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'

export function SmartLink({ to, children, ...props }) {
  const ref = useRef<HTMLAnchorElement>(null)
  
  useEffect(() => {
    // Prefetch kada korisnik hover-uje preko linka
    const element = ref.current
    if (!element) return
    
    const handleMouseEnter = () => {
      // Lazy load route chunk
      import(`../pages/${to.replace('/', '')}Page`)
    }
    
    element.addEventListener('mouseenter', handleMouseEnter)
    return () => element.removeEventListener('mouseenter', handleMouseEnter)
  }, [to])
  
  return <Link ref={ref} to={to} {...props}>{children}</Link>
}
```

#### 4. IndexedDB Batch Operations
```typescript
// lib/db/batchOperations.ts
export async function batchAddReceipts(receipts: Receipt[]): Promise<void> {
  const BATCH_SIZE = 100
  
  for (let i = 0; i < receipts.length; i += BATCH_SIZE) {
    const batch = receipts.slice(i, i + BATCH_SIZE)
    await db.receipts.bulkAdd(batch)
  }
}
```

#### 5. Service Worker - Network First sa Fallback
```typescript
// public/sw-custom.js
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))  // Fallback na cache
    )
  }
})
```

---

## 📦 BUNDLE SIZE OPTIMIZACIJA

### Trenutni Bundle (iz build output-a):
```
vendor-B2boVSaV.js          808.14 kB (264 kB gzip)
backend-Chw_Qw30.js         404.53 kB (120 kB gzip)
qr-scanner-BUZqVm42.js      387.95 kB (99 kB gzip)
charts-Dz73A5f5.js          361.32 kB (79 kB gzip)
react-core-BeMGFuNn.js      180.36 kB (52 kB gzip)
```

### 🎯 Optimizacije:

#### 1. Tree-shaking za Charts
```typescript
// Umesto: import { LineChart, BarChart, ... } from 'recharts'
// Koristiti:
import { LineChart } from 'recharts/lib/chart/LineChart'
import { BarChart } from 'recharts/lib/chart/BarChart'
import { XAxis } from 'recharts/lib/cartesian/XAxis'
// ... samo što se koristi

// Ili još bolje - lazy load charts:
const ChartView = lazy(() => import('./components/charts/ChartView'))
```

#### 2. Date-fns - Import samo potrebnih funkcija
```typescript
// ❌ NE OVAKO:
import { format, parseISO, differenceInDays } from 'date-fns'

// ✅ OVAKO:
import format from 'date-fns/format'
import parseISO from 'date-fns/parseISO'
import differenceInDays from 'date-fns/differenceInDays'
```

#### 3. Lucide Icons - Optimizovati import
```typescript
// lib/icons.ts - Centralizovani export samo korišćenih ikonica
export { 
  Home, 
  Receipt, 
  Search, 
  Settings,
  // ... samo one koje se koriste
} from 'lucide-react'

// Umesto direktnih importa u svakom fajlu
```

#### 4. Conditional Polyfills
```typescript
// main.tsx
// Učitati polyfills samo ako su potrebni
if (!globalThis.structuredClone) {
  await import('core-js/actual/structured-clone')
}
```

---

## 🗄️ DATABASE OPTIMIZACIJE

### Indeksi su dobri! Ali mogu biti bolji:

```typescript
// lib/db.ts - Dodati složene indekse
this.version(4).stores({
  receipts: 
    '++id, ' +
    'merchantName, ' +
    'date, ' +
    '[date+category], ' +           // Compound index za filtriranje po datumu i kategoriji
    '[merchantName+date], ' +       // Compound za pretragu
    'totalAmount, ' +
    'syncStatus, ' +
    'createdAt, ' +
    '[syncStatus+updatedAt]',       // Za sync queue
})
```

### Full-Text Search optimizacija:
```typescript
// lib/search/fuzzySearch.ts
import Fuse from 'fuse.js'

// Kreirati indeks samo jednom i reusovati
let searchIndex: Fuse<Receipt> | null = null

export function searchReceipts(query: string, receipts: Receipt[]) {
  if (!searchIndex || searchIndex.getCollection().length !== receipts.length) {
    searchIndex = new Fuse(receipts, {
      keys: ['merchantName', 'category', 'notes'],
      threshold: 0.3,
      minMatchCharLength: 2,
      ignoreLocation: true,
      useExtendedSearch: true
    })
  }
  
  return searchIndex.search(query)
}
```

### Dodati Database Compression:
```typescript
// lib/db/compression.ts
import pako from 'pako'

export function compressData<T>(data: T): Uint8Array {
  const json = JSON.stringify(data)
  return pako.deflate(json)
}

export function decompressData<T>(compressed: Uint8Array): T {
  const json = pako.inflate(compressed, { to: 'string' })
  return JSON.parse(json)
}

// Koristiti za velike note polja ili PDF-ove
```

---

## 🚨 ERROR HANDLING & RESILIENCE

### 1. Global Error Boundary sa Recovery
```typescript
// components/error/GlobalErrorBoundary.tsx
export class GlobalErrorBoundary extends Component {
  state = { error: null, errorInfo: null }
  
  componentDidCatch(error, errorInfo) {
    // Log u Sentry
    logger.error('Global error:', error, errorInfo)
    
    // Pokušaj recovery
    this.attemptRecovery(error)
  }
  
  attemptRecovery(error) {
    // Očisti corrupt localStorage
    if (error.message.includes('localStorage')) {
      this.clearCorruptedStorage()
    }
    
    // Resetuj Dexie ako je DB corrupt
    if (error.message.includes('Dexie')) {
      this.resetDatabase()
    }
  }
}
```

### 2. Network Resilience - Retry Logic
```typescript
// lib/api/retry.ts
export async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  options = { maxRetries: 3, backoff: 1000 }
): Promise<T> {
  let lastError: Error
  
  for (let i = 0; i < options.maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      if (i < options.maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        await sleep(options.backoff * Math.pow(2, i))
      }
    }
  }
  
  throw lastError
}
```

### 3. Graceful Degradation
```typescript
// lib/features/featureFlags.ts
export const features = {
  ocr: {
    enabled: import.meta.env.VITE_ENABLE_OCR === 'true',
    fallback: 'manual-entry'
  },
  qrScanner: {
    enabled: import.meta.env.VITE_ENABLE_QR_SCANNER === 'true',
    fallback: 'manual-entry'
  }
}

// Komponente automatski degraduju na fallback ako feature ne radi
```

---

## 📊 MONITORING & ANALYTICS

### Web Vitals - već imate! Ali dodati custom metrics:

```typescript
// lib/monitoring/customMetrics.ts
export function trackDatabaseOperation(operation: string, duration: number) {
  // Track u analytics
  analytics.track('db_operation', {
    operation,
    duration,
    timestamp: Date.now()
  })
  
  // Warn ako je sporo
  if (duration > 1000) {
    logger.warn(`Slow DB operation: ${operation} took ${duration}ms`)
  }
}

// Koristiti:
const start = performance.now()
await db.receipts.add(receipt)
trackDatabaseOperation('add_receipt', performance.now() - start)
```

### User Flow Analytics:
```typescript
// lib/analytics/userFlow.ts
export class UserFlowTracker {
  private sessionActions: string[] = []
  
  trackAction(action: string) {
    this.sessionActions.push(action)
    
    // Detect patterns
    if (this.detectDropOff()) {
      analytics.track('user_drop_off', {
        flow: this.sessionActions,
        lastAction: action
      })
    }
  }
  
  detectDropOff(): boolean {
    // Ako korisnik napusti stranicu u sredini add receipt flow-a
    return this.sessionActions.includes('add_receipt_start') &&
           !this.sessionActions.includes('add_receipt_complete')
  }
}
```

---

## 🎯 PRIORITETI (Top 5)

### 1. **Image Compression** (HIGH IMPACT)
- Implementirati pre upload-a
- Generisati thumbnails
- WebP format
- **Benefit:** -70% bandwidth, brže učitavanje

### 2. **Bundle Optimization** (MEDIUM IMPACT)
- Tree-shake charts i icons
- Conditional polyfills
- **Benefit:** -100KB bundle size

### 3. **Database Indices** (MEDIUM IMPACT)  
- Compound indices za common queries
- **Benefit:** 2-3x brže query-je

### 4. **Error Recovery** (HIGH RELIABILITY)
- Automatic recovery za corrupt storage
- Retry logic za network
- **Benefit:** Manje user frustrations

### 5. **localStorage Encryption** (SECURITY)
- Za osetljive podatke
- **Benefit:** Dodatna sigurnost

---

## 📝 QUICK WINS (Instant Improvements)

1. **Dodati `loading="lazy"` na sve slike:**
```tsx
<img src={receipt.imageUrl} loading="lazy" alt="..." />
```

2. **Prefetch kritičnih route-ova:**
```tsx
<link rel="prefetch" href="/receipts" />
<link rel="prefetch" href="/add" />
```

3. **Optimizovati font loading:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>
```

4. **Service Worker - Cache API responses:**
```javascript
// sw-custom.js - Keširati GET zahteve ka Supabase
workbox.routing.registerRoute(
  /https:\/\/.*\.supabase\.co\/rest\/v1\/.*/,
  new workbox.strategies.NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minuta
      }),
    ],
  })
);
```

5. **Dodati Resource Hints:**
```html
<!-- index.html -->
<link rel="dns-prefetch" href="https://accounts.google.com">
<link rel="dns-prefetch" href="https://fonts.googleapis.com">
```

---

## 🔍 CODE QUALITY WINS

### 1. Consolidate localStorage Calls
Napraviti centralizovani wrapper:
```typescript
// lib/storage/index.ts
export const storage = {
  recent: {
    get: () => parseJSON(localStorage.getItem('recent_searches')),
    set: (val) => localStorage.setItem('recent_searches', JSON.stringify(val))
  },
  language: {
    get: () => localStorage.getItem('i18nextLng'),
    set: (lang) => localStorage.setItem('i18nextLng', lang)
  }
  // ... centralizovati sve localStorage pristupe
}
```

### 2. Typed Event Handlers
```typescript
// types/events.ts
export type AppEvent = 
  | { type: 'receipt_added', data: Receipt }
  | { type: 'receipt_deleted', id: number }
  | { type: 'sync_completed' }

// lib/events/eventBus.ts
class EventBus {
  emit(event: AppEvent) { /* ... */ }
  on<T extends AppEvent['type']>(type: T, handler: (e: Extract<AppEvent, { type: T }>) => void)
}
```

### 3. Remove Unused Dependencies
Proverite da li sve dependencies iz `package.json` se koriste:
```bash
npx depcheck
```

---

## 💡 BONUS: Performance Budget

Dodati u `package.json`:
```json
{
  "size-limit": [
    {
      "name": "Main bundle",
      "path": "dist/assets/index-*.js",
      "limit": "150 KB"
    },
    {
      "name": "React core",
      "path": "dist/assets/react-core-*.js",
      "limit": "60 KB"
    }
  ]
}
```

Run: `npm run size` pre svakog deploya!

---

## ✅ ZAKLJUČAK

**Trenutno stanje:** 8.5/10 - Odličan kod! 🎉

**Sa ovim unapređenjima:** 9.5/10 - Production-ready enterprise aplikacija! 🚀

**Sledeći koraci:**
1. Implementirati Image Compression (biggest impact)
2. Bundle optimization (date-fns, charts)
3. Database compound indices
4. Error recovery mechanisms
5. localStorage encryption

**Vremenska procena:**
- Quick wins: 2-3 sata
- Image compression: 4-6 sati  
- Bundle optimization: 3-4 sata
- Database: 2-3 sata
- Error handling: 4-5 sati

**Ukupno:** ~20 sati rada za sve optimizacije

---

_Generisano: Oktobar 2025 | Fiskalni Račun v1.0_
