# 🔧 Konkretni Primeri Refaktorisanja

## 1. API Auth Refactoring

### Trenutno stanje (`api/auth.ts`)

```typescript
// ❌ PROBLEM: Monolitni handler sa 350+ linija
export default async function handler(req: Request) {
  const url = new URL(req.url)
  const path = url.pathname.replace('/api/auth/', '')
  
  if (req.method === 'POST' && path === 'register') {
    // 50+ linija koda...
  }
  
  if (req.method === 'POST' && path === 'login') {
    // 40+ linija koda...
  }
  
  // ... još 8 handlera
}
```

### Preporučeno rešenje

```typescript
// ✅ api/auth/handlers/register.ts
import { z } from 'zod'
import { sql } from '../../db'
import { hashPassword, generateSessionToken, hashToken } from '../utils/password'
import { createSession } from '../utils/sessions'
import { validateEmail, validatePassword } from '../utils/validation'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100),
  fullName: z.string().max(200).optional(),
})

export async function handleRegister(req: Request): Promise<Response> {
  try {
    const body = await req.json()
    const data = registerSchema.parse(body)
    
    // Validation
    validateEmail(data.email)
    validatePassword(data.password)
    
    const normalizedEmail = data.email.trim().toLowerCase()
    
    // Check if user exists
    const existingUsers = await sql`SELECT id FROM users WHERE email = ${normalizedEmail}`
    if (existingUsers.length > 0) {
      return new Response(
        JSON.stringify({ error: 'User already exists', code: 'USER_EXISTS' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Create user
    const passwordHash = await hashPassword(data.password)
    const result = await sql`
      INSERT INTO users (email, password_hash, full_name)
      VALUES (${normalizedEmail}, ${passwordHash}, ${data.fullName || null})
      RETURNING id, email, full_name, avatar_url, email_verified, created_at, updated_at, last_login_at, is_active
    `
    const user = result[0]
    
    // Create session
    const token = generateSessionToken()
    await createSession(user.id, token)
    
    return new Response(
      JSON.stringify({ success: true, user, token }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: error.errors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    console.error('Register error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
```

```typescript
// ✅ api/auth/index.ts
import { handleRegister } from './handlers/register'
import { handleLogin } from './handlers/login'
import { handleLogout } from './handlers/logout'
import { handleMe } from './handlers/me'
import { handleProfileUpdate } from './handlers/profile'
import { handlePasswordReset } from './handlers/password-reset'
import { handleChangePassword } from './handlers/change-password'
import { handleDeleteAccount } from './handlers/delete-account'

export const config = {
  runtime: 'edge',
}

const routes = {
  'POST:/register': handleRegister,
  'POST:/login': handleLogin,
  'POST:/logout': handleLogout,
  'GET:/me': handleMe,
  'PATCH:/profile': handleProfileUpdate,
  'POST:/request-password-reset': handlePasswordReset,
  'POST:/reset-password': handlePasswordReset,
  'POST:/change-password': handleChangePassword,
  'POST:/delete-account': handleDeleteAccount,
} as const

export default async function handler(req: Request) {
  const url = new URL(req.url)
  const path = url.pathname.replace('/api/auth/', '')
  const method = req.method
  const routeKey = `${method}:${path}` as keyof typeof routes
  
  const handler = routes[routeKey]
  if (!handler) {
    return new Response('Not Found', { status: 404 })
  }
  
  return handler(req)
}
```

---

## 2. Hardcoded Text Refactoring

### Trenutno stanje (`AuthPage.tsx`)

```typescript
// ❌ PROBLEM: Hardcoded tekst na srpskom
if (password.length < 6) {
  toast.error('Lozinka mora imati najmanje 6 karaktera')
  return
}
```

### Preporučeno rešenje

```typescript
// ✅ AuthPage.tsx
import { useTranslation } from 'react-i18next'

function AuthPage() {
  const { t } = useTranslation()
  
  // ...
  
  if (password.length < 6) {
    toast.error(t('auth.passwordMinLength', { min: 6 }))
    return
  }
}
```

```typescript
// ✅ src/i18n/translations.ts
export const translations = {
  sr: {
    auth: {
      passwordMinLength: 'Lozinka mora imati najmanje {{min}} karaktera',
      // ...
    }
  },
  en: {
    auth: {
      passwordMinLength: 'Password must be at least {{min}} characters',
      // ...
    }
  }
}
```

---

## 3. EditReceiptPage Validation Refactoring

### Trenutno stanje (`EditReceiptPage.tsx`)

```typescript
// ❌ PROBLEM: Hardcoded validation messages
const editReceiptSchema = z.object({
  merchantName: z.string().min(1, 'Naziv prodavnice je obavezan').max(200),
  totalAmount: z.number().positive('Iznos mora biti pozitivan'),
  // ...
})
```

