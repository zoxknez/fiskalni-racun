# 🚀 Moderne Tehnologije i Principi - Preporuke

## 📊 Trenutni Stack Analiza

### ✅ Već Implementirano
- **React 18.3** - Moderna verzija sa Suspense, Concurrent Features
- **Zustand** - Lightweight state management
- **TanStack Query v5** - Server state management sa caching
- **Dexie** - IndexedDB wrapper sa real-time updates
- **React Hook Form + Zod** - Type-safe form validation
- **PWA** - Service Worker, Background Sync, Offline support
- **Vite + SWC** - Brzi build tool
- **Edge Runtime** - Serverless functions
- **Rate Limiting** - Zaštita od abuse-a
- **Error Handling** - Centralizovani sistem

---

## 🎯 Preporučene Moderne Tehnologije

### 1. **React 19 Features** ⭐ VISOK PRIORITET

**Zašto:** React 19 donosi značajne poboljšanja performansi i DX.

**Šta dodati:**
- `useOptimistic` - Optimistic updates za bolji UX
- `useActionState` - Unified state management za forme
- `useFormStatus` - Form status tracking
- `useFormState` - Form state management

**Primer implementacije:**
```typescript
// Za optimistic updates pri dodavanju računa
import { useOptimistic } from 'react'

function useOptimisticReceipts(receipts: Receipt[]) {
  const [optimisticReceipts, addOptimisticReceipt] = useOptimistic(
    receipts,
    (state, newReceipt: Receipt) => [...state, newReceipt]
  )
  
  return { optimisticReceipts, addOptimisticReceipt }
}
```

**Kada koristiti:**
- Dodavanje/izmena računa - instant feedback
- Sync operacije - optimistički prikaži promene
- Form submissions - bolji UX

---

### 2. **View Transitions API** ⭐ VISOK PRIORITET

**Zašto:** Smooth navigacija između stranica bez flash-a.

**Šta dodati:**
- Native browser API za smooth page transitions
- Automatska animacija između stranica
- Shared element transitions

**Primer implementacije:**
```typescript
// src/lib/view-transitions.ts
export function startViewTransition(callback: () => void) {
  if ('startViewTransition' in document) {
    (document as any).startViewTransition(callback)
  } else {
    callback()
  }
}

// U React Router
import { useNavigate } from 'react-router-dom'
import { startViewTransition } from '@/lib/view-transitions'

function useSmoothNavigate() {
  const navigate = useNavigate()
  
  return (to: string) => {
    startViewTransition(() => navigate(to))
  }
}
```

**Kada koristiti:**
- Navigacija između stranica
- Modal otvaranje/zatvaranje
- Lista → Detalj transitions

---

### 3. **Upstash Redis** ⭐ VISOK PRIORITET (Production)

**Zašto:** Trenutni rate limiting je in-memory - ne radi u serverless okruženju.

**Šta dodati:**
- Redis za distributed rate limiting
- Session storage za multi-instance deployment
- Cache layer za česte upite

**Primer implementacije:**
```typescript
// api/middleware/rateLimitRedis.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const authRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  analytics: true,
})
```

**Kada koristiti:**
- Production deployment
- Multi-region deployment
- High traffic scenarios

---

### 4. **Resend** ⭐ VISOK PRIORITET

**Zašto:** Trenutno je mock email - potreban je pravi email service.

**Šta dodati:**
- Email service za password reset
- Email notifications za garancije
- Transactional emails

**Primer implementacije:**
```typescript
// api/services/email.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendPasswordResetEmail(email: string, token: string) {
  await resend.emails.send({
    from: 'noreply@fiskalni-racun.app',
    to: email,
    subject: 'Reset lozinke',
    html: `<a href="${process.env.APP_URL}/reset-password?token=${token}">Resetuj lozinku</a>`,
  })
}
```

**Kada koristiti:**
- Password reset
- Email verification
- Warranty expiry notifications

---

