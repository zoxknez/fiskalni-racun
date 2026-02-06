/**
 * Sync Debug API Handler
 *
 * Diagnostic endpoint to check user data status on the server.
 * Helps troubleshoot synchronization issues between devices.
 *
 * @module api/sync/debug
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '../db.js'
import { verifyTokenFromHeader } from '../lib/auth.js'

interface DebugResponse {
  success: boolean
  userId?: string
  counts?: {
    receipts: number
    devices: number
    householdBills: number
    reminders: number
    documents: number
    subscriptions: number
    settings: boolean
  }
  latestUpdates?: {
    receipts: string | null
    devices: string | null
    householdBills: string | null
    documents: string | null
    subscriptions: string | null
  }
  error?: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[sync/debug] Request received:', req.method)

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization || (req.headers['Authorization'] as string)
    const userId = await verifyTokenFromHeader(authHeader)

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized - no valid token' })
    }

    console.log(`[sync/debug] Checking data for user ${userId}`)

    // Get counts for all tables
    const [
      receiptsCount,
      devicesCount,
      householdBillsCount,
      remindersCount,
      documentsCount,
      subscriptionsCount,
      settingsResult,
    ] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM receipts WHERE user_id = ${userId} AND (is_deleted IS NULL OR is_deleted = false)`,
      sql`SELECT COUNT(*) as count FROM devices WHERE user_id = ${userId} AND (is_deleted IS NULL OR is_deleted = false)`,
      sql`SELECT COUNT(*) as count FROM household_bills WHERE user_id = ${userId} AND (is_deleted IS NULL OR is_deleted = false)`,
      sql`SELECT COUNT(*) as count FROM reminders WHERE user_id = ${userId} AND (is_deleted IS NULL OR is_deleted = false)`,
      sql`SELECT COUNT(*) as count FROM documents WHERE user_id = ${userId} AND (is_deleted IS NULL OR is_deleted = false)`,
      sql`SELECT COUNT(*) as count FROM subscriptions WHERE user_id = ${userId} AND (is_deleted IS NULL OR is_deleted = false)`,
      sql`SELECT * FROM user_settings WHERE user_id = ${userId} LIMIT 1`,
    ])

    // Get latest update timestamps
    const [latestReceipt, latestDevice, latestHouseholdBill, latestDocument, latestSubscription] =
      await Promise.all([
        sql`SELECT MAX(updated_at) as latest FROM receipts WHERE user_id = ${userId}`,
        sql`SELECT MAX(updated_at) as latest FROM devices WHERE user_id = ${userId}`,
        sql`SELECT MAX(updated_at) as latest FROM household_bills WHERE user_id = ${userId}`,
        sql`SELECT MAX(updated_at) as latest FROM documents WHERE user_id = ${userId}`,
        sql`SELECT MAX(updated_at) as latest FROM subscriptions WHERE user_id = ${userId}`,
      ])

    const response: DebugResponse = {
      success: true,
      userId,
      counts: {
        receipts: Number((receiptsCount as { count: number }[])[0]?.count ?? 0),
        devices: Number((devicesCount as { count: number }[])[0]?.count ?? 0),
        householdBills: Number((householdBillsCount as { count: number }[])[0]?.count ?? 0),
        reminders: Number((remindersCount as { count: number }[])[0]?.count ?? 0),
        documents: Number((documentsCount as { count: number }[])[0]?.count ?? 0),
        subscriptions: Number((subscriptionsCount as { count: number }[])[0]?.count ?? 0),
        settings: (settingsResult as unknown[]).length > 0,
      },
      latestUpdates: {
        receipts: (latestReceipt as { latest: string | null }[])[0]?.latest ?? null,
        devices: (latestDevice as { latest: string | null }[])[0]?.latest ?? null,
        householdBills: (latestHouseholdBill as { latest: string | null }[])[0]?.latest ?? null,
        documents: (latestDocument as { latest: string | null }[])[0]?.latest ?? null,
        subscriptions: (latestSubscription as { latest: string | null }[])[0]?.latest ?? null,
      },
    }

    console.log(`[sync/debug] Data status for user ${userId}:`, response.counts)

    return res.status(200).json(response)
  } catch (error) {
    console.error('[sync/debug] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ success: false, error: message })
  }
}
