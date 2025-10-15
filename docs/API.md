# API Documentation

Dokumentacija za sve API endpointe i servise u Fiskalni Račun aplikaciji.

## 🏗️ Arhitektura

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   React UI  │─────▶│  API Client  │─────▶│  Supabase   │
└─────────────┘      └──────────────┘      └─────────────┘
                             │
                             ▼
                      ┌──────────────┐
                      │    Dexie     │
                      │  (IndexedDB) │
                      └──────────────┘
```

## 📡 API Client

### Base Client (`src/lib/api.ts`)

```typescript
import { createAPIClient } from '@/lib/api'

const api = createAPIClient({
  baseURL: import.meta.env.VITE_SUPABASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// GET request
const data = await api.get('/rest/v1/receipts')

// POST request
const newReceipt = await api.post('/rest/v1/receipts', {
  body: { store: 'Maxi', amount: 1500 }
})

// PATCH request
await api.patch('/rest/v1/receipts', {
  params: { id: 'eq.123' },
  body: { amount: 2000 }
})

// DELETE request
await api.delete('/rest/v1/receipts', {
  params: { id: 'eq.123' }
})
```

### Enhanced Client with Caching

```typescript
import { createSupabaseAPIClient } from '@/lib/api/enhancedClient'

const api = createSupabaseAPIClient()

// Automatic auth token injection
// Automatic token refresh on 401
// In-memory caching for GET requests

const receipts = await api.get('/rest/v1/receipts') // Cached
```

## 🗄️ Database (Dexie)

### Schema

```typescript
// lib/db.ts
const db = new Dexie('FiskalniRacunDB')

db.version(2).stores({
  receipts: '++id, userId, store, date, amount, category, warranty, syncStatus',
  devices: '++id, userId, receiptId, name, purchaseDate, warrantyUntil, brand, category',
  syncQueue: '++id, tableName, operation, recordId, timestamp',
  _migrations: '++id, version, name, appliedAt',
})
```

### Indexes

```typescript
// Compound indexes for efficient queries
receipts: [
  '[userId+date]',        // User's receipts by date
  '[userId+category]',    // User's receipts by category
  '[userId+syncStatus]',  // Pending sync items
]
```

### Live Queries

```typescript
import { useLiveReceipts } from '@/hooks/queries/useLiveReceipts'

function ReceiptList() {
  const receipts = useLiveReceipts()
  
  // Automatically updates when database changes
  return <div>{receipts?.map(...)}</div>
}
```

## 🔐 Authentication

### Sign Up

```typescript
import { signUp } from '@/lib/auth'

await signUp('user@example.com', 'SecurePassword123!')
// Auto-validates password strength
// Creates user session
// Redirects to /receipts
```

### Sign In

```typescript
import { signIn } from '@/lib/auth'

await signIn('user@example.com', 'password')
// Returns session
// Stores auth token
// Sets up refresh token
```

### Session Management

```typescript
import { 
  registerSession,
  getActiveSessions,
  revokeSession 
} from '@/lib/auth/sessionManager'

// Register current device
const deviceId = await registerSession()

// Get all active sessions
const sessions = await getActiveSessions()

// Revoke specific session
await revokeSession('device-123')
```

## 📝 Receipts API

### Get All Receipts

```typescript
const { data } = await supabase
  .from('receipts')
  .select('*')
  .eq('userId', currentUserId)
  .order('date', { ascending: false })
```

### Add Receipt

```typescript
import { useAddReceipt } from '@/hooks/queries/useReceiptsQuery'

const addMutation = useAddReceipt()

await addMutation.mutateAsync({
  store: 'Maxi',
  date: new Date(),
  amount: 1500,
  category: 'groceries',
  items: ['Hleb', 'Mleko'],
})
```

### Update Receipt

```typescript
import { useUpdateReceipt } from '@/hooks/queries/useReceiptsQuery'

const updateMutation = useUpdateReceipt()

await updateMutation.mutateAsync({
  id: '123',
  amount: 2000,
})
```

### Delete Receipt

```typescript
import { useDeleteReceipt } from '@/hooks/queries/useReceiptsQuery'

const deleteMutation = useDeleteReceipt()

await deleteMutation.mutateAsync('123')
```

## 🛡️ Warranties (Devices)

### Add Device/Warranty

```typescript
import { useAddDevice } from '@/hooks/queries/useDevicesQuery'

const addMutation = useAddDevice()

await addMutation.mutateAsync({
  receiptId: '123',
  name: 'Samsung TV',
  brand: 'Samsung',
  category: 'electronics',
  purchaseDate: new Date(),
  warrantyMonths: 24,
})
```

### Get Expiring Warranties

```typescript
import { useLiveExpiringDevices } from '@/hooks/queries/useLiveDevices'

function WarrantyAlerts() {
  const expiring = useLiveExpiringDevices(30) // Next 30 days
  
  return <Alert>You have {expiring?.length} expiring warranties</Alert>
}
```

## 🔄 Sync Queue

### Process Sync Queue

```typescript
import { processSyncQueue } from '@/lib/db'

const result = await processSyncQueue()
// { processed: 5, failed: 0 }
```

### Background Sync

```typescript
// Automatically syncs when online
// Uses Service Worker Background Sync API
// Retries failed requests
```

## 📊 Analytics

### Track Event

```typescript
import { trackEvent } from '@/lib/analytics/posthog'

trackEvent('receipt_scanned', {
  method: 'qr',
  store: 'Maxi',
})
```

### Feature Flags

```typescript
import { useFeatureFlag } from '@/hooks/useFeatureFlag'

function NewFeature() {
  const isEnabled = useFeatureFlag('new-ui')
  
  if (!isEnabled) return null
  
  return <div>New UI</div>
}
```

## 🖼️ Image Processing

### OCR (Text Extraction)

```typescript
import { extractTextFromImage } from '@lib/ocr'

const text = await extractTextFromImage(imageFile)
// Returns extracted text
```

### QR Code Scanning

```typescript
import { scanQRCode } from '@lib/qr-scanner'

const data = await scanQRCode(imageFile)
// Returns QR code data
```

### Image Optimization

```typescript
import { optimizeImage } from '@/lib/images/optimizer'

const optimized = await optimizeImage(file, {
  maxWidth: 1920,
  quality: 0.8,
  format: 'webp',
})
```

## 📤 Export

### Export to PDF

```typescript
import { exportToPDF } from '@/lib/exportUtils'

await exportToPDF(receipts, {
  title: 'Računi - Januar 2024',
  groupBy: 'category',
})
```

### Export to CSV

```typescript
import { exportToCSV } from '@/lib/exportUtils'

await exportToCSV(receipts, {
  filename: 'receipts-2024.csv',
  fields: ['date', 'store', 'amount'],
})
```

## ⚡ Performance

### Caching Strategy

```typescript
// API responses cached for 5 minutes
const [data, isStale] = await cacheManager.get(
  'receipts-list',
  () => api.get('/receipts'),
  {
    ttl: 5 * 60 * 1000,
    staleWhileRevalidate: 10 * 60 * 1000,
  }
)
```

### Rate Limiting

```typescript
import { RateLimiter } from '@/lib/utils/rateLimiter'

const limiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000, // 10 requests per minute
})

