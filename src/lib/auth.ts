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
const REDIRECT_URL =
  typeof window !== 'undefined'
    ? import.meta.env.PROD
      ? 'https://fiskalni.app/auth/callback'
      : `${window.location.origin}/auth/callback`
    : 'https://fiskalni.app/auth/callback'

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
  authLogger.debug('Current hostname:', window.location.hostname)
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

  authLogger.debug('OAuth response data:', data)
  if (data?.url) {
    authLogger.debug('Full OAuth URL:', data.url)

    // CRITICAL FIX: Replace any localhost URLs in the OAuth URL
    let finalUrl = data.url
    if (finalUrl.includes('localhost') || finalUrl.includes('127.0.0.1')) {
      authLogger.warn('Detected localhost in OAuth URL, replacing with production URL')
      finalUrl = finalUrl.replace(/localhost:3000/g, 'fiskalni.app')
      finalUrl = finalUrl.replace(/localhost:54321/g, 'fiskalni.app')
      finalUrl = finalUrl.replace(/127\.0\.0\.1:3000/g, 'fiskalni.app')
      finalUrl = finalUrl.replace(/http:\/\/fiskalni\.app/g, 'https://fiskalni.app')
      authLogger.debug('Fixed OAuth URL:', finalUrl)

      // Redirect manually to the fixed URL
      window.location.href = finalUrl
      return data
    }
  }

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
export function toAuthUser(user: User, profile?: any): AuthUser {
  return {
    id: user.id,
    email: user.email!,
    fullName: profile?.full_name || user.user_metadata?.full_name,
    avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url,
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