### 5. **Broadcast Channel API** ⭐ SREDNJI PRIORITET

**Zašto:** Bolja cross-tab komunikacija od Storage Events.

**Šta dodati:**
- Real-time sync između tabova
- Instant updates kada se promeni podatak u drugom tabu
- Better performance od Storage Events

**Primer implementacije:**
```typescript
// src/lib/broadcast.ts
const channel = new BroadcastChannel('fiskalni-racun-sync')

export function useBroadcastSync() {
  useEffect(() => {
    channel.onmessage = (event) => {
      if (event.data.type === 'receipt-updated') {
        // Invalidate React Query cache
        queryClient.invalidateQueries(['receipts'])
      }
    }
    
    return () => {
      channel.close()
    }
  }, [])
}

export function broadcastReceiptUpdate(receiptId: string) {
  channel.postMessage({
    type: 'receipt-updated',
    receiptId,
  })
}
```

**Kada koristiti:**
- Cross-tab sync
- Real-time updates
- Multi-window scenarios

---

### 6. **Web Streams API** ⭐ SREDNJI PRIORITET

**Zašto:** Streaming podataka za bolje performanse pri velikim datasetima.

**Šta dodati:**
- Streaming za export podataka
- Progressive loading za velike liste
- Real-time data updates

**Primer implementacije:**
```typescript
// src/lib/streaming-export.ts
export async function streamReceiptsExport(format: 'csv' | 'json') {
  const stream = new ReadableStream({
    async start(controller) {
      const receipts = await getAllReceipts()
      
      for (const receipt of receipts) {
        const chunk = format === 'csv' 
          ? formatCSVRow(receipt)
          : JSON.stringify(receipt)
        
        controller.enqueue(chunk)
        
        // Yield control to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 0))
      }
      
      controller.close()
    },
  })
  
  return stream
}
```

**Kada koristiti:**
- Export velikih datasetova
- Progressive data loading
- Real-time updates

---

### 7. **File System Access API** ⭐ SREDNJI PRIORITET

**Zašto:** Direktan pristup fajlovima bez download-a.

**Šta dodati:**
- Direktno čitanje fajlova sa diska
- Direktno čuvanje fajlova na disk
- Better UX za import/export

**Primer implementacije:**
```typescript
// src/lib/file-access.ts
export async function saveFileToDisk(data: Blob, filename: string) {
  if ('showSaveFilePicker' in window) {
    const handle = await (window as any).showSaveFilePicker({
      suggestedName: filename,
      types: [{
        description: 'CSV files',
        accept: { 'text/csv': ['.csv'] },
      }],
    })
    
    const writable = await handle.createWritable()
    await writable.write(data)
    await writable.close()
  } else {
    // Fallback to download
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
}
```

**Kada koristiti:**
- Export podataka
- Import podataka
- File management

---

### 8. **Web Locks API** ⭐ NIZAK PRIORITET

**Zašto:** Koordinacija između tabova za kritične operacije.

**Šta dodati:**
- Prevent concurrent modifications
- Sync queue coordination
- Critical section protection

**Primer implementacije:**
```typescript
// src/lib/locks.ts
export async function withLock<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  if ('locks' in navigator) {
    return navigator.locks.request(name, { ifAvailable: false }, fn)
  }
  
  // Fallback - simple mutex
  return fn()
}

// Usage
await withLock('sync-queue', async () => {
  await processSyncQueue()
})
```

**Kada koristiti:**
- Sync queue processing
- Critical operations
- Multi-tab coordination

---

### 9. **Partytown** ⭐ NIZAK PRIORITET

**Zašto:** Third-party skripte (analytics) u web worker-u ne blokiraju main thread.

**Šta dodati:**
- Move analytics to web worker
- Better main thread performance
- Non-blocking third-party scripts

