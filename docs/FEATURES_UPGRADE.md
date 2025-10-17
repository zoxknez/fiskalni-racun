# Unapređenja aplikacije - Implementaciona dokumentacija

Ovaj dokument opisuje nova unapređenja implementirana u aplikaciji Fiskalni Račun.

## 📋 Pregled implementiranih funkcionalnosti

### 1. WebAuthn / Passkeys podrška 🔐

**Fajl:** `src/lib/auth/webauthn.ts`

Omogućava korisnicima da se prijavljuju bez lozinke koristeći biometriju (Face ID, Touch ID, Windows Hello) ili sigurnosne ključeve.

**Ključne funkcije:**
- `registerPasskey()` - Registracija novog passkey-a
- `loginWithPasskey()` - Prijava pomoću passkey-a
- `listPasskeys()` - Pregled svih registrovanih passkey-eva
- `removePasskey(id)` - Uklanjanje passkey-a

**Primjer upotrebe:**
```typescript
import { registerPasskey, loginWithPasskey } from '@/lib/auth/webauthn'

// Registracija
try {
  await registerPasskey()
  console.log('Passkey uspešno registrovan!')
} catch (error) {
  console.error('Greška:', error.message)
}

// Prijava
try {
  const { user, session } = await loginWithPasskey()
  console.log('Uspešna prijava:', user)
} catch (error) {
  console.error('Greška:', error.message)
}
```

**Potrebna backend konfiguracija:**
Potrebno je kreirati Supabase Edge Functions:
- `webauthn-register-options` - Generiše opcije za registraciju
- `webauthn-register` - Čuva kredencijale
- `webauthn-login-options` - Generiše opcije za prijavu
- `webauthn-login` - Validira prijavu

---

### 2. Push notifikacije 🔔

**Fajl:** `src/lib/push/push.ts`

Implementira web push notifikacije za obaveštenja o novim računima, garancijama koje ističu, itd.

**Ključne funkcije:**
- `subscribeToPush()` - Pretplata na notifikacije
- `unsubscribeFromPush()` - Otkazivanje pretplate
- `isSubscribed()` - Provera statusa pretplate
- `sendTestNotification()` - Slanje test notifikacije

**Primjer upotrebe:**
```typescript
import { subscribeToPush, sendTestNotification } from '@/lib/push/push'

// Pretplata
try {
  const subscription = await subscribeToPush()
  console.log('Pretplaćeni ste na notifikacije!')
  
  // Slanje test notifikacije
  await sendTestNotification()
} catch (error) {
  console.error('Greška:', error.message)
}
```

**Konfiguracija:**
1. Dodati `VITE_VAPID_PUBLIC_KEY` u `.env`
2. Kreirati `push_subscriptions` tabelu u Supabase-u:
```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Service Worker:**
Push notifikacije su integrisane u `public/sw-custom.js` i automatski rukuju prikazivanjem notifikacija.

---

### 3. Real-time performance monitoring 📊

**Fajl:** `src/lib/monitoring/metrics.ts`

Prati Core Web Vitals i custom metrike, šalje ih u PostHog za analizu.

**Ključne funkcije:**
- `initWebVitals()` - Inicijalizuje praćenje Web Vitals
- `initPerformanceMonitoring()` - Inicijalizuje sve metrike
- `trackCustomMetric(name, value, metadata)` - Prati custom metriku
- `startMeasure(operation)` - Meri trajanje operacije

**Primjer upotrebe:**
```typescript
import { initPerformanceMonitoring, startMeasure } from '@/lib/monitoring/metrics'

// U main.tsx
initPerformanceMonitoring()

// Merenje operacije
const endMeasure = startMeasure('data-fetch')
await fetchData()
const duration = endMeasure({ success: true })
console.log(`Operacija trajala: ${duration}ms`)
```

**Integrisane metrike:**
- **LCP** (Largest Contentful Paint) - < 2.5s
- **INP** (Interaction to Next Paint) - < 200ms
- **CLS** (Cumulative Layout Shift) - < 0.1
- **FID** (First Input Delay) - < 100ms
- **FCP** (First Contentful Paint) - < 1.8s
- **TTFB** (Time to First Byte) - < 800ms

**PostHog integracija:**
Sve metrike se automatski šalju u PostHog sa oznakama "good", "needs-improvement", ili "poor". Možete podesiti alertove za loše metrike.

---

### 4. A/B testiranje i feature flags 🧪

**Fajl:** `src/hooks/useExperiment.ts`

Omogućava A/B testiranje i postupno uvođenje novih funkcionalnosti.

**Ključni hook-ovi:**
- `useExperiment(key, variations, default)` - Jednostavni eksperiment
- `useMultiVariantExperiment(key, variants, default)` - Multi-variant eksperiment sa praćenjem
- `useFeatureRollout(key, default)` - Postupno uvođenje funkcionalnosti
- `useExperimentWithConversion(key, variations, default)` - Eksperiment sa praćenjem konverzije

**Primjer upotrebe:**

```typescript
import { useExperiment, useExperimentWithConversion } from '@/hooks/useExperiment'

