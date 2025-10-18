/**
 * Modern API Layer
 *
 * Type-safe fetch wrapper with:
 * - Automatic error handling
 * - Request/response interceptors
 * - Retry logic with exponential backoff + jitter
 * - Timeout support
 * - AbortController integration
 * - Result<T, APIError> pattern
 */

import { logger } from './logger'
import { Err, Ok, type Result } from './result'

type HeaderRecord = Record<string, string>

type QueryValue = string | number | boolean | null | undefined | Record<string, unknown>

type QueryParams = Record<string, QueryValue | QueryValue[]> | URLSearchParams

function toHeaderRecord(headers: HeadersInit = {}): HeaderRecord {
  if (headers instanceof Headers) {
    const record: HeaderRecord = {}
    headers.forEach((value, key) => {
      record[key.toLowerCase()] = value
    })
    return record
  }

  if (Array.isArray(headers)) {
    return headers.reduce<HeaderRecord>((acc, [key, value]) => {
      acc[String(key).toLowerCase()] = String(value)
      return acc
    }, {})
  }

  return Object.entries(headers as Record<string, string>).reduce<HeaderRecord>(
    (acc, [key, value]) => {
      acc[key.toLowerCase()] = value
      return acc
    },
    {}
  )
}

const isFormData = (value: unknown): value is FormData =>
  typeof FormData !== 'undefined' && value instanceof FormData
const isURLSearchParams = (value: unknown): value is URLSearchParams =>
  typeof URLSearchParams !== 'undefined' && value instanceof URLSearchParams
const isBlob = (value: unknown): value is Blob =>
  typeof Blob !== 'undefined' && value instanceof Blob
const isArrayBuffer = (value: unknown): value is ArrayBuffer =>
  typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer
const isReadableStream = (value: unknown): value is ReadableStream =>
  typeof ReadableStream !== 'undefined' && value instanceof ReadableStream

const isJsonContentType = (contentType: string | null) =>
  !!contentType && /application\/(json|.*\+json)/i.test(contentType)

const joinURL = (base: string, path: string): string => {
  if (!base) return path
  if (!path) return base
  const trimmedBase = base.replace(/\/+$/, '')
  const trimmedPath = path.replace(/^\/+/, '')
  return `${trimmedBase}/${trimmedPath}`
}

const encodeQuery = (query?: QueryParams): string => {
  if (!query) return ''
  if (isURLSearchParams(query)) return query.toString()

  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value == null) continue

    const appendValue = (input: QueryValue | QueryValue[]) => {
      if (input == null) return
      if (Array.isArray(input)) {
        for (const item of input) appendValue(item)
        return
      }

      if (typeof input === 'object') {
        searchParams.append(key, JSON.stringify(input))
      } else {
        searchParams.append(key, String(input))
      }
    }

    appendValue(value)
  }

  return searchParams.toString()
}

const buildURL = (baseURL: string, endpoint: string, query?: QueryParams): string => {
  const base = baseURL ? joinURL(baseURL, endpoint) : endpoint
  const qs = encodeQuery(query)
  if (!qs) return base
  return `${base}${base.includes('?') ? '&' : '?'}${qs}`
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const backoff = (attempt: number, baseDelay: number) => {
  const exponential = baseDelay * 2 ** attempt
  const jitter = exponential * (0.4 * Math.random() - 0.2)
  return Math.max(50, exponential + jitter)
}

const shouldRetryStatus = (status: number) =>
  status === 408 || status === 429 || (status >= 500 && status < 600)

const mergeSignals = (a?: AbortSignal | null, b?: AbortSignal | null): AbortSignal | undefined => {
  if (!a && !b) return undefined
  const signals = [a, b].filter((signal): signal is AbortSignal => Boolean(signal))
  if (signals.length === 0) return undefined

  const abortSignalAny = (
    AbortSignal as typeof AbortSignal & {
      any?: (signals: AbortSignal[]) => AbortSignal
    }
  ).any

  if (typeof abortSignalAny === 'function') {
    return abortSignalAny(signals)
  }

  const controller = new AbortController()
  const abort = () => controller.abort()

  for (const signal of signals) {
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) {
      controller.abort()
    }
  }

  return controller.signal
}

const serializeBody = (data: unknown): BodyInit | null | undefined => {
  if (data == null) return data as null | undefined
  if (typeof data === 'string') return data
  if (
    isFormData(data) ||
    isURLSearchParams(data) ||
    isBlob(data) ||
    isArrayBuffer(data) ||
    isReadableStream(data)
  ) {
    return data as BodyInit
  }
  return JSON.stringify(data)
}

const adjustContentType = (
  headers: HeaderRecord,
  body: BodyInit | null | undefined
): HeaderRecord => {
  if (body == null) return headers
  if (isFormData(body) || isURLSearchParams(body) || isBlob(body)) {
    return Object.fromEntries(Object.entries(headers).filter(([key]) => key !== 'content-type'))
  }
  return headers
}

