import type { Session, User } from '@supabase/supabase-js'
import { authLogger } from '../logger'
import { supabase } from '../supabase'
import { passwordSchema } from '../validation/passwordSchema'

/**
 * AuthUser – minimalni oblik koji app koristi.
 */
export interface AuthUser {
  id: string
  email: string
  fullName?: string
  avatarUrl?: string
}

/* =========================
   URL / Redirect helpers
   ========================= */

/**
 * Bezbedno čitanje env varijable (radi i u browseru).
 */
function readEnv(key: string): string | undefined {
  if (typeof process === 'undefined' || typeof process.env === 'undefined') {
    return undefined
  }
  return process.env[key]
}

function readRecordValue(record: Record<string, unknown> | undefined, key: string): unknown {
  if (!record) return undefined
  return record[key]
}

/**
 * Vraća bazni origin za SSR/CSR.
 * Redosled:
 * 1) window.origin (CSR)
 * 2) NEXT_PUBLIC_SITE_URL (npr. https://app.tvoj-domen.com)
 * 3) VERCEL_URL (doda https://)
 * 4) http://localhost:3000
 */
function getOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  const siteUrl = readEnv('NEXT_PUBLIC_SITE_URL')
  const vercelUrl = readEnv('VERCEL_URL')
  const envUrl = siteUrl || (vercelUrl ? `https://${vercelUrl}` : '')

  return envUrl || 'http://localhost:3000'
}

function buildRedirect(path: string): string {
  const base = getOrigin().replace(/\/+$/, '')
  const clean = path.startsWith('/') ? path : `/${path}`
  return `${base}${clean}`
}

const CALLBACK_URL = buildRedirect('/auth/callback')
const RESET_URL = buildRedirect('/auth/reset-password')

/* =========================
   Error / utils
   ========================= */

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function asError(e: unknown): Error {
  if (e instanceof Error) return e
  if (e && typeof e === 'object' && 'message' in e) {
    const message = (e as { message?: unknown }).message
    return new Error(typeof message === 'string' ? message : String(message))
  }
  return new Error(String(e))
}

/* =========================
   Public API
   ========================= */

/**
 * Sign up (email & password)
 * - Validacija jačine lozinke
 * - Stabilan redirect (SSR/CSR)
 */
export async function signUp(email: string, password: string) {
  authLogger.debug('Sign up – redirect =>', CALLBACK_URL)

  try {
    passwordSchema.parse(password)
  } catch (err) {
    const e = asError(err)
    throw new Error(`Validacija šifre neuspešna: ${e.message}`)
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizeEmail(email),
    password,
    options: {
      emailRedirectTo: CALLBACK_URL,
      data: {
        // korisno za profile triger-e u bazi (možeš dopuniti)
        registered_via: 'password',
      },
    },
  })

  if (error) throw asError(error)
  return data
}

/**
 * Sign in (email & password)
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  })

  if (error) throw asError(error)
  return data
}

/**
 * Demo login
 * - Pokuša login; ako nema usera, kreira pa auto-login.
 * - Robusnije grananje poruka.
 */
export async function signInDemo() {
  const DEMO_EMAIL = 'demo@example.com'
  const DEMO_PASSWORD = 'DemoPassword123!'

  authLogger.debug('Demo login pokušaj...')

  // 1) Pokušaj da se uloguje
  {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    })
    if (!error && data?.user) {
      authLogger.debug('Demo user uspešno ulogovan')
      return data
    }
  }

  // 2) Ako ne postoji, kreiraj
  authLogger.debug('Demo user ne postoji – kreiram...')
  const { error: signUpError } = await supabase.auth.signUp({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    options: {
      emailRedirectTo: CALLBACK_URL,
      data: { full_name: 'Demo User', registered_via: 'demo' },
    },
  })

  // Ako signup vrati grešku koja NIJE “already registered”, prekini
  if (signUpError && !/registered|exists|User already/i.test(signUpError.message)) {
    authLogger.error('Kreiranje demo user-a neuspešno:', signUpError)
    throw asError(signUpError)
  }

  // 3) Auto-login
  const { data: autoLoginData, error: autoLoginError } = await supabase.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  })

  if (autoLoginError) {
    authLogger.error('Auto-login demo user-a neuspešan:', autoLoginError)
    throw asError(autoLoginError)
  }

  authLogger.debug('Demo user kreiran/ulogovan uspešno')
  return autoLoginData
}

