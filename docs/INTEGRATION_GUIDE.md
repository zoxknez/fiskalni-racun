# Vodič za integraciju novih funkcionalnosti

Ovaj vodič pruža step-by-step uputstva za integraciju implementiranih funkcionalnosti u vašu aplikaciju.

---

## 1. Performance Monitoring

### Korak 1: Dodati u `src/main.tsx`

```typescript
import { initPerformanceMonitoring } from '@/lib/monitoring/metrics'

// Postojeći kod za renderovanje
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
)

// ✨ DODATI: Inicijalizuj performance monitoring
if (typeof window !== 'undefined') {
  initPerformanceMonitoring()
}
```

### Korak 2: Koristiti u komponentama (opcionalno)

```typescript
import { startMeasure, trackCustomMetric } from '@/lib/monitoring/metrics'

function AnalyticsPage() {
  useEffect(() => {
    const endMeasure = startMeasure('analytics-page-load')
    
    // Učitaj podatke
    fetchAnalyticsData().then(() => {
      endMeasure({ success: true })
    })
  }, [])
  
  return <div>...</div>
}
```

---

## 2. Push Notifikacije

### Korak 1: Dodati VAPID key u `.env`

```bash
# Generišite VAPID ključeve sa: npx web-push generate-vapid-keys
VITE_VAPID_PUBLIC_KEY=your-public-vapid-key-here
```

### Korak 2: Kreirati Supabase tabelu

```sql
-- Pokrenite u Supabase SQL Editor
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

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own subscriptions"
  ON push_subscriptions FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Korak 3: Dodati UI toggle u Settings

Kreirajte `src/components/settings/PushNotificationToggle.tsx`:

```typescript
import { useState, useEffect } from 'react'
import { subscribeToPush, unsubscribeFromPush, isSubscribed, isPushSupported } from '@/lib/push/push'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

export function PushNotificationToggle() {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const supported = isPushSupported()

  useEffect(() => {
    if (supported) {
      isSubscribed().then(setEnabled)
    }
  }, [supported])

  const handleToggle = async (checked: boolean) => {
    setLoading(true)
    try {
      if (checked) {
        await subscribeToPush()
        toast.success('Push notifikacije omogućene!')
      } else {
        await unsubscribeFromPush()
        toast.success('Push notifikacije onemogućene')
      }
      setEnabled(checked)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Greška')
    } finally {
      setLoading(false)
    }
  }

  if (!supported) {
    return (
      <div className="text-sm text-gray-500">
        Push notifikacije nisu podržane u vašem browseru
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="font-medium">Push notifikacije</h3>
        <p className="text-sm text-gray-500">
          Primajte obaveštenja o novim računima i garancijama
        </p>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={handleToggle}
        disabled={loading}
      />
    </div>
  )
}
```

### Korak 4: Dodati u Settings stranicu

U `src/pages/SettingsPage.tsx`:

```typescript
import { PushNotificationToggle } from '@/components/settings/PushNotificationToggle'

export function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Postojeće sekcije */}
      
      <section className="card">
        <h2 className="section-title">Notifikacije</h2>
        <PushNotificationToggle />
      </section>
    </div>
  )
}
```

---

## 3. WebAuthn / Passkeys

### Korak 1: Kreirati Supabase Edge Functions

Kreirajte folder strukturu:

```
supabase/functions/
├── webauthn-register-options/
│   └── index.ts
├── webauthn-register/
│   └── index.ts
├── webauthn-login-options/
│   └── index.ts
└── webauthn-login/
    └── index.ts