### Preporučeno rešenje

```typescript
// ✅ EditReceiptPage.tsx
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

function EditReceiptPage() {
  const { t } = useTranslation()
  
  // Create schema with i18n messages
  const editReceiptSchema = z.object({
    merchantName: z.string()
      .min(1, t('validation.merchantNameRequired'))
      .max(200, t('validation.merchantNameMaxLength')),
    totalAmount: z.number()
      .positive(t('validation.amountPositive')),
    date: z.date({
      required_error: t('validation.dateRequired'),
    }),
    category: z.string().optional(),
    notes: z.string().max(500, t('validation.notesMaxLength')).optional(),
  })
  
  // ...
}
```

```typescript
// ✅ src/i18n/translations.ts
export const translations = {
  sr: {
    validation: {
      merchantNameRequired: 'Naziv prodavnice je obavezan',
      merchantNameMaxLength: 'Naziv prodavnice ne može biti duži od 200 karaktera',
      amountPositive: 'Iznos mora biti pozitivan',
      dateRequired: 'Datum je obavezan',
      notesMaxLength: 'Napomene ne mogu biti duže od 500 karaktera',
    }
  },
  en: {
    validation: {
      merchantNameRequired: 'Merchant name is required',
      merchantNameMaxLength: 'Merchant name cannot exceed 200 characters',
      amountPositive: 'Amount must be positive',
      dateRequired: 'Date is required',
      notesMaxLength: 'Notes cannot exceed 500 characters',
    }
  }
}
```

---

## 4. AddReceiptPageSimplified Refactoring

### Trenutno stanje

```typescript
// ❌ PROBLEM: 1100+ linija u jednom fajlu
function AddReceiptPageSimplified() {
  // Fiscal form state
  const [merchantName, setMerchantName] = useState('')
  const [date, setDate] = useState('')
  // ... 20+ state variables
  
  // Household form state
  const [householdBillType, setHouseholdBillType] = useState('')
  // ... 15+ state variables
  
  // 500+ linija JSX-a
}
```

### Preporučeno rešenje

```typescript
// ✅ pages/AddReceiptPage/components/FiscalReceiptForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'

const fiscalReceiptSchema = z.object({
  merchantName: z.string().min(1),
  date: z.date(),
  amount: z.number().positive(),
  notes: z.string().optional(),
  imageUrl: z.string().optional(),
  qrLink: z.string().optional(),
})

type FiscalReceiptFormData = z.infer<typeof fiscalReceiptSchema>

interface FiscalReceiptFormProps {
  onSubmit: (data: FiscalReceiptFormData) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export function FiscalReceiptForm({ onSubmit, onCancel, loading }: FiscalReceiptFormProps) {
  const { t } = useTranslation()
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FiscalReceiptFormData>({
    resolver: zodResolver(fiscalReceiptSchema),
  })
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
      {/* Form fields */}
    </form>
  )
}
```

```typescript
// ✅ pages/AddReceiptPage/components/HouseholdBillForm.tsx
// Slična struktura kao FiscalReceiptForm
```

```typescript
// ✅ pages/AddReceiptPage/index.tsx
import { useState } from 'react'
import { FiscalReceiptForm } from './components/FiscalReceiptForm'
import { HouseholdBillForm } from './components/HouseholdBillForm'
import { TypeSelector } from './components/TypeSelector'

function AddReceiptPage() {
  const [type, setType] = useState<'fiscal' | 'household' | null>(null)
  
  if (!type) {
    return <TypeSelector onSelect={setType} />
  }
  
  if (type === 'fiscal') {
    return (
      <FiscalReceiptForm
        onSubmit={handleFiscalSubmit}
        onCancel={() => setType(null)}
        loading={loading}
      />
    )
  }
  
  return (
    <HouseholdBillForm
      onSubmit={handleHouseholdSubmit}
      onCancel={() => setType(null)}
      loading={loading}
    />
  )
}
```

---

## 5. API Sync Refactoring

### Trenutno stanje (`api/sync.ts`)

```typescript
// ❌ PROBLEM: Duplikacija koda u handleCreate i handleUpdate
async function handleCreate(table: string, userId: string, id: string, data: Record<string, unknown>) {
  if (table === 'receipts') {
    await sql`INSERT INTO receipts (...) VALUES (...)`
  } else if (table === 'devices') {
    await sql`INSERT INTO devices (...) VALUES (...)`
  }
  // ... 6 više if-ova
}

async function handleUpdate(table: string, userId: string, id: string, data: Record<string, unknown>) {
  if (table === 'receipts') {
    await sql`UPDATE receipts SET ... WHERE ...`
  }
  // ... duplikacija
}
```

### Preporučeno rešenje