const parseResponse = async <T>(response: Response, method: string): Promise<T> => {
  const normalizedMethod = method.toUpperCase()
  if (response.status === 204 || response.status === 205 || normalizedMethod === 'HEAD') {
    return undefined as unknown as T
  }

  const contentType = response.headers.get('content-type')

  if (isJsonContentType(contentType)) {
    try {
      return (await response.json()) as T
    } catch {
      // fall through to text parsing
    }
  }

  try {
    const text = await response.text()
    return text as unknown as T
  } catch {
    return undefined as unknown as T
  }
}

const parseError = async (
  response: Response
): Promise<{ message: string; code?: string; details?: unknown }> => {
  const contentType = response.headers.get('content-type')

  if (isJsonContentType(contentType)) {
    try {
      const payload = await response.json()
      const message =
        (payload && (payload.message || payload.error || payload.detail)) ||
        `HTTP ${response.status}`
      const code = payload && (payload.code || payload.error_code)

      const result: { message: string; code?: string; details?: unknown } = {
        message: String(message),
        details: payload,
      }

      if (code) {
        result.code = String(code)
      }

      return result
    } catch {
      // ignore and fall through
    }
  }

  const text = await response.text().catch(() => '')
  const result: { message: string; code?: string; details?: unknown } = {
    message: text || `HTTP ${response.status}`,
  }

  if (text) {
    result.details = text
  }

  return result
}

export interface RequestConfig extends RequestInit {
  timeout?: number
  retry?: number
  retryDelay?: number
  baseURL?: string
  query?: QueryParams
}

export interface APIError {
  message: string
  status?: number
  code?: string
  details?: unknown
  url?: string
  method?: string
}

export class APIClient {
  private baseURL: string
  private defaultHeaders: HeaderRecord
  private requestInterceptors: Array<
    (config: RequestConfig) => RequestConfig | Promise<RequestConfig>
  > = []
  private responseInterceptors: Array<(response: Response) => Response | Promise<Response>> = []

  constructor(baseURL: string = '', defaultHeaders: HeadersInit = {}) {
    this.baseURL = baseURL
    this.defaultHeaders = toHeaderRecord(defaultHeaders)
  }

  setBaseURL(url: string) {
    this.baseURL = url
  }

  useRequestInterceptor(
    interceptor: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>
  ): () => void {
    this.requestInterceptors.push(interceptor)
    return () => {
      const index = this.requestInterceptors.indexOf(interceptor)
      if (index >= 0) {
        this.requestInterceptors.splice(index, 1)
      }
    }
  }

  useResponseInterceptor(
    interceptor: (response: Response) => Response | Promise<Response>
  ): () => void {
    this.responseInterceptors.push(interceptor)
    return () => {
      const index = this.responseInterceptors.indexOf(interceptor)
      if (index >= 0) {
        this.responseInterceptors.splice(index, 1)
      }
    }
  }

  private async applyRequestInterceptors(config: RequestConfig): Promise<RequestConfig> {
    let current = config
    for (const interceptor of this.requestInterceptors) {
      current = await interceptor(current)
    }
    return current
  }

