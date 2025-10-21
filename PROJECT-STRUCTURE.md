# 📁 Project Organization

Ovaj dokument opisuje organizaciju fajlova i foldera u **fiskalni-racun** projektu.

## 🗂️ Root Struktura

```
fiskalni-racun/
├── 📄 Core Files
│   ├── README.md              # Glavna dokumentacija projekta
│   ├── ROADMAP.md             # Plan razvoja i feature lista
│   ├── LICENSE                # MIT licenca
│   ├── SECURITY.md            # Sigurnosne smernice
│   └── package.json           # NPM dependencies i scripts
│
├── ⚙️ Configuration Files
│   ├── tsconfig.json          # TypeScript konfiguracija
│   ├── vite.config.ts         # Vite bundler config
│   ├── vitest.config.ts       # Unit test config
│   ├── playwright.config.ts  # E2E test config
│   ├── tailwind.config.js    # Tailwind CSS config
│   ├── biome.json            # Code formatter i linter
│   ├── capacitor.config.ts   # Mobile app config
│   └── commitlint.config.js  # Git commit conventions
│
├── 🌍 Environment Files
│   └── .env.example          # Template za environment variables
│
├── 📂 Source Code
│   ├── src/                  # Glavna source koda
│   ├── lib/                  # Shared biblioteke i utilities
│   ├── public/               # Static assets (logo, manifest, etc.)
│   └── types/                # TypeScript type definitions
│
├── 📊 Reports & Documentation
│   ├── izvestaji/            # Development reports i analize
│   ├── docs/                 # API dokumentacija
│   └── mobile-docs/          # Mobile build guides
│
├── 🧪 Testing
│   ├── playwright-report/    # E2E test results (gitignored)
│   └── test-results/         # Test artifacts (gitignored)
│
├── 🔧 Build & Scripts
│   ├── scripts/              # Build i setup scripts
│   ├── dist/                 # Production build (gitignored)
│   └── dev-dist/             # Development build (gitignored)
│
├── 📱 Mobile
│   ├── android/              # Android native code (gitignored)
│   └── ios/                  # iOS native code (gitignored)
│
└── 🗄️ Database & Services
    └── supabase/             # Supabase schema i migrations
```

---

## 📂 Detaljni Opis Foldera

### `src/` - Source Code
```
src/
├── components/        # React komponente
│   ├── common/       # Reusable komponente (Button, Modal, etc.)
│   ├── layout/       # Layout komponente (Header, Sidebar)
│   └── charts/       # Chart komponente (LazyCharts)
├── pages/            # Page komponente (routes)
├── hooks/            # Custom React hooks
├── store/            # Zustand state management
├── services/         # API i business logic services
├── lib/              # Utilities i helpers
├── types/            # TypeScript interfaces
├── i18n/             # Internationalization (translations)
├── workers/          # Web Workers (OCR, background tasks)
├── test/             # Test utilities i setup
└── __tests__/        # Unit tests
```

### `izvestaji/` - Development Reports
```
izvestaji/
├── README.md                        # Index svih izveštaja
├── 🎯 Projekat
│   ├── PROJECT-COMPLETE.md
│   ├── COMPLETION-REPORT.md
│   └── SUMMARY.md
├── 🔍 Analize
│   ├── ANALYSIS-REPORT.md
│   └── README-ANALYSIS.md
├── ⚡ Optimizacije
│   ├── ADVANCED-OPTIMIZATIONS.md
│   └── FINAL-IMPROVEMENTS.md
├── 🐛 Bug Fixes
│   ├── BUGFIX-LOGGER-RECURSION.md
│   └── NAVIGATION-FIX.md
├── 🌍 i18n
│   ├── I18N-AUDIT-REPORT.md
│   ├── I18N-FIXES.md
│   └── TRANSLATION-FIX-SUMMARY.md
└── ♻️ Refactoring
    └── IMPORT-EXPORT-REFACTOR.md
```

### `mobile-docs/` - Mobile Documentation
```
mobile-docs/
├── README.md                    # Mobile docs index
├── QUICK-START.md              # Brzi start guide
├── MOBILE-BUILD-GUIDE.md       # Detaljan build guide
├── COMMANDS-CHEATSHEET.md      # Cheat sheet za komande
├── PRE-RELEASE-CHECKLIST.md   # Pre-release checklist
├── APP-STORE-REQUIREMENTS.md  # Store submission guide
├── ICONS-GUIDE.md             # Icon generation guide
└── FAQ.md                      # Često postavljana pitanja
```

### `docs/` - API Documentation
```
docs/
└── openapi.json    # OpenAPI spec za backend API
```

### `scripts/` - Build Scripts
```
scripts/
├── analyze-external-db.ts      # Database analysis
├── import-from-external-db.ts  # Data import
├── seed-database.ts            # Database seeding
├── generate-openapi.ts         # API docs generation
├── generate-sitemap.ts         # SEO sitemap
├── check-bundle.ts             # Bundle size check
└── dev-cleanup.ts              # Dev cleanup script
```

### `supabase/` - Database
```
supabase/
├── config.toml      # Supabase config
├── schema.sql       # Database schema
└── migrations/      # Database migrations
```

---

## 🚫 Gitignored Folders

Sledeći folderi/fajlovi nisu u git repozitorijumu:

