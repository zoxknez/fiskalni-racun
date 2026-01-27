/**
 * Broadcast Channel API
 *
 * Provides real-time cross-tab communication
 * Better performance than Storage Events
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API
 */

export type BroadcastMessage =
  | { type: 'receipt-updated'; receiptId: string }
  | { type: 'receipt-deleted'; receiptId: string }
  | { type: 'receipt-created'; receiptId: string }
  | { type: 'device-updated'; deviceId: string }
  | { type: 'device-deleted'; deviceId: string }
  | { type: 'device-created'; deviceId: string }
  | { type: 'sync-completed'; timestamp: number }
  | { type: 'auth-changed'; userId: string | null }
  | { type: 'settings-changed'; settings: unknown }

/**
 * Check if Broadcast Channel API is supported
 */
export function isBroadcastChannelSupported(): boolean {
  return typeof BroadcastChannel !== 'undefined'
}

// Create broadcast channel instance
let channel: BroadcastChannel | null = null

/**
 * Get or create broadcast channel
 */
function getChannel(): BroadcastChannel | null {
  if (!isBroadcastChannelSupported()) {
    return null
  }

  if (!channel) {
    channel = new BroadcastChannel('fiskalni-racun-sync')
  }

  return channel
}

/**
 * Subscribe to broadcast messages
 *
 * @param callback - Function to call when message is received
 * @returns Unsubscribe function
 *
 * @example
 * ```ts
 * const unsubscribe = subscribeToBroadcast((message) => {
 *   if (message.type === 'receipt-updated') {
 *     // Invalidate cache
 *     queryClient.invalidateQueries(['receipts'])
 *   }
 * })
 *
 * // Later...
 * unsubscribe()
 * ```
 */
export function subscribeToBroadcast(callback: (message: BroadcastMessage) => void): () => void {
  const ch = getChannel()

  if (!ch) {
    // Fallback: no-op
    return () => {}
  }

  const handler = (event: MessageEvent) => {
    try {
      callback(event.data as BroadcastMessage)
    } catch (error) {
      // Silently ignore handler errors in production
      if (import.meta.env.DEV) {
        console.error('Broadcast message handler error:', error)
      }
    }
  }

  ch.addEventListener('message', handler)

  return () => {
    ch.removeEventListener('message', handler)
  }
}

/**
 * Broadcast a message to all tabs
 *
 * @param message - Message to broadcast
 *
 * @example
 * ```ts
 * broadcastMessage({
 *   type: 'receipt-updated',
 *   receiptId: '123'
 * })
 * ```
 */
export function broadcastMessage(message: BroadcastMessage): void {
  const ch = getChannel()

  if (!ch) {
    // Fallback: no-op
    return
  }

  try {
    ch.postMessage(message)
  } catch (error) {
    // Silently ignore broadcast errors in production
    if (import.meta.env.DEV) {
      console.error('Broadcast message error:', error)
    }
  }
}

/**
 * Close broadcast channel (cleanup)
 */
export function closeBroadcastChannel(): void {
  if (channel) {
    channel.close()
    channel = null
  }
}
