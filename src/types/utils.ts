/**
 * Modern TypeScript Utility Types
 *
 * Advanced type utilities for better type safety
 */

/**
 * Make specific keys required
 */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>

/**
 * Make specific keys optional
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * Require at least one property
 */
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys]

/**
 * Require exactly one property
 */
export type RequireOnlyOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, undefined>>
  }[Keys]

/**
 * Deep Partial
 */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>
    }
  : T

/**
 * Deep Readonly
 */
export type DeepReadonly<T> = T extends object
  ? {
      readonly [P in keyof T]: DeepReadonly<T[P]>
    }
  : T

/**
 * Mutable (opposite of Readonly)
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P]
}

/**
 * Deep Mutable
 */
export type DeepMutable<T> = T extends object
  ? {
      -readonly [P in keyof T]: DeepMutable<T[P]>
    }
  : T

/**
 * Non-nullable
 */
export type NonNullable<T> = Exclude<T, null | undefined>

/**
 * Strict Extract - extract keys that exactly match condition
 */
export type StrictExtract<T, U extends T> = T extends U ? T : never

/**
 * Strict Omit - prevents typos in omitted keys
 */
export type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

/**
 * Value of object/array
 */
export type ValueOf<T> = T[keyof T]

/**
 * Promise type unwrapper
 */
export type Await<T> = T extends Promise<infer U> ? U : T

/**
 * Function type unwrapper
 */
export type ReturnTypeOf<T> = T extends (...args: unknown[]) => infer R ? R : never

/**
 * Tuple to Union
 */
export type TupleToUnion<T extends readonly unknown[]> = T[number]

/**
 * Union to Intersection
 */
export type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never

/**
 * Prettify - expand object types for better IDE tooltips
 */
export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

/**
 * Const assertion helper
 */
export type Const<T> = T extends readonly unknown[] ? readonly [...T] : Readonly<T>

/**
 * JSON-serializable types only
 */
export type JSONValue = string | number | boolean | null | JSONObject | JSONArray
export type JSONObject = { [key: string]: JSONValue }
export type JSONArray = JSONValue[]

/**
 * Ensure type is JSON-serializable
 */
export type EnsureJSON<T> = T extends JSONValue ? T : never

// Example usage:
/*
// RequireKeys
interface User {
  id?: string
  name?: string
  email?: string
}
type RequiredUser = RequireKeys<User, 'id' | 'email'>
// Result: { id: string; email: string; name?: string }

// RequireAtLeastOne
type Filter = RequireAtLeastOne<{
  name?: string
  email?: string
  phone?: string
}, 'name' | 'email' | 'phone'>
// Must have at least one of: name, email, or phone

// Prettify
type ComplexType = User & { role: string }
type PrettyType = Prettify<ComplexType>
// IDE shows expanded type instead of intersection

// Const
const config = {
  api: 'https://api.example.com',
  timeout: 5000
} as const
type Config = Const<typeof config>
// Fully immutable type
*/