if (await limiter.check('api-call')) {
  await api.get('/receipts')
}
```

## 🔍 Search

### Fuzzy Search

```typescript
import { useFuzzySearch } from '@/hooks/useOptimizedSearch'

const { results, search } = useFuzzySearch(receipts, {
  keys: ['store', 'items', 'category'],
  threshold: 0.3,
})

search('maxi')
// Returns fuzzy matched receipts
```

## 🧪 Testing

### Mock API (MSW)

```typescript
// src/mocks/handlers.ts
export const handlers = [
  rest.get('/rest/v1/receipts', (req, res, ctx) => {
    return res(ctx.json([
      { id: '1', store: 'Maxi', amount: 1500 }
    ]))
  }),
]
```

## 📈 Monitoring

### Error Tracking (Sentry)

```typescript
// Automatic error tracking
// Performance monitoring
// User feedback
```

### Web Vitals

```typescript
// Automatic tracking of:
// - LCP (Largest Contentful Paint)
// - FID (First Input Delay)
// - CLS (Cumulative Layout Shift)
// - FCP (First Contentful Paint)
// - TTFB (Time to First Byte)
```

## 🔗 Resursi

- [Supabase Documentation](https://supabase.com/docs)
- [Dexie.js Documentation](https://dexie.org)
- [TanStack Query](https://tanstack.com/query/latest)
- [PostHog Analytics](https://posthog.com/docs)

