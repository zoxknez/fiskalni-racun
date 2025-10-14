# Fiskalni Račun - PWA Aplikacija 📱💳

> Mobilna aplikacija za digitalizaciju fiskalnih računa i praćenje garancija uređaja

## 🎯 Status Projekta

### ✅ Kompletno Implementirano

#### Frontend (100%)
- ✅ **React 18 + TypeScript + Vite** - Moderna razvojna infrastruktura
- ✅ **Tailwind CSS 3** - Mobile-first responsive dizajn
- ✅ **Dark/Light tema** - Automatsko prepoznavanje + ručno podešavanje
- ✅ **Internacionalizacija (i18n)** - Srpski (latinica) i Engleski (400+ stringova)
- ✅ **8 stranica** - Home, Receipts, Receipt Detail, Warranties, Warranty Detail, Add, Search, Profile
- ✅ **Navigacija** - Sidebar (desktop) + Bottom nav (mobile)
- ✅ **State Management** - Zustand sa persistence
- ✅ **Custom CSS sistem** - .card, .btn-*, .badge-*, .input komponente

#### Database Layer (95%)
- ✅ **Dexie.js** - IndexedDB wrapper sa TypeScript podrškom
- ✅ **Database schema v2** - Compound indexes za optimizovane upite
- ✅ **CRUD API** - Kompletne operacije za receipts, devices, reminders, settings
- ✅ **Sync Queue** - Offline-first podrška sa background sinhronizacijom
- ✅ **Hooks layer** - 15+ React hooks za real-time updates (`useReceipts`, `useDevices`, `useDashboardStats`, itd.)
- ✅ **Automatic hooks** - Timestamp, warranty calculation, cascade deletes
- ✅ **Statistics API** - Dashboard analytics, monthly spending, category totals
- ⏳ **Zod validation** - Schemas kreirane, integracija u toku

---

## 🏗️ Tehnički Stack

### Core
- **React** 18.3.1
- **TypeScript** 5.2.2
- **Vite** 5.2.10
- **Tailwind CSS** 3.4.3

### State & Data
- **Zustand** 4.5.2 (global state)
- **Dexie** 4.0.4 + **dexie-react-hooks** 1.1.7 (IndexedDB)
- **React Router** 6.22.3 (routing)

### UI & UX
- **Lucide React** 0.359.0 (icons)
- **react-hot-toast** 2.4.1 (notifications)
- **date-fns** 3.6.0 (date formatting)
- **i18next** 23.10.1 (internationalization)

### Mobile & PWA
- **Capacitor** 5.7.0 (native wrapper)
- **workbox-window** 7.1.0 (service worker)
- **vite-plugin-pwa** 0.20.5 (PWA manifest)

### Integrations
- **html5-qrcode** 2.3.8 (QR scanning)
- **Recharts** 2.12.2 (charts)
- **Fuse.js** 7.0.0 (fuzzy search)
- **jsPDF** 2.5.2 + **jspdf-autotable** 3.8.3 (PDF export)
- **PapaParse** 5.4.1 (CSV export)
- **JSZip** 3.10.1 + **file-saver** 2.0.5 (backup)

### Quality & Monitoring
- **Zod** 3.23.8 (runtime validation)
- **@sentry/react** 8.46.0 (error tracking)
- **react-error-boundary** 4.1.2 (error boundaries)
- **@playwright/test** 1.49.1 (E2E testing)

---

## 🚀 Kako Pokrenuti

### Instalacija

```powershell
# Clone repository
git clone https://github.com/zoxknez/fiskalni-racun.git
cd fiskalni-racun

# Install dependencies
npm install

# Development server
npm run dev
```

Aplikacija će biti dostupna na **http://localhost:3000** (ili drugi slobodan port).

### Build za Production

```powershell
# TypeScript type check
npm run build

# Preview production build
npm run preview
```

---

## 📚 Korišćenje Database Layer-a

### React Hooks (Preporučeno)

