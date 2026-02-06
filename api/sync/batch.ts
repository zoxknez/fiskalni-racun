/**
 * Batch Sync API Handler
 *
 * Handles batch synchronization of multiple items at once.
 * Much more efficient than syncing items one by one.
 *
 * @module api/sync/batch
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyTokenFromHeader } from '../lib/auth.js'
import * as deviceHandler from './handlers/device.js'
import * as documentHandler from './handlers/document.js'
import * as householdBillHandler from './handlers/householdBill.js'
import * as receiptHandler from './handlers/receipt.js'
import * as reminderHandler from './handlers/reminder.js'
import * as subscriptionHandler from './handlers/subscription.js'

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

interface SyncItem {
  entityType: 'receipt' | 'device' | 'householdBill' | 'reminder' | 'subscription' | 'document'
  entityId: string
  operation: 'create' | 'update' | 'delete'
  data?: Record<string, unknown>
}

interface BatchRequest {
  items: SyncItem[]
}

// Entity type to handler mapping for DRY delete/create/update dispatch
const handlers = {
  receipt: receiptHandler,
  device: deviceHandler,
  householdBill: householdBillHandler,
  reminder: reminderHandler,
  subscription: subscriptionHandler,
  document: documentHandler,
} as const

// ────────────────────────────────────────────────────────────
// Main Handler
// ────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[sync/batch] Request received:', req.method)

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const authHeader = (req.headers.authorization || req.headers['Authorization']) as string
    const userId = await verifyTokenFromHeader(authHeader)

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    const body = req.body as BatchRequest
    if (!body || !Array.isArray(body.items)) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid request format - items array required' })
    }

    const items = body.items
    let success = 0
    let failed = 0
    const errors: string[] = []

    const BATCH_SIZE = 5
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE)

      await Promise.all(
        batch.map(async (item) => {
          try {
            const entityHandler = handlers[item.entityType]
            if (!entityHandler) {
              throw new Error(`Unsupported entity type: ${item.entityType}`)
            }

            if (item.operation === 'delete') {
              await entityHandler.handleDelete(userId, item.entityId)
            } else {
              if (!item.data) {
                throw new Error('Data is required for create/update operations')
              }
              // handleCreate uses ON CONFLICT DO UPDATE, so it works for both create and update
              await entityHandler.handleCreate(userId, item.entityId, item.data)
            }
            success++
          } catch (error) {
            failed++
            errors.push(
              `${item.entityType}/${item.entityId}: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
          }
        })
      )
    }

    return res.status(200).json({
      success,
      failed,
      total: items.length,
      errors: errors.slice(0, 10),
    })
  } catch (error) {
    console.error('Batch sync error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