```
# Dependencies
node_modules/

# Build outputs
dist/
dev-dist/
build/

# Testing
coverage/
test-results/
playwright-report/

# Environment
.env
.env.local
.env.*.local

# Mobile (generisani kod)
android/
ios/
.capacitor/

# IDE
.vscode/ (osim extensions.json i settings.json)
.idea/

# Misc
.DS_Store
.vercel/
.vite-inspect/
```

---

## 📝 Configuration Files Pregled

| File | Purpose |
|------|---------|
| `package.json` | NPM dependencies, scripts, project metadata |
| `tsconfig.json` | TypeScript compiler options |
| `vite.config.ts` | Vite bundler config (HMR, build optimizations) |
| `vitest.config.ts` | Unit testing framework config |
| `playwright.config.ts` | E2E testing config |
| `tailwind.config.js` | CSS utility classes config |
| `biome.json` | Code formatter & linter rules |
| `capacitor.config.ts` | Mobile app settings |
| `commitlint.config.js` | Git commit message conventions |
| `postcss.config.js` | PostCSS transformations |
| `vercel.json` | Vercel deployment config |
| `size-limit.json` | Bundle size limits |

---

## 🎯 Naming Conventions

### Files
- **Components:** PascalCase (`ReceiptCard.tsx`)
- **Pages:** PascalCase (`AnalyticsPage.tsx`)
- **Utilities:** camelCase (`formatCurrency.ts`)
- **Types:** PascalCase (`types/Receipt.ts`)
- **Hooks:** camelCase (`useReceipts.ts`)
- **Services:** camelCase (`receiptService.ts`)

### Folders
- **Lowercase:** `components/`, `pages/`, `hooks/`
- **kebab-case:** Za multi-word (`mobile-docs/`)

### Reports (izvestaji/)
- **UPPERCASE-KEBAB-CASE.md**
- Primer: `I18N-AUDIT-REPORT.md`

---

## 🔄 Workflow

### Development
1. Uradi izmene u `src/`
2. Testiraj sa `npm run dev`
3. Proveri tipove: `npm run type-check`
4. Pokreni testove: `npm run test`
5. Lint kod: `npm run lint:fix`

### Deployment
1. Build: `npm run build`
2. Preview: `npm run preview`
3. Deploy na Vercel (automatski sa push)

### Mobile Build
1. Sinhroniziraj: `npx cap sync`
2. Otvori projekat: `npx cap open android/ios`
3. Build u Android Studio / Xcode

---

## 📦 Dependencies Overview

### Core
- **React 18.3.1** - UI library
- **TypeScript 5.6.3** - Type safety
- **Vite 5.4.11** - Build tool

### Routing & State
- **React Router 7.0.1** - Client-side routing
- **Zustand 5.0.1** - State management
- **TanStack Query 5.59.20** - Server state

### UI & Styling
- **Tailwind CSS 3.4.14** - Utility-first CSS
- **Framer Motion 11.11.11** - Animations
- **Lucide React** - Icons

### Forms & Validation
- **React Hook Form 7.53.1** - Forms
- **Zod 3.23.8** - Schema validation

### Data Visualization
- **Recharts 2.13.3** - Charts (lazy loaded)

### Database & Storage
- **Dexie.js 4.0.9** - IndexedDB wrapper
- **Supabase** - Backend (optional)

### Mobile
- **Capacitor 6.2.0** - Native mobile wrapper

### Development
- **Vitest** - Unit testing
- **Playwright** - E2E testing
- **Biome** - Linting & formatting

---

## 🎨 Code Organization Principles

1. **Separation of Concerns**
   - Components only handle UI
   - Services handle business logic
   - Hooks manage side effects

2. **DRY (Don't Repeat Yourself)**
   - Reusable components in `components/common/`
   - Shared utilities in `lib/`

3. **Type Safety**
   - All functions typed
   - Strict TypeScript config
   - Zod for runtime validation

4. **Performance**
   - Lazy loading for heavy components
   - Code splitting by route
   - Memoization where needed

5. **Accessibility**
   - Semantic HTML
   - ARIA labels
   - Keyboard navigation

6. **Internationalization**
   - All text in `i18n/translations.ts`
   - No hardcoded strings
   - Multi-language support

---

## 📚 Documentation Hierarchy

```
1. README.md                    # Start here
   ├── 2. ROADMAP.md           # Features & plans
   ├── 3. SECURITY.md          # Security practices
   └── 4. izvestaji/README.md  # Development reports
       ├── Bug fixes
       ├── Optimizations
       ├── i18n fixes
       └── Refactorings

Mobile specific:
1. mobile-docs/README.md        # Mobile index
   ├── QUICK-START.md          # Get started fast
   ├── MOBILE-BUILD-GUIDE.md   # Detailed guide
   └── FAQ.md                  # Common questions
```

---

## 🚀 Quick Reference

### Start Development
```bash
npm install
npm run dev
```

### Run Tests
```bash
npm run test           # Unit tests
npm run test:e2e      # E2E tests
npm run type-check    # TypeScript check
```

### Build
```bash
npm run build         # Production build
npm run preview       # Test production build
```

### Mobile
```bash
npx cap sync          # Sync web → mobile
npx cap open android  # Open Android Studio
npx cap open ios      # Open Xcode
```

### Code Quality
```bash
npm run lint          # Check code
npm run lint:fix      # Fix issues
```

---

**Organizovano:** October 21, 2025  
**Projekat:** fiskalni-racun  
**Verzija:** 1.0.0
