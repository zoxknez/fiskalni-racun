/**
 * Session Management
 *
 * Track and manage active user sessions across devices
 *
 * @module lib/auth/sessionManager
 */

import { logger } from '../logger'
import { supabase, type Database } from '../supabase'

type UserSessionRow = Database['public']['Tables']['user_sessions']['Row']

export interface SessionInfo {
  id: string
  userId: string
  deviceId: string
  deviceName: string
  deviceType: 'mobile' | 'tablet' | 'desktop'
  browser: string
  os: string
  ipAddress?: string
  userAgent: string
  lastActivity: Date
  createdAt: Date
  expiresAt: Date
  isCurrent: boolean
}

/**
 * Generate unique device ID
 */
function getDeviceId(): string {
  let deviceId = localStorage.getItem('deviceId')

  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('deviceId', deviceId)
  }

  return deviceId
}

/**
 * Detect device type
 */
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

/**
 * Get device name
 */
function getDeviceName(): string {
  const type = getDeviceType()
  const platform = navigator.platform || 'Unknown'

  return `${type.charAt(0).toUpperCase() + type.slice(1)} (${platform})`
}

/**
 * Parse user agent
 */
function parseUserAgent(ua: string): { browser: string; os: string } {
  // Simple parser (can use ua-parser-js for better results)
  let browser = 'Unknown'
  let os = 'Unknown'

  // Browser detection
  if (ua.includes('Chrome')) browser = 'Chrome'
  else if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Safari')) browser = 'Safari'
  else if (ua.includes('Edge')) browser = 'Edge'

  // OS detection
  if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac')) os = 'macOS'
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iOS') || ua.includes('iPhone')) os = 'iOS'

  return { browser, os }
}

/**
 * Register current session
 */
export async function registerSession(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('No active session')
  }

  const deviceId = getDeviceId()
  const { browser, os } = parseUserAgent(navigator.userAgent)

  const sessionInfo = {
    user_id: session.user.id,
    device_id: deviceId,
    device_name: getDeviceName(),
    device_type: getDeviceType(),
    browser,
    os,
    user_agent: navigator.userAgent,
    last_activity: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
  }

  try {
    // Upsert session (requires database table)
    const { error } = await supabase
      .from('user_sessions')
      .upsert(sessionInfo, { onConflict: 'device_id' })
      .select()
      .single()

    if (error) throw error

    logger.info('Session registered:', deviceId)
    return deviceId
  } catch (error) {
    // Table might not exist - that's ok
    logger.warn('Session registration failed (table might not exist):', error)
    return deviceId
  }
}

/**
 * Update session activity
 */
export async function updateSessionActivity(): Promise<void> {
  const deviceId = getDeviceId()

  try {
    await supabase
      .from('user_sessions')
      .update({
        last_activity: new Date().toISOString(),
      })
      .eq('device_id', deviceId)
  } catch {
    // Ignore errors (table might not exist)
  }
}

/**
 * Get active sessions for current user
 */
export async function getActiveSessions(): Promise<SessionInfo[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .order('last_activity', { ascending: false })

    if (error) throw error

    const currentDeviceId = getDeviceId()

    const sessions = (data ?? []) as UserSessionRow[]

    return sessions.map((session) => {
      const info: SessionInfo = {
        id: session.id,
        userId: session.user_id,
        deviceId: session.device_id,
        deviceName: session.device_name,
        deviceType: session.device_type,
        browser: session.browser,
        os: session.os,
        userAgent: session.user_agent,
        lastActivity: new Date(session.last_activity),
        createdAt: new Date(session.created_at),
        expiresAt: new Date(session.expires_at),
        isCurrent: session.device_id === currentDeviceId,
      }

      if (session.ip_address) {
        info.ipAddress = session.ip_address
      }

      return info
    })
  } catch (error) {
    logger.warn('Failed to fetch sessions:', error)
    return []
  }
}

/**
 * Revoke session
 */
export async function revokeSession(deviceId: string): Promise<void> {
  const currentDeviceId = getDeviceId()

  try {
    await supabase.from('user_sessions').delete().eq('device_id', deviceId)

    logger.info('Session revoked:', deviceId)

    // If revoking current session, sign out
    if (deviceId === currentDeviceId) {
      await supabase.auth.signOut()
    }
  } catch (error) {
    logger.error('Failed to revoke session:', error)
    throw error
  }
}

/**
 * Revoke all sessions except current
 */
export async function revokeAllOtherSessions(): Promise<void> {
  const currentDeviceId = getDeviceId()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  try {
    await supabase
      .from('user_sessions')
      .delete()
      .eq('user_id', user.id)
      .neq('device_id', currentDeviceId)

    logger.info('All other sessions revoked')
  } catch (error) {
    logger.error('Failed to revoke sessions:', error)
    throw error
  }
}

/**
 * Start activity tracking
 */
export function startActivityTracking(): () => void {
  const interval = setInterval(
    () => {
      updateSessionActivity()
    },
    5 * 60 * 1000
  ) // Every 5 minutes

  // Track on user interaction
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
  let lastUpdate = 0

  const handleActivity = () => {
    const now = Date.now()

    // Throttle updates (max once per minute)
    if (now - lastUpdate > 60 * 1000) {
      updateSessionActivity()
      lastUpdate = now
    }
  }

  events.forEach((event) => {
    window.addEventListener(event, handleActivity, { passive: true })
  })

  return () => {
    clearInterval(interval)
    events.forEach((event) => {
      window.removeEventListener(event, handleActivity)
    })
  }
}
