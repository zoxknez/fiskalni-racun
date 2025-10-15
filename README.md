# 🧾 Fiskalni Račun - Digitalna Evidencija Računa i Garancija

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![React](https://img.shields.io/badge/React-18.3-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178c6.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Moderna PWA aplikacija za praćenje fiskalnih računa, garancija i upravljanje uređajima**

[Demo](#) · [Dokumentacija](#features) · [Instalacija](#installation)

</div>

---

## 📋 Sadržaj

- [O Aplikaciji](#o-aplikaciji)
- [Ključne Funkcionalnosti](#ključne-funkcionalnosti)
- [Tehnologije](#tehnologije)
- [Instalacija](#instalacija)
- [Pokretanje](#pokretanje)
- [Arhitektura](#arhitektura)
- [Features u Detalje](#features-u-detalje)
- [Performance](#performance)
- [Accessibility](#accessibility)
- [PWA Mogućnosti](#pwa-mogućnosti)
- [Razvoj](#razvoj)
- [Testiranje](#testiranje)
- [Deploy](#deploy)
- [Contributing](#contributing)
- [Licenca](#licenca)

---

## 🎯 O Aplikaciji

**Fiskalni Račun** je moderna, progresivna web aplikacija (PWA) koja omogućava:

- 📱 **Digitalizaciju papirnih računa** - Fotografiši ili skeniraj QR kod sa fiskalnog računa
- 🔍 **OCR tehnologiju** - Automatsko čitanje podataka sa računa korišćenjem Tesseract.js
- 📊 **Analitiku potrošnje** - Detaljni prikaz trendova, kategorija i statistika
- ⏰ **Praćenje garancija** - Automatska obaveštenja pre isteka garancije
- 📦 **Upravljanje uređajima** - Evidencija kupljenih uređaja sa svim detaljima
- 🔄 **Offline rad** - Potpuna funkcionalnost bez interneta
- ☁️ **Cloud sinhronizacija** - Automatski backup na Supabase

---

## ✨ Ključne Funkcionalnosti

### 📸 Skeniranje i Digitalizacija
- ✅ **QR kod skeniranje** - Instant čitanje fiskalnih računa preko QR koda
- ✅ **OCR prepoznavanje** - Automatsko čitanje teksta sa fotografija računa
- ✅ **Fotografija računa** - Čuvanje originalnih slika u高oj rezoluciji
- ✅ **PDF generisanje** - Export računa u PDF format
- ✅ **Image optimization** - Automatska kompresija u WebP/AVIF format

### 🏷️ Organizacija i Pretraga
- ✅ **Kategorije** - 15+ predefinisanih kategorija (hrana, odeća, tehnologija...)
- ✅ **Tagovi** - Fleksibilno označavanje računa
- ✅ **Napredna pretraga** - Fuzzy search sa Fuse.js
- ✅ **Filteri** - Po datumu, iznosu, kategoriji, trgovcu
- ✅ **Sortiranje** - Različiti načini prikazivanja podataka

### 📊 Analitika i Izveštaji
- ✅ **Mesečni trendovi** - Grafički prikaz potrošnje kroz vreme
- ✅ **Kategorije po utrošku** - Pie chart sa detaljnom analizom
- ✅ **Top trgovci** - Najčešći prodavci
- ✅ **Statistike** - Ukupan broj računa, prosečan iznos, najveća kupovina
- ✅ **Date range filteri** - Analiza za bilo koji period

### ⏰ Garancije i Podsetnici
- ✅ **Praćenje garancija** - Automatsko izračunavanje datuma isteka
- ✅ **Push notifikacije** - Obaveštenja pre isteka (30, 14, 7, 1 dan)
- ✅ **Status uređaja** - Active, Expired, In-Service
- ✅ **Servisni centri** - Čuvanje kontakt podataka servisa
- ✅ **Dokumenti garancije** - Prilaganje garancijskih listova

### 💾 Sinhronizacija i Backup
- ✅ **Offline-first** - IndexedDB lokalna baza podataka
- ✅ **Cloud backup** - Supabase real-time sinhronizacija
- ✅ **Background sync** - Automatski upload kada je internet dostupan
- ✅ **Conflict resolution** - Pametno rešavanje konflikata
- ✅ **Export/Import** - CSV, JSON, PDF izvoz podataka

### 🎨 Korisnički Interfejs
- ✅ **Dark/Light tema** - Podržava sistem preference
- ✅ **Responsive design** - Perfektno radi na svim uređajima
- ✅ **Animacije** - Smooth transitions sa Framer Motion
- ✅ **Command Palette** - Brza navigacija (Cmd/Ctrl + K)
- ✅ **Virtual scrolling** - Performanse sa hiljade stavki
- ✅ **Accessibility** - WCAG 2.1 AA/AAA compliant

### 🔐 Sigurnost i Privatnost
- ✅ **Web Crypto API** - AES-GCM enkripcija osetljivih podataka
- ✅ **Supabase Auth** - OAuth 2.0 / Magic Link / Email autentifikacija
- ✅ **PKCE flow** - Siguran OAuth flow
- ✅ **DOMPurify** - XSS zaštita
- ✅ **Content Security Policy** - HTTP headers

### 📱 PWA Funkcionalnosti
- ✅ **Install prompt** - Mogućnost instalacije kao native app
- ✅ **Service Worker** - Offline caching sa Workbox
- ✅ **Push notifications** - Web push API
- ✅ **Background sync** - Sync kada app nije aktivan
- ✅ **App shortcuts** - Quick actions iz home screen
- ✅ **Share API** - Deljenje računa sa drugim apps

---

## 🛠️ Tehnologije

### Frontend
- **React 18.3** - Latest features (Suspense, Transitions, Concurrent Rendering)
- **TypeScript 5.4** - Strict mode, branded types, utility types
- **Vite 5.2** - Lightning-fast HMR and build
- **TailwindCSS 3.4** - Utility-first styling
- **Framer Motion 12** - Smooth animations

### State Management
- **Zustand 4.5** - Lightweight state management with slices
- **TanStack Query 5** - Server state & caching
- **React Hook Form 7** - Performant forms with validation
- **Zod 4.1** - Schema validation

### Database & Storage
- **Dexie 4.0** - IndexedDB wrapper (offline storage)
- **Supabase** - PostgreSQL backend with real-time
- **Dexie Observable** - Change tracking for sync

### AI & Computer Vision
- **Tesseract.js 6.0** - OCR engine (offline capable)
- **@zxing/library 0.21** - QR code scanner
- **Canvas API** - Image processing & optimization

### UI Components
- **Lucide React** - Beautiful icons (tree-shakeable)
- **Recharts 2.12** - Interactive charts
- **React Virtuoso 4** - Virtual scrolling
- **Sonner** - Toast notifications
- **CMDK** - Command palette

### Developer Tools
- **Biome 2.2** - Fast linter & formatter (Rust-based)
- **Vitest 3.2** - Unit testing framework
- **Playwright** - E2E testing
- **Lighthouse CI** - Performance monitoring
- **GitHub Actions** - CI/CD pipeline

### Performance & Monitoring
- **Web Vitals 5.1** - Core Web Vitals tracking
- **Sentry** - Error tracking (ready for integration)
- **Performance API** - Custom metrics

---

## 📦 Instalacija

### Preduslov
```bash
Node.js >= 18.0.0
npm >= 9.0.0 ili pnpm >= 8.0.0
```

### 1. Kloniraj repo
```bash
git clone https://github.com/zoxknez/fiskalni-racun.git
cd fiskalni-racun
```

### 2. Instaliraj dependencies
```bash
npm install
# ili
pnpm install
```

### 3. Podesi environment varijable
```bash
cp .env.example .env
```

Popuni `.env` fajl sa svojim credentials:
```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Sentry
VITE_SENTRY_DSN=your_sentry_dsn

# Optional: Analytics
VITE_GA_TRACKING_ID=your_google_analytics_id
```

### 4. Supabase Setup
```bash
# Instaliraj Supabase CLI
npm install -g supabase

# Login
supabase login

# Link projekat
supabase link --project-ref your-project-ref

# Primeni migracije
supabase db push
```

---

## 🚀 Pokretanje

### Development
```bash
npm run dev
```
App će biti dostupan na `http://localhost:3000`

### Build za Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Type Check
```bash
npm run type-check
```

### Linting & Formatting
```bash
# Check
npm run lint

# Auto-fix
npm run lint:fix

# Format
npm run format
```

### Testing
```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

---

## 🏗️ Arhitektura

```
fiskalni-racun/
├── lib/                      # Shared utilities (backend logic)
│   ├── db.ts                # Dexie database schema & queries
│   ├── ocr.ts               # Tesseract OCR engine
│   ├── qr-scanner.ts        # QR code scanning
│   ├── notifications.ts     # Push notifications
│   ├── analytics.ts         # Analytics tracking
│   └── validation.ts        # Zod schemas
├── src/
│   ├── components/          # React components
│   │   ├── auth/           # Authentication
│   │   ├── common/         # Reusable components
│   │   ├── devices/        # Device management
│   │   ├── layout/         # Layout components
│   │   └── scanner/        # QR/OCR scanning
│   ├── hooks/              # Custom React hooks
│   │   ├── useOCR.ts       # OCR hook
│   │   ├── useBackgroundSync.ts
│   │   ├── useWebVitals.ts
│   │   └── ...
│   ├── lib/                # Frontend utilities
│   │   ├── supabase.ts     # Supabase client
│   │   ├── auth.ts         # Auth helpers
│   │   ├── crypto.ts       # Encryption
│   │   ├── performance.ts  # Performance utilities
│   │   ├── a11y.ts         # Accessibility
│   │   └── ...
│   ├── pages/              # Page components
│   │   ├── HomePage.tsx
│   │   ├── ReceiptsPage.tsx
│   │   ├── WarrantiesPage.tsx
│   │   └── ...
│   ├── store/              # Zustand state
│   │   ├── useAppStore.ts
│   │   └── slices/
│   ├── types/              # TypeScript types
│   └── i18n/               # Internationalization
├── public/                 # Static assets
├── supabase/
│   └── migrations/         # Database migrations
└── tests/                  # Test files
```

### Design Patterns

#### 🎯 Slice Pattern (Zustand)
```typescript
// store/slices/createAuthSlice.ts
export const createAuthSlice: StateCreator<AppStore, [], [], AuthSlice> = (set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false }),
})
```

#### 🛡️ Result Type Pattern (Error Handling)
```typescript
// Rust-inspired error handling
const result = await fetchData()
if (result.ok) {
  console.log(result.value)
} else {
  console.error(result.error)
}
```

#### 🔄 HOC Pattern
```typescript
// hoc/withAuth.tsx
export const withAuth = <P extends object>(Component: ComponentType<P>) => {
  return (props: P) => {
    const { isAuthenticated } = useAppStore()
    if (!isAuthenticated) return <Navigate to="/auth" />
    return <Component {...props} />
  }
}
```

---

## 🎨 Features u Detalje

### 📸 QR Scanner

```typescript
import { QRScanner } from '@/components/scanner/QRScanner'

<QRScanner
  onScan={(data) => {
    // Parse fiskalni QR
    const receipt = parseFiscalQR(data)
    saveReceipt(receipt)
  }}
  onError={(error) => console.error(error)}
/>
```

**Features:**
- Real-time scanning sa ZXing
- Auto-focus & torch control
- Debounce duplicate scans
- Error recovery
- Camera permission handling

### 🔍 OCR Scanning

```typescript
import { useOCR } from '@/hooks/useOCR'

const { recognize, isProcessing } = useOCR()

const handleImage = async (file: File) => {
  const result = await recognize(file, {
    lang: 'srp+eng',
    preprocessImage: true,
  })
  
  if (result.ok) {
    const { merchantName, totalAmount, date } = result.value
  }
}
```

**OCR Features:**
- Serbian & English language support
- Image preprocessing (contrast, brightness, rotation)
- Automatic field extraction
- Confidence scoring
- Worker thread processing (non-blocking)

### 📊 Analytics Dashboard

```typescript
import { AnalyticsPage } from '@/pages/AnalyticsPage'

// Features:
// - Monthly spending trends (Line chart)
// - Category breakdown (Pie chart)
// - Top merchants (Bar chart)
// - Date range filtering
// - Export to PDF/CSV
```

**Metrics Tracked:**
- Total spending
- Average receipt amount
- Number of receipts
- Spending by category
- Spending by merchant
- Trend analysis (week-over-week, month-over-month)

### ⏰ Warranty Notifications

```typescript
// Automatski setup u useEffect
useEffect(() => {
  const devices = await db.devices.toArray()
  
  for (const device of devices) {
    await scheduleWarrantyReminders(device, {
      intervals: [30, 14, 7, 1], // days before expiry
      requirePermission: true,
    })
  }
}, [])
```

**Notification Types:**
- Browser push notifications
- In-app toasts
- Email notifications (via Supabase)
- Quiet hours support

### 🔄 Background Sync

```typescript
// Automatic sync hook
import { useBackgroundSync } from '@/hooks/useBackgroundSync'

function App() {
  useBackgroundSync() // That's it!
  
  // Automatically syncs:
  // - When coming back online
  // - When app becomes visible
  // - On mount (if online)
}
```

**Sync Strategy:**
- Offline-first architecture
- Retry with exponential backoff
- Conflict resolution
- Sync queue with priority
- Stale data cleanup

---

## ⚡ Performance

### Build Optimizations

**Code Splitting:**
```typescript
// Lazy load heavy libraries
const OCR = lazy(() => import('./lib/ocr'))
const Charts = lazy(() => import('./components/Charts'))

// Manual chunks in vite.config.ts
rollupOptions: {
  output: {
    manualChunks: {
      'react-vendor': ['react', 'react-dom'],
      'ocr': ['tesseract.js'],      // ~5MB
      'qr-scanner': ['@zxing/library'], // ~500KB
      'charts': ['recharts'],        // ~400KB
    }
  }
}
```

**Image Optimization:**
```typescript
// Automatic WebP/AVIF conversion
const optimized = await optimizeImage(file, {
  maxWidth: 1920,
  quality: 0.85,
  format: 'auto', // Detects WebP/AVIF support
})

// Result: ~70% file size reduction
```

### Core Web Vitals

Target metrics:
- **LCP** (Largest Contentful Paint): < 2.5s ✅
- **FID** (First Input Delay): < 100ms ✅
- **CLS** (Cumulative Layout Shift): < 0.1 ✅
- **FCP** (First Contentful Paint): < 1.8s ✅
- **TTFB** (Time to First Byte): < 800ms ✅
- **INP** (Interaction to Next Paint): < 200ms ✅

### Performance Features

- ✅ **Virtual Scrolling** - React Virtuoso za liste
- ✅ **Image Lazy Loading** - Native loading="lazy"
- ✅ **Route-based Code Splitting** - React.lazy
- ✅ **Memoization** - React.memo, useMemo, useCallback
- ✅ **Deferred Values** - useDeferredValue za search
- ✅ **Request Idle Callback** - Low-priority tasks
- ✅ **Service Worker Caching** - Instant repeat visits

---

## ♿ Accessibility

### WCAG 2.1 AA/AAA Compliance

**Keyboard Navigation:**
```typescript
// Command Palette (Cmd/Ctrl + K)
useKeyboard('mod+k', () => setCommandOpen(true))

// Escape to close modals
useKeyboard('Escape', () => setModalOpen(false))

// Arrow navigation in lists
<div role="listbox" onKeyDown={handleArrowKeys}>
```

**Screen Reader Support:**
```typescript
// ARIA live regions
announce('Račun uspešno sačuvan', 'polite')

// Proper semantic HTML
<nav aria-label="Glavna navigacija">
<main aria-label="Glavni sadržaj">
<button aria-label="Dodaj novi račun">
```

**Focus Management:**
```typescript
// Focus trap in modals
useFocusTrap(modalRef)

// Focus restoration
const previousFocus = document.activeElement
// ... show modal
previousFocus?.focus()
```

**Other Features:**
- High contrast mode support
- Reduced motion support
- Skip to main content link
- Proper heading hierarchy
- Alt text for all images
- Descriptive link text

---

## 📱 PWA Mogućnosti

### Installation

```typescript
// Auto-detect installability
const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent>()

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  setDeferredPrompt(e)
  setShowInstallPrompt(true)
})
```

### Offline Support

**Caching Strategy:**
```typescript
// vite-plugin-pwa config
workbox: {
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\./,
      handler: 'NetworkFirst', // Try network, fallback to cache
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg)$/,
      handler: 'CacheFirst', // Cache-first for images
    }
  ]
}
```

**Offline Indicators:**
```typescript
const isOnline = useOnlineStatus()

<OfflineIndicator visible={!isOnline} />
```

### App Manifest

```json
{
  "name": "Fiskalni Račun",
  "short_name": "Fiskalni",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#0ea5e9",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/logo.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    }
  ]
}
```

---

## 🧪 Testiranje

### Unit Tests (Vitest)

```bash
npm run test
```

Example test:
```typescript
import { describe, it, expect } from 'vitest'
import { formatCurrency } from '@/lib/utils'

describe('formatCurrency', () => {
  it('formats Serbian currency', () => {
    expect(formatCurrency(1234.56, 'RSD')).toBe('1.234,56 RSD')
  })
})
```

### E2E Tests (Playwright)

```bash
npm run test:e2e
```

Example test:
```typescript
test('should add receipt via QR scan', async ({ page }) => {
  await page.goto('/')
  await page.click('[aria-label="Dodaj račun"]')
  await page.click('text=Skeniraj QR')
  
  // Mock camera & QR scan
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('qr-scan', {
      detail: 'mock-qr-data'
    }))
  })
  
  await expect(page.locator('text=Račun sačuvan')).toBeVisible()
})
```

### Coverage

```bash
npm run test:coverage
```

Target: **70%+ coverage** (statements, branches, functions, lines)

---

## 🚀 Deploy

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

### Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

### GitHub Pages

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

---

## 🔧 Razvoj

### Dodavanje Nove Kategorije

```typescript
// lib/categories.ts
export const categories = {
  // ... existing
  'electronics': {
    label: { 'sr-Latn': 'Elektronika', en: 'Electronics' },
    icon: '💻',
    color: 'purple'
  }
}
```

### Kreiranje Novog Hook-a

```typescript
// src/hooks/useCustomHook.ts
import { useState, useEffect } from 'react'

export function useCustomHook(param: string) {
  const [data, setData] = useState(null)
  
  useEffect(() => {
    // Your logic
  }, [param])
  
  return { data }
}
```

### Dodavanje Nove Stranice

```typescript
// 1. Create page
// src/pages/NewPage.tsx
export default function NewPage() {
  return <div>New Page</div>
}

// 2. Add route
// src/App.tsx
const NewPage = lazy(() => import('./pages/NewPage'))

<Route path="/new" element={<NewPage />} />
```

---

## 🤝 Contributing

Contributions su dobrodošle! Molimo pratite sledeće korake:

1. **Fork** repo
2. **Kreiraj** feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** promene (`git commit -m 'Add some AmazingFeature'`)
4. **Push** na branch (`git push origin feature/AmazingFeature`)
5. **Otvori** Pull Request

### Code Style

- Koristi **Biome** za linting i formatting
- Piši **TypeScript** sa strict mode
- Dodaj **JSDoc** komentare za funkcije
- Piši **testove** za nove feature-e
- Prati **conventional commits** format

### Commit Convention

```
feat: Add QR scanner feature
fix: Fix date parsing bug
docs: Update README
style: Format code with Biome
refactor: Simplify authentication logic
test: Add unit tests for utils
chore: Update dependencies
```

---

## 📄 Licenca

MIT License - pogledaj [LICENSE](LICENSE) fajl za detalje.

---

## 👤 Autor

**zoxknez**
- GitHub: [@zoxknez](https://github.com/zoxknez)
- Email: zoxknez@hotmail.com

---

## 🙏 Zahvalnice

- [React Team](https://react.dev) - Za neverovatnu biblioteku
- [Supabase](https://supabase.com) - Za backend-as-a-service
- [Tesseract.js](https://tesseract.projectnaptha.com/) - Za OCR engine
- [Vercel](https://vercel.com) - Za besplatan hosting

---

## 📊 Stats

![GitHub stars](https://img.shields.io/github/stars/zoxknez/fiskalni-racun?style=social)
![GitHub forks](https://img.shields.io/github/forks/zoxknez/fiskalni-racun?style=social)
![GitHub issues](https://img.shields.io/github/issues/zoxknez/fiskalni-racun)
![GitHub pull requests](https://img.shields.io/github/issues-pr/zoxknez/fiskalni-racun)

---

<div align="center">

**Napravljeno sa ❤️ u Srbiji**

[⬆ Nazad na vrh](#-fiskalni-račun---digitalna-evidencija-računa-i-garancija)

</div>