```tsx
import {
  useReceipts,
  useReceipt,
  useDevices,
  useDashboardStats,
  addReceipt,
  updateReceipt,
  deleteReceipt,
} from '@/hooks/useDatabase'

function MyComponent() {
  // Real-time live query - automatski se ažurira
  const receipts = useReceipts()
  const stats = useDashboardStats()
  
  // CRUD operations
  const handleAdd = async () => {
    await addReceipt({
      merchantName: 'Maxi',
      pib: '12345678',
      date: new Date(),
      time: '14:30',
      totalAmount: 1250.50,
      category: 'groceries',
    })
  }
  
  return (
    <div>
      {receipts?.map(r => (
        <div key={r.id}>{r.merchantName}</div>
      ))}
    </div>
  )
}
```

### Available Hooks

```typescript
// Receipts
useReceipts()                          // Svi računi
useReceipt(id)                         // Jedan račun
useRecentReceipts(limit)               // Nedavni računi
useReceiptsByCategory(category)        // Po kategoriji
useReceiptSearch(query)                // Pretraga

// Devices
useDevices()                           // Svi uređaji
useDevice(id)                          // Jedan uređaj
useDevicesByStatus(status)             // Po statusu
useExpiringDevices(days)               // Ističu uskoro
useDeviceSearch(query)                 // Pretraga

// Statistics
useDashboardStats()                    // Dashboard podaci
useCategoryTotals()                    // Suma po kategorijama

// Other
useDeviceReminders(deviceId)           // Podsjetnici za uređaj
usePendingReminders()                  // Neobrađeni podsjetnici
useSyncQueue()                         // Sync queue stavke
```

---

## 📊 Database Schema

### Receipts Table

| Field | Type | Description |
|-------|------|-------------|
| `id` | `number` | Auto-increment ID |
| `merchantName` | `string` | Naziv prodavnice |
| `pib` | `string` | PIB broj |
| `date` | `Date` | Datum kupovine |
| `time` | `string` | Vreme (HH:mm) |
| `totalAmount` | `number` | Ukupan iznos |
| `vatAmount` | `number?` | PDV |
| `items` | `ReceiptItem[]?` | Stavke |
| `category` | `string` | Kategorija |
| `notes` | `string?` | Beleške |
| `qrLink` | `string?` | QR kod link |
| `imageUrl` | `string?` | Slika računa |
| `pdfUrl` | `string?` | PDF računa |
| `createdAt` | `Date` | Kreirano |
| `updatedAt` | `Date` | Ažurirano |
| `syncStatus` | `'synced'\|'pending'\|'error'` | Status sinhronizacije |

**Indexes:** `merchantName`, `pib`, `date`, `category`, `[merchantName+date]`, `[category+createdAt]`

### Devices Table

| Field | Type | Description |
|-------|------|-------------|
| `id` | `number` | Auto-increment ID |
| `receiptId` | `number?` | Veza na račun |
| `brand` | `string` | Brend |
| `model` | `string` | Model |
| `category` | `string` | Kategorija |
| `serialNumber` | `string?` | Serijski broj |
| `purchaseDate` | `Date` | Datum kupovine |
| `warrantyDuration` | `number` | Trajanje (meseci) |
| `warrantyExpiry` | `Date` | Datum isteka (auto) |
| `status` | `'active'\|'expired'\|'in-service'` | Status (auto) |
| `serviceCenterName` | `string?` | Servis centar |
| `serviceCenterAddress` | `string?` | Adresa servisa |
| `serviceCenterPhone` | `string?` | Telefon servisa |
| `serviceCenterHours` | `string?` | Radno vreme |
| `reminders` | `Reminder[]` | Podsjetnici |
| `createdAt` | `Date` | Kreirano |
| `updatedAt` | `Date` | Ažurirano |

**Indexes:** `receiptId`, `[status+warrantyExpiry]`, `warrantyExpiry`, `brand`, `model`, `category`

---

## 🎨 Design System

### Boje

