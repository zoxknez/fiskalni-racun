/**
 * Sync API Handler
 *
 * Handles synchronization of local data with the server database.
 * Supports create, update, and delete operations for all entity types.
 *
 * @module api/sync
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyTokenFromHeader } from './lib/auth.js'
import { type EntityTypeValue, SyncRequestSchema, validateEntityData } from './schemas/sync.js'
import * as deviceHandler from './sync/handlers/device.js'
import * as documentHandler from './sync/handlers/document.js'
import * as householdBillHandler from './sync/handlers/householdBill.js'
import * as receiptHandler from './sync/handlers/receipt.js'
import * as reminderHandler from './sync/handlers/reminder.js'
import * as settingsHandler from './sync/handlers/settings.js'
import * as subscriptionHandler from './sync/handlers/subscription.js'

// ────────────────────────────────────────────────────────────
// Utility Functions
// ────────────────────────────────────────────────────────────

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
    ),
  ])
}

// ────────────────────────────────────────────────────────────
// CRUD Operations
// ────────────────────────────────────────────────────────────

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
    case 'subscription':
      await subscriptionHandler.handleCreate(userId, entityId, data)
      break
  }
}

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
    case 'subscription':
      await subscriptionHandler.handleUpdate(userId, entityId, data)
      break
  }
}

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
    case 'subscription':
      await subscriptionHandler.handleDelete(userId, entityId)
      break
  }
}

// ────────────────────────────────────────────────────────────
// Main Handler
// ────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[sync] Request received:', req.method)

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const authHeader = (req.headers.authorization || req.headers['Authorization']) as string
    const userId = await verifyTokenFromHeader(authHeader)

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    const body = req.body
    console.log('[sync] Request body:', JSON.stringify(body).slice(0, 500))

    const parseResult = SyncRequestSchema.safeParse(body)
    if (!parseResult.success) {
      console.log('[sync] Validation failed:', JSON.stringify(parseResult.error.issues))
      return res.status(400).json({
        success: false,
        error: 'Invalid request format',
        errors: parseResult.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      })
    }

    const { entityType, entityId, operation, data } = parseResult.data

    if ((operation === 'create' || operation === 'update') && data) {
      const validationResult = validateEntityData(
        entityType,
        data,
        operation as 'create' | 'update'
      )
      if (validationResult.success === false) {
        console.log(
          '[sync] Entity validation failed for',
          entityType,
          ':',
          JSON.stringify(validationResult.error.issues)
        )
        console.log('[sync] Data that failed validation:', JSON.stringify(data).slice(0, 1000))
        return res.status(400).json({
          success: false,
          error: 'Invalid entity data',
          errors: validationResult.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        })
      }
    }

    await withTimeout(
      (async () => {
        switch (operation) {
          case 'create':
            if (!data) {
              throw new Error('Data is required for create operation')
            }
            await handleCreate(entityType, userId, entityId, data as Record<string, unknown>)
            break

          case 'update':
            if (!data) {
              throw new Error('Data is required for update operation')
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

    return res.status(200).json({ success: true, operation, entityType, entityId })
  } catch (error) {
    console.error('[sync] Error:', error)
    console.error('[sync] Error stack:', error instanceof Error ? error.stack : 'No stack')
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ success: false, error: message })
  }
}