/**
 * Google OAuth
 * - SSR-safe logovi (bez direktnog pristupa window-u na serveru)
 * - Scopes + offline access
 */
export async function signInWithGoogle() {
  authLogger.debug('Google OAuth – redirect =>', CALLBACK_URL)
  if (typeof window !== 'undefined') {
    authLogger.debug('Location (CSR):', window.location.href)
    authLogger.debug('Origin (CSR):', window.location.origin)
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: CALLBACK_URL,
      skipBrowserRedirect: false,
      scopes: 'openid email profile',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  authLogger.debug('OAuth response:', { url: data?.url, error })
  if (error) throw asError(error)
  return data
}

/**
 * Sign out
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw asError(error)
}

/**
 * Trenutni user (client-side)
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    // getUser često vraća error kad nema session-a – tretiramo kao null
    authLogger.debug('getUser error (tretiram kao null):', error)
    return null
  }
  return data.user ?? null
}

/**
 * Trenutna sesija – zgodno za zaštitu ruta
 */
export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    authLogger.debug('getSession error (tretiram kao null):', error)
    return null
  }
  return data.session ?? null
}

/* =========================
   Profili (SQL tabela: users)
   ========================= */

export interface ProfileRow {
  id: string
  full_name?: string | null
  avatar_url?: string | null
  updated_at?: string | null
  // dodaj ovde polja koja imaš u tabeli
}

/**
 * Fetch profila
 */
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select<'*', ProfileRow>('*')
    .eq('id', userId)
    .single()

  if (error) throw asError(error)
  return data
}

/**
 * Update profila
 */
export async function updateUserProfile(
  userId: string,
  updates: {
    full_name?: string
    avatar_url?: string
  }
) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select<'*', ProfileRow>()
    .single()

  if (error) throw asError(error)
  return data
}

/* =========================
   Adapteri i listeners
   ========================= */

/**
 * Pretvara Supabase.User + opcioni profil u AuthUser
 */
export function toAuthUser(user: User, profile?: Record<string, unknown>): AuthUser {
  const profileFullName = readRecordValue(profile, 'full_name')
  const metadata = user.user_metadata as Record<string, unknown> | undefined
  const metadataFullName = readRecordValue(metadata, 'full_name')
  const resolvedFullName =
    typeof profileFullName === 'string'
      ? profileFullName
      : typeof metadataFullName === 'string'
        ? metadataFullName
        : undefined

  const profileAvatarUrl = readRecordValue(profile, 'avatar_url')
  const metadataAvatarUrl = readRecordValue(metadata, 'avatar_url')
  const resolvedAvatarUrl =
    typeof profileAvatarUrl === 'string'
      ? profileAvatarUrl
      : typeof metadataAvatarUrl === 'string'
        ? metadataAvatarUrl
        : undefined

  const authUser: AuthUser = {
    id: user.id,
    email: user.email ?? '',
  }

  if (resolvedFullName !== undefined) authUser.fullName = resolvedFullName
  if (resolvedAvatarUrl !== undefined) authUser.avatarUrl = resolvedAvatarUrl

  return authUser
}

/**
 * Slušalac promena auth stanja – vraća unsubscribe()
 */
export function onAuthStateChange(callback: (user: User | null) => void) {
  const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null)
  })

  // supabase-js v2: sub.subscription?.unsubscribe ne postoji – direktno .unsubscribe()
  return () => {
    try {
      sub.subscription?.unsubscribe?.() // stariji typingi
      // @ts-expect-error – realno postoji .unsubscribe u runtime-u
      sub.unsubscribe?.()
    } catch {
      /* noop */
    }
  }
}

/* =========================
   Password flows
   ========================= */

/**
 * Reset lozinke – šalje email sa linkom na /auth/reset-password
 */
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
    redirectTo: RESET_URL,
  })
  if (error) throw asError(error)
}

/**
 * Update lozinke – validacija jačine
 */
export async function updatePassword(newPassword: string) {
  try {
    passwordSchema.parse(newPassword)
  } catch (err) {
    const e = asError(err)
    throw new Error(`Validacija šifre neuspešna: ${e.message}`)
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw asError(error)
}
