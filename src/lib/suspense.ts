/**
 * Modern React Suspense Data Fetching
 *
 * Create suspense-compatible resources
 * Works with React 18+ Suspense boundaries
 *
 * Pattern: "Render-as-you-fetch" instead of "Fetch-on-render"
 */

type SuspenseStatus = 'pending' | 'success' | 'error'

interface SuspenseResource<T> {
  read: () => T
}

/**
 * Create a suspense-compatible resource
 * Throws promise while loading (Suspense catches it)
 * Returns data when ready
 */
export function createResource<T>(promise: Promise<T>): SuspenseResource<T> {
  let status: SuspenseStatus = 'pending'
  let result: T
  let error: Error

  const suspender = promise.then(
    (data) => {
      status = 'success'
      result = data
    },
    (err) => {
      status = 'error'
      error = err instanceof Error ? err : new Error(String(err))
    }
  )

  return {
    read() {
      if (status === 'pending') {
        throw suspender // Suspense catches this
      }
      if (status === 'error') {
        throw error
      }
      return result
    },
  }
}

/**
 * Create cached resource
 * Caches results by key
 */
export function createCachedResource<T>(
  fetchFn: (key: string) => Promise<T>
): (key: string) => SuspenseResource<T> {
  const cache = new Map<string, SuspenseResource<T>>()

  return (key: string) => {
    const existing = cache.get(key)
    if (existing) {
      return existing
    }

    const resource = createResource(fetchFn(key))
    cache.set(key, resource)
    return resource
  }
}

/**
 * Preload resource
 * Start fetching before component renders
 */
export function preloadResource<T>(promise: Promise<T>): SuspenseResource<T> {
  return createResource(promise)
}

// Example usage:
/*
// 1. Create resource OUTSIDE component
const userResource = createResource(fetchUser(userId))

// 2. Use in component with Suspense
function UserProfile() {
  const user = userResource.read() // Suspends if not ready
  return <div>{user.name}</div>
}

// 3. Wrap with Suspense
<Suspense fallback={<Loading />}>
  <UserProfile />
</Suspense>

// With caching:
const getReceipt = createCachedResource((id) => db.receipts.get(Number(id)))

function Receipt({ id }: { id: string }) {
  const receipt = getReceipt(id).read()
  return <div>{receipt.merchantName}</div>
}
*/
