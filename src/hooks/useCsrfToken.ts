/**
 * CSRF Token Hook
 *
 * Provides CSRF protection for state-changing API requests.
 * Automatically fetches and refreshes CSRF tokens.
 *
 * @module hooks/useCsrfToken
 */

import { useCallback, useEffect, useRef, useState } from 'react'

const CSRF_COOKIE_NAME = 'csrf-token'
const CSRF_HEADER_NAME = 'X-CSRF-Token'
const TOKEN_REFRESH_INTERVAL = 50 * 60 * 1000 // 50 minutes (tokens expire in 1 hour)

/**
 * Get CSRF token from cookie
 */
function getCsrfTokenFromCookie(): string | null {
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === CSRF_COOKIE_NAME && value) {
      return value
    }
  }
  return null
}

/**
 * Fetch a new CSRF token from the server
 */
async function fetchCsrfToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/auth/csrf', {
      method: 'GET',
      credentials: 'include',
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.csrfToken || null
  } catch {
    return null
  }
}

interface UseCsrfTokenReturn {
  /** Current CSRF token */
  token: string | null
  /** Whether the token is being fetched */
  isLoading: boolean
  /** Add CSRF header to fetch options */
  addCsrfHeader: (headers?: HeadersInit) => Headers
  /** Manually refresh the token */
  refreshToken: () => Promise<void>
}

/**
 * Hook for managing CSRF tokens
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { addCsrfHeader, isLoading } = useCsrfToken()
 *
 *   const handleSubmit = async () => {
 *     await fetch('/api/sensitive-action', {
 *       method: 'POST',
 *       headers: addCsrfHeader({
 *         'Content-Type': 'application/json',
 *       }),
 *       body: JSON.stringify(data),
 *     })
 *   }
 * }
 * ```
 */
export function useCsrfToken(): UseCsrfTokenReturn {
  const [token, setToken] = useState<string | null>(() => getCsrfTokenFromCookie())
  const [isLoading, setIsLoading] = useState(false)
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refreshToken = useCallback(async () => {
    setIsLoading(true)
    try {
      const newToken = await fetchCsrfToken()
      if (newToken) {
        setToken(newToken)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch token on mount if not already present
  useEffect(() => {
    if (!token) {
      refreshToken()
    }

    // Set up automatic refresh
    refreshIntervalRef.current = setInterval(refreshToken, TOKEN_REFRESH_INTERVAL)

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [refreshToken, token])

  const addCsrfHeader = useCallback(
    (headers?: HeadersInit): Headers => {
      const newHeaders = new Headers(headers)
      if (token) {
        newHeaders.set(CSRF_HEADER_NAME, token)
      }
      return newHeaders
    },
    [token]
  )

  return {
    token,
    isLoading,
    addCsrfHeader,
    refreshToken,
  }
}

/**
 * Create fetch options with CSRF header
 *
 * Utility function for adding CSRF header without using the hook.
 *
 * @example
 * ```ts
 * const options = createCsrfFetchOptions({
 *   method: 'POST',
 *   body: JSON.stringify(data),
 * })
 * await fetch('/api/action', options)
 * ```
 */
export function createCsrfFetchOptions(options: RequestInit = {}): RequestInit {
  const token = getCsrfTokenFromCookie()
  if (!token) {
    return options
  }

  const headers = new Headers(options.headers)
  headers.set(CSRF_HEADER_NAME, token)

  return {
    ...options,
    headers,
  }
}
