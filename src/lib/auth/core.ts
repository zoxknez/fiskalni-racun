import type { User } from '@supabase/supabase-js'
import { authLogger } from '../logger'
import { supabase } from '../supabase'
import { passwordSchema } from '../validation/passwordSchema'

export interface AuthUser {
  id: string
  email: string
  fullName?: string
  avatarUrl?: string
}

// Dynamic redirect URL - supports both dev and production
const getRedirectURL = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:3000/auth/callback'
  }

  // Use current origin in all cases (dev and production)
  return `${window.location.origin}/auth/callback`
}

const REDIRECT_URL = getRedirectURL()

// Sign up with email and password
export async function signUp(email: string, password: string) {
  authLogger.debug('Sign up - Redirect URL:', REDIRECT_URL)

  // ⭐ Validate password strength
  try {
    passwordSchema.parse(password)
  } catch (validationError) {
    if (validationError instanceof Error) {
      throw new Error(`Validacija šifre neuspešna: ${validationError.message}`)
    }
    throw validationError
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: REDIRECT_URL,
    },
  })

  if (error) throw error
  return data
}

// Sign in with email and password
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

// Demo login - automatically creates demo user if it doesn't exist
export async function signInDemo() {
  const DEMO_EMAIL = 'demo@example.com'
  const DEMO_PASSWORD = 'DemoPassword123!'

  authLogger.debug('Attempting demo login...')

  // Try to sign in first
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  })

  // If login successful, return data
  if (!loginError && loginData.user) {
    authLogger.debug('Demo user logged in successfully')
    return loginData
  }

  // If user doesn't exist, create it
  if (loginError?.message?.includes('Invalid login credentials')) {
    authLogger.debug('Demo user not found, creating...')

    const { error: signUpError } = await supabase.auth.signUp({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      options: {
        emailRedirectTo: REDIRECT_URL,
        data: {
          full_name: 'Demo User',
        },
      },
    })

    if (signUpError) {
      authLogger.error('Failed to create demo user:', signUpError)
      throw signUpError
    }

    // Automatically sign in after creation
    const { data: autoLoginData, error: autoLoginError } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    })

    if (autoLoginError) {
      authLogger.error('Failed to auto-login demo user:', autoLoginError)
      throw autoLoginError
    }

    authLogger.debug('Demo user created and logged in successfully')
    return autoLoginData
  }

  // If it's a different error, throw it
  authLogger.error('Demo login error:', loginError)
  throw loginError
}

// Sign in with Google
export async function signInWithGoogle() {
  authLogger.debug('Google OAuth - Redirect URL:', REDIRECT_URL)
  authLogger.debug('Current location:', window.location.href)
  authLogger.debug('Current origin:', window.location.origin)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: REDIRECT_URL,
      skipBrowserRedirect: false,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  authLogger.debug('OAuth response:', { url: data?.url, error })

  if (error) {
    authLogger.error('OAuth error:', error)
    throw error
  }

  return data
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Get current user
export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

// Get user profile from database
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single()

  if (error) throw error
  return data
}

// Update user profile
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
    .select()
    .single()

  if (error) throw error
  return data
}

// Convert Supabase User to AuthUser
export function toAuthUser(user: User, profile?: Record<string, unknown>): AuthUser {
  const profileFullName = profile?.['full_name']
  const metadataFullName = user.user_metadata?.['full_name']
  const resolvedFullName =
    typeof profileFullName === 'string'
      ? profileFullName
      : typeof metadataFullName === 'string'
        ? metadataFullName
        : undefined

  const profileAvatarUrl = profile?.['avatar_url']
  const metadataAvatarUrl = user.user_metadata?.['avatar_url']
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

  if (resolvedFullName !== undefined) {
    authUser.fullName = resolvedFullName
  }

  if (resolvedAvatarUrl !== undefined) {
    authUser.avatarUrl = resolvedAvatarUrl
  }

  return authUser
}

// Listen to auth state changes
export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null)
  })
}

// Reset password (send email)
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })

  if (error) throw error
}

// Update password
export async function updatePassword(newPassword: string) {
  // ⭐ Validate new password strength
  try {
    passwordSchema.parse(newPassword)
  } catch (validationError) {
    if (validationError instanceof Error) {
      throw new Error(`Validacija šifre neuspešna: ${validationError.message}`)
    }
    throw validationError
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) throw error
}