  private async applyResponseInterceptors(response: Response): Promise<Response> {
    let current = response
    for (const interceptor of this.responseInterceptors) {
      current = await interceptor(current)
    }
    return current
  }

  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<Result<T, APIError>> {
    const {
      timeout = 30_000,
      retry = 0,
      retryDelay = 250,
      baseURL = this.baseURL,
      headers,
      body,
      method = 'GET',
      query,
      signal: externalSignal,
      ...fetchOptions
    } = config

    let lastError: APIError | null = null

    for (let attempt = 0; attempt <= retry; attempt++) {
      const timeoutController = new AbortController()
      const timeoutId = setTimeout(() => timeoutController.abort(), timeout)
      let currentUrl = buildURL(baseURL, endpoint, query)
      let currentMethod = method
      let currentRetryDelay = retryDelay

      try {
        const mergedSignal = mergeSignals(externalSignal ?? undefined, timeoutController.signal)
        const interceptorConfig: RequestConfig = {
          method,
          baseURL,
          timeout,
          retry,
          retryDelay,
          ...fetchOptions,
        }

        if (headers) {
          interceptorConfig.headers = headers
        }
        if (body !== undefined) {
          interceptorConfig.body = body
        }
        if (typeof query !== 'undefined') {
          interceptorConfig.query = query
        }
        if (mergedSignal) {
          interceptorConfig.signal = mergedSignal
        }

        const interceptedConfig = await this.applyRequestInterceptors(interceptorConfig)

        const {
          method: interceptedMethod,
          headers: interceptedHeaders,
          body: interceptedBody,
          signal: interceptedSignal,
          query: interceptedQuery,
          baseURL: interceptedBaseURL,
          timeout: _interceptedTimeout,
          retry: _interceptedRetry,
          retryDelay: interceptedRetryDelay,
          ...restIntercepted
        } = interceptedConfig

        const effectiveMethod = interceptedMethod ?? method
        currentMethod = effectiveMethod
        const effectiveBaseURL = interceptedBaseURL ?? baseURL
        const effectiveQuery = typeof interceptedQuery !== 'undefined' ? interceptedQuery : query
        currentUrl = buildURL(effectiveBaseURL, endpoint, effectiveQuery)
        const effectiveSignal = interceptedSignal ?? mergedSignal
        const effectiveRetryDelay = interceptedRetryDelay ?? retryDelay
        currentRetryDelay = effectiveRetryDelay

        const rawBody =
          interceptedBody !== undefined ? interceptedBody : body !== undefined ? body : undefined

        let finalBody: BodyInit | null | undefined
        if (rawBody === null) {
          finalBody = null
        } else if (rawBody === undefined) {
          finalBody = undefined
        } else if (
          typeof rawBody === 'string' ||
          isFormData(rawBody) ||
          isURLSearchParams(rawBody) ||
          isBlob(rawBody) ||
          isArrayBuffer(rawBody) ||
          isReadableStream(rawBody)
        ) {
          finalBody = rawBody as BodyInit
        } else {
          finalBody = serializeBody(rawBody)
        }

        let mergedHeaders: HeaderRecord = {
          ...this.defaultHeaders,
          ...toHeaderRecord(interceptedHeaders ?? headers),
        }

        const isJsonBody =
          finalBody !== undefined &&
          finalBody !== null &&
          !isFormData(finalBody) &&
          !isURLSearchParams(finalBody) &&
          !isBlob(finalBody) &&
          !isArrayBuffer(finalBody) &&
          !isReadableStream(finalBody)

        if (isJsonBody) {
          mergedHeaders = {
            'content-type': 'application/json',
            ...mergedHeaders,
          }
        }

        mergedHeaders = adjustContentType(mergedHeaders, finalBody)

        const requestInit: RequestInit = {
          ...fetchOptions,
          ...(restIntercepted as RequestInit),
          method: effectiveMethod,
          headers: mergedHeaders,
        }

        if (effectiveSignal) {
          requestInit.signal = effectiveSignal
        }
        if (finalBody !== undefined) {
          requestInit.body = finalBody
        }

        let response = await fetch(currentUrl, requestInit)
        response = await this.applyResponseInterceptors(response)

        if (!response.ok) {
          const errorPayload = await parseError(response)
          const errorInfo: APIError = {
            message: errorPayload.message,
            status: response.status,
            url: currentUrl,
            method: effectiveMethod,
          }

          if (errorPayload.code) {
            errorInfo.code = errorPayload.code
          }
          if (typeof errorPayload.details !== 'undefined') {
            errorInfo.details = errorPayload.details
          }

          lastError = errorInfo

          if (attempt < retry && shouldRetryStatus(response.status)) {
            const waitTime = backoff(attempt, effectiveRetryDelay)
            logger.warn?.(
              `Retry ${attempt + 1}/${retry} after ${Math.round(waitTime)}ms (HTTP ${response.status})`
            )
            await sleep(waitTime)
            continue
          }

          return Err(errorInfo)
        }

        const data = await parseResponse<T>(response, effectiveMethod)
        return Ok(data)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return Err({
            message: 'Request aborted',
            code: 'ABORTED',
            url: currentUrl,
            method: currentMethod,
          })
        }

        const message = error instanceof Error ? error.message : 'Network error'
        lastError = {
          message,
          code: 'NETWORK_ERROR',
          url: currentUrl,
          method: currentMethod,
        }

        if (attempt < retry) {
          const waitTime = backoff(attempt, currentRetryDelay)
          logger.warn?.(`Retry ${attempt + 1}/${retry} after ${Math.round(waitTime)}ms (network)`)
          await sleep(waitTime)
        }
      } finally {
        clearTimeout(timeoutId)
      }
    }

    return Err(
      lastError ?? {
        message: 'Request failed',
        code: 'UNKNOWN_ERROR',
      }
    )
  }

  get<T>(endpoint: string, config?: RequestConfig): Promise<Result<T, APIError>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' })
  }

  delete<T>(endpoint: string, config?: RequestConfig): Promise<Result<T, APIError>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' })
  }

  post<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<Result<T, APIError>> {
    const serialized = serializeBody(data)
    const nextConfig: RequestConfig = { ...(config ?? {}), method: 'POST' }
    if (serialized !== undefined) {
      nextConfig.body = serialized
    }
    return this.request<T>(endpoint, nextConfig)
  }

  put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<Result<T, APIError>> {
    const serialized = serializeBody(data)
    const nextConfig: RequestConfig = { ...(config ?? {}), method: 'PUT' }
    if (serialized !== undefined) {
      nextConfig.body = serialized
    }
    return this.request<T>(endpoint, nextConfig)
  }

  patch<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<Result<T, APIError>> {
    const serialized = serializeBody(data)
    const nextConfig: RequestConfig = { ...(config ?? {}), method: 'PATCH' }
    if (serialized !== undefined) {
      nextConfig.body = serialized
    }
    return this.request<T>(endpoint, nextConfig)
  }

  setAuthToken(token: string) {
    this.defaultHeaders = {
      ...this.defaultHeaders,
      authorization: `Bearer ${token}`,
    }
  }

  clearAuthToken() {
    const { authorization: _omit, ...rest } = this.defaultHeaders
    this.defaultHeaders = rest
  }
}
