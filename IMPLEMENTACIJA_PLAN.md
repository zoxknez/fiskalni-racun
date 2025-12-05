# 📋 Plan Implementacije Modernih Tehnologija

## 🎯 Faza 1: Kritične Stvari (1-2 nedelje)

### 1. View Transitions API
**Prioritet:** ⭐⭐⭐ VISOK  
**Vreme:** 2-3 sata  
**Impact:** Veliki UX improvement

**Implementacija:**
```typescript
// src/lib/view-transitions.ts
export function startViewTransition(callback: () => void) {
  if ('startViewTransition' in document) {
    (document as any).startViewTransition(callback)
  } else {
    callback()
  }
}

// src/hooks/useSmoothNavigate.ts
import { useNavigate } from 'react-router-dom'
import { startViewTransition } from '@/lib/view-transitions'

export function useSmoothNavigate() {
  const navigate = useNavigate()
  
  return useCallback((to: string) => {
    startViewTransition(() => navigate(to))
  }, [navigate])
}
```

**Koraci:**
1. Kreirati `src/lib/view-transitions.ts`
2. Kreirati `src/hooks/useSmoothNavigate.ts`
3. Zameniti `useNavigate` sa `useSmoothNavigate` u komponentama
4. Dodati CSS za transitions:
```css
@view-transition {
  navigation: auto;
}
```

---

### 2. Upstash Redis za Rate Limiting
**Prioritet:** ⭐⭐⭐ VISOK  
**Vreme:** 3-4 sata  
**Impact:** Kritično za production

**Implementacija:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

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

export async function checkRateLimitRedis(
  identifier: string,
  endpoint: string
) {
  const result = await authRateLimit.limit(`${endpoint}:${identifier}`)
  return {
    allowed: result.success,
    retryAfter: result.reset - Date.now(),
    limit: result.limit,
    remaining: result.remaining,
  }
}
```

**Koraci:**
1. Kreirati Upstash account
2. Dodati env variables
3. Kreirati `api/middleware/rateLimitRedis.ts`
4. Ažurirati handlers da koriste Redis umesto in-memory
5. Testirati u production

---

### 3. Resend za Email Service
**Prioritet:** ⭐⭐⭐ VISOK  
**Vreme:** 2-3 sata  
**Impact:** Potrebno za password reset

**Implementacija:**
```bash
npm install resend
```

```typescript
// api/services/email.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`
  
  await resend.emails.send({
    from: 'Fiskalni Račun <noreply@fiskalni-racun.app>',
    to: email,
    subject: 'Reset lozinke',
    html: `
      <h1>Reset lozinke</h1>
      <p>Kliknite na link ispod da resetujete lozinku:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>Link važi 1 sat.</p>
    `,
  })
}
```

**Koraci:**
1. Kreirati Resend account
2. Dodati env variable
3. Kreirati `api/services/email.ts`
4. Ažurirati `api/auth/handlers/password-reset.ts`
5. Testirati email sending

---

## 🎯 Faza 2: UX Poboljšanja (2-3 nedelje)

### 4. Broadcast Channel API
**Prioritet:** ⭐⭐ SREDNJI  
**Vreme:** 2-3 sata  
**Impact:** Bolji cross-tab sync

**Implementacija:**
```typescript
// src/lib/broadcast.ts
const channel = new BroadcastChannel('fiskalni-racun-sync')

export function useBroadcastSync() {
  const queryClient = useQueryClient()
  
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data.type === 'receipt-updated') {
        queryClient.invalidateQueries(['receipts'])
      }
    }
    
    channel.addEventListener('message', handler)
    return () => channel.removeEventListener('message', handler)
  }, [queryClient])
}

export function broadcastReceiptUpdate(receiptId: string) {
  channel.postMessage({
    type: 'receipt-updated',
    receiptId,
  })
}
```

---

### 5. File System Access API
**Prioritet:** ⭐⭐ SREDNJI  
**Vreme:** 3-4 sata  
**Impact:** Bolji UX za export

**Implementacija:**
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
    // Fallback
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
}
```

---

## 🎯 Faza 3: Nice to Have (kada bude vremena)

### 6. React 19 Upgrade
**Prioritet:** ⭐ NIZAK  
**Vreme:** 1-2 dana  
**Impact:** Bolje performanse, novi features

**Napomena:** Sačekati stabilnu verziju React 19.

**Features:**
- `useOptimistic` - Dodatak na TanStack Query optimistic updates
- `useActionState` - Unified form state
- `useFormStatus` - Form status tracking

---

### 7. Web Streams API
**Prioritet:** ⭐ NIZAK  
**Vreme:** 4-5 sati  
**Impact:** Bolje performanse za velike export-e

---

### 8. Partytown
**Prioritet:** ⭐ NIZAK  
**Vreme:** 2-3 sata  
**Impact:** Bolje performanse za analytics

---

## 📊 ROI Analiza

| Feature | Vreme | Impact | ROI |
|---------|-------|--------|-----|
| View Transitions | 2-3h | Visok | ⭐⭐⭐⭐⭐ |
| Upstash Redis | 3-4h | Kritičan | ⭐⭐⭐⭐⭐ |
| Resend Email | 2-3h | Kritičan | ⭐⭐⭐⭐⭐ |
| Broadcast Channel | 2-3h | Srednji | ⭐⭐⭐ |
| File System API | 3-4h | Srednji | ⭐⭐⭐ |
| React 19 | 1-2d | Srednji | ⭐⭐ |
| Web Streams | 4-5h | Nizak | ⭐⭐ |
| Partytown | 2-3h | Nizak | ⭐⭐ |

---

## 🚀 Quick Wins (može odmah)

1. **View Transitions API** - 2-3 sata, veliki UX improvement
2. **CSS Improvements** - Skeleton loading states
3. **Error Boundaries** - Bolje error handling
4. **Progressive Enhancement** - Core funkcionalnost bez JS

---

*Poslednji update: ${new Date().toLocaleDateString('sr-RS')}*

