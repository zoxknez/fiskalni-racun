# 📱 Fiskalni Račun

Moderna Progressive Web App (PWA) za evidenciju fiskalnih računa i upravljanje garancijama. Skenuj, čuvaj i pretraži sve svoje račune na jednom mestu!

## ✨ Karakteristike

### 🔥 Osnovne funkcionalnosti
- 📸 **QR skeniranje** - Skeniraj QR kod sa fiskalnih računa
- 🤖 **OCR** - Automatsko prepoznavanje teksta sa slika
- 💾 **Offline support** - Radi bez interneta, sinhronizuje se kasnije
- 🔍 **Napredna pretraga** - Fuzzy search sa filterima
- 📊 **Statistike** - Mesečna potrošnja, kategorije, trendovi
- 🛡️ **Garancije** - Praćenje garancija sa notifikacijama
- 📤 **Export** - PDF, CSV, ZIP format
- 🌐 **i18n** - Višejezična podrška (SRP/ENG)

### ⚡ Performanse
- **Lighthouse Score**: 95+ across all metrics
- **Bundle Size**: <500KB (gzipped)
- **First Load**: <2s
- **Time to Interactive**: <3s
- **Web Vitals**: Green across LCP, FID, CLS

### 🎨 UI/UX
- 🌗 **Dark mode** - Automatska detekcija system preference
- 📱 **Responsive** - Od mobile do desktop
- ♿ **Accessibility** - WCAG 2.1 Level AA
- ✨ **Animations** - Smooth transitions (Framer Motion)
- 🎯 **Modern design** - Tailwind CSS + shadcn/ui inspired

### 🔐 Bezbednost
- 🔒 **Strict CSP** - Content Security Policy sa nonce
- 🛡️ **Trusted Types** - XSS zaštita
- 🔑 **Strong passwords** - Zod validacija
- 👤 **Session management** - Multi-device tracking
- ⏱️ **Rate limiting** - Client-side rate limiter

## 🚀 Quick Start

### Preduslov

- Node.js 18+ 
- npm ili yarn
- Supabase nalog

### Instalacija

```bash
# Clone repo
git clone https://github.com/yourusername/fiskalni-racun.git
cd fiskalni-racun

# Install dependencies
npm install

# Setup environment
cp env.template .env.local
# Popuni .env.local sa Supabase kredencijalima

# Initialize Husky
npm run prepare

# Start dev server
npm run dev
```

### Environment Variables

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-key-here

# Optional
VITE_POSTHOG_KEY=your-posthog-key
VITE_SENTRY_DSN=your-sentry-dsn
```

## 📚 Documentation

- [API Documentation](./docs/API.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Accessibility Guidelines](./docs/ACCESSIBILITY.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [Changelog](./CHANGELOG.md)

## 🛠️ Tech Stack

### Core
- **React 18.3** - UI library
- **TypeScript 5.5** - Type safety
- **Vite 5.2** - Build tool
- **Tailwind CSS 3.4** - Styling

### State & Data
- **Zustand 4.5** - Global state
- **TanStack Query v5** - Server state
- **Dexie 4** - IndexedDB wrapper
- **React Hook Form 7** - Forms

### Mobile
- **Capacitor 6** - Native mobile features
- **PWA** - Installable web app

### Testing
- **Vitest** - Unit tests
- **Playwright** - E2E tests
- **MSW** - API mocking
- **Testing Library** - Component tests

### Tools
- **Biome** - Linting & formatting
- **Husky** - Git hooks
- **Commitlint** - Conventional commits

## 📜 Scripts

```bash
# Development
npm run dev              # Start dev server
npm run dev:inspect      # Dev server + plugin inspector

# Build
npm run build           # Production build
npm run build:analyze   # Build + bundle visualizer
npm run preview         # Preview production build

# Quality
npm run lint            # Lint check
npm run lint:fix        # Auto-fix lint errors
npm run format          # Format code
npm run type-check      # TypeScript check

# Testing
npm run test            # Unit tests (watch)
npm run test:run        # Run tests once
npm run test:coverage   # Coverage report
npm run test:ui         # Vitest UI
npm run test:e2e        # E2E tests

# Utilities
npm run clean           # Clean cache
npm run bundle:check    # Bundle size analysis
npm run size            # Size limit check
npm run seed            # Seed test data
npm run sitemap         # Generate sitemap
```

## 🏗️ Project Structure

```
fiskalni-racun/
├── src/
│   ├── components/       # React components
│   │   ├── ui/          # Base UI components
│   │   ├── common/      # Shared components
│   │   └── scanner/     # QR/OCR components
│   ├── pages/           # Page components
│   ├── hooks/           # Custom hooks
│   ├── store/           # Zustand stores
│   ├── lib/             # Utilities & config
│   │   ├── a11y/       # Accessibility helpers
│   │   ├── analytics/  # Analytics integration
│   │   ├── auth/       # Authentication
│   │   ├── cache/      # Cache management
│   │   ├── dev/        # Development tools
│   │   ├── forms/      # Form schemas
│   │   ├── images/     # Image optimization
│   │   ├── monitoring/ # Error & performance tracking
│   │   ├── performance/# Performance utils
│   │   ├── security/   # Security utilities
│   │   └── utils/      # General utilities
│   ├── workers/         # Web Workers
│   ├── mocks/           # MSW handlers
│   └── __tests__/       # Integration tests
├── lib/                 # Shared library code
│   └── db/             # Database (Dexie)
├── docs/                # Documentation
├── scripts/             # Build & dev scripts
├── public/              # Static assets
└── .github/             # GitHub Actions & templates
```

## 🤝 Contributing

Dobrodošli su svi doprinosi! Molim vas pročitajte [CONTRIBUTING.md](./CONTRIBUTING.md) pre slanja PR-a.

### Commit Convention

Koristimo [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(receipts): add export to PDF
fix(qr): resolve scanner crash on Android  
docs: update API documentation
refactor(db): optimize query performance
```

### Development Workflow

1. Fork the repo
2. Create feature branch (`git checkout -b feat/amazing-feature`)
3. Make changes
4. Run tests (`npm test`)
5. Commit (`git commit -m 'feat: add amazing feature'`)
6. Push (`git push origin feat/amazing-feature`)
7. Open Pull Request

## 📊 Performance

- **Lighthouse Score**: 95+
- **Bundle Size**: ~450KB (gzipped)
- **Initial Load**: <2s (3G)
- **TTI**: <3s
- **CLS**: <0.1
- **LCP**: <2.5s
- **FID**: <100ms

## 🔒 Security

- Content Security Policy with nonce
- Trusted Types API
- HTTPS only
- Password strength validation
- Rate limiting
- XSS protection
- CSRF protection

## ♿ Accessibility

- WCAG 2.1 Level AA compliant
- Keyboard navigation
- Screen reader support
- Focus management
- High contrast support
- Reduced motion support

## 📱 Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- iOS Safari 14+
- Android Chrome 90+

## 📄 License

MIT License - see [LICENSE](./LICENSE)

## 🙏 Acknowledgments

- [Tesseract.js](https://tesseract.projectnaptha.com/) - OCR engine
- [ZXing](https://github.com/zxing-js/library) - QR code scanning
- [Supabase](https://supabase.com/) - Backend & auth
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [shadcn/ui](https://ui.shadcn.com/) - Component inspiration

## 📞 Support

- 📧 Email: support@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/fiskalni-racun/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/yourusername/fiskalni-racun/discussions)

---

**Made with ❤️ for better receipt management**
