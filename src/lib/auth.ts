import type { User } from '@supabase/supabase-js'
import { authLogger } from './logger'
import { supabase } from './supabase'

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
  return {
    id: user.id,
    email: user.email ?? '',
    fullName: (profile?.full_name as string) || user.user_metadata?.full_name,
    avatarUrl: (profile?.avatar_url as string) || user.user_metadata?.avatar_url,
  }
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
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) throw error
}