```

### Korak 2: Implementirati Edge Functions

**`supabase/functions/webauthn-register-options/index.ts`:**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const authHeader = req.headers.get('Authorization')!
  const token = authHeader.replace('Bearer ', '')
  
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Generate challenge
  const challenge = crypto.getRandomValues(new Uint8Array(32))
  const challengeBase64 = btoa(String.fromCharCode(...challenge))

  // Store challenge in database temporarily
  await supabase.from('webauthn_challenges').insert({
    user_id: user.id,
    challenge: challengeBase64,
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min
  })

  const options = {
    challenge: Array.from(challenge),
    rp: {
      name: 'Fiskalni Račun',
      id: Deno.env.get('RP_ID') || 'localhost',
    },
    user: {
      id: Array.from(new TextEncoder().encode(user.id)),
      name: user.email,
      displayName: user.email,
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },
      { alg: -257, type: 'public-key' },
    ],
    timeout: 60000,
    attestation: 'none',
    authenticatorSelection: {
      userVerification: 'preferred',
      requireResidentKey: false,
    },
  }

  return new Response(JSON.stringify(options), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

### Korak 3: Deployati Edge Functions

```bash
# Login
supabase login

# Link projekat
supabase link --project-ref your-project-ref

# Deploy funkcije
supabase functions deploy webauthn-register-options
supabase functions deploy webauthn-register
supabase functions deploy webauthn-login-options
supabase functions deploy webauthn-login
```

### Korak 4: Kreirati UI komponentu

`src/components/settings/PasskeyManager.tsx`:

```typescript
import { useState, useEffect } from 'react'
import { registerPasskey, listPasskeys, removePasskey, isPlatformAuthenticatorAvailable } from '@/lib/auth/webauthn'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function PasskeyManager() {
  const [passkeys, setPasskeys] = useState([])
  const [available, setAvailable] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    isPlatformAuthenticatorAvailable().then(setAvailable)
    loadPasskeys()
  }, [])

  const loadPasskeys = async () => {
    try {
      const keys = await listPasskeys()
      setPasskeys(keys)
    } catch (error) {
      console.error('Failed to load passkeys:', error)
    }
  }

  const handleRegister = async () => {
    setLoading(true)
    try {
      await registerPasskey()
      toast.success('Passkey uspješno registrovan!')
      await loadPasskeys()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Greška')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (id: string) => {
    try {
      await removePasskey(id)
      toast.success('Passkey uklonjen')
      await loadPasskeys()
    } catch (error) {
      toast.error('Greška prilikom uklanjanja')
    }
  }

  if (!available) {
    return (
      <div className="text-sm text-gray-500">
        Passkeys nisu podržani na ovom uređaju
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Passkeys</h3>
          <p className="text-sm text-gray-500">
            Prijavite se bez lozinke koristeći biometriju ili sigurnosni ključ
          </p>
        </div>
        <Button onClick={handleRegister} disabled={loading}>
          Dodaj passkey
        </Button>
      </div>

      {passkeys.length > 0 && (
        <ul className="space-y-2">
          {passkeys.map((key) => (
            <li key={key.id} className="flex items-center justify-between p-3 border rounded">
              <div>
                <div className="font-medium">{key.name || 'Passkey'}</div>
                <div className="text-sm text-gray-500">
                  Kreiran: {new Date(key.created_at).toLocaleDateString()}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleRemove(key.id)}>
                Ukloni
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

---

## 4. A/B Testing

### Korak 1: Kreirati feature flag u PostHog

1. Idite na PostHog Dashboard
2. Feature Flags → New Feature Flag
3. Podesite ime (npr. `new-dashboard-layout`)
4. Dodajte varijante ili rollout procenat

### Korak 2: Koristiti u komponentama

```typescript
import { useExperiment } from '@/hooks/useExperiment'

function Dashboard() {
  const showNewLayout = useExperiment('new-dashboard-layout', [true, false], false)

  return showNewLayout ? <NewDashboardLayout /> : <OldDashboardLayout />
}
```

### Multi-variant primer:

```typescript
import { useMultiVariantExperiment } from '@/hooks/useExperiment'

function HomePage() {
  const { variant, variantKey, isLoading } = useMultiVariantExperiment(
    'homepage-hero',
    {
      control: { title: 'Dobrodošli', color: 'blue' },
      variant_a: { title: 'Započnite danas', color: 'green' },
      variant_b: { title: 'Pridružite se', color: 'purple' },
    },
    'control'
  )

  if (isLoading) return <Skeleton />

  return (
    <Hero 
      title={variant.title}
      color={variant.color}
      variant={variantKey}
    />
  )
}
```

### Sa praćenjem konverzije:

```typescript
import { useExperimentWithConversion } from '@/hooks/useExperiment'

function PricingPage() {
  const { variation: ctaText, trackConversion } = useExperimentWithConversion(
    'pricing-cta-test',
    ['Kupi odmah', 'Započni besplatno', 'Probaj 14 dana'],
    'Kupi odmah'
  )

  const handleCTAClick = () => {
    trackConversion('pricing_cta_clicked', { 
      cta_text: ctaText,
      plan: 'premium' 
    })
    // Navigate to checkout
  }

  return <Button onClick={handleCTAClick}>{ctaText}</Button>
}
```

---

## 5. OpenAPI Generisanje

### Korak 1: Generisati specifikaciju

```bash
npm run generate:openapi
```

Output: `docs/openapi.json`

### Korak 2: Pregledati sa Swagger UI

```bash
# Instalirati swagger-ui-watcher
npm install -g swagger-ui-watcher

# Otvoriti UI
swagger-ui-watcher docs/openapi.json
```

### Korak 3: Generisati TypeScript tipove (opcionalno)

```bash
npx openapi-typescript docs/openapi.json -o src/types/api.ts
```

### Korak 4: Koristiti generirane tipove

```typescript
import type { paths } from '@/types/api'

type Receipt = paths['/receipts']['get']['responses']['200']['content']['application/json']['data'][0]

async function fetchReceipts(): Promise<Receipt[]> {
  // Type-safe API call
}
```

---

## 6. E2E Testiranje

### Korak 1: Instalirati Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

### Korak 2: Kreirati Playwright config (ako ne postoji)

`playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './src/__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

### Korak 3: Pokrenuti testove

```bash
# Svi testovi
npx playwright test

# Sa UI
npx playwright test --ui

# Specific browser
npx playwright test --project=chromium

# Debug mode
npx playwright test --debug
```

---

## 7. Provjera implementacije

### Checklist

- [ ] Performance monitoring inicijalizovan u `main.tsx`
- [ ] Push notifikacije konfigurisane (VAPID key, tabela)
- [ ] Push notification toggle dodat u Settings
- [ ] WebAuthn Edge Functions deployane
- [ ] Passkey manager dodat u Settings
- [ ] PostHog feature flags konfigurisani
- [ ] A/B testovi implementirani u komponentama
- [ ] OpenAPI specifikacija generisana
- [ ] E2E testovi prođu uspješno

### Testiranje

```bash
# Linter
npm run lint

# Type check
npm run type-check

# Unit testovi
npm run test

# E2E testovi
npm run test:e2e

# Build
npm run build
```

---

## 🎯 Troubleshooting

### Push notifikacije ne rade

1. Provjerite da li je `VITE_VAPID_PUBLIC_KEY` dodat
2. Provjerite da li je `push_subscriptions` tabela kreirana
3. Provjerite HTTPS (push ne radi na HTTP)
4. Provjerite browser permissions

### WebAuthn ne radi

1. Provjerite da li su Edge Functions deployane
2. Provjerite HTTPS (WebAuthn ne radi na HTTP osim localhost)
3. Provjerite `RP_ID` environment variable
4. Provjerite browser compatibility

### Performance metrics se ne šalju

1. Provjerite PostHog konfiguraciju
2. Provjerite da je `initPerformanceMonitoring()` pozvan
3. Provjerite Network tab u DevTools

---

Sretno sa integracijom! 🚀

