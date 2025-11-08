/**
 * Background Sync API Type Definitions
 *
 * The Background Sync API is not yet in TypeScript lib.dom.d.ts
 * This adds proper types to avoid @ts-expect-error
 *
 * Spec: https://wicg.github.io/background-sync/spec/
 */

interface SyncManager {
  /**
   * Register a sync event that will be triggered when the user agent is online
   * @param tag - Unique identifier for the sync event
   */
  register(tag: string): Promise<void>

  /**
   * Get all registered sync tags
   */
  getTags(): Promise<string[]>
}

interface ServiceWorkerRegistration {
  /**
   * Background Sync API
   * Available in Chrome 49+, Edge 79+, Opera 36+
   */
  readonly sync: SyncManager
}

interface SyncEvent extends ExtendableEvent {
  readonly tag: string
  readonly lastChance: boolean
}

interface ServiceWorkerGlobalScopeEventMap {
  sync: SyncEvent
}
