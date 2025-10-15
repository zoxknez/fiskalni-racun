# Architecture Overview

Arhitektura Fiskalni Račun aplikacije.

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│  (React 18 + Tailwind CSS + Framer Motion)              │
└──────────────┬──────────────────────────────────────────┘
               │
┌──────────────┴──────────────────────────────────────────┐
│                   State Management                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │   Zustand   │  │ TanStack     │  │  React Hook    │ │
│  │   (Global)  │  │ Query (API)  │  │  Form (Forms)  │ │
│  └─────────────┘  └──────────────┘  └────────────────┘ │
└──────────────┬──────────────────────────────────────────┘
               │
┌──────────────┴──────────────────────────────────────────┐
│                   Data Layer                             │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │   Dexie     │  │   Supabase   │  │   Web Workers  │ │
│  │ (IndexedDB) │  │   (Backend)  │  │   (Heavy CPU)  │ │
│  └─────────────┘  └──────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 📦 Layer Breakdown

### 1. Presentation Layer

**Components** (`src/components/`)
- **ui/** - Base UI components (Button, Input, etc.)
- **common/** - Shared components (ErrorBoundary, SEO, etc.)
- **scanner/** - QR/OCR specific components

**Pages** (`src/pages/`)
- Route-level components
- Page-specific logic
- SEO per page

**Key Patterns:**
- Component composition
- Controlled vs Uncontrolled components
- Render props
- Compound components

### 2. State Management Layer

**Zustand** - Global Application State
```typescript
src/store/
├── useAppStore.ts      # Main app state
├── useUserStore.ts     # User preferences
└── useUIStore.ts       # UI state (modals, toasts)
```

**TanStack Query** - Server State
```typescript
src/hooks/queries/
├── useReceiptsQuery.ts # Receipt CRUD
├── useDevicesQuery.ts  # Device CRUD
└── useLiveReceipts.ts  # Live IndexedDB queries
```

**React Hook Form** - Form State
```typescript
src/hooks/
└── useForm.ts          # Custom form hook with Zod
```

### 3. Data Access Layer

**IndexedDB (Dexie)**
- Primary data store
- Offline-first
- Sync queue for pending operations

```typescript
lib/db.ts
├── receipts         # Receipt data
├── devices          # Device/warranty data
├── syncQueue        # Pending sync operations
└── _migrations      # Database versioning
```

**Supabase**
- Authentication
- Backend sync target
- Real-time subscriptions (optional)

**API Client**
```typescript
src/lib/api.ts
├── createAPIClient()          # Base client
└── createSupabaseAPIClient()  # Enhanced with auth
```

### 4. Business Logic Layer

**Services** (`src/services/`)
```typescript
accountService.ts    # Account operations
receiptService.ts    # Receipt processing
deviceService.ts     # Device management
syncService.ts       # Sync logic
```

**Utilities** (`src/lib/`)
```typescript
lib/ocr.ts           # OCR processing
lib/qr-scanner.ts    # QR code scanning
lib/exportUtils.ts   # PDF/CSV export
lib/images/          # Image optimization
```

### 5. Infrastructure Layer

**Monitoring**
```typescript
src/lib/monitoring/
├── sentry.ts        # Error tracking
├── webVitals.ts     # Performance monitoring
└── logger.ts        # Structured logging
```

**Security**
```typescript
src/lib/security/
├── csp.ts           # Content Security Policy
├── rateLimiter.ts   # Rate limiting
└── validation/      # Input validation
```

**Caching**
```typescript
src/lib/cache/
└── cacheManager.ts  # SWR + cache invalidation
```

## 🔄 Data Flow

### Write Path (Add Receipt)

```
1. User uploads image
   ↓
2. Web Worker processes image (optimization)
   ↓
3. OCR Worker extracts text (optional)
   ↓
4. Form validation (Zod)
   ↓
5. Write to IndexedDB (Dexie)
   ↓
6. Add to sync queue
   ↓
7. Background sync to Supabase
   ↓
8. Update UI (TanStack Query invalidation)
```

### Read Path (List Receipts)

```
1. User navigates to receipts page
   ↓
2. TanStack Query checks cache
   ↓
3. If stale, fetch from IndexedDB (Live Query)
   ↓
4. Background sync from Supabase (optional)
   ↓
5. Render with Virtual Scrolling
   ↓
6. Progressive image loading
```

## 🔐 Security Architecture

### Defense in Depth

1. **Client-Side**
   - Content Security Policy (CSP)
   - Trusted Types API
   - Input validation (Zod)
   - XSS protection

2. **Network**
   - HTTPS only
   - CORS configuration
   - Rate limiting

3. **Backend (Supabase)**
   - Row Level Security (RLS)
   - JWT authentication
   - API rate limiting

### Authentication Flow

```
1. User enters credentials
   ↓
2. Client validates (Zod schema)
   ↓
3. Supabase Auth API call
   ↓
4. JWT token received
   ↓
5. Token stored (HttpOnly cookie / localStorage)
   ↓
6. Token injected in API calls (interceptor)
   ↓
7. Auto-refresh on 401 (retry interceptor)
```

## 📱 PWA Architecture

### Service Worker Strategies

1. **Precache** - Static assets (HTML, CSS, JS)
2. **Network First** - API calls
3. **Cache First** - Images, fonts
4. **Stale While Revalidate** - User content

### Offline Strategy

```
Online:
  Write → IndexedDB → Sync Queue → Supabase
  Read  → IndexedDB (with background Supabase sync)

Offline:
  Write → IndexedDB → Sync Queue (pending)
  Read  → IndexedDB only

On Reconnect:
  Process Sync Queue → Supabase
  Background sync latest data
```

## 🎯 Performance Optimizations

### Bundle Splitting

```
Chunks:
- react-vendor  (~120KB) - React core
- supabase      (~80KB)  - Supabase client
- database      (~50KB)  - Dexie
- ocr           (~1.5MB) - Tesseract (lazy)
- qr-scanner    (~150KB) - ZXing (lazy)
- charts        (~200KB) - Recharts (lazy)
```

### Code Splitting Routes

```typescript
const ReceiptsPage = lazy(() => import('./pages/ReceiptsPage'))
const AddReceiptPage = lazy(() => import('./pages/AddReceiptPage'))
const WarrantiesPage = lazy(() => import('./pages/WarrantiesPage'))
```

### Image Optimization

1. Resize to max dimensions (1920x1080)
2. Convert to WebP/AVIF
3. Generate responsive srcset
4. Lazy loading with blur-up placeholder
5. Progressive enhancement

### Rendering Optimization

- Virtual scrolling for large lists (react-virtuoso)
- React.memo for expensive components
- useDeferredValue for search
- useTransition for non-urgent updates
- Suspense boundaries for code splitting

## 🧪 Testing Strategy

### Pyramid Structure

```
      E2E Tests (Playwright)
         /       \
    Integration Tests (Vitest + MSW)
         /              \
   Unit Tests (Vitest)  Component Tests (Testing Library)
```

### Test Coverage Goals

- Unit tests: >80%
- Integration tests: Critical paths
- E2E tests: Happy paths + critical flows
- Visual regression: Storybook + Chromatic (optional)

## 📊 Monitoring & Observability

### Error Tracking (Sentry)
- JavaScript errors
- Network errors
- User feedback
- Performance issues

### Analytics (PostHog)
- User behavior
- Feature usage
- Funnels
- A/B testing

### Performance (Web Vitals)
- LCP, FID, CLS
- Custom metrics
- Real User Monitoring (RUM)

## 🔄 CI/CD Pipeline

```
git push
   ↓
GitHub Actions
   ├─ Lint (Biome)
   ├─ Type Check (tsc)
   ├─ Unit Tests (Vitest)
   ├─ E2E Tests (Playwright)
   ├─ Build
   ├─ Size Check (size-limit)
   └─ Lighthouse Audit
   ↓
Vercel Deployment
   ├─ Preview (branches)
   └─ Production (main)
```

## 🔐 Environment Variables

### Required
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase public key

### Optional
- `VITE_POSTHOG_KEY` - PostHog analytics
- `VITE_SENTRY_DSN` - Sentry error tracking
- `VITE_VERCEL_ANALYTICS_ID` - Vercel analytics

## 📝 Architecture Decision Records (ADR)

See `docs/adr/` for detailed decisions:
- [ADR-0001: Dexie for Offline Storage](./adr/0001-use-dexie-for-offline-storage.md)
- [ADR-0002: Zustand for State Management](./adr/0002-use-zustand-for-state-management.md)

## 🚀 Deployment Targets

1. **Vercel** (Primary) - Zero-config deployment
2. **Netlify** - Alternative static hosting
3. **Docker** - Self-hosted option
4. **Capacitor** - Native mobile apps

---

**Architecture evolves with the application. Keep this document updated!**

