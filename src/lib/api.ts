/**
 * Modern API Layer
 *
 * Type-safe fetch wrapper with:
 * - Automatic error handling
 * - Request/response interceptors
 * - Retry logic
 * - Timeout support
 * - AbortController integration
 * - Result type pattern
 */

import { logger } from './logger'
import { Err, Ok, type Result } from './result'

type HeaderRecord = Record<string, string>

function toHeaderRecord(headers: HeadersInit = {}): HeaderRecord {
  if (headers instanceof Headers) {
    const record: HeaderRecord = {}
    headers.forEach((value, key) => {
      record[key] = value
    })
    return record
  }

  if (Array.isArray(headers)) {
    return headers.reduce<HeaderRecord>((acc, [key, value]) => {
      acc[key] = value
      return acc
    }, {})
  }

  return { ...(headers as Record<string, string>) }
}

export interface RequestConfig extends RequestInit {
  timeout?: number
  retry?: number
  retryDelay?: number
  baseURL?: string
}

export interface APIError {
  message: string
  status?: number
  code?: string
  details?: unknown
}

/**
 * Type-safe API client
 */
export class APIClient {
  private baseURL: string
  private defaultHeaders: HeaderRecord
  private requestInterceptors: Array<
    (config: RequestConfig) => RequestConfig | Promise<RequestConfig>
  > = []
  private responseInterceptors: Array<(response: Response) => Response | Promise<Response>> = []

  constructor(baseURL: string = '', defaultHeaders: HeadersInit = {}) {
    this.baseURL = baseURL
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...toHeaderRecord(defaultHeaders),
    }
  }

  /**
   * ⭐ Add request interceptor
   */
  useRequestInterceptor(
    interceptor: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>
  ): () => void {
    this.requestInterceptors.push(interceptor)

    return () => {
      const index = this.requestInterceptors.indexOf(interceptor)
      if (index > -1) {
        this.requestInterceptors.splice(index, 1)
      }
    }
  }

  /**
   * ⭐ Add response interceptor
   */
  useResponseInterceptor(
    interceptor: (response: Response) => Response | Promise<Response>
  ): () => void {
    this.responseInterceptors.push(interceptor)

    return () => {
      const index = this.responseInterceptors.indexOf(interceptor)
      if (index > -1) {
        this.responseInterceptors.splice(index, 1)
      }
    }
  }

  /**
   * ⭐ Apply request interceptors
   */
  private async applyRequestInterceptors(config: RequestConfig): Promise<RequestConfig> {
    let finalConfig = config

    for (const interceptor of this.requestInterceptors) {
      finalConfig = await interceptor(finalConfig)
    }

    return finalConfig
  }

  /**
   * ⭐ Apply response interceptors
   */
  private async applyResponseInterceptors(response: Response): Promise<Response> {
    let finalResponse = response

    for (const interceptor of this.responseInterceptors) {
      finalResponse = await interceptor(finalResponse)
    }

    return finalResponse
  }

  /**
   * Generic request method
   */
  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<Result<T, APIError>> {
    const {
      timeout = 30000,
      retry = 0,
      retryDelay = 1000,
      baseURL = this.baseURL,
      headers,
      ...fetchOptions
    } = config

    const url = baseURL + endpoint
    let lastError: APIError | null = null

    for (let attempt = 0; attempt <= retry; attempt++) {
      try {
        // ⭐ Apply request interceptors
        const interceptedConfig = await this.applyRequestInterceptors(config)

        // Create AbortController for timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const mergedHeaders = {
          ...this.defaultHeaders,
          ...toHeaderRecord(interceptedConfig.headers || headers),
        }

        let response = await fetch(url, {
          ...fetchOptions,
          ...interceptedConfig,
          headers: mergedHeaders,
          signal: config.signal || controller.signal,
        })

        clearTimeout(timeoutId)

        // ⭐ Apply response interceptors
        response = await this.applyResponseInterceptors(response)

        // Handle HTTP errors
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          lastError = {
            message: errorData.message || `HTTP ${response.status}`,
            status: response.status,
            code: errorData.code,
            details: errorData,
          }

          if (attempt < retry) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)))
            continue
          }

          return Err(lastError)
        }

        // Parse JSON response
        const data = await response.json()
        return Ok(data)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return Err({
            message: 'Request aborted',
            code: 'ABORTED',
          })
        }

        lastError = {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'NETWORK_ERROR',
        }

        if (attempt < retry) {
          logger.warn(`Retry attempt ${attempt + 1}/${retry}`)
          await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)))
        }
      }
    }

    return Err(
      lastError ?? {
        message: 'Request failed',
        code: 'UNKNOWN_ERROR',
      }
    )
  }

  /**
   * GET request
   */
  get<T>(endpoint: string, config?: RequestConfig): Promise<Result<T, APIError>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' })
  }

  /**
   * POST request
   */
  post<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<Result<T, APIError>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * PUT request
   */
  put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<Result<T, APIError>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * PATCH request
   */
  patch<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<Result<T, APIError>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  /**
   * DELETE request
   */
  delete<T>(endpoint: string, config?: RequestConfig): Promise<Result<T, APIError>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' })
  }

  /**
   * Set authorization header
   */
  setAuthToken(token: string) {
    this.defaultHeaders = {
      ...this.defaultHeaders,
      Authorization: `Bearer ${token}`,
    }
  }

  /**
   * Clear authorization header
   */
  clearAuthToken() {
  delete this.defaultHeaders['Authorization']
  }
}

// Example usage:
/*
const api = new APIClient('https://api.example.com')

// GET request
const result = await api.get<User[]>('/users')
if (isOk(result)) {
  console.log(result.value)
} else {
  console.error(result.error.message)
}

// POST with retry
const createResult = await api.post<User>(
  '/users',
  { name: 'John' },
  { retry: 3, retryDelay: 1000 }
)

// With AbortController
const controller = new AbortController()
const result = await api.get<Data>('/data', { signal: controller.signal })
setTimeout(() => controller.abort(), 5000) // Cancel after 5s
*/