**Primer implementacije:**
```typescript
// vite.config.ts
import { partytownVite } from '@builder.io/partytown/utils'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    partytownVite({
      dest: resolve(__dirname, 'dist', '~partytown'),
    }),
  ],
})

// index.html
<script type="text/partytown">
  // Analytics code here runs in web worker
</script>
```

**Kada koristiti:**
- Third-party analytics
- Tracking scripts
- Non-critical scripts

---

### 10. **React Compiler** ⭐ EKSPERIMENTALNO

**Zašto:** Automatske optimizacije bez manual memoization.

**Šta dodati:**
- Automatic memoization
- Automatic dependency tracking
- Better performance bez manual optimizations

**Napomena:** Još uvek eksperimentalno, ali obećavajuće.

---

## 🎨 UX/UI Poboljšanja

### 1. **Skeleton Loading States**
- Umesto loading spinners, koristiti skeleton screens
- Bolji UX, manje "flash of content"

### 2. **Optimistic Updates**
- Instant feedback pri akcijama
- Koristiti React 19 `useOptimistic`

### 3. **Error Boundaries sa Retry**
- Automatski retry za failed requests
- Better error recovery

### 4. **Progressive Enhancement**
- Core funkcionalnost radi bez JS
- JS dodaje enhancements

---

## 🔒 Security Poboljšanja

### 1. **CSRF Protection**
- Dodati CSRF tokens za sensitive operations
- Koristiti SameSite cookies

### 2. **Content Security Policy (CSP)**
- Striktniji CSP headers
- Prevent XSS attacks

### 3. **Subresource Integrity (SRI)**
- Verify integrity of external scripts
- Prevent supply chain attacks

---

## 📈 Performance Optimizations

### 1. **React Server Components** (zahteva Next.js/Remix)
- Server-side rendering
- Reduced client bundle size
- Better SEO

### 2. **Islands Architecture** (zahteva Astro)
- Partial hydration
- Smaller JavaScript bundles
- Better performance

### 3. **Edge Functions**
- Već koristi Edge Runtime ✅
- Može se proširiti za više endpoints

---

## 🧪 Testing Improvements

### 1. **Playwright Component Testing**
- Već imaju Playwright ✅
- Dodati component testing

### 2. **Visual Regression Testing**
- Screenshot testing
- Prevent UI regressions

### 3. **E2E Testing Improvements**
- Više test scenarios
- Better coverage

---

## 📱 Mobile Improvements

### 1. **Capacitor Plugins**
- Već koriste Capacitor ✅
- Dodati više native features

### 2. **Native File Picker**
- Koristiti native file picker
- Better UX na mobile

### 3. **Haptic Feedback**
- Već imaju haptics ✅
- Proširiti korišćenje

---

## 🎯 Prioritetna Implementacija

### Faza 1 (Visok prioritet - odmah)
1. ✅ **View Transitions API** - Smooth navigacija (nema breaking changes)
2. ✅ **Upstash Redis** - Rate limiting za production (kritično za serverless)
3. ✅ **Resend** - Email service (trenutno mock)
4. ✅ **React 19** - Upgrade kada bude stabilan (trenutno React 18.3)

**Napomena:** Već koriste optimistic updates sa TanStack Query ✅ - React 19 `useOptimistic` bi bio dodatak, ne zamena.

### Faza 2 (Srednji prioritet - sledeći mesec)
1. ✅ Broadcast Channel API
2. ✅ Web Streams API
3. ✅ File System Access API

### Faza 3 (Nizak prioritet - kada bude vremena)
1. ✅ Web Locks API
2. ✅ Partytown
3. ✅ React Compiler (kada bude stabilan)

---

## 📚 Resursi

- [React 19 Docs](https://react.dev/blog/2024/04/25/react-19)
- [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
- [Upstash Redis](https://upstash.com/docs/redis/overall/getstarted)
- [Resend](https://resend.com/docs)
- [Broadcast Channel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)
- [Web Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API)

---

*Poslednji update: ${new Date().toLocaleDateString('sr-RS')}*

