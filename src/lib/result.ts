/**
 * Modern Result Type Pattern (Rust-inspired)
 *
 * Instead of throwing exceptions, functions return Result<T, E>
 * This makes error handling explicit and type-safe
 *
 * Benefits:
 * - No silent failures
 * - Forced error handling
 * - Better type inference
 * - Composable error handling
 */

export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E }

/**
 * Create successful result
 */
export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value }
}

/**
 * Create error result
 */
export function Err<E>(error: E): Result<never, E> {
  return { ok: false, error }
}

/**
 * Check if result is Ok
 */
export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok === true
}

/**
 * Check if result is Err
 */
export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return result.ok === false
}

/**
 * Unwrap result value (throws if error)
 * Use only when you're SURE it's Ok
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.value
  }
  throw result.error
}

/**
 * Unwrap or return default value
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return isOk(result) ? result.value : defaultValue
}

/**
 * Map over result value
 */
export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return isOk(result) ? Ok(fn(result.value)) : result
}

/**
 * Map over result error
 */
export function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  return isErr(result) ? Err(fn(result.error)) : result
}

/**
 * Chain result operations (flatMap)
 */
export function andThen<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  return isOk(result) ? fn(result.value) : result
}

/**
 * Convert Promise to Result
 * Catches errors and wraps in Result type
 */
export async function fromPromise<T>(promise: Promise<T>): Promise<Result<T, Error>> {
  try {
    const value = await promise
    return Ok(value)
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * Convert Result to Promise
 */
export function toPromise<T, E>(result: Result<T, E>): Promise<T> {
  return isOk(result) ? Promise.resolve(result.value) : Promise.reject(result.error)
}

/**
 * Combine multiple Results
 * All must be Ok for result to be Ok
 */
export function all<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = []

  for (const result of results) {
    if (isErr(result)) {
      return result
    }
    values.push(result.value)
  }

  return Ok(values)
}

/**
 * Try-catch wrapper that returns Result
 */
export function tryCatch<T>(fn: () => T): Result<T, Error> {
  try {
    return Ok(fn())
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * Async try-catch wrapper that returns Result
 */
export async function tryAsync<T>(fn: () => Promise<T>): Promise<Result<T, Error>> {
  try {
    const value = await fn()
    return Ok(value)
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)))
  }
}

// Example usage:
/*
// Instead of:
// try {
//   const data = await fetchData()
//   return data
// } catch (error) {
//   console.error(error)
//   return null
// }

// Use:
// const result = await tryAsync(() => fetchData())
// if (isOk(result)) {
//   return result.value
// } else {
//   return null
// }

// Or even better with pattern matching:
// return match(result, {
//   ok: (data) => data,
//   err: (error) => null
// })
*/