```typescript
// ✅ api/sync/builders/receiptBuilder.ts
import { z } from 'zod'
import { sql } from '../../db'

const receiptSchema = z.object({
  id: z.string(),
  merchantName: z.string(),
  pib: z.string().optional(),
  date: z.string(),
  totalAmount: z.number(),
  // ... ostala polja
})

export const receiptBuilder = {
  schema: receiptSchema,
  
  create: async (userId: string, data: z.infer<typeof receiptSchema>) => {
    const validated = receiptSchema.parse(data)
    await sql`
      INSERT INTO receipts (
        id, user_id, merchant_name, pib, date, total_amount, ...
      ) VALUES (
        ${validated.id}, ${userId}, ${validated.merchantName}, ...
      )
      ON CONFLICT (id) DO UPDATE SET ...
    `
  },
  
  update: async (userId: string, id: string, data: Partial<z.infer<typeof receiptSchema>>) => {
    const validated = receiptSchema.partial().parse(data)
    await sql`
      UPDATE receipts SET
        merchant_name = COALESCE(${validated.merchantName}, merchant_name),
        ...
      WHERE id = ${id} AND user_id = ${userId}
    `
  },
  
  delete: async (userId: string, id: string) => {
    await sql`
      UPDATE receipts SET is_deleted = TRUE, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
    `
  },
}
```

```typescript
// ✅ api/sync/index.ts
import { receiptBuilder } from './builders/receiptBuilder'
import { deviceBuilder } from './builders/deviceBuilder'
// ... ostali builders

const builders = {
  receipt: receiptBuilder,
  device: deviceBuilder,
  // ...
} as const

export default async function handler(req: Request) {
  const userId = await verifyToken(req)
  if (!userId) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  const { entityType, entityId, operation, data } = await req.json()
  
  const builder = builders[entityType]
  if (!builder) {
    return new Response('Invalid entity type', { status: 400 })
  }
  
  try {
    switch (operation) {
      case 'create':
        await builder.create(userId, data)
        break
      case 'update':
        await builder.update(userId, entityId, data)
        break
      case 'delete':
        await builder.delete(userId, entityId)
        break
      default:
        return new Response('Invalid operation', { status: 400 })
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: error.errors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
```

---

## 6. Error Handling Refactoring

### Trenutno stanje

```typescript
// ❌ PROBLEM: Nekonzistentan error handling
try {
  await someOperation()
} catch (error) {
  logger.error('Error:', error)
  toast.error(t('common.error'))
}
```

### Preporučeno rešenje

```typescript
// ✅ lib/errors/index.ts
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 400, details)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404)
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super('UNAUTHORIZED', 'Unauthorized', 401)
  }
}
```

```typescript
// ✅ lib/errors/handler.ts
import { logger } from '@/lib/logger'
import { AppError } from './index'

export function handleError(error: unknown): Response {
  if (error instanceof AppError) {
    logger.warn('App error:', { code: error.code, message: error.message })
    return new Response(
      JSON.stringify({
        error: error.message,
        code: error.code,
        details: error.details,
      }),
      {
        status: error.statusCode,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
  
  logger.error('Unexpected error:', error)
  return new Response(
    JSON.stringify({
      error: 'Internal Server Error',
      code: 'INTERNAL_ERROR',
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}
```

```typescript
// ✅ Usage u API handlers
import { handleError } from '@/lib/errors/handler'
import { ValidationError, NotFoundError } from '@/lib/errors'

export async function handleGetReceipt(req: Request) {
  try {
    const { id } = await req.json()
    
    if (!id) {
      throw new ValidationError('Receipt ID is required')
    }
    
    const receipt = await getReceipt(id)
    if (!receipt) {
      throw new NotFoundError('Receipt')
    }
    
    return new Response(JSON.stringify({ receipt }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return handleError(error)
  }
}
```

---

## 7. Rate Limiting Implementation

### Preporučeno rešenje

```typescript
// ✅ api/middleware/rateLimit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const authRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 requests per 15 minutes
  analytics: true,
  prefix: '@upstash/ratelimit/auth',
})

export async function rateLimit(req: Request, identifier: string) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  const { success, limit, remaining, reset } = await authRateLimit.limit(`${identifier}:${ip}`)
  
  if (!success) {
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.round((reset - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          },
        }
      ),
    }
  }
  
  return { allowed: true }
}
```

```typescript
// ✅ Usage u auth handlers
import { rateLimit } from '../middleware/rateLimit'

export async function handleLogin(req: Request) {
  const { email } = await req.json()
  const limitResult = await rateLimit(req, `login:${email}`)
  
  if (!limitResult.allowed) {
    return limitResult.response
  }
  
  // ... rest of login logic
}
```

---

*Ovi primeri pokazuju kako refaktorisati kritične delove aplikacije za bolju održivost, bezbednost i performanse.*

