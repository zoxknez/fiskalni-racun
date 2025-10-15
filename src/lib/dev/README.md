# Developer Tools

Ovaj folder sadrži alate za debugging i development.

## 📁 Fajlovi

### `debugTools.ts`
Inicijalizacija debug alata za development:
- **Eruda**: Mobilni DevTools console
- **Why Did You Render**: Detektuje nepotrebne React re-rendere

```ts
import { initDebugTools } from '@/lib/dev/debugTools'

// In main.tsx (dev mode only)
if (import.meta.env.DEV) {
  initDebugTools()
}
```

### `performance.ts`
Performance monitoring utilities:
- `measureTime()` - Merenje brzine izvršavanja funkcija
- `useRenderCount()` - Brojanje rendovanja komponente
- `useSlowRenderDetection()` - Detekcija sporih rendovanja
- `useWhyDidYouUpdate()` - Logovanje razloga za re-render
- `MemoryMonitor` - Praćenje memorije i detekcija memory leak-ova

```tsx
import { measureTimeAsync, useSlowRenderDetection } from '@/lib/dev/performance'

function MyComponent() {
  useSlowRenderDetection('MyComponent', 16) // Warn if render takes >16ms
  
  const loadData = async () => {
    await measureTimeAsync(
      () => fetch('/api/data'),
      'Data fetch'
    )
  }
  
  return <div>...</div>
}
```

## 🛠️ VS Code Setup

### Extensions (`.vscode/extensions.json`)
Preporučene ekstenzije:
- Biome - Linting i formatting
- Tailwind CSS IntelliSense
- ESLint
- React snippets
- Vitest i Playwright
- GitLens
- Error Lens
- Path IntelliSense

### Settings (`.vscode/settings.json`)
Auto-konfiguracija:
- Biome kao default formatter
- Format on save
- Auto-organize imports
- Tailwind CSS IntelliSense
- TypeScript strict mode

## 📦 Scripts

### Development
```bash
# Regular dev server
npm run dev

# Dev server with plugin inspector
npm run dev:inspect

# Clean cache and temp files
npm run clean
```

### Build & Analysis
```bash
# Production build
npm run build

# Build with bundle analyzer
npm run build:analyze

# Check bundle sizes
npm run bundle:check

# Size limit check
npm run size
```

### Quality
```bash
# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format

# All-in-one check
npm run check
```

### Testing
```bash
# Unit tests (watch mode)
npm run test

# Unit tests (run once)
npm run test:run

# Test coverage
npm run test:coverage

# Test UI
npm run test:ui

# E2E tests
npm run test:e2e
```

## 🔍 Vite Plugins

### `vite-plugin-checker`
Type checking i linting tokom developmenta:
- Real-time TypeScript errors
- Biome linting errors
- Overlay u browseru

### `vite-plugin-inspect`
Debug Vite plugin transformations:
- Pristup: `http://localhost:3000/__inspect/`
- Vidi transformacije za svaki file
- Debug HMR updates

### `vite-plugin-restart`
Auto-restart dev servera na config changes:
- `vite.config.ts`
- `tailwind.config.js`
- `tsconfig.json`
- `biome.json`

## 🎯 Best Practices

1. **Koristi debug alate samo u dev mode-u**
   ```ts
   if (import.meta.env.DEV) {
     // Debug code
   }
   ```

2. **Redovno proveravaj bundle size**
   ```bash
   npm run bundle:check
   ```

3. **Prati performance metriku**
   - Web Vitals se automatski loguju u produkciji
   - Koristi `useSlowRenderDetection` za problematične komponente

4. **Optimizuj re-rendere**
   - Koristi `why-did-you-render` za identifikaciju
   - Memorizuj callback-e sa `useCallback`
   - Memorizuj vrednosti sa `useMemo`

5. **Redovno pokreći testove**
   ```bash
   npm run test:coverage
   ```

