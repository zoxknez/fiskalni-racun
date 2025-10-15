/**
 * Modern Test Example - Result Type
 *
 * Tests for functional error handling
 */

import { describe, expect, it } from 'vitest'
import {
  all,
  andThen,
  Err,
  fromPromise,
  isErr,
  isOk,
  map,
  mapErr,
  Ok,
  tryAsync,
  tryCatch,
  unwrap,
  unwrapOr,
} from '../result'

describe('Result Type', () => {
  describe('Ok and Err constructors', () => {
    it('should create Ok result', () => {
      const result = Ok(42)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(42)
      }
    })

    it('should create Err result', () => {
      const result = Err(new Error('test error'))
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toBe('test error')
      }
    })
  })

  describe('isOk and isErr type guards', () => {
    it('should narrow Ok type', () => {
      const result = Ok(42)
      if (isOk(result)) {
        expect(result.value).toBe(42)
      }
    })

    it('should narrow Err type', () => {
      const result = Err(new Error('test'))
      if (isErr(result)) {
        expect(result.error.message).toBe('test')
      }
    })
  })

  describe('unwrap', () => {
    it('should return value from Ok', () => {
      const result = Ok(42)
      expect(unwrap(result)).toBe(42)
    })

    it('should throw error from Err', () => {
      const result = Err(new Error('test error'))
      expect(() => unwrap(result)).toThrow('test error')
    })
  })

  describe('unwrapOr', () => {
    it('should return value from Ok', () => {
      const result = Ok(42)
      expect(unwrapOr(result, 0)).toBe(42)
    })

    it('should return default from Err', () => {
      const result = Err(new Error('test'))
      expect(unwrapOr(result, 0)).toBe(0)
    })
  })

  describe('map', () => {
    it('should transform Ok value', () => {
      const result = Ok(42)
      const mapped = map(result, (x) => x * 2)
      expect(unwrap(mapped)).toBe(84)
    })

    it('should pass through Err', () => {
      const result = Err(new Error('test'))
      const mapped = map(result, (x: number) => x * 2)
      expect(isErr(mapped)).toBe(true)
    })
  })

  describe('mapErr', () => {
    it('should pass through Ok', () => {
      const result = Ok(42)
      const mapped = mapErr(result, () => new Error('transformed'))
      expect(unwrap(mapped)).toBe(42)
    })

    it('should transform Err', () => {
      const result = Err(new Error('original'))
      const mapped = mapErr(result, (e) => new Error(`transformed: ${e.message}`))

      if (isErr(mapped)) {
        expect(mapped.error.message).toBe('transformed: original')
      }
    })
  })

  describe('andThen (flatMap)', () => {
    it('should chain Ok results', () => {
      const result = Ok(42)
      const chained = andThen(result, (x) => Ok(x * 2))
      expect(unwrap(chained)).toBe(84)
    })

    it('should short-circuit on Err', () => {
      const result = Err(new Error('test'))
      const chained = andThen(result, (x: number) => Ok(x * 2))
      expect(isErr(chained)).toBe(true)
    })
  })

  describe('fromPromise', () => {
    it('should convert resolved promise to Ok', async () => {
      const promise = Promise.resolve(42)
      const result = await fromPromise(promise)
      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toBe(42)
      }
    })

    it('should convert rejected promise to Err', async () => {
      const promise = Promise.reject(new Error('test error'))
      const result = await fromPromise(promise)
      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toBe('test error')
      }
    })
  })

  describe('tryCatch', () => {
    it('should catch exceptions and return Err', () => {
      const result = tryCatch(() => {
        throw new Error('test error')
      })
      expect(isErr(result)).toBe(true)
    })

    it('should return Ok for successful execution', () => {
      const result = tryCatch(() => 42)
      expect(unwrap(result)).toBe(42)
    })
  })

  describe('tryAsync', () => {
    it('should handle async success', async () => {
      const result = await tryAsync(async () => 42)
      expect(unwrap(result)).toBe(42)
    })

    it('should handle async errors', async () => {
      const result = await tryAsync(async () => {
        await Promise.resolve()
        throw new Error('async error')
      })
      expect(isErr(result)).toBe(true)
    })
  })

  describe('all', () => {
    it('should combine all Ok results', () => {
      const results = [Ok(1), Ok(2), Ok(3)]
      const combined = all(results)
      expect(unwrap(combined)).toEqual([1, 2, 3])
    })

    it('should return first Err', () => {
      const results = [Ok(1), Err(new Error('error')), Ok(3)]
      const combined = all(results)
      expect(isErr(combined)).toBe(true)
    })
  })
})