// Jednostavni boolean test
function Dashboard() {
  const showNewDashboard = useExperiment('new-dashboard-test', [true, false], false)
  
  return showNewDashboard ? <NewDashboard /> : <OldDashboard />
}

// Multi-variant test
function PricingPage() {
  const { variant, variantKey } = useMultiVariantExperiment(
    'pricing-layout',
    {
      control: { layout: 'vertical', highlight: false },
      variant_a: { layout: 'horizontal', highlight: true },
      variant_b: { layout: 'grid', highlight: true },
    },
    'control'
  )
  
  return <PricingTable layout={variant.layout} highlight={variant.highlight} />
}

// Sa praćenjem konverzije
function CTAButton() {
  const { variation: buttonText, trackConversion } = useExperimentWithConversion(
    'cta-text-test',
    ['Kupi odmah', 'Započni besplatno', 'Probaj sada'],
    'Kupi odmah'
  )
  
  const handleClick = () => {
    trackConversion('cta_clicked', { button_text: buttonText })
    // ... ostali kod
  }
  
  return <button onClick={handleClick}>{buttonText}</button>
}
```

**PostHog konfiguracija:**
1. Kreirajte feature flag u PostHog dashboard-u
2. Podesite varijante i targetiranje
3. Hook će automatski dobiti dodeljenu varijantu

---

### 5. Dinamički importi za OCR 📦

**Fajl:** `lib/ocr.ts`

Tesseract.js (~2MB) se sada učitava dinamički samo kada je potreban, što smanjuje početni bundle.

**Izmene:**
- Tesseract.js se importuje dinamički pomoću `import('tesseract.js')`
- Prvi poziv `runOCR()` učitava biblioteku
- Naredni pozivi koriste keširan modul

**Ušteda:**
- **Početni bundle:** ~2MB manji
- **Vreme učitavanja:** Brže za korisnike koji ne skeniraju račune
- **Performanse:** Nema uticaja na OCR performanse

---

### 6. Poboljšana pristupačnost ♿

**Fajlovi:** `src/index.css`, `tailwind.config.js`

**Implementirane izmene:**

#### Focus-visible stilovi
```css
:focus-visible {
  outline: 2px solid rgb(var(--color-primary));
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

:focus:not(:focus-visible) {
  outline: none;
}
```

Pokazuje outline samo pri navigaciji tastaturom, ne i pri kliku.

#### Reduced motion preference
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Poštuje korisničke postavke za smanjeno kretanje.

#### Tailwind varijante
```javascript
variants: {
  extend: {
    animation: ['motion-safe', 'motion-reduce'],
    transition: ['motion-safe', 'motion-reduce'],
  },
}
```

Omogućava conditions animacije kao `motion-safe:animate-fade-in`.

---

### 7. OpenAPI specifikacija 📜

**Fajl:** `scripts/generate-openapi.ts`

Generiše OpenAPI 3.0 specifikaciju za API dokumentaciju i generisanje SDK-ova.

**Pokretanje:**
```bash
npm run generate:openapi
# ili
tsx scripts/generate-openapi.ts
```

**Output:** `docs/openapi.json`

**Sledeći koraci:**
```bash
# Pregled u Swagger UI
npx swagger-ui-watcher docs/openapi.json

# Generisanje TypeScript tipova
npx openapi-typescript docs/openapi.json -o src/types/api.ts

# Validacija
npx swagger-cli validate docs/openapi.json
```

**Sadržaj:**
- Endpoints za receipts, devices, bills, analytics
- Šeme za request/response
- Authentication (Bearer JWT)
- Error responses

---

### 8. E2E testovi 🧪

**Fajlovi:**
- `src/__tests__/e2e/offline.spec.ts` - Offline funkcionalnost
- `src/__tests__/e2e/api-errors.spec.ts` - Rukovanje greškama

**Pokriveni scenariji:**

#### Offline testovi:
- Učitavanje aplikacije u offline modu
- Kreiranje računa offline
- Sinhronizacija kada se vrati online
- Prikazivanje offline indikatora
- Keširanje slika
- Queue-ovanje mutacija

#### API error testovi:
- Network timeout
- 401 Unauthorized (redirect na login)
- 403 Forbidden
- 404 Not Found
- 500 Server Error
- Retry mehanizam
- Malformed JSON
- Rate limiting (429)
- CORS greške
- Form validacija

**Pokretanje testova:**
```bash
# Instalacija Playwright (prvi put)
npx playwright install

# Pokretanje E2E testova
npx playwright test

# Sa UI
npx playwright test --ui

# Specifičan test
npx playwright test offline.spec.ts
```

---

## 🚀 Integracija u aplikaciju

### main.tsx

Dodajte u `src/main.tsx`:

```typescript
import { initPerformanceMonitoring } from '@/lib/monitoring/metrics'

// Nakon renderovanja aplikacije
initPerformanceMonitoring()
```

### Settings stranica

Dodajte opcije u `SettingsPage.tsx`:

```typescript
import { subscribeToPush, unsubscribeFromPush } from '@/lib/push/push'
import { registerPasskey, listPasskeys } from '@/lib/auth/webauthn'

// U komponenti
const [pushEnabled, setPushEnabled] = useState(false)

const handlePushToggle = async (enabled: boolean) => {
  if (enabled) {
    await subscribeToPush()
  } else {
    await unsubscribeFromPush()
  }
  setPushEnabled(enabled)
}

const handleRegisterPasskey = async () => {
  try {
    await registerPasskey()
    toast.success('Passkey uspešno registrovan!')
  } catch (error) {
    toast.error(error.message)
  }
}
```

---

## 📊 Monitoring i Analytics

### PostHog Events

Nova unapređenja šalju sledeće custom evente:

- `web_vital` - Web Vitals metrike
- `performance_alert` - Upozorenja za loše performanse
- `custom_metric` - Custom metrike
- `long_task` - Long tasks (>50ms)
- `navigation_timing` - Navigation performance
- `resource_timing` - Resource loading
- `$experiment_exposure` - Izloženost eksperimentu

### Alertovi

Podesite alertove u PostHog-u:
- LCP > 4s
- INP > 500ms
- CLS > 0.25
- Long tasks > 100ms

---

## 🔒 Sigurnost

### WebAuthn
- Kredencijali se čuvaju na serveru sa hash-ovanim public key-em
- Challenge se generiše na serveru i validira
- Timeout: 60 sekundi

### Push Notifications
- VAPID ključevi se čuvaju sigurno
- Subscriptions su vezane za user_id
- Endpoint validacija na serveru

---

## 📱 Progressive Web App

Sva unapređenja podržavaju PWA funkcionalnosti:
- Service Worker keširanje
- Offline mode
- Background sync
- Push notifications
- Install prompt

---

## 🐛 Debugging

### Development mode

Svi moduli loguju dodatne informacije u development modu:

```typescript
if (import.meta.env.DEV) {
  console.log('🔐 [WebAuthn] ...')
  console.log('🔔 [Push] ...')
  console.log('📊 [Metrics] ...')
}
```

### Chrome DevTools

- **Application > Service Workers** - Provera SW statusa
- **Application > Storage** - Provera subscriptions
- **Network > Throttling** - Testiranje offline
- **Lighthouse** - Provera Web Vitals
- **Performance** - Profiling

---

## 📚 Dodatni resursi

- [WebAuthn Guide](https://webauthn.guide/)
- [Web Vitals](https://web.dev/vitals/)
- [Push Notifications](https://web.dev/push-notifications/)
- [PostHog Docs](https://posthog.com/docs)
- [Playwright Docs](https://playwright.dev/)

---

## ✅ Checklist za produkciju

- [ ] Dodati VAPID ključeve u environment variables
- [ ] Kreirati Supabase Edge Functions za WebAuthn
- [ ] Kreirati `push_subscriptions` tabelu
- [ ] Podesiti PostHog alertove za performance
- [ ] Testirati na različitim browser-ima
- [ ] Testirati offline funkcionalnost
- [ ] Provjeriti GDPR compliance za push notifikacije
- [ ] Dodati user consent za push i analytics
- [ ] Dokumentovati backend API endpoints
- [ ] Pokrenuti E2E testove u CI/CD

---

*Dokumentaciju ažurirao: AI Agent*  
*Datum: 16. Oktobar 2025.*

