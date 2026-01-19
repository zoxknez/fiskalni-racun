/**
 * Sync API Handler
 *
 * Handles synchronization of local data with the server database.
 * Supports create, update, and delete operations for all entity types.
 *
 * @module api/sync
 */

import { verifyToken } from './auth-utils'
import { parseJsonBody } from './lib/request-helpers'
import { type EntityTypeValue, SyncRequestSchema, validateEntityData } from './schemas/sync'
import * as deviceHandler from './sync/handlers/device'
import * as documentHandler from './sync/handlers/document'
import * as householdBillHandler from './sync/handlers/householdBill'
// Import modular handlers
import * as receiptHandler from './sync/handlers/receipt'
import * as reminderHandler from './sync/handlers/reminder'
import * as settingsHandler from './sync/handlers/settings'

export const config = {
  runtime: 'nodejs',
  // maxDuration: 20, // Removed to use default
  // regions: ['fra1'], // Removed to use default
}

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────
// Utility Functions
// ────────────────────────────────────────────────────────────

/**
 * Wrap a promise with a timeout. Rejects with an Error on timeout.
 */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
    ),
  ])
}

/**
 * Create JSON response with proper headers
 */
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}

/**
 * Create error response
 */
function errorResponse(message: string, status: number, errors?: unknown): Response {
  return jsonResponse({ success: false, error: message, errors }, status)
}

// ────────────────────────────────────────────────────────────
// CRUD Operations
// ────────────────────────────────────────────────────────────

/**
 * Handle CREATE operation
 */
async function handleCreate(
  entityType: EntityTypeValue,
  userId: string,
  entityId: string,
  data: Record<string, unknown>
): Promise<void> {
  switch (entityType) {
    case 'receipt':
      await receiptHandler.handleCreate(userId, entityId, data)
      break
    case 'device':
      await deviceHandler.handleCreate(userId, entityId, data)
      break
    case 'reminder':
      await reminderHandler.handleCreate(userId, entityId, data)
      break
    case 'householdBill':
      await householdBillHandler.handleCreate(userId, entityId, data)
      break
    case 'document':
      await documentHandler.handleCreate(userId, entityId, data)
      break
    case 'settings':
      await settingsHandler.handleCreate(userId, entityId, data)
      break
  }
}

/**
 * Handle UPDATE operation
 */
async function handleUpdate(
  entityType: EntityTypeValue,
  userId: string,
  entityId: string,
  data: Record<string, unknown>
): Promise<void> {
  switch (entityType) {
    case 'receipt':
      await receiptHandler.handleUpdate(userId, entityId, data)
      break
    case 'device':
      await deviceHandler.handleUpdate(userId, entityId, data)
      break
    case 'reminder':
      await reminderHandler.handleUpdate(userId, entityId, data)
      break
    case 'householdBill':
      await householdBillHandler.handleUpdate(userId, entityId, data)
      break
    case 'document':
      await documentHandler.handleUpdate(userId, entityId, data)
      break
    case 'settings':
      await settingsHandler.handleUpdate(userId, entityId, data)
      break
  }
}

/**
 * Handle DELETE operation (soft delete)
 */
async function handleDelete(
  entityType: EntityTypeValue,
  userId: string,
  entityId: string
): Promise<void> {
  switch (entityType) {
    case 'receipt':
      await receiptHandler.handleDelete(userId, entityId)
      break
    case 'device':
      await deviceHandler.handleDelete(userId, entityId)
      break
    case 'reminder':
      await reminderHandler.handleDelete(userId, entityId)
      break
    case 'householdBill':
      await householdBillHandler.handleDelete(userId, entityId)
      break
    case 'document':
      await documentHandler.handleDelete(userId, entityId)
      break
    case 'settings':
      await settingsHandler.handleDelete(userId, entityId)
      break
  }
}

// ────────────────────────────────────────────────────────────
// Main Handler
// ────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    // Verify authentication
    const userId = await verifyToken(req)
    if (!userId) {
      return errorResponse('Unauthorized', 401)
    }

    // Parse request body
    let body: unknown
    try {
      body = await parseJsonBody(req)
    } catch {
      return errorResponse('Invalid JSON body', 400)
    }

    // Validate request structure
    const parseResult = SyncRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return errorResponse(
        'Invalid request format',
        400,
        parseResult.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
      )
    }

    const { entityType, entityId, operation, data } = parseResult.data

    // For create/update, validate entity data
    if ((operation === 'create' || operation === 'update') && data) {
      const validationResult = validateEntityData(entityType, data)
      if (validationResult.success === false) {
        return errorResponse(
          'Invalid entity data',
          400,
          validationResult.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
        )
      }
    }

    // Execute operation
    // Execute operation with a 9s guard to avoid hitting function timeout (10s on Hobby)
    await withTimeout(
      (async () => {
        switch (operation) {
          case 'create':
            if (!data) {
              return errorResponse('Data is required for create operation', 400)
            }
            await handleCreate(entityType, userId, entityId, data as Record<string, unknown>)
            break

          case 'update':
            if (!data) {
              return errorResponse('Data is required for update operation', 400)
            }
            await handleUpdate(entityType, userId, entityId, data as Record<string, unknown>)
            break

          case 'delete':
            await handleDelete(entityType, userId, entityId)
            break
        }
      })(),
      9000
    )

    return jsonResponse({ success: true, operation, entityType, entityId })
  } catch (error) {
    console.error('Sync error:', error)

    // Expose error for debugging
    const message = error instanceof Error ? error.message : 'Unknown error'
    const stack = error instanceof Error ? error.stack : undefined

    return errorResponse(message, 500, { stack })
  }
}