```css
/* Light Mode */
--primary: #3B82F6 (blue-600)
--dark: #1F2937 → #F9FAFB (gray scale)

/* Dark Mode */
--primary: #60A5FA (blue-400)
--dark: #111827 → #F9FAFB (inverted)
```

### Komponente

```tsx
// Cards
<div className="card">...</div>
<div className="card-hover">...</div>
<div className="stat-card">...</div>

// Buttons
<button className="btn-primary">Primary</button>
<button className="btn-secondary">Secondary</button>
<button className="btn-danger">Delete</button>

// Badges
<span className="badge-success">Active</span>
<span className="badge-warning">Expiring</span>
<span className="badge-error">Expired</span>

// Inputs
<input className="input" placeholder="Enter text" />
```

---

## 🌍 Internacionalizacija

### Trenutno Podržani Jezici
- 🇷🇸 **Srpski** (latinica) - `sr`
- 🇬🇧 **English** - `en`

### Kako Dodati Novi String

1. Otvori `src/i18n/translations.ts`
2. Dodaj key u oba jezika:

```typescript
export const translations = {
  sr: {
    myNewKey: 'Moj novi tekst',
  },
  en: {
    myNewKey: 'My new text',
  },
}
```

3. Koristi u komponenti:

```tsx
import { useTranslation } from 'react-i18next'

function MyComponent() {
  const { t } = useTranslation()
  return <div>{t('myNewKey')}</div>
}
```

---

## 📦 Build & Deployment

### Production Build

```powershell
# Build for web
npm run build

# Output: dist/
# Ready for static hosting (Vercel, Netlify, Cloudflare Pages)
```

### Android APK

```powershell
# Sync assets
npx cap sync android

# Open Android Studio
npx cap open android

# Build: Build > Build Bundle(s) / APK(s) > Build APK(s)
```

### iOS App

```powershell
# Sync assets
npx cap sync ios

# Open Xcode
npx cap open ios

# Build: Product > Archive
```

---

## 🤝 Doprinos

### Git Workflow

```powershell
# Create feature branch
git checkout -b feature/nova-funkcija

# Commit changes
git add .
git commit -m "feat: dodao novu funkciju"

# Push to GitHub
git push origin feature/nova-funkcija

# Create Pull Request na GitHub-u
```

### Commit Convention

- `feat:` Nova funkcionalnost
- `fix:` Bug fix
- `docs:` Dokumentacija
- `style:` Formatiranje, CSS
- `refactor:` Refaktorisanje koda
- `test:` Testovi
- `chore:` Build/config promene

---

## 🎯 Roadmap

### Sprint 1: Core Integrations (U TOKU)
- [x] Database layer setup
- [x] React hooks creation
- [x] HomePage integration
- [ ] ReceiptsPage integration
- [ ] WarrantiesPage integration
- [ ] AddReceiptPage (manual mode)
- [ ] SearchPage integration

### Sprint 2: Scanner Features
- [ ] QR Scanner (html5-qrcode)
- [ ] Camera integration
- [ ] Gallery upload
- [ ] OCR (Tesseract.js)

### Sprint 3: PWA Features
- [ ] Service Worker
- [ ] Offline caching
- [ ] Background Sync
- [ ] Install prompt
- [ ] Push notifications

### Sprint 4: Advanced Features
- [ ] Charts & analytics
- [ ] Export (PDF, CSV)
- [ ] Backup/Restore
- [ ] Biometric lock
- [ ] Error tracking (Sentry)

### Sprint 5: Mobile Build
- [ ] Android APK
- [ ] iOS App
- [ ] App Store deployment

---

## 📞 Support

- **GitHub:** https://github.com/zoxknez/fiskalni-racun
- **Issues:** https://github.com/zoxknez/fiskalni-racun/issues

---

## 📜 License

MIT License - slobodno korišćenje i modifikacija.

---

**Poslednje ažuriranje:** ${new Date().toLocaleDateString('sr-Latn')}  
**Verzija:** 1.0.0-beta  
**Status:** 🚧 U aktivnom razvoju
