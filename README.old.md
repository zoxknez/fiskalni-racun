# Fiskalni račun - README

## 📱 Fiskalni račun App

Moderna PWA aplikacija za evidenciju fiskalnih računa i upravljanje garancijama.

### ✨ Features

- 📸 **QR skeniranje** - Brzo dodavanje računa skeniranjem QR koda
- 📷 **OCR** - Automatsko prepoznavanje podataka sa fotografije računa
- 🛡️ **Garancije** - Potpuna evidencija uređaja i garancija
- ⏰ **Podsetnici** - Automatska obaveštenja pre isteka garancije
- 📊 **Analytics** - Uvid u potrošnju po kategorijama
- 🔍 **Pretraga** - Brza pretraga računa i uređaja
- 🌐 **i18n** - Podrška za srpski i engleski jezik
- 🌓 **Dark/Light tema** - Savršen izgled u oba režima
- 📱 **Mobile-first** - Optimizovano za mobilne uređaje
- 🔄 **Offline-first** - Rad bez interneta sa sync-om

### 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### 🏗️ Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **State**: Zustand
- **i18n**: i18next
- **Database**: Dexie (IndexedDB)
- **Icons**: Lucide React
- **Mobile**: Capacitor

### 📁 Project Structure

```
src/
├── components/      # Reusable components
│   └── layout/      # Layout components
├── pages/           # Page components
├── store/           # Zustand store
├── types/           # TypeScript types
├── i18n/            # Translations
└── lib/             # Utility functions

lib/                 # Core business logic (existing)
├── db.ts
├── ocr.ts
├── qr-scanner.ts
├── categories.ts
├── analytics.ts
├── notifications.ts
├── utils.ts
└── validation.ts
```

### 🎨 Design System

- **Primary Color**: Sky Blue (#0ea5e9)
- **Font**: Inter
- **Mobile-first**: Starting from 320px
- **Breakpoints**: sm(640px), md(768px), lg(1024px)

### 📦 Features Implementation

#### MVP (Current)
- ✅ Add receipt (QR/Photo/Manual)
- ✅ Receipt list & detail
- ✅ Add device/warranty from receipt
- ✅ Warranty list & detail
- ✅ Search functionality
- ✅ Profile & settings
- ✅ Dark/Light theme
- ✅ RS/EN language
- ⏳ QR scanner integration (placeholder)
- ⏳ OCR integration (placeholder)
- ⏳ Database (Dexie) integration

#### v1 (Planned)
- Budget tracking
- Family Space
- Export CSV/PDF
- Service claims
- Service center catalog

#### v2 (Future)
- Email import
- Auto-categorization
- Extended service catalog
- UBL 2.1 support
- IPS QR payments
- Widgets

### 🔧 Development

```bash
# Lint
npm run lint

# Type check
npx tsc --noEmit
```

### 📱 PWA

The app is configured as a Progressive Web App (PWA) with:
- Offline support
- Install prompt
- App-like experience
- Push notifications (planned)

### 🌐 i18n

Supported languages:
- 🇷🇸 Serbian (sr)
- 🇬🇧 English (en)

Add new translations in `src/i18n/translations.ts`

### 🎯 Key Pages

- **Home** (`/`) - Dashboard with insights
- **Receipts** (`/receipts`) - Receipt list
- **Receipt Detail** (`/receipts/:id`) - Receipt details
- **Warranties** (`/warranties`) - Device/warranty list
- **Warranty Detail** (`/warranties/:id`) - Device details
- **Add Receipt** (`/add`) - Add new receipt (QR/Photo/Manual)
- **Search** (`/search`) - Global search
- **Profile** (`/profile`) - Settings & account

### 📄 License

Private project - All rights reserved

---

Made with ❤️ for keeping receipts organized
