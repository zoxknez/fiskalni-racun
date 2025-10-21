# 📱 Fiskalni Račun

Moderna aplikacija za praćenje fiskalnih računa, garancija i analizu potrošnje. Dostupna kao web aplikacija i native mobilna aplikacija za iOS i Android.

## ✨ Funkcionalnosti

- 📸 **Skeniranje QR kodova** sa fiskalnih računa
- 🖼️ **OCR ekstrakcija podataka** sa fotografija računa
- ✍️ **Ručno dodavanje računa**
- 📊 **Detaljne statistike i analitika potrošnje**
- 🛡️ **Upravljanje garancijama** sa notifikacijama pre isteka
- 🗂️ **Organizacija po kategorijama**
- 💾 **Export podataka** (CSV, PDF, Excel)
- 🌙 **Dark mode podrška**
- 🌐 **Multi-language** (Srpski, Engleski)
- 📴 **Offline-first** - sve radi bez interneta

## 🚀 Web Verzija

### Instalacija i pokretanje

```bash
# Kloniraj repozitorijum
git clone https://github.com/zoxknez/fiskalni-racun.git
cd fiskalni-racun

# Instaliraj dependencies
npm install

# Pokreni development server
npm run dev

# Build za production
npm run build

# Preview production build-a
npm run preview
```

### Dostupne komande

```bash
npm run dev              # Development server
npm run build            # Production build
npm run preview          # Preview production build-a
npm run lint             # Lint kod
npm run lint:fix         # Fix lint issues
npm run test             # Run unit testove
npm run test:e2e         # Run E2E testove
npm run type-check       # TypeScript type check
```

## 📱 Mobilne Aplikacije (iOS & Android)

### 🎯 Brzi početak

Kompletan vodič za kreiranje mobilnih aplikacija se nalazi u **`mobile-docs/`** folderu:

- 📖 **[QUICK-START.md](./mobile-docs/QUICK-START.md)** - Brzi početak (2 min)
- 📚 **[MOBILE-BUILD-GUIDE.md](./mobile-docs/MOBILE-BUILD-GUIDE.md)** - Detaljan vodič
- 🏪 **[APP-STORE-REQUIREMENTS.md](./mobile-docs/APP-STORE-REQUIREMENTS.md)** - Store zahtevi
- 🎨 **[ICONS-GUIDE.md](./mobile-docs/ICONS-GUIDE.md)** - Kreiranje ikona
- ❓ **[FAQ.md](./mobile-docs/FAQ.md)** - Često postavljana pitanja

### Instalacija mobilnih platformi

```bash
# Instaliraj Android i iOS platforme
npm install @capacitor/android@6 @capacitor/ios@6

# Dodaj platforme
npx cap add android
npx cap add ios

# Build web verzije
npm run build

# Sync sa mobilnim platformama
npx cap sync

# Otvori u Android Studio (Windows/Mac/Linux)
npx cap open android

# Otvori u Xcode (samo macOS)
npx cap open ios
```

### Mobile NPM skripte

```bash
npm run cap:sync              # Sync sa platformama
npm run cap:android           # Otvori Android Studio
npm run cap:ios               # Otvori Xcode
npm run mobile:build          # Build web + sync
npm run mobile:dev:android    # Live reload Android
npm run mobile:dev:ios        # Live reload iOS
```

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI biblioteka
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool i dev server
- **Tailwind CSS** - Utility-first CSS
- **Framer Motion** - Animacije
- **React Router** - Routing

### State & Data
- **Zustand** - State management
- **Dexie.js** - IndexedDB wrapper (lokalna baza)
- **React Query** - Server state management
- **React Hook Form** - Form handling
- **Zod** - Schema validation

### Mobile
- **Capacitor 6** - Native iOS/Android wrapper
- **Capacitor Camera** - Pristup kameri
- **Capacitor File System** - File storage
- **Capacitor Push Notifications** - Push notifikacije

### Dodatno
- **Tesseract.js** - OCR (optical character recognition)
- **ZXing** - QR code scanning
- **date-fns** - Date utility
- **Recharts** - Grafikoni
- **i18next** - Internacionalizacija

### Development Tools
- **Biome** - Linter i formatter
- **Vitest** - Unit testing
- **Playwright** - E2E testing
- **Husky** - Git hooks
- **Sentry** - Error tracking
- **PostHog** - Product analytics

## 📁 Struktura projekta

```
fiskalni-racun/
├── src/
│   ├── components/      # React komponente
│   ├── pages/           # Page komponente
│   ├── hooks/           # Custom React hooks
│   ├── store/           # Zustand store
│   ├── lib/             # Utility funkcije
│   ├── services/        # API servisi
│   ├── types/           # TypeScript tipovi
│   └── i18n/            # Prevodi
├── public/              # Static assets
├── mobile-docs/         # 📱 Mobile build dokumentacija
├── lib/                 # Shared biblioteke
├── scripts/             # Build i setup skripte
├── android/             # Android projekat (posle `npx cap add android`)
├── ios/                 # iOS projekat (posle `npx cap add ios`)
└── docs/                # Dokumentacija
```

## 🔐 Privatnost

**Fiskalni Račun NE prikuplja lične podatke.**

- ✅ Svi podaci se čuvaju lokalno na vašem uređaju
- ✅ Nema obavezne registracije
- ✅ Nema slanja podataka na eksterne servere
- ✅ OCR i QR skeniranje se izvršava lokalno

Detaljna Privacy Policy: [public/privacy.html](./public/privacy.html)

## 📄 Licenca

Ovaj projekat je licenciran pod MIT licencom - vidi [LICENSE](./LICENSE) fajl za detalje.

## 🤝 Doprinos

Pull requests su dobrodošli! Za veće izmene, prvo otvori issue da diskutujemo šta želiš da promeniš.

```bash
# Fork projekat
# Kreiraj feature branch
git checkout -b feature/amazing-feature

# Commit izmene
git commit -m 'Add amazing feature'

# Push na branch
git push origin feature/amazing-feature

# Otvori Pull Request
```

## 📞 Kontakt

- **GitHub:** [@zoxknez](https://github.com/zoxknez)
- **Email:** support@fiskalniracun.app
- **Issues:** [GitHub Issues](https://github.com/zoxknez/fiskalni-racun/issues)

## 🎉 Zahvalnice

Posebna zahvalnost svim open-source projektima koji su omogućili ovu aplikaciju!

---

**Napravljeno sa ❤️ u Srbiji 🇷🇸**
